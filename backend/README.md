# Land Classification — Frontend Changes

## New files added to `src/`
```
src/
├── utils/
│   ├── api.js          # All fetch calls to Flask backend
│   └── pdf.js          # PDF export (print window)
├── hooks/
│   └── useTheme.js     # Dark/light theme toggle
└── components/
    ├── Toast.jsx/.css         # Toast notification system
    ├── ProgressBar.jsx/.css   # Upload/compress progress bar
    ├── ImageUploader.jsx      # ← REPLACE existing file
    ├── ClassificationResult.jsx  ← REPLACE
    ├── LandClassification.jsx    ← REPLACE
    ├── LandChangeDetection.jsx   ← REPLACE
    ├── Header.jsx                ← REPLACE
    └── Header.css               ← REPLACE (append included)
```

## `.env` for frontend
```
VITE_API_URL=http://localhost:5000/api
```

## What changed
- `ImageUploader` — validates file type/size, compresses to max 1200px JPEG,
  converts to base64, shows progress bar
- `LandClassification` — calls `POST /api/classify`, shows real model output
  including all 10 class probabilities and satellite warning
- `LandChangeDetection` — calls `POST /api/change-detection`, shows real
  before/after types, confidence scores, and derived change bars
- `ClassificationResult` — Export PDF button, satellite warning banner,
  all-class probability bars
- `Header` — theme switcher (dark ↔ light)
- `App` — ToastContainer, useTheme wired up
