"""
Copernicus Data Space Ecosystem (CDSE) — Sentinel-2 utilities.

Goal
----
Given a location (lat/lng) and TWO date ranges (before + after), find the
clearest Sentinel-2 L2A scene for each range, download its quicklook image,
crop it around the user's point, and return both as base64 JPEGs.

Authentication
--------------
Set in backend/.env:
  COPERNICUS_USER   your CDSE account e-mail
  COPERNICUS_PASS   your CDSE account password
Free registration: https://dataspace.copernicus.eu
"""

from __future__ import annotations
import os, io, re, logging, base64, requests
from typing import Optional
from PIL import Image

logger = logging.getLogger(__name__)

# ── Config ─────────────────────────────────────────────────────────────────────
_ready: bool = False
_error: Optional[str] = None

TOKEN_URL  = "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token"
ODATA_BASE = "https://catalogue.dataspace.copernicus.eu/odata/v1"

REQUESTS_TIMEOUT_SHORT = 25
REQUESTS_TIMEOUT_LONG  = 60


def _try_init() -> None:
    global _ready, _error
    user = os.getenv("COPERNICUS_USER", "").strip()
    pw   = os.getenv("COPERNICUS_PASS", "").strip()
    if not user or not pw:
        _error = (
            "Set COPERNICUS_USER and COPERNICUS_PASS in backend/.env "
            "then restart the server. Register free at dataspace.copernicus.eu"
        )
        return
    _ready = True
    logger.info("Sentinel-2/CDSE module ready.")


_try_init()


class SentinelNotConfiguredError(RuntimeError):
    pass


def is_configured() -> bool:
    return _ready


def config_error() -> Optional[str]:
    return _error


def _require() -> None:
    if not _ready:
        raise SentinelNotConfiguredError(_error or "Sentinel-2 not configured.")


# ── Authentication ─────────────────────────────────────────────────────────────
def _get_token() -> str:
    """Exchange username/password for a short-lived OAuth2 bearer token."""
    resp = requests.post(
        TOKEN_URL,
        data={
            "grant_type": "password",
            "username":   os.getenv("COPERNICUS_USER", ""),
            "password":   os.getenv("COPERNICUS_PASS", ""),
            "client_id":  "cdse-public",
        },
        timeout=REQUESTS_TIMEOUT_SHORT,
    )
    if not resp.ok:
        raise RuntimeError(
            f"CDSE authentication failed ({resp.status_code}). "
            "Check COPERNICUS_USER / COPERNICUS_PASS in backend/.env."
        )
    return resp.json()["access_token"]


# ── Product search ─────────────────────────────────────────────────────────────
def _search(
    lat: float, lng: float,
    start: str, end: str,
    max_cloud: int = 80,
    limit: int = 10,
) -> list[dict]:
    """
    Query CDSE OData for Sentinel-2 L2A products that:
      - intersect the given lat/lng point
      - fall within the start/end date range
      - have cloud cover ≤ max_cloud percent
    Returns list sorted by cloud cover ascending (clearest first).
    """
    # OData filter — note: POINT uses (longitude latitude) order
    filt = (
        "Collection/Name eq 'SENTINEL-2'"
        " and Attributes/OData.CSC.StringAttribute/any("
        "  att:att/Name eq 'productType'"
        "  and att/OData.CSC.StringAttribute/Value eq 'S2MSI2A')"
        f" and OData.CSC.Intersects(area=geography'SRID=4326;POINT ({lng} {lat})')"
        f" and ContentDate/Start ge {start}T00:00:00.000Z"
        f" and ContentDate/Start le {end}T23:59:59.999Z"
    )
    try:
        r = requests.get(
            f"{ODATA_BASE}/Products",
            params={
                "$filter":  filt,
                "$orderby": "ContentDate/Start asc",
                "$top":     str(limit),
                "$expand":  "Attributes",
            },
            timeout=REQUESTS_TIMEOUT_LONG,
        )
        r.raise_for_status()
        products = r.json().get("value", [])
    except Exception as exc:
        logger.error(f"CDSE search error: {exc}")
        return []

    def _cloud(p: dict) -> float:
        for a in p.get("Attributes", []):
            if a.get("Name") == "cloudCover":
                try:
                    return float(a["Value"])
                except (TypeError, ValueError):
                    pass
        return 100.0

    # Filter and sort by cloud cover
    filtered = [p for p in products if _cloud(p) <= max_cloud]
    filtered.sort(key=_cloud)
    return filtered


# ── Quicklook download ─────────────────────────────────────────────────────────
def _get_quicklook_bytes(product_id: str, token: str) -> Optional[bytes]:
    """
    Try multiple strategies to download the quicklook/thumbnail image bytes.

    Strategy A – OData Assets endpoint (authorised)
    Strategy B – Direct $value on the product (sometimes works)
    """
    headers = {"Authorization": f"Bearer {token}"}

    # ── A: Assets endpoint ────────────────────────────────────────────────
    try:
        r = requests.get(
            f"{ODATA_BASE}/Products({product_id})/Assets",
            headers=headers,
            timeout=REQUESTS_TIMEOUT_SHORT,
        )
        if r.ok:
            for asset in r.json().get("value", []):
                atype = asset.get("Type", "").upper()
                link  = asset.get("DownloadLink", "")
                if not link:
                    continue
                if any(kw in atype for kw in ("QUICKLOOK", "THUMBNAIL", "PREVIEW")):
                    img_r = requests.get(link, headers=headers, timeout=REQUESTS_TIMEOUT_LONG, stream=True)
                    if img_r.ok:
                        data = img_r.content
                        if len(data) > 500:         # at least 500 bytes = real image
                            logger.info(f"Quicklook via Assets for {product_id}: {len(data)} bytes")
                            return data
    except Exception as exc:
        logger.debug(f"Assets strategy failed for {product_id}: {exc}")

    # ── B: Try first Asset $value (some providers expose it) ─────────────
    try:
        r2 = requests.get(
            f"{ODATA_BASE}/Products({product_id})/Assets",
            headers=headers,
            timeout=REQUESTS_TIMEOUT_SHORT,
        )
        if r2.ok:
            assets = r2.json().get("value", [])
            if assets:
                # Just grab the first asset regardless of type
                link = assets[0].get("DownloadLink", "")
                if link:
                    img_r = requests.get(link, headers=headers, timeout=REQUESTS_TIMEOUT_LONG, stream=True)
                    if img_r.ok and img_r.headers.get("Content-Type", "").startswith("image"):
                        data = img_r.content
                        if len(data) > 500:
                            logger.info(f"Fallback Asset for {product_id}: {len(data)} bytes")
                            return data
    except Exception as exc:
        logger.debug(f"Fallback asset strategy failed: {exc}")

    logger.warning(f"Could not retrieve quicklook for product {product_id}")
    return None


# ── Footprint parsing ──────────────────────────────────────────────────────────
def _parse_footprint(footprint_str: str) -> Optional[tuple[float, float, float, float]]:
    """
    Parse WKT footprint → (min_lng, min_lat, max_lng, max_lat).
    Accepts the CDSE format:  geography'SRID=4326;POLYGON ((...))' 
    """
    if not footprint_str:
        return None
    pairs = re.findall(r'([-\d.]+)\s+([-\d.]+)', footprint_str)
    if len(pairs) < 3:
        return None
    lngs = [float(p[0]) for p in pairs]
    lats = [float(p[1]) for p in pairs]
    return min(lngs), min(lats), max(lngs), max(lats)


# ── Quicklook crop ─────────────────────────────────────────────────────────────
def _crop_quicklook(
    img_bytes: bytes,
    footprint_str: str,
    lat: float,
    lng: float,
    crop_fraction: float = 0.35,
    out_size: int = 512,
) -> Optional[str]:
    """
    Crop the quicklook around (lat, lng).
    Returns a base64-encoded JPEG data URL.

    crop_fraction controls how much of the scene to crop (0.35 = 35% of width/height).
    Sentinel-2 scenes cover ~110 km, so 35% ≈ 38 km — visible regional context.
    """
    try:
        img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
        w, h = img.size

        bounds = _parse_footprint(footprint_str)
        if bounds:
            min_lng, min_lat, max_lng, max_lat = bounds
            cx = int((lng - min_lng) / max(max_lng - min_lng, 1e-9) * w)
            cy = int((max_lat - lat) / max(max_lat - min_lat, 1e-9) * h)  # y-axis inverted
        else:
            # No footprint → centre of the image
            cx, cy = w // 2, h // 2
            logger.debug("No footprint data; using image centre.")

        half_w = max(int(w * crop_fraction / 2), 64)
        half_h = max(int(h * crop_fraction / 2), 64)

        left  = max(0,  cx - half_w)
        upper = max(0,  cy - half_h)
        right  = min(w, cx + half_w)
        lower  = min(h, cy + half_h)

        cropped = img.crop((left, upper, right, lower))
        cropped = cropped.resize((out_size, out_size), Image.LANCZOS)

        buf = io.BytesIO()
        cropped.save(buf, format="JPEG", quality=90)
        b64 = base64.b64encode(buf.getvalue()).decode()
        return f"data:image/jpeg;base64,{b64}"
    except Exception as exc:
        logger.warning(f"Quicklook crop error: {exc}")
        return None


# ── Metadata ───────────────────────────────────────────────────────────────────
def _build_meta(product: dict) -> dict:
    attrs    = {a["Name"]: a.get("Value") for a in product.get("Attributes", [])}
    date_str = (product.get("ContentDate", {}).get("Start") or "")[:10]
    cloud    = round(float(attrs.get("cloudCover", 0) or 0), 1)
    return {
        "id":         product["Id"],
        "title":      product.get("Name", ""),
        "date":       date_str,
        "cloudCover": cloud,
        "footprint":  product.get("Footprint", ""),
    }


# ── Public API ─────────────────────────────────────────────────────────────────
def find_scenes_for_periods(
    lat: float, lng: float,
    before_start: str, before_end: str,
    after_start: str,  after_end: str,
    cloud_cover: int = 80,
) -> dict:
    """
    Finds the best (lowest cloud cover) Sentinel-2 L2A scene for each period,
    downloads the quicklook, crops it around (lat, lng), and returns both images
    as base64 JPEGs ready for display and classification.

    Returns
    -------
    {
      "before": { id, title, date, cloudCover, image } | None,
      "after":  { id, title, date, cloudCover, image } | None,
      "errors": [ str, ... ]
    }
    """
    _require()

    logger.info(f"Fetching Sentinel scenes — before: {before_start}→{before_end}, after: {after_start}→{after_end}")

    try:
        token = _get_token()
    except RuntimeError as exc:
        raise exc

    errors: list[str] = []

    def _fetch_period(start: str, end: str, label: str) -> Optional[dict]:
        products = _search(lat, lng, start, end, max_cloud=cloud_cover)

        if not products:
            errors.append(
                f"No Sentinel-2 scenes found for the {label} period ({start} – {end}) "
                f"with ≤{cloud_cover}% cloud cover. "
                "Try widening the date range (use a full year) or increasing cloud cover."
            )
            return None

        best = products[0]          # lowest cloud cover
        meta = _build_meta(best)

        logger.info(
            f"  {label}: found {len(products)} scenes, best='{meta['title']}' "
            f"cloud={meta['cloudCover']}% date={meta['date']}"
        )

        # Download and crop quicklook
        ql_bytes = _get_quicklook_bytes(best["Id"], token)
        if ql_bytes:
            meta["image"] = _crop_quicklook(ql_bytes, meta["footprint"], lat, lng)
        else:
            meta["image"] = None
            errors.append(
                f"Found a {label} scene ({meta['date']}) but could not download its preview image. "
                "The scene exists — you can still try change detection if both scenes are found."
            )

        return meta

    before = _fetch_period(before_start, before_end, "before")
    after  = _fetch_period(after_start,  after_end,  "after")

    return {"before": before, "after": after, "errors": errors}
