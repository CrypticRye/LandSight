import logging, base64, requests as _req
from flask import Blueprint, request, jsonify
from app import db
from app.models_db import ClassificationRecord, ChangeDetectionRecord, SentinelChangeRecord
from app.utils import (
    decode_base64_image,
    compress_image_base64,
    is_satellite_image,
    classify_image,
    compute_change_detection,
)
from app import sentinel_utils

logger = logging.getLogger(__name__)
api_bp = Blueprint("api", __name__)


@api_bp.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"}), 200


# ── Tile-stitch helpers ───────────────────────────────────────────────────────
import math as _math
import io as _io
from PIL import Image as _PILImage

TILE_URL = (
    "https://server.arcgisonline.com/ArcGIS/rest/services"
    "/World_Imagery/MapServer/tile/{z}/{y}/{x}"
)
TILE_SIZE = 256   # pixels per tile
MAX_TILES = 64    # safety cap (8×8 grid max)


def _lng_to_tile_x(lng: float, zoom: int) -> int:
    return int((lng + 180.0) / 360.0 * (2 ** zoom))


def _lat_to_tile_y(lat: float, zoom: int) -> int:
    lat_r = _math.radians(lat)
    return int(
        (1.0 - _math.log(_math.tan(lat_r) + 1.0 / _math.cos(lat_r)) / _math.pi)
        / 2.0 * (2 ** zoom)
    )


def _tile_to_lng(x: int, zoom: int) -> float:
    return x / (2 ** zoom) * 360.0 - 180.0


def _tile_to_lat(y: int, zoom: int) -> float:
    n = _math.pi - 2.0 * _math.pi * y / (2 ** zoom)
    return _math.degrees(_math.atan(_math.sinh(n)))


def _fetch_tile(z: int, x: int, y: int, session) -> _PILImage.Image | None:
    url = TILE_URL.format(z=z, x=x, y=y)
    headers = {
        "User-Agent": "Mozilla/5.0 (compatible; LandSight/1.0)",
        "Referer": "https://www.arcgis.com/",
    }
    for attempt in range(3):
        try:
            r = session.get(url, timeout=10, headers=headers)
            if r.ok and "image" in r.headers.get("Content-Type", ""):
                return _PILImage.open(_io.BytesIO(r.content)).convert("RGB")
        except Exception:
            pass
        import time; time.sleep(0.4 * (attempt + 1))
    return None


def _stitch_tiles(
    west: float, south: float, east: float, north: float,
    zoom: int, out_size: int = 640,
) -> _PILImage.Image:
    """
    Fetch all Esri tiles covering the bbox at the given zoom, stitch them,
    and crop+resize to out_size × out_size.
    """
    x_min = _lng_to_tile_x(west,  zoom)
    x_max = _lng_to_tile_x(east,  zoom)
    y_min = _lat_to_tile_y(north, zoom)   # note: y increases southward
    y_max = _lat_to_tile_y(south, zoom)

    cols = x_max - x_min + 1
    rows = y_max - y_min + 1

    if cols * rows > MAX_TILES:
        raise ValueError(
            f"Too many tiles requested ({cols}×{rows}={cols*rows}). "
            "Zoom in more or draw a smaller selection."
        )

    canvas_w = cols * TILE_SIZE
    canvas_h = rows * TILE_SIZE
    canvas = _PILImage.new("RGB", (canvas_w, canvas_h))

    import requests as _req_local
    session = _req_local.Session()

    for row, ty in enumerate(range(y_min, y_max + 1)):
        for col, tx in enumerate(range(x_min, x_max + 1)):
            tile = _fetch_tile(zoom, tx, ty, session)
            if tile:
                canvas.paste(tile, (col * TILE_SIZE, row * TILE_SIZE))
            else:
                logger.warning(f"Tile missing: z={zoom} x={tx} y={ty}")

    # --- pixel-precise crop to the bbox ---
    # Top-left corner of our stitched canvas corresponds to tile (x_min, y_min)
    tl_lng = _tile_to_lng(x_min,     zoom)
    tl_lat = _tile_to_lat(y_min,     zoom)
    br_lng = _tile_to_lng(x_max + 1, zoom)
    br_lat = _tile_to_lat(y_max + 1, zoom)

    def lng_to_px(lng_val):   return (lng_val - tl_lng) / (br_lng - tl_lng) * canvas_w
    def lat_to_px(lat_val):   return (tl_lat  - lat_val) / (tl_lat  - br_lat) * canvas_h

    left  = max(0, int(lng_to_px(west)))
    right = min(canvas_w, int(lng_to_px(east)))
    top   = max(0, int(lat_to_px(north)))
    bot   = min(canvas_h, int(lat_to_px(south)))

    if right <= left or bot <= top:
        raise ValueError("Crop region is empty — bbox may be too small at this zoom.")

    cropped = canvas.crop((left, top, right, bot))
    return cropped.resize((out_size, out_size), _PILImage.LANCZOS)


# ── Capture endpoint ──────────────────────────────────────────────────────────

@api_bp.route("/capture-map-tiles", methods=["POST"])
def capture_map_tiles():
    """
    Capture satellite imagery for a bbox by stitching individual Esri tiles.
    Uses the same tile URL Leaflet uses — no export endpoint, no API key.
    Body: { west, south, east, north, zoom, size? }
    Returns: { image: "data:image/jpeg;base64,..." }
    """
    data  = request.get_json(silent=True) or {}
    west  = data.get("west")
    south = data.get("south")
    east  = data.get("east")
    north = data.get("north")
    zoom  = data.get("zoom", 17)
    size  = min(int(data.get("size", 640)), 1024)

    if any(v is None for v in [west, south, east, north]):
        return jsonify({"error": "Missing bbox params (west/south/east/north)."}), 400

    try:
        west, south, east, north = float(west), float(south), float(east), float(north)
        zoom = max(1, min(int(zoom), 20))
        if not (-180 <= west <= 180 and -90 <= south <= 90 and -180 <= east <= 180 and -90 <= north <= 90):
            return jsonify({"error": "Invalid coordinates."}), 400
        if west >= east or south >= north:
            return jsonify({"error": "Invalid bbox: west must be < east and south must be < north."}), 400
    except (TypeError, ValueError) as e:
        return jsonify({"error": f"Invalid parameter: {e}"}), 400

    try:
        logger.info(f"Stitching tiles: zoom={zoom} bbox=[{west:.5f},{south:.5f},{east:.5f},{north:.5f}]")
        img = _stitch_tiles(west, south, east, north, zoom=zoom, out_size=size)
        buf = _io.BytesIO()
        img.save(buf, format="JPEG", quality=90)
        b64 = base64.b64encode(buf.getvalue()).decode()
        logger.info(f"Tile stitch successful: {len(buf.getvalue())} bytes")
        return jsonify({"image": f"data:image/jpeg;base64,{b64}"})
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as exc:
        logger.exception(f"Tile stitch failed: {exc}")
        return jsonify({"error": f"Capture failed: {exc}"}), 500


# ── Land Classification ───────────────────────────────────────────────────────

@api_bp.route("/classify", methods=["POST"])
def classify():
    data     = request.get_json(silent=True) or {}
    b64      = data.get("image")
    filename = data.get("filename", "upload.jpg")

    if not b64:
        return jsonify({"error": "No image provided."}), 400
    if len(b64) > 14_000_000:
        return jsonify({"error": "Image too large. Maximum size is ~10 MB."}), 413

    try:
        pil_img = decode_base64_image(b64)
    except Exception as e:
        return jsonify({"error": f"Could not decode image: {e}"}), 400

    sat_check = is_satellite_image(pil_img)
    result    = classify_image(pil_img)
    if "error" in result:
        return jsonify(result), 503

    thumbnail = compress_image_base64(pil_img)
    try:
        record = ClassificationRecord(
            filename     = filename,
            land_type    = result["rawLabel"],
            confidence   = result["confidence"],
            is_satellite = sat_check["isSatellite"],
            image_base64 = thumbnail,
            features     = result["features"],
            all_probs    = result["allProbs"],
        )
        db.session.add(record)
        db.session.commit()
        record_id = record.id
    except Exception:
        logger.exception("DB write failed")
        db.session.rollback()
        record_id = None

    return jsonify({
        "id":               record_id,
        "landType":         result["landType"],
        "rawLabel":         result["rawLabel"],
        "broadLabel":       result.get("broadLabel", "Unknown"),
        "broadDescription": result.get("broadDescription", ""),
        "confidence":       round(result["confidence"] * 100, 1),
        "description":      result["description"],
        "features":         result["features"],
        "allProbs":         result["allProbs"],
        "isSatellite":      sat_check["isSatellite"],
        "satelliteReason":  sat_check["reason"],
    }), 200


# ── Upload-based Change Detection ─────────────────────────────────────────────

@api_bp.route("/change-detection", methods=["POST"])
def change_detection():
    data       = request.get_json(silent=True) or {}
    before_b64 = data.get("beforeImage")
    after_b64  = data.get("afterImage")

    if not before_b64 or not after_b64:
        return jsonify({"error": "Both beforeImage and afterImage are required."}), 400

    try:
        before_img = decode_base64_image(before_b64)
        after_img  = decode_base64_image(after_b64)
    except Exception as e:
        return jsonify({"error": f"Image decode error: {e}"}), 400

    before_result = classify_image(before_img)
    after_result  = classify_image(after_img)

    if "error" in before_result or "error" in after_result:
        return jsonify({"error": "Model not available."}), 503

    changes = compute_change_detection(before_result, after_result)

    try:
        record = ChangeDetectionRecord(
            before_type = before_result["rawLabel"],
            after_type  = after_result["rawLabel"],
            before_conf = before_result["confidence"],
            after_conf  = after_result["confidence"],
            changes     = changes,
        )
        db.session.add(record)
        db.session.commit()
        record_id = record.id
    except Exception:
        logger.exception("DB write failed")
        db.session.rollback()
        record_id = None

    return jsonify({
        "id":             record_id,
        "beforeType":     before_result["landType"],
        "afterType":      after_result["landType"],
        "beforeRawLabel": before_result.get("rawLabel", ""),
        "afterRawLabel":  after_result.get("rawLabel",  ""),
        "beforeConf":     round(before_result["confidence"] * 100, 1),
        "afterConf":      round(after_result["confidence"]  * 100, 1),
        "changes":        changes,
        "beforeAllProbs": before_result.get("allProbs", {}),
        "afterAllProbs":  after_result.get("allProbs",  {}),
    }), 200


# ── History ───────────────────────────────────────────────────────────────────

@api_bp.route("/history", methods=["GET"])
def history():
    page = request.args.get("page", 1, type=int)
    pp   = request.args.get("per_page", 20, type=int)
    q    = ClassificationRecord.query.order_by(
               ClassificationRecord.created_at.desc()
           ).paginate(page=page, per_page=pp, error_out=False)
    return jsonify({"records": [r.to_dict() for r in q.items],
                    "total": q.total, "pages": q.pages, "page": page}), 200


@api_bp.route("/change-history", methods=["GET"])
def change_history():
    page = request.args.get("page", 1, type=int)
    pp   = request.args.get("per_page", 20, type=int)
    q    = ChangeDetectionRecord.query.order_by(
               ChangeDetectionRecord.created_at.desc()
           ).paginate(page=page, per_page=pp, error_out=False)
    return jsonify({"records": [r.to_dict() for r in q.items],
                    "total": q.total, "pages": q.pages, "page": page}), 200


# ── Copernicus / Sentinel-2 ───────────────────────────────────────────────────

@api_bp.route("/sentinel-status", methods=["GET"])
def sentinel_status():
    return jsonify({
        "configured": sentinel_utils.is_configured(),
        "error":      sentinel_utils.config_error(),
    }), 200


@api_bp.route("/sentinel-find-scenes", methods=["POST"])
def sentinel_find_scenes():
    """
    Search Copernicus CDSE for the best Sentinel-2 L2A scene in each date range,
    download its quicklook, crop around the user's location, and return both
    images as base64 JPEGs for preview + change-detection.

    Request body:
      { lat, lng, beforeStart, beforeEnd, afterStart, afterEnd, cloudCover? }

    Response:
      {
        before: { id, title, date, cloudCover, image } | null,
        after:  { id, title, date, cloudCover, image } | null,
        errors: [str, ...]
      }
    """
    if not sentinel_utils.is_configured():
        return jsonify({"error": sentinel_utils.config_error()}), 503

    data = request.get_json(silent=True) or {}
    required = ["lat", "lng", "beforeStart", "beforeEnd", "afterStart", "afterEnd"]
    missing  = [f for f in required if data.get(f) is None]
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

    try:
        lat          = float(data["lat"])
        lng          = float(data["lng"])
        before_start = str(data["beforeStart"])
        before_end   = str(data["beforeEnd"])
        after_start  = str(data["afterStart"])
        after_end    = str(data["afterEnd"])
        cloud_cover  = int(data.get("cloudCover", 40))
    except (ValueError, TypeError) as e:
        return jsonify({"error": f"Invalid parameter: {e}"}), 400

    if not (-90 <= lat <= 90) or not (-180 <= lng <= 180):
        return jsonify({"error": "Lat must be -90..90 and lng -180..180."}), 400

    try:
        result = sentinel_utils.find_scenes_for_periods(
            lat, lng,
            before_start, before_end,
            after_start,  after_end,
            cloud_cover,
        )
    except sentinel_utils.SentinelNotConfiguredError as e:
        return jsonify({"error": str(e)}), 503
    except Exception as e:
        logger.exception("sentinel-find-scenes error")
        return jsonify({"error": f"Scene search failed: {e}"}), 500

    # Optionally persist to DB (only when both scenes were found)
    if result.get("before") and result.get("after"):
        try:
            b = result["before"]
            a = result["after"]
            record = SentinelChangeRecord(
                lat          = lat,
                lng          = lng,
                before_start = before_start,
                before_end   = before_end,
                after_start  = after_start,
                after_end    = after_end,
                before_date  = b.get("date"),
                after_date   = a.get("date"),
                before_cloud = b.get("cloudCover"),
                after_cloud  = a.get("cloudCover"),
            )
            db.session.add(record)
            db.session.commit()
        except Exception:
            logger.exception("Sentinel DB write failed")
            db.session.rollback()

    return jsonify(result), 200


@api_bp.route("/sentinel-history", methods=["GET"])
def sentinel_history():
    page = request.args.get("page", 1, type=int)
    pp   = request.args.get("per_page", 20, type=int)
    q    = SentinelChangeRecord.query.order_by(
               SentinelChangeRecord.created_at.desc()
           ).paginate(page=page, per_page=pp, error_out=False)
    return jsonify({"records": [r.to_dict() for r in q.items],
                    "total": q.total, "pages": q.pages, "page": page}), 200
