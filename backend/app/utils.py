"""
Preprocessing, model loading, satellite detection, and helper functions.
Supports the 5-class ResNet50 model trained on EuroSAT + UC Merced + RESISC45.

IMPORTANT — TF class index order (alphabetical by folder name):
  Index 0 → Agriculture
  Index 1 → Bareland
  Index 2 → Urban
  Index 3 → Vegetation
  Index 4 → Water
"""
import io
import base64
import logging
import numpy as np
from PIL import Image

logger = logging.getLogger(__name__)

# ── 5-Class Labels in TF alphabetical order ───────────────────────────────────
# tf.keras.utils.image_dataset_from_directory assigns indices alphabetically.
# This list MUST match that order exactly.
CLASS_LABELS = [
    "Agriculture",  # index 0
    "Bareland",     # index 1
    "Urban",        # index 2
    "Vegetation",   # index 3
    "Water",        # index 4
]

DISPLAY_NAMES = {
    "Urban":       "Urban Area",
    "Vegetation":  "Vegetation",
    "Water":       "Water Body",
    "Agriculture": "Agricultural Land",
    "Bareland":    "Bare Land",
}

# broadLabel == rawLabel — model directly outputs the 5 broad classes.

BROAD_DESCRIPTIONS = {
    "Urban":       "Built-up areas dominated by impervious surfaces, structures, and "
                   "infrastructure. Includes residential neighbourhoods, industrial zones, and roads.",
    "Vegetation":  "Natural or semi-natural land covered by trees, shrubs, or low "
                   "herbaceous plants. Includes forests and meadows with minimal human disturbance.",
    "Water":       "Surface water bodies — rivers, streams, lakes, reservoirs, or coastal areas. "
                   "Characterised by a high near-infrared absorption signature.",
    "Agriculture": "Land actively used for crop cultivation, livestock grazing, or "
                   "other agricultural purposes. Includes annual and permanent cropland and pasture.",
    "Bareland":    "Exposed soil, sand, rock, or desert terrain with little to no vegetation cover. "
                   "Characterised by low NDVI and high soil brightness index.",
}

CLASS_FEATURES = {
    "Urban":       ["Building Clusters", "Road Grid", "Impervious Surface", "Infrastructure"],
    "Vegetation":  ["Dense Canopy", "Ground Cover", "High Biomass", "Mixed Species"],
    "Water":       ["Open Water", "Reflective Surface", "Aquatic Habitat", "Low Turbidity"],
    "Agriculture": ["Row Patterns", "Crop Fields", "Tilled Soil", "Pastoral Use"],
    "Bareland":    ["Exposed Soil", "Low NDVI", "Sand / Rock", "Desert Terrain"],
}

CLASS_DESCRIPTIONS = {
    "Urban":       "Built-up area containing buildings, roads, and other human-made structures. "
                   "Characterised by dense impervious surfaces, a visible road network, and mixed "
                   "residential, commercial, or industrial land use.",
    "Vegetation":  "Natural or managed land covered by trees, shrubs, grasses, or other "
                   "herbaceous plants. Includes forests, meadows, and transitional green zones "
                   "with minimal urbanisation or agricultural modification.",
    "Water":       "Open surface water body — river, stream, lake, reservoir, or coastal area. "
                   "Typically shows a dark, uniform spectral signature with low near-infrared "
                   "reflectance and a high NDWI index.",
    "Agriculture": "Land under active agricultural use, including cropland (annual or permanent), "
                   "orchards, vineyards, and managed pastures. Row patterns, seasonal colour "
                   "change, and tilled soil texture are key visual indicators.",
    "Bareland":    "Exposed terrain with very little to no vegetation — including bare soil, "
                   "sand, gravel, rock outcrops, and desert areas. Low chlorophyll content "
                   "produces a distinctive bright, low-NDVI spectral response.",
}

_model = None


def load_model():
    global _model
    if _model is not None:
        return _model
    try:
        import tensorflow as tf
        import os
        model_path = os.path.join(
            os.path.dirname(__file__), "..", "models", "best_model_resnet50_final1.keras"
        )
        model_path = os.path.abspath(model_path)
        logger.info(f"Loading model from {model_path}")
        _model = tf.keras.models.load_model(model_path)
        logger.info("Model loaded successfully.")
    except Exception as e:
        logger.error(f"Model load failed: {e}")
        _model = None
    return _model


def decode_base64_image(b64_string: str) -> Image.Image:
    """Accept data-URI or raw base64 and return a PIL Image."""
    if "," in b64_string:
        b64_string = b64_string.split(",", 1)[1]
    img_bytes = base64.b64decode(b64_string)
    return Image.open(io.BytesIO(img_bytes)).convert("RGB")


def preprocess_for_resnet(pil_img: Image.Image) -> np.ndarray:
    """Resize -> array -> ResNet50 preprocess_input."""
    from tensorflow.keras.applications.resnet50 import preprocess_input
    img = pil_img.resize((224, 224), Image.LANCZOS)
    arr = np.array(img, dtype=np.float32)
    arr = np.expand_dims(arr, axis=0)
    return preprocess_input(arr)


def compress_image_base64(pil_img: Image.Image, max_dim: int = 512, quality: int = 75) -> str:
    """Return a compressed JPEG as base64 data-URI for storage."""
    img = pil_img.copy()
    img.thumbnail((max_dim, max_dim), Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=quality)
    b64 = base64.b64encode(buf.getvalue()).decode()
    return f"data:image/jpeg;base64,{b64}"


def is_satellite_image(pil_img: Image.Image) -> dict:
    import colorsys

    w, h = pil_img.size
    aspect = min(w, h) / max(w, h)          # 1.0 = perfect square

    img_small = pil_img.resize((64, 64))
    pixels = np.array(img_small).reshape(-1, 3) / 255.0
    saturations = []
    for r, g, b in pixels:
        _, s, _ = colorsys.rgb_to_hsv(r, g, b)
        saturations.append(s)
    sat_mean = float(np.mean(saturations))
    sat_std  = float(np.std(saturations))

    score = 0.0
    reasons = []

    if aspect > 0.85:
        score += 0.35
    else:
        reasons.append("non-square aspect ratio")

    if sat_mean < 0.45:
        score += 0.35
    else:
        reasons.append("high colour saturation (may not be satellite)")

    if sat_std < 0.20:
        score += 0.30
    else:
        reasons.append("high colour variance")

    is_sat = score >= 0.55
    reason = (
        "Image appears to be a valid satellite/aerial patch."
        if is_sat
        else f"Image may NOT be a satellite image: {'; '.join(reasons)}."
    )

    return {"isSatellite": is_sat, "reason": reason, "score": round(score, 3)}


def _is_blue_dominant(pil_img: Image.Image) -> tuple:
    """
    Check whether the image is dominated by blue/cyan tones.

    Used as a post-processing heuristic to recover Water predictions that the
    model misclassifies as Vegetation on Google Maps tiles, where water is
    rendered as bright cartographic blue rather than the dark satellite signature
    the model was trained on.

    Returns (is_blue: bool, blue_ratio: float).
    """
    img_small = pil_img.resize((64, 64))
    arr = np.array(img_small, dtype=np.float32)      # (64, 64, 3)
    r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]

    # A pixel is "blue-dominant" when B significantly exceeds R and G and is bright
    blue_mask  = (b > r + 20) & (b > g + 10) & (b > 80)
    blue_ratio = float(blue_mask.mean())
    return blue_ratio > 0.35, round(blue_ratio, 3)


def classify_image(pil_img: Image.Image) -> dict:
    """
    Classify a satellite/aerial image using the 5-class ResNet50 model.

    TF assigns class indices alphabetically by folder name at training time:
      Index 0 -> Agriculture
      Index 1 -> Bareland
      Index 2 -> Urban
      Index 3 -> Vegetation
      Index 4 -> Water

    A Water rescue heuristic compensates for the model's low Water recall on
    Google Maps imagery (bright blue cartographic tiles vs dark satellite water).
    The heuristic triggers when:
      - The top prediction is Vegetation with confidence < 80%, AND
      - The image has >35% blue-dominant pixels.
    """
    model = load_model()
    if model is None:
        return {
            "error": "Model not loaded. Ensure best_model_resnet50_final1.keras is in backend/models/.",
            "landType": "Unavailable",
            "broadLabel": "Unknown",
            "confidence": 0,
            "features": [],
            "allProbs": {},
        }

    arr   = preprocess_for_resnet(pil_img)
    preds = model.predict(arr, verbose=0)[0]      # shape (5,)

    # TF alphabetical index constants
    WATER_IDX      = 4
    VEGETATION_IDX = 3

    top_idx  = int(np.argmax(preds))
    top_conf = float(preds[top_idx])

    # ── Water rescue heuristic ─────────────────────────────────────────────────
    water_rescued = False
    rescue_note   = ""

    if top_idx == VEGETATION_IDX and top_conf < 0.80:
        is_blue, blue_ratio = _is_blue_dominant(pil_img)
        if is_blue:
            top_idx       = WATER_IDX
            top_conf      = float(preds[WATER_IDX])
            water_rescued = True
            rescue_note   = (
                f"Blue-dominance heuristic applied (blue_ratio={blue_ratio}). "
                f"Vegetation confidence was {preds[VEGETATION_IDX]*100:.1f}%, "
                f"Water score: {preds[WATER_IDX]*100:.1f}%."
            )

    if not water_rescued and top_idx == VEGETATION_IDX and preds[WATER_IDX] > 0.15:
        is_blue, blue_ratio = _is_blue_dominant(pil_img)
        if is_blue:
            top_idx       = WATER_IDX
            top_conf      = float(preds[WATER_IDX])
            water_rescued = True
            rescue_note   = (
                f"Water threshold rescue (score={preds[WATER_IDX]*100:.1f}%, "
                f"blue_ratio={blue_ratio})."
            )
    # ──────────────────────────────────────────────────────────────────────────

    top_label   = CLASS_LABELS[top_idx]
    broad_label = top_label

    all_probs = {
        DISPLAY_NAMES.get(CLASS_LABELS[i], CLASS_LABELS[i]): round(float(preds[i]) * 100, 2)
        for i in range(len(CLASS_LABELS))
    }

    result = {
        "landType":         DISPLAY_NAMES.get(top_label, top_label),
        "rawLabel":         top_label,
        "broadLabel":       broad_label,
        "broadDescription": BROAD_DESCRIPTIONS.get(broad_label, ""),
        "confidence":       top_conf,
        "description":      CLASS_DESCRIPTIONS.get(top_label, ""),
        "features":         CLASS_FEATURES.get(top_label, []),
        "allProbs":         all_probs,
    }
    if water_rescued:
        result["rescueNote"] = rescue_note
    return result


def compute_change_detection(before_result: dict, after_result: dict) -> list:
    """
    Compare two classification results using the 5-class direct taxonomy:
      Agriculture, Bareland, Urban, Vegetation, Water.

    Since the model outputs the broad class directly, transitions are detected
    by comparing rawLabel values. Confidence scores measure certainty.
    """
    CHANGE_COLORS = {
        "Vegetation Loss":       "#e74c3c",
        "Vegetation Gain":       "#27ae60",
        "Urban Expansion":       "#e67e22",
        "Urban to Natural":      "#27ae60",
        "Agricultural Change":   "#f39c12",
        "Water Body Change":     "#3498db",
        "Land Degradation":      "#c0392b",
        "Land Recovery":         "#00b894",
        "Stable Cover":          "#2ecc71",
        "Land Cover Transition": "#9b59b6",
    }

    before_broad = before_result.get("broadLabel") or before_result.get("rawLabel", "Unknown")
    after_broad  = after_result.get("broadLabel")  or after_result.get("rawLabel",  "Unknown")
    before_conf  = before_result.get("confidence", 0)
    after_conf   = after_result.get("confidence",  0)

    certainty = round((before_conf + after_conf) / 2 * 100, 1)
    changes   = []

    if before_broad == after_broad:
        stable_pct = round(certainty)
        changes.append({"label": "Stable Cover",            "percent": stable_pct, "color": CHANGE_COLORS["Stable Cover"]})
        before_fine = before_result.get("rawLabel", "")
        after_fine  = after_result.get("rawLabel",  "")
        if before_fine != after_fine:
            intra = max(0, round(100 - stable_pct, 1))
            if intra > 0:
                changes.append({"label": "Land Cover Transition", "percent": intra, "color": CHANGE_COLORS["Land Cover Transition"]})
    else:
        change_pct = round(after_conf * 100, 1)
        stable_pct = max(0, round(100 - change_pct, 1))

        if before_broad == "Vegetation" and after_broad == "Urban":
            changes.append({"label": "Vegetation Loss",    "percent": change_pct, "color": CHANGE_COLORS["Vegetation Loss"]})
            changes.append({"label": "Urban Expansion",    "percent": change_pct, "color": CHANGE_COLORS["Urban Expansion"]})
        elif before_broad == "Agriculture" and after_broad == "Urban":
            changes.append({"label": "Urban Expansion",    "percent": change_pct, "color": CHANGE_COLORS["Urban Expansion"]})
            changes.append({"label": "Agricultural Change","percent": change_pct, "color": CHANGE_COLORS["Agricultural Change"]})
        elif before_broad == "Urban" and after_broad in ("Vegetation", "Agriculture"):
            changes.append({"label": "Urban to Natural",   "percent": change_pct, "color": CHANGE_COLORS["Urban to Natural"]})
        elif before_broad == "Vegetation" and after_broad == "Agriculture":
            changes.append({"label": "Agricultural Change","percent": change_pct, "color": CHANGE_COLORS["Agricultural Change"]})
            changes.append({"label": "Vegetation Loss",    "percent": change_pct, "color": CHANGE_COLORS["Vegetation Loss"]})
        elif after_broad == "Vegetation" and before_broad != "Vegetation":
            changes.append({"label": "Vegetation Gain",    "percent": change_pct, "color": CHANGE_COLORS["Vegetation Gain"]})
        elif "Water" in (before_broad, after_broad):
            changes.append({"label": "Water Body Change",  "percent": change_pct, "color": CHANGE_COLORS["Water Body Change"]})
        elif after_broad == "Bareland":
            changes.append({"label": "Land Degradation",   "percent": change_pct, "color": CHANGE_COLORS["Land Degradation"]})
        elif before_broad == "Bareland":
            changes.append({"label": "Land Recovery",      "percent": change_pct, "color": CHANGE_COLORS["Land Recovery"]})
        else:
            changes.append({"label": "Land Cover Transition", "percent": change_pct, "color": CHANGE_COLORS["Land Cover Transition"]})

        if stable_pct > 0:
            changes.append({"label": "Stable Cover", "percent": stable_pct, "color": CHANGE_COLORS["Stable Cover"]})

    changes.sort(key=lambda x: x["percent"], reverse=True)
    seen, unique = set(), []
    for c in changes:
        if c["label"] not in seen:
            seen.add(c["label"])
            unique.append(c)
    return unique[:6]
