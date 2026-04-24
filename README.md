# Land Classification Application — Setup Guide

## 🚀 After `git pull`

Follow these steps to set up the complete application (frontend + backend).

### Prerequisites
- Python 3.8+ 
- Node.js 16+
- Git

---

## Backend Setup

### 1. Create Python Virtual Environment

```bash
cd backend
python -m venv venv
```

**Activate the virtual environment:**

**Windows (PowerShell):**
```powershell
.\venv\Scripts\Activate.ps1
```

**Windows (Command Prompt):**
```cmd
venv\Scripts\activate
```

**macOS/Linux:**
```bash
source venv/bin/activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

Dependencies include:
- Flask, Flask-CORS, Flask-SQLAlchemy
- TensorFlow 2.13.0 & NumPy 1.24.3
- Pillow, Python-dotenv, Gunicorn

### 3. Set Up Environment Variables

Copy the example env file:
```bash
cp env.example .env
```

Edit `.env` and add necessary configuration (database URL, API keys, etc.)

### 4. Initialize Database (if needed)

```bash
python create_db.py
```

### 5. Run Backend Server

```bash
python run.py
```

Backend will run on `http://localhost:5000`

---

## Frontend Setup

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Set Up Environment Variables

Create a `.env` file in the `frontend/` directory:
```
VITE_API_URL=http://localhost:5000/api
```

### 3. Run Development Server

```bash
npm run dev
```

Frontend will run on `http://localhost:5173` (or next available port)

---

## Running Both Simultaneously

**Option 1: Two Terminal Tabs**
- Tab 1: `cd backend && python run.py`
- Tab 2: `cd frontend && npm run dev`

**Option 2: Single Terminal (from root)**
```bash
# Terminal 1
cd backend && python run.py

# Terminal 2 (new terminal)
cd frontend && npm run dev
```

---

## 📋 Checklist

After `git pull`, do this:
- [ ] Backend: Create virtual environment
- [ ] Backend: Activate venv
- [ ] Backend: `pip install -r requirements.txt`
- [ ] Backend: Set up `.env` file
- [ ] Backend: `python create_db.py` (if needed)
- [ ] Frontend: `npm install`
- [ ] Frontend: Create `.env` with API URL
- [ ] Run both servers
- [ ] Open `http://localhost:5173` in browser

---

## Features

- **Land Classification**: Upload satellite images for automatic land use classification
- **Change Detection**: Compare before/after images to detect land use changes
- **Dark/Light Theme**: Toggle UI theme
- **PDF Export**: Export classification results as PDF
- **Real-time Progress**: Upload progress tracking and compression status

---

## Troubleshooting

**Port Already in Use:**
- Backend: Change port in `run.py`
- Frontend: Vite will auto-increment to next available port

**Module Not Found:**
- Ensure virtual environment is activated
- Reinstall: `pip install -r requirements.txt`

**API Connection Issues:**
- Verify `VITE_API_URL` matches backend URL in frontend `.env`
- Check backend is running: `http://localhost:5000`
