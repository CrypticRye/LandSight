# 🚀 Complete Deployment Guide for LandSight

A complete, beginner-friendly guide to deploy your Flask + React app online for testing.

---

## 📋 Table of Contents
1. [What You'll Deploy](#what-youll-deploy)
2. [Architecture Overview](#architecture-overview)
3. [Deployment Steps](#deployment-steps)
4. [Common Errors & Fixes](#common-errors--fixes)
5. [Testing Your Deployment](#testing-your-deployment)

---

## What You'll Deploy

Your app has **3 main parts** that need to go live:

| Part | Current Location | Will Deploy To |
|------|------------------|-----------------|
| **Backend (Flask)** | `localhost:5000` | Render.com |
| **Frontend (React)** | `localhost:5173` | Vercel.com |
| **Database (PostgreSQL)** | Your computer | Render's managed database |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     DEPLOYED SETUP                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Your Browser                                               │
│      ↓                                                       │
│  Frontend (Vercel)                                          │
│  https://yourapp-frontend.vercel.app                        │
│      ↓ (API calls with https)                              │
│  Backend (Render)                                           │
│  https://yourapp-backend.onrender.com/api                   │
│      ↓ (connects via DATABASE_URL)                          │
│  PostgreSQL Database (Render)                               │
│  postgres://...                                             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Deployment Steps

### ⚠️ IMPORTANT: Before Starting
Make sure your code is in a **Git repository** and pushed to GitHub. Both Render and Vercel deploy FROM GitHub.

```bash
# Check if you have git initialized
cd c:\Users\Acera\Documents\MLFINALAPPNATHIS
git status

# If not initialized:
git init
git add .
git commit -m "Initial commit"
# Then push to GitHub (you need a GitHub account)
```

---

## PHASE 1: Database Setup

### Step 1.1: Create a Free PostgreSQL Database on Render

1. Go to **[render.com](https://render.com)** and sign up (FREE)
2. Click **"New +"** → **"PostgreSQL"**
3. Fill in:
   - **Name**: `land-classification-db`
   - **Database**: `land_classification`
   - **User**: `postgres` (default)
   - **Region**: Choose closest to you (or `Ohio` for free tier)
   - **PostgreSQL Version**: `16` (or latest)
4. Click **"Create Database"**
5. **Wait 5-10 minutes** for it to set up
6. Copy the **External Database URL** (looks like: `postgresql://user:pass@host:port/dbname`)
   - **Save this somewhere safe!**

---

## PHASE 2: Backend Deployment (Flask on Render)

### Step 2.1: Prepare Your Backend

First, update your backend files:

#### A. Create a `.gitignore` in backend folder (if not exists)

```bash
# File: backend/.gitignore
.env
.DS_Store
__pycache__/
*.pyc
env/
venv/
*.egg-info/
.pytest_cache/
node_modules/
dist/
```

#### B. Create `.env.production` (for Render)

```bash
# File: backend/.env.production
DATABASE_URL=postgresql://postgres:PASSWORD@HOST:5432/land_classification
FLASK_DEBUG=false
PORT=5000
SECRET_KEY=your-super-secret-random-key-change-this-in-production

COPERNICUS_USER=your_email@example.com
COPERNICUS_PASS=your_password
```

**Replace:**
- `PASSWORD` with your Render database password
- `HOST` with your Render database host (from the URL you copied)
- `SECRET_KEY` with something random (use a password generator)
- `COPERNICUS_USER` and `COPERNICUS_PASS` with your actual credentials

#### C. Update `backend/requirements.txt` (ensure it has all needed packages)

Check requirements include (they seem to already):
```
flask
flask-cors
flask-sqlalchemy
flask-migrate
psycopg2-binary
python-dotenv
gunicorn
pillow
numpy
tensorflow
```

If TensorFlow is too large and causes deployment issues, try `tensorflow-cpu` instead.

#### D. Create `backend/render-build.sh`

```bash
#!/usr/bin/env bash
# File: backend/render-build.sh

set -o errexit

pip install -r requirements.txt

# Run database migrations (if you have any)
# flask db upgrade

echo "Build complete!"
```

Make it executable (on your computer):
```bash
chmod +x backend/render-build.sh
```

#### E. Create `backend/Procfile`

```
# File: backend/Procfile
web: gunicorn -w 4 -b 0.0.0.0:$PORT run:app
```

This tells Render how to start your Flask app.

### Step 2.2: Deploy Backend to Render

1. Go to **[render.com/dashboard](https://render.com/dashboard)** (logged in)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository:
   - Click **"Connect repository"**
   - Select your `MLFINALAPPNATHIS` repo
4. Fill in the form:
   ```
   Name: landsight-backend
   Root Directory: backend
   Runtime: Python 3
   Build Command: ./render-build.sh
   Start Command: gunicorn -w 4 -b 0.0.0.0:$PORT run:app
   ```
5. Scroll down to **"Environment"**:
   - Add each variable from your `.env.production`:
   ```
   KEY                VALUE
   DATABASE_URL       postgresql://...
   FLASK_DEBUG        false
   PORT               5000
   SECRET_KEY         your-random-key
   COPERNICUS_USER    your_email@example.com
   COPERNICUS_PASS    your_password
   ```
6. Click **"Create Web Service"**
7. **Wait 10-15 minutes** for deployment
   - You should see a green checkmark when done
   - Your backend URL will be like: `https://landsight-backend.onrender.com`

**Test:** Open your browser and go to:
```
https://landsight-backend.onrender.com/api/health
```
You should see: `{"status":"ok"}`

---

## PHASE 3: Frontend Deployment (React on Vercel)

### Step 3.1: Prepare Your Frontend

#### A. Create `frontend/.env.production`

```bash
# File: frontend/.env.production
VITE_API_URL=https://landsight-backend.onrender.com/api
```

**Replace `landsight-backend` with YOUR actual backend URL from Render**

#### B. Update `frontend/vite.config.js` (if needed)

Check it looks like this:
```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
})
```

### Step 3.2: Deploy Frontend to Vercel

1. Go to **[vercel.com](https://vercel.com)** and sign up (FREE)
2. Click **"Add New"** → **"Project"**
3. **Import Git Repository**:
   - Select your `MLFINALAPPNATHIS` repo from GitHub
4. Fill in project settings:
   ```
   Project Name: landsight-frontend
   Framework: Vite
   Root Directory: ./frontend
   Build Command: npm run build
   Output Directory: dist
   ```
5. Click **"Environment Variables"** and add:
   ```
   KEY               VALUE
   VITE_API_URL      https://landsight-backend.onrender.com/api
   ```
6. Click **"Deploy"**
7. **Wait 5 minutes** for build and deployment
   - Your frontend URL will be like: `https://landsight-frontend.vercel.app`

---

## PHASE 4: Fix CORS Issues (if they appear)

### What is CORS?
Your browser blocks requests from frontend URL to backend URL unless the backend explicitly allows it. Your Flask app already has this configured!

**Status:** ✅ Already configured in `backend/app/__init__.py`:
```python
CORS(app, resources={r"/api/*": {"origins": "*"}})
```

This means: **"Allow all origins to call /api/* endpoints"** (safe for testing)

If you get CORS errors after deployment:
1. Open backend console on Render (dashboard → click your service → logs)
2. Look for errors about CORS
3. If changed, update `CORS` line in `app/__init__.py`:
   ```python
   # More secure (only allow your frontend)
   CORS(app, resources={
       r"/api/*": {
           "origins": ["https://landsight-frontend.vercel.app"]
       }
   })
   ```
4. Commit and push changes (Render auto-redeploys)

---

## Common Errors & Fixes

### ❌ Error: "Backend returns 502 Bad Gateway"
**Cause:** Backend service not running or crashed
**Fix:**
1. Go to Render dashboard → Your backend service
2. Click "Logs" tab
3. Look for error messages
4. Common issues:
   - Database URL wrong → double-check DATABASE_URL
   - TensorFlow not installed → check build logs
   - Missing environment variables → add them in Render dashboard

### ❌ Error: "Frontend shows blank page or 404"
**Cause:** Build failed or wrong root directory
**Fix:**
1. Go to Vercel dashboard → Your project → Deployments
2. Click latest deployment → see error logs
3. Common issues:
   - Root directory is wrong (should be `./frontend`)
   - Missing dependencies → check `package.json`

### ❌ Error: "API calls from frontend fail / 'Cannot POST /api/classify'"
**Cause:** Frontend still pointing to localhost
**Fix:**
1. Check `frontend/.env.production` has correct backend URL
2. In Vercel dashboard → go to your project → Settings → Environment Variables
3. Verify `VITE_API_URL=https://landsight-backend.onrender.com/api`
4. Redeploy: click "Deployments" → "..." menu on latest → "Redeploy"

### ❌ Error: "Database connection fails"
**Cause:** DATABASE_URL wrong or database not ready
**Fix:**
1. Copy DATABASE_URL from Render database dashboard again
2. Make sure all special characters (like `@`, `:`) are correct
3. Wait 2 minutes and try again
4. Check database exists: go to Render → click database → check it's "Available"

### ❌ Error: "Model files not found" or "TensorFlow errors"
**Cause:** Model files from `backend/models/` not included in deployment
**Fix:**
Create `backend/.gitignore` should NOT include `models/` folder:
```bash
# DO include these in deployment:
models/
datasets/  # or exclude if too large

# DO NOT include:
.env
__pycache__/
*.pyc
```

Or, manually upload model files to Render using SFTP (advanced).

---

## Testing Your Deployment

### ✅ Step 1: Test Backend is Running

Open in your browser:
```
https://landsight-backend.onrender.com/api/health
```

Expected response:
```json
{"status":"ok"}
```

### ✅ Step 2: Test Frontend is Loading

Open in your browser:
```
https://landsight-frontend.vercel.app
```

You should see your app homepage.

### ✅ Step 3: Test Frontend → Backend Connection

1. Open your frontend in browser
2. Open **Developer Console** (press `F12` or `Ctrl+Shift+I`)
3. Go to **"Network"** tab
4. Try to use your app (upload an image, run classification, etc.)
5. You should see API calls to your backend URL (no errors)

If you see **red 404 or 502 errors**:
- Check backend URL is correct in `.env.production`
- Check backend is running on Render (green status)
- Check CORS is enabled

### ✅ Step 4: Test Image Upload & Processing

1. Go to frontend app
2. Upload an image
3. Click "Classify"
4. Watch the **Network** tab in Developer Console
5. You should see:
   - POST to `/api/classify` → returns 200 OK with results

### ✅ Step 5: Test with Others

Share your Vercel URL with friends:
```
https://landsight-frontend.vercel.app
```

They should be able to:
- Load the page
- Upload images
- Run classifications
- See results

---

## What's Next?

### After Initial Deployment:
1. **Test thoroughly** - try all features
2. **Collect feedback** from testers
3. **Fix bugs** and re-deploy (just `git push` and Render/Vercel auto-redeploy)
4. **Add monitoring** - Render/Vercel have free monitoring dashboards

### To Make Changes:
```bash
cd c:\Users\Acera\Documents\MLFINALAPPNATHIS

# Make your code changes
# Then:
git add .
git commit -m "Description of changes"
git push origin main

# Render and Vercel automatically redeploy!
# Check status on their dashboards
```

### If Database Gets Full:
1. Go to Render → Database → "Connection" tab
2. You get 10GB storage free (usually more than enough)
3. If needed, request more through Render dashboard

---

## Checklist Before Going Live

- [ ] Backend variables set in Render dashboard
- [ ] Database URL verified
- [ ] Frontend .env.production has correct backend URL
- [ ] Backend health check works (returns `{"status":"ok"}`)
- [ ] Frontend loads and shows UI
- [ ] Can upload and classify images
- [ ] No CORS errors in browser console
- [ ] Works on different browsers (Chrome, Firefox, Safari)
- [ ] Share URL with test users

---

## Quick Reference: Your Deployment URLs

After deployment, you'll have URLs like:

```
Frontend: https://landsight-frontend.vercel.app
Backend:  https://landsight-backend.onrender.com
Database: postgresql://...@...render.com:5432/land_classification
```

---

## Need Help?

If something fails:
1. **Check the logs** (Render/Vercel dashboards show real error messages)
2. **Google the error message** (add "Render" or "Vercel" to search)
3. **Ask in Render/Vercel Discord** (they have active communities)
4. **Test locally first** (make sure it works on `localhost` before deploying)

---

Good luck! 🚀
