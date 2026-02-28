from flask import Flask, request, jsonify
from flask_cors import CORS
import tensorflow as tf
import numpy as np
from PIL import Image
import io

from tensorflow.keras.applications.mobilenet_v2 import preprocess_input

app = Flask(__name__)
CORS(app)

# Load .h5 model
model = tf.keras.models.load_model("MobileNetV2_best.h5")

class_labels = [
    "AnnualCrop", "Forest", "HerbaceousVegetation",
    "Highway", "Industrial", "Pasture",
    "PermanentCrop", "Residential", "River", "SeaLake"
]

@app.route("/predict", methods=["POST"])
def predict():
    file = request.files["file"]

    img = Image.open(io.BytesIO(file.read())).convert("RGB")
    img = img.resize((224, 224))

    img_array = np.array(img)
    img_array = np.expand_dims(img_array, axis=0)
    img_array = preprocess_input(img_array)

    preds = model.predict(img_array)

    pred_index = np.argmax(preds)
    confidence = float(preds[0][pred_index])

    top_indices = preds[0].argsort()[-3:][::-1]
    top3 = [
        {
            "label": class_labels[i],
            "probability": float(preds[0][i])
        }
        for i in top_indices
    ]

    return jsonify({
        "predicted_class": class_labels[pred_index],
        "confidence": confidence,
        "top3": top3
    })

if __name__ == "__main__":
    app.run(debug=True)