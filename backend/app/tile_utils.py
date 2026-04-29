"""
Tile-stitching utilities for the LandSight capture endpoint.

Fetches individual Esri World Imagery tiles, stitches them into a single
image, and crops/resizes to the requested output size.

Features:
- Parallel tile fetching via ThreadPoolExecutor (fast!)
- LRU cache keyed on (west, south, east, north, zoom) to avoid re-fetching
- Retry logic (3 attempts per tile with back-off)
"""

import io
import math
import logging
import hashlib
import functools
from concurrent.futures import ThreadPoolExecutor, as_completed

import requests
from PIL import Image

logger = logging.getLogger(__name__)

TILE_URL = (
    "https://server.arcgisonline.com/ArcGIS/rest/services"
    "/World_Imagery/MapServer/tile/{z}/{y}/{x}"
)
TILE_SIZE  = 256    # pixels per tile
MAX_TILES  = 64     # safety cap (8×8 grid max)
MAX_ESRI_ZOOM = 18  # Esri World Imagery has good data up to zoom 18


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


# ── Single tile fetch (with retry) ───────────────────────────────────────────

_session = requests.Session()
_session.headers.update({
    "User-Agent": "Mozilla/5.0 (compatible; LandSight/1.0)",
    "Referer":    "https://www.arcgis.com/",
})


def _fetch_tile(z: int, x: int, y: int) -> tuple[tuple[int, int], Image.Image | None]:
    """Return ((col, row), PIL Image) or ((col, row), None) on failure."""
    url = TILE_URL.format(z=z, x=x, y=y)
    for attempt in range(3):
        try:
            r = _session.get(url, timeout=10)
            if r.ok and "image" in r.headers.get("Content-Type", ""):
                return Image.open(io.BytesIO(r.content)).convert("RGB")
        except Exception:
            pass
        import time; time.sleep(0.3 * (attempt + 1))
    logger.warning("Tile missing after 3 attempts: z=%d x=%d y=%d", z, x, y)
    return None


# ── LRU-cached stitch ─────────────────────────────────────────────────────────
# Cache up to 64 recent bbox/zoom combinations (avoids re-fetching on redraw).

@functools.lru_cache(maxsize=64)
def _cached_stitch(west: float, south: float, east: float, north: float,
                   zoom: int, out_size: int) -> bytes:
    """
    Returns JPEG bytes for the stitched+cropped tile image.
    Result is cached by (west, south, east, north, zoom, out_size).
    """
    x_min = lng_to_tile_x(west,  zoom)
    x_max = lng_to_tile_x(east,  zoom)
    y_min = lat_to_tile_y(north, zoom)   # y increases southward
    y_max = lat_to_tile_y(south, zoom)

    cols = x_max - x_min + 1
    rows = y_max - y_min + 1

    if cols * rows > MAX_TILES:
        raise ValueError(
            f"Too many tiles requested ({cols}×{rows}={cols * rows}). "
            "Zoom in more or draw a smaller selection."
        )

    canvas_w = cols * TILE_SIZE
    canvas_h = rows * TILE_SIZE
    canvas   = Image.new("RGB", (canvas_w, canvas_h))

    # Build list of (col_index, row_index, tx, ty) tasks
    tasks = [
        (col, row, x_min + col, y_min + row)
        for row in range(rows)
        for col in range(cols)
    ]

    # Fetch tiles in parallel
    with ThreadPoolExecutor(max_workers=min(16, len(tasks))) as pool:
        futures = {
            pool.submit(_fetch_tile, zoom, tx, ty): (col, row)
            for col, row, tx, ty in tasks
        }
        for future in as_completed(futures):
            col, row = futures[future]
            try:
                tile = future.result()
            except Exception:
                tile = None
            if tile:
                canvas.paste(tile, (col * TILE_SIZE, row * TILE_SIZE))

    # Pixel-precise crop to the requested bbox
    tl_lng = tile_to_lng(x_min,     zoom)
    tl_lat = tile_to_lat(y_min,     zoom)
    br_lng = tile_to_lng(x_max + 1, zoom)
    br_lat = tile_to_lat(y_max + 1, zoom)

    def lng_to_px(lng_val):
        return (lng_val - tl_lng) / (br_lng - tl_lng) * canvas_w

    def lat_to_px(lat_val):
        return (tl_lat - lat_val) / (tl_lat - br_lat) * canvas_h

    left  = max(0, int(lng_to_px(west)))
    right = min(canvas_w, int(lng_to_px(east)))
    top   = max(0, int(lat_to_px(north)))
    bot   = min(canvas_h, int(lat_to_px(south)))

    if right <= left or bot <= top:
        raise ValueError(
            "Crop region is empty — bbox may be too small at this zoom level."
        )

    cropped = canvas.crop((left, top, right, bot))
    resized = cropped.resize((out_size, out_size), Image.LANCZOS)

    buf = io.BytesIO()
    resized.save(buf, format="JPEG", quality=90)
    return buf.getvalue()


def stitch_tiles(west: float, south: float, east: float, north: float,
                 zoom: int, out_size: int = 640) -> Image.Image:
    """
    Public API: fetch + stitch Esri tiles for the given bbox at `zoom`.
    Returns a PIL Image (out_size × out_size).
    zoom is clamped to [1, MAX_ESRI_ZOOM].
    """
    zoom = max(1, min(int(zoom), MAX_ESRI_ZOOM))
    # Round bbox to 5 decimal places so tiny float noise doesn't bust the cache
    w = round(west,  5)
    s = round(south, 5)
    e = round(east,  5)
    n = round(north, 5)
    jpeg_bytes = _cached_stitch(w, s, e, n, zoom, out_size)
    return Image.open(io.BytesIO(jpeg_bytes))
