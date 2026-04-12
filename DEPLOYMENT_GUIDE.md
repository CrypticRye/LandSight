# 🚀 COMPLETE DEPLOYMENT GUIDE - STEP BY STEP

**Estimated Time: 60-90 minutes**
**Last Updated: April 2026**

---

## 🎯 What You're Building

```
┌─────────────────────────────────────────────────────┐
│           YOUR DEPLOYED APPLICATION                │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Users → Vercel (Frontend)                         │
│           https://yourdomain.vercel.app            │
│           ↓ (HTTPS API calls)                      │
│           Render (Backend)                         │
│           https://yourdomain-api.onrender.com      │
│           ↓ (Database connection)                  │
│           PostgreSQL on Render                     │
│           postgres://...                           │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## ✅ PREREQUISITE CHECKLIST

- [ ] You have a GitHub account ([github.com](https://github.com))
- [ ] You have a Render account ([render.com](https://render.com))
- [ ] You have a Vercel account ([vercel.com](https://vercel.com))
- [ ] You have Git installed on Windows
- [ ] You have this folder open: `c:\Users\Acera\Documents\MLFINALAPPNATHIS`

---

## 📋 STAGE 1: LOCAL GIT SETUP (10 mins)

### Step 1.1: Open PowerShell Terminal

1. Open your project folder: `c:\Users\Acera\Documents\MLFINALAPPNATHIS`
2. Right-click in empty space → **"Open in Terminal"** or **"Open PowerShell here"**

Verify you're in the right folder:
```powershell
cd c:\Users\Acera\Documents\MLFINALAPPNATHIS
ls
```

You should see: `backend/`, `frontend/`, `.gitignore`, etc.

### Step 1.2: Configure Git (First Time Only)

Set your Git identity:
```powershell
git config --global user.name "Your Full Name"
git config --global user.email "your.email@gmail.com"
```

Replace with your actual name and email.

### Step 1.3: Initialize Git Repository

Check if git is initialized:
```powershell
git status
```

If you see "not a git repository", initialize it:
```powershell
git init
```

### Step 1.4: Stage All Files

```powershell
git add .
```

Verify files are staged:
```powershell
git status
```

Should show green files with "new file" labels.

### Step 1.5: Create Initial Commit

```powershell
git commit -m "Initial commit - LandSight ML classification app"
```

You should see:
```
[main (root-commit) abc123]
 X files changed, Y insertions(+)
```

✅ **Git is now initialized locally!**

---

## 📤 STAGE 2: PUSH TO GITHUB (10 mins)

### Step 2.1: Create GitHub Repository

1. Go to [github.com](https://github.com)
2. Sign in with your account
3. Click **"+ New"** button (top right)
4. Fill in the form:
   - **Repository name**: `landsight`
   - **Description**: `ML Land Classification with Satellite Imagery`
   - **Privacy**: Select **"PRIVATE"** ⚠️ IMPORTANT
   - Leave other options as default
5. Click **"Create repository"**

### Step 2.2: Connect Local to GitHub

You'll see instructions on GitHub. Copy and run these commands in PowerShell:

```powershell
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/landsight.git
git push -u origin main
```

⚠️ **Replace `YOUR-USERNAME`** with your actual GitHub username

**Example:**
```powershell
git remote add origin https://github.com/john-smith/landsight.git
```

### Step 2.3: Enter GitHub Authentication

If prompted for credentials:
- **Username**: Your GitHub username
- **Password**: Your GitHub personal access token (or password if enabled)

If you don't have a token, create one:
1. Go to GitHub → Settings → Developer settings → Personal access tokens
2. Generate new token with `repo` scope
3. Copy and paste it in terminal

### Step 2.4: Verify Upload

1. Refresh your GitHub repository page
2. Should see all your files: `backend/`, `frontend/`, etc.
3. Check **"Commits"** shows your initial commit

✅ **Your code is now safely on GitHub!**

---

## 🗄️ STAGE 3: CREATE DATABASE (10 mins)

### Step 3.1: Create Render Account

1. Go to [render.com](https://render.com)
2. Click **"Get started"**
3. Sign up with GitHub (easiest method)
4. Authorize Render to access GitHub
5. Verify your email

### Step 3.2: Create PostgreSQL Database

1. In Render dashboard, click **"New"** button (top left)
2. Click **"PostgreSQL"**
3. Fill in the form:
   - **Name**: `landsight-db`
   - **Database**: `land_classification`
   - **User**: `postgres`
   - **Password**: (auto-generated, copy for later)
   - **Region**: `Ohio` (free tier) or nearest to you
   - **PostgreSQL Version**: `16` (or latest)
   - **Datadog API Key**: Leave blank
4. Click **"Create Database"**

⏳ **WAIT 5-10 MINUTES** - Status will change from "Creating" → "Available"

### Step 3.3: SAVE Database Connection String

When database shows "Available":

1. Click the database name
2. Go to **"Info"** tab
3. Copy the **"External Database URL"** (looks like):
   ```
   postgresql://postgres:YOUR_PASSWORD@dpg-abc123xyz.render-instances.com:5432/land_classification
   ```
4. **PASTE THIS INTO A TEXT FILE** - you'll need it for backend!

⚠️ **KEEP THIS SECRET! Never share or commit it.**

---

## ⚙️ STAGE 4: DEPLOY BACKEND (20 mins)

### Step 4.1: Verify Backend Files

In your project, verify `backend/` folder has:
- ✅ `Procfile` (tells Render how to start Flask)
- ✅ `render-build.sh` (build script)
- ✅ `requirements.txt` (Python dependencies)
- ✅ `run.py` (main app file)
- ✅ `app/__init__.py` (Flask setup)

### Step 4.2: Prepare Render Backend Service

1. Go to [render.com](https://render.com) dashboard
2. Click **"New"** → **"Web Service"**
3. You'll see: **"Connect a repository"**
4. Click **"Connect account"** (authorize if needed)
5. Find your `landsight` repository and click it
6. If not showing, click **"Configure account"** to enable GitHub access

### Step 4.3: Configure the Service

Fill in these settings:

| Field | Value |
|-------|-------|
| **Name** | `landsight-api` |
| **Environment** | `Python 3` |
| **Region** | Same as database (Ohio) |
| **Branch** | `main` |
| **Root Directory** | `backend` ⚠️ IMPORTANT |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `gunicorn -w 4 -b 0.0.0.0:$PORT run:app` |
| **Plan** | `Free` |

Click **"Create Web Service"**

### Step 4.4: Add Environment Variables

Once service is created:

1. Scroll down to **"Environment"** section
2. Click **"Add Environment Variable"** for each:

| Key | Value | Notes |
|-----|-------|-------|
| `FLASK_ENV` | `production` | Tells Flask it's production |
| `FLASK_DEBUG` | `false` | Disables debug mode |
| `DATABASE_URL` | Paste from Step 3.3 | Your PostgreSQL connection string |
| `SECRET_KEY` | `your-secret-key-${RANDOM}` | Generate random string |
| `PORT` | `5000` | Port for Flask |

After adding each variable, click **"Save"**

### Step 4.5: Wait for Deployment

Monitor the **Logs** tab:
- Should progress: "Starting" → "Installing" → "Building" → "Live"
- Takes 3-5 minutes usually
- Check for errors in logs

### Step 4.6: Get Your Backend URL

When status shows **"Live"** (green):

1. At the top, you'll see a URL like: `https://landsight-api.onrender.com`
2. **COPY THIS URL** - you'll need it for frontend!

### Step 4.7: Test Backend Health

Open a new browser tab and go to:
```
https://YOUR-BACKEND-URL/api/health
```

Replace `YOUR-BACKEND-URL` with your actual URL.

You should see:
```json
{"status": "ok"}
```

✅ **Backend is working!**

---

## 🎨 STAGE 5: DEPLOY FRONTEND (20 mins)

### Step 5.1: Update Frontend Config

Before deploying, update your frontend to point to backend:

**File**: `frontend/.env.production`

```
VITE_API_URL=https://YOUR-BACKEND-URL/api
```

Replace with your Render URL from Step 4.6.

**Example:**
```
VITE_API_URL=https://landsight-api.onrender.com/api
```

### Step 5.2: Commit Changes to Git

```powershell
cd c:\Users\Acera\Documents\MLFINALAPPNATHIS
git add frontend/.env.production
git commit -m "Add production API URL for frontend"
git push origin main
```

Verify on GitHub that the file is updated.

### Step 5.3: Create Vercel Account

1. Go to [vercel.com](https://vercel.com)
2. Click **"Sign Up"**
3. Sign up with GitHub (easiest)
4. Authorize Vercel to access GitHub

### Step 5.4: Create Vercel Project

1. In Vercel dashboard, click **"Add New"** → **"Project"**
2. Click **"Continue with GitHub"**
3. Find your `landsight` repository
4. Click **"Import"**

### Step 5.5: Configure Project Settings

On the settings page:

| Setting | Value |
|---------|-------|
| **Project Name** | `landsight-frontend` |
| **Framework Preset** | `Vite` |
| **Root Directory** | `frontend` ⚠️ IMPORTANT |

### Step 5.6: Add Environment Variables

Before deploying:

1. Click **"Environment Variables"**
2. Add this variable:

| Name | Value |
|------|-------|
| `VITE_API_URL` | `https://YOUR-BACKEND-URL/api` |

Use your Render URL from Step 4.6.

3. Click **"Save"**

### Step 5.7: Deploy

Click **"Deploy"**

Watch the build progress:
- "Building" → "Analyzing" → "Ready" (3-5 mins)

### Step 5.8: Get Frontend URL

When deployment shows **"Ready"**:

1. Click the URL at top (looks like): `https://landsight.vercel.app`
2. Opens your live app! 🎉

---

## 🧪 STAGE 6: TESTING (15 mins)

### Test 6.1: Frontend Loads

1. Go to your Vercel URL
2. Should see home page with samples
3. No errors in browser console (F12)

### Test 6.2: Sample Images Load

1. Scroll down to "Sample Classifications"
2. Should see 5 images:
   - Urban (PNG)
   - Vegetation (PNG)
   - Water (PNG)
   - Agriculture (JPG)
   - Bare Land (JPG)
3. All images display correctly

### Test 6.3: Image Upload

1. Click "Upload Image" or use sample
2. Select a satellite image (JPG or PNG)
3. Click Classify
4. Wait 10-30 seconds

### Test 6.4: Check for Errors

1. Open Developer Tools: **F12**
2. Go to **Console** tab
3. Should see NO errors like:
   - "502 Bad Gateway"
   - "404 Not Found"
   - "CORS error"

### Test 6.5: Check Network Calls

1. Open **Network** tab in DevTools
2. Make a classification request
3. Click the `/classify` request
4. Should show:
   - Status: `200` (success)
   - Response: Classification result

---

## 📊 Success Checklist

- [ ] GitHub repository created (private)
- [ ] All code pushed to GitHub
- [ ] PostgreSQL database on Render (Available)
- [ ] Backend service on Render (Live)
- [ ] Backend `/api/health` returns `{"status":"ok"}`
- [ ] Frontend service on Vercel (Ready)
- [ ] Frontend loads without errors
- [ ] Sample images display correctly
- [ ] Can classify images successfully
- [ ] No 502/404/CORS errors

---

## 🆘 TROUBLESHOOTING

### Problem: "502 Bad Gateway"

Check these in order:

1. **Render Logs**: Dashboard → Your service → Logs tab
   - Look for error messages
   - Check for Python module import errors

2. **Environment Variables**: Dashboard → Settings → Environment
   - Verify `DATABASE_URL` is set correctly
   - Verify `SECRET_KEY` is present

3. **Rebuild Service**:
   ```
   Dashboard → Your service → Manual Deploy → Deploy latest commit
   ```

### Problem: "Can't reach frontend"

1. Check Vercel deployment status (should be "Ready")
2. Clear browser cache: **Ctrl+Shift+Delete**
3. Try incognito window

### Problem: "API calls failing"

1. Verify `VITE_API_URL` in Vercel environment matches your Render URL exactly
2. Check Vercel logs: Click your Vercel project → Deployments → Logs
3. Test health endpoint directly: `https://YOUR-BACKEND-URL/api/health`

### Problem: "Images don't load"

1. Frontend assets folder must have:
   - ✅ `Urban.png`
   - ✅ `Vegetation.png`
   - ✅ `Water.png`
   - ✅ `Agriculture.jpg`
   - ✅ `Bareland.jpg`

2. Update `frontend/src/components/SampleClassifications.jsx` to match asset filenames

---

## 📞 Quick Reference

| Component | Location | Health Check |
|-----------|----------|--------------|
| Frontend | Vercel | Visit URL in browser |
| Backend | Render | Visit `/api/health` endpoint |
| Database | Render PostgreSQL | Check Logs for "connected" |
| Git | GitHub | Repo page shows all files |

---

**🎯 You've successfully deployed your app!**

Next steps: Monitor Render logs, collect user feedback, iterate on features.

---

**Questions?** Check the console logs or Render dashboard logs for detailed error messages.
