# 🌍 Land Classification System

AI-Powered Image Analysis & Change Detection

---

## 📁 Project Structure

```
land-classification/
├── index.html
├── package.json
├── vite.config.js
└── src/
    ├── main.jsx                          ← App entry point
    ├── index.css                         ← Global reset
    ├── App.jsx                           ← Root component (tab router)
    ├── App.css                           ← Global styles & CSS variables
    └── components/
        ├── Header.jsx                    ← Top navigation bar
        ├── Header.css
        ├── ImageUploader.jsx             ← Reusable drag-and-drop uploader
        ├── ImageUploader.css
        ├── ClassificationResult.jsx      ← Result panel (land type + confidence)
        ├── ClassificationResult.css
        ├── SampleClassifications.jsx     ← Horizontal sample image gallery
        ├── SampleClassifications.css
        ├── LandClassification.jsx        ← Tab 1: Upload + classify single image
        ├── LandClassification.css
        ├── LandChangeDetection.jsx       ← Tab 2: Before/After comparison
        └── LandChangeDetection.css
```

---

## 🚀 Setup Instructions (VS Code)

### Prerequisites
Make sure you have these installed:
- **Node.js** (v18 or higher) → https://nodejs.org
- **VS Code** → https://code.visualstudio.com

### Step 1 — Open the project in VS Code
1. Extract the downloaded ZIP file
2. Open VS Code
3. Go to **File → Open Folder**
4. Select the `land-classification` folder

### Step 2 — Open the Terminal in VS Code
Press `` Ctrl + ` `` (backtick) or go to **Terminal → New Terminal**

### Step 3 — Install dependencies
In the terminal, run:
```bash
npm install
```
This installs React, Vite, and all required packages.

### Step 4 — Start the development server
```bash
npm run dev
```

### Step 5 — Open in browser
You'll see something like:
```
  VITE v5.x  ready in 300ms
  ➜  Local:   http://localhost:5173/
```
Open **http://localhost:5173** in your browser — done! 🎉

---

## 🔧 Recommended VS Code Extensions
Install these for the best experience:
- **ES7+ React/Redux/React-Native snippets** (dsznajder)
- **Prettier - Code formatter** (esbenp)
- **vscode-css-modules** (clinyong)

---

## 🧩 Component Overview

| Component | Purpose |
|-----------|---------|
| `App.jsx` | Root component, manages active tab state |
| `Header.jsx` | Logo + tab navigation |
| `ImageUploader.jsx` | Drag-and-drop / file select, shows preview |
| `ClassificationResult.jsx` | Displays land type, confidence bar, feature tags |
| `SampleClassifications.jsx` | Horizontal scrollable gallery of sample images |
| `LandClassification.jsx` | Page for Tab 1 — single image classification |
| `LandChangeDetection.jsx` | Page for Tab 2 — before/after change detection |

---

## 🛠️ Build for Production
```bash
npm run build
```
Output goes to `dist/` folder — ready to deploy.
