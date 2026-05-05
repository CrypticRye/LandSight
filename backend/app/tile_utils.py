"""
Tile-stitching utilities for the LandSight capture endpoint.
Supports both standard Esri World Imagery and Historical Wayback releases.
"""

import io
import math
import logging
import functools
from concurrent.futures import ThreadPoolExecutor, as_completed

import requests
from PIL import Image

logger = logging.getLogger(__name__)

TILE_URL_ESRI = (
    "https://server.arcgisonline.com/ArcGIS/rest/services"
    "/World_Imagery/MapServer/tile/{z}/{y}/{x}"
)
TILE_URL_WAYBACK = (
    "https://wayback.maptiles.arcgis.com/arcgis/rest/services"
    "/World_Imagery/MapServer/tile/{release}/{z}/{y}/{x}"
)

TILE_SIZE  = 256
MAX_TILES  = 128     # Allow slightly larger selections
MAX_ESRI_ZOOM = 18

_session = requests.Session()
_session.headers.update({
    "User-Agent": "Mozilla/5.0 (compatible; LandSight/1.0)",
    "Referer":    "https://www.arcgis.com/",
})

# ── Coordinate helpers ────────────────────────────────────────────────────────

def lng_to_tile_x(lng: float, zoom: int) -> int:
    return int((lng + 180.0) / 360.0 * (2 ** zoom))

def lat_to_tile_y(lat: float, zoom: int) -> int:
    lat_r = math.radians(lat)
    return int(
        (1.0 - math.log(math.tan(lat_r) + 1.0 / math.cos(lat_r)) / math.pi)
        / 2.0 * (2 ** zoom)
    )

def tile_to_lng(x: int, zoom: int) -> float:
    return x / (2 ** zoom) * 360.0 - 180.0

def tile_to_lat(y: int, zoom: int) -> float:
    n = math.pi - 2.0 * math.pi * y / (2 ** zoom)
    return math.degrees(math.atan(math.sinh(n)))

# ── Fetch Logic ───────────────────────────────────────────────────────────────

def _fetch_tile(z: int, x: int, y: int, release: str = None) -> Image.Image | None:
    """Fetches a single tile. If release is provided, uses Wayback URL."""
    if release:
        url = TILE_URL_WAYBACK.format(release=release, z=z, x=x, y=y)
    else:
        url = TILE_URL_ESRI.format(z=z, x=x, y=y)

    for attempt in range(3):
        try:
            r = _session.get(url, timeout=10)
            if r.ok and "image" in r.headers.get("Content-Type", ""):
                return Image.open(io.BytesIO(r.content)).convert("RGB")
        except Exception:
            pass
        import time; time.sleep(0.3 * (attempt + 1))
    return None

@functools.lru_cache(maxsize=128)
def _cached_stitch(west: float, south: float, east: float, north: float,
                   zoom: int, out_size: int, wayback_release: str = None) -> bytes:
    """
    Stitches tiles for a bbox and returns JPEG bytes.
    """
    x_min = lng_to_tile_x(west,  zoom)
    x_max = lng_to_tile_x(east,  zoom)
    y_min = lat_to_tile_y(north, zoom)
    y_max = lat_to_tile_y(south, zoom)

    cols = x_max - x_min + 1
    rows = y_max - y_min + 1

    if cols * rows > MAX_TILES:
        raise ValueError(f"Selection too large: {cols}x{rows} tiles requested. Please zoom in.")

    full_img = Image.new("RGB", (cols * TILE_SIZE, rows * TILE_SIZE))

    with ThreadPoolExecutor(max_workers=8) as executor:
        future_to_pos = {
            executor.submit(_fetch_tile, zoom, x, y, wayback_release): (x - x_min, y - y_min)
            for x in range(x_min, x_max + 1)
            for y in range(y_min, y_max + 1)
        }
        for future in as_completed(future_to_pos):
            col, row = future_to_pos[future]
            try:
                tile_img = future.result()
                if tile_img:
                    full_img.paste(tile_img, (col * TILE_SIZE, row * TILE_SIZE))
            except Exception as e:
                logger.error("Error fetching tile at col=%d row=%d: %s", col, row, e)

    # Geographic boundaries of the full stitched grid
    full_west  = tile_to_lng(x_min, zoom)
    full_east  = tile_to_lng(x_max + 1, zoom)
    full_north = tile_to_lat(y_min, zoom)
    full_south = tile_to_lat(y_max + 1, zoom)

    # Pixel interpolation for precise crop
    left   = (west - full_west) / (full_east - full_west) * full_img.width
    right  = (east - full_west) / (full_east - full_west) * full_img.width
    top    = (north - full_north) / (full_south - full_north) * full_img.height
    bottom = (south - full_north) / (full_south - full_north) * full_img.height

    cropped = full_img.crop((int(left), int(top), int(right), int(bottom)))
    resized = cropped.resize((out_size, out_size), Image.LANCZOS)

    buf = io.BytesIO()
    resized.save(buf, format="JPEG", quality=90)
    return buf.getvalue()

def stitch_tiles(west: float, south: float, east: float, north: float,
                 zoom: int = 17, out_size: int = 640, wayback_release: str = None) -> Image.Image:
    """Main entry point for capturing satellite imagery."""
    img_bytes = _cached_stitch(west, south, east, north, zoom, out_size, wayback_release)
    return Image.open(io.BytesIO(img_bytes))
