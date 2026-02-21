# Land Classification Mini Web Application

## Overview

This project is a **mini web application** for **land use and land cover (LULC) classification** using RGB satellite images. The system is designed as a **full-stack application** with a Flask backend handling the machine learning model and a React frontend for user interaction.

Even without a trained model initially, the app supports **image uploads, dummy predictions, and frontend-backend integration**, making it ready for model integration later.

---

## Features

### Backend
- Flask API for image upload and classification
- Modular Python structure:
  - `app/` — Flask app and API routes
  - `utils/` — Preprocessing and prediction scripts
  - `models/` — Store trained CNN models
  - `uploads/` — Temporary storage for uploaded images
- Dummy predictions for testing without a trained model
- CORS enabled for React frontend

### Frontend
- React + Vite application
- Upload images and receive predictions
- Display prediction results including class and confidence
- Preview uploaded images
- Responsive and user-friendly interface

---

## Folder Structure


Backend/
├─ app/
│ ├─ init.py
│ ├─ routes.py
│ └─ utils/
│ ├─ init.py
│ ├─ preprocess.py
│ └─ inference.py
├─ models/ # Store CNN models
├─ uploads/ # Temporary uploaded images
├─ notebooks/ # For model experimentation
├─ tests/ # Unit tests for backend
├─ run.py # Flask entry point
├─ requirements.txt
└─ venv/ # Python virtual environment (ignored in GitHub)

Frontend/
├─ src/
│ ├─ components/
│ │ └─ UploadPredict.jsx
│ ├─ App.jsx
│ └─ main.jsx
├─ package.json
└─ vite.config.js


---

## Installation & Setup

### Backend
1. Create a virtual environment:
   ```bash
   python -m venv venv

Activate the virtual environment:

Windows:

venv\Scripts\activate

Mac/Linux:

source venv/bin/activate

Install dependencies:

pip install -r requirements.txt

Run the Flask server:

python run.py

The API will be available at http://127.0.0.1:5000/.

Frontend

Navigate to the frontend folder:

cd frontend

Install dependencies:

npm install

Run the React development server:

npm run dev

Open the app in your browser at http://localhost:5173.

Usage

Open the frontend app in the browser.

Upload an RGB satellite image using the upload button.

Click Upload & Predict.

View the prediction results (dummy or real once a model is integrated).

Optional: preview the uploaded image and visualize a color-coded map.

Future Work

Integrate a trained CNN model (MobileNetV2 or ResNet50) for real predictions.

Add temporal change detection to compare multi-date images.

Generate land distribution statistics and color-coded output maps.

Deploy the app for online access.

Contributing

Create a new branch for your feature:

git checkout -b feature/<feature-name>

Commit changes and push to GitHub:

git add .
git commit -m "Add feature: <feature-name>"
git push origin feature/<feature-name>

Open a Pull Request to merge into the main branch.

License

This project is for academic purposes and demo usage. Modify and use it as needed for your research or studies.