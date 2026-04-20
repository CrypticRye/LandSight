# 🚀 COMPLETE DEPLOYMENT - ALL STAGES (STEP BY STEP)

**Total Time: 60-90 minutes**
**✅ Stage 1 & 2 COMPLETE - Code is on GitHub!**

---

## 📊 Deployment Pipeline

```
Stage 1 ✅ Git Setup
   ↓
Stage 2 ✅ Push to GitHub
   ↓
Stage 3 → Create Database (Render) ← YOU ARE HERE
   ↓
Stage 4 → Deploy Backend (Render)
   ↓
Stage 5 → Deploy Frontend (Vercel)
   ↓
Stage 6 → Full Testing
   ↓
🎉 LIVE!
```

---

---

# 🗄️ STAGE 3: CREATE POSTGRESQL DATABASE (10 mins)

## 3.1: Go to Render

1. Open [render.com](https://render.com) in your browser
2. Log in to your Render account (create if needed - FREE tier available)

## 3.2: Create New PostgreSQL Database

1. Click **"New"** button (top left)
2. Click **"PostgreSQL"**

You should see a form. Fill it out:

| Field | Value | Notes |
|-------|-------|-------|
| **Name** | `landsight-db` | Identifier in Render dashboard |
| **Database** | `land_classification` | Actual database name |
| **User** | `postgres` | Default user |
| **Password** | (auto-generated) | **COPY THIS** - you'll need it |
| **Region** | `Ohio` | Free tier or nearest to you |
| **PostgreSQL Version** | `16` | Latest stable |

**Leave all other fields as default**

Click **"Create Database"**

## 3.3: Wait for Database to Be Ready

⏳ **Status will cycle**: "Creating" → "Building" → "Available" (takes 5-10 minutes)

In the meantime, keep this page open and watch for the "Available" status.

## 3.4: CRITICAL - Get Your Database URL

When status shows **"Available"** (green), click on the database name to go to details page.

**Navigate to:** Database page → **"Info"** tab

You'll see several connection strings. Look for:

**"External Database URL"** - Copy the ENTIRE string

It looks like this (example):
```
postgresql://postgres:YOUR_PASSWORD@dpg-abc123xyz.render-instances.com:5432/land_classification
```

### 📌 SAVE THIS URL!

**Create a text file** `backend/.env.production` and paste it there temporarily:

```
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@dpg-abc123xyz.render-instances.com:5432/land_classification
```

⚠️ **NEVER commit this to GitHub - it's a secret!** (But our `.gitignore` protects it)

## 3.5: ✅ Database Ready!

Your PostgreSQL database is now live and waiting for your backend to connect.

---

---

# ⚙️ STAGE 4: DEPLOY BACKEND TO RENDER (25 mins)

## 4.1: Create Web Service on Render

1. Go to [render.com](https://render.com) dashboard
2. Click **"New"** button (top left)
3. Click **"Web Service"**

You'll see: **"Connect a repository"**

## 4.2: Connect GitHub Repository

1. Click **"Connect account"** (if not already connected)
2. GitHub will ask to authorize Render - click **"Authorize"**
3. Find your `landsight` repository in the list
4. Click on it to select it

**If you don't see your repository:**
- Click **"Refresh"** button
- Or click **"Configure account"** to give Render more GitHub permissions

## 4.3: Configure Service Settings

After selecting repository, fill out the configuration form:

| Setting | Value | Purpose |
|---------|-------|---------|
| **Name** | `landsight-api` | Service name in Render |
| **Environment** | `Python 3` | Runtime environment |
| **Region** | `Ohio` | Same as database ⚠️ |
| **Branch** | `main` | Deploy from this branch |
| **Build Command** | `pip install -r requirements.txt` | Install dependencies |
| **Start Command** | `gunicorn -w 4 -b 0.0.0.0:$PORT run:app` | How to start Flask |
| **Plan** | `Free` | Pricing tier |

**Make sure these are correct, especially:**
- ✅ **Root Directory**: Make sure it shows `backend/` (NOT root)
- ✅ **Region**: Should match database (Ohio)

### Click **"Create Web Service"**

## 4.4: Wait for Initial Deploy

You'll see a screen showing the deployment progress. It will take 2-3 minutes:

1. "Building" - Installing dependencies
2. "Live" (or similar) - Service is running

**Check the Logs** for any errors. Common errors:
- ❌ "No module named 'tensorflow'" → Missing in requirements.txt
- ❌ "Permission denied" → Likely permissions issue
- ❌ "Error connecting to database" → DATABASE_URL not set yet

Let it finish the initial deployment (it's ok if there are warnings).

## 4.5: Add Environment Variables

Once service is created, you need to add your secrets:

1. On the service page, scroll down to **"Environment"** section
2. Click **"Add Environment Variable"** for EACH variable below:

**Add these variables one by one:**

### Variable 1: FLASK_ENV
- **Key**: `FLASK_ENV`
- **Value**: `production`
- Click **"Add"**

### Variable 2: FLASK_DEBUG
- **Key**: `FLASK_DEBUG`
- **Value**: `false`
- Click **"Add"**

### Variable 3: DATABASE_URL (CRITICAL!)
- **Key**: `DATABASE_URL`
- **Value**: Paste the full PostgreSQL URL from Step 3.4
  ```
  postgresql://postgres:YOUR_PASSWORD@dpg-abc123xyz.render-instances.com:5432/land_classification
  ```
- Click **"Add"**

### Variable 4: SECRET_KEY
- **Key**: `SECRET_KEY`
- **Value**: Generate a random string (use this):
  ```
  your-super-secret-key-landsight-2024-$(Get-Random)
  ```
  Or just use: `landsight-secret-key-production-2024`
- Click **"Add"**

### Variable 5: PORT
- **Key**: `PORT`
- **Value**: `5000`
- Click **"Add"**

**After adding each variable, Render will auto-redeploy!** ⏳ Wait for deployment to complete.

## 4.6: Watch the Redeployment

After adding environment variables:
1. You'll see logs showing service restarting
2. Status will show "Building" again
3. Wait for it to complete (2-3 mins)
4. Status should show "Live" or ✅

## 4.7: Get Your Backend URL

At the top of the service page, you'll see your URL like:

```
https://landsight-api.onrender.com
```

**COPY THIS URL** - You'll need it for the frontend!

## 4.8: Test Backend Health Check

Open a new browser tab and go to:

```
https://YOUR-BACKEND-URL/api/health
```

Replace `YOUR-BACKEND-URL` with your actual URL (e.g., `https://landsight-api.onrender.com`)

**Full example:**
```
https://landsight-api.onrender.com/api/health
```

### What you should see:

```json
{"status":"ok"}
```

✅ **If you see this, backend is working perfectly!**

### Troubleshooting if you see an error:

- **502 Bad Gateway**: Check Render service logs - there's a Python error
- **404 Not Found**: Wrong URL or service not deployed
- **504 Gateway Timeout**: Service is still starting up - wait 30 seconds

Go to Render dashboard → Your service → **Logs** tab to debug.

## 4.9: ✅ Backend is Live!

Your Flask API is now running on Render, connected to PostgreSQL database, and ready to accept requests!

---

---

# 🎨 STAGE 5: DEPLOY FRONTEND TO VERCEL (20 mins)

## 5.1: Update Frontend Configuration

Before deploying, you need to tell your frontend where the backend is.

### Update `.env.production` file

**File location:** `frontend/.env.production`

Open this file and update it with your backend URL from Stage 4.7:

```
VITE_API_URL=https://YOUR-BACKEND-URL/api
```

**Example:**
```
VITE_API_URL=https://landsight-api.onrender.com/api
```

**Save the file.**

### Commit this change to Git

```powershell
cd c:\Users\Acera\Documents\MLFINALAPPNATHIS
git add frontend/.env.production
git commit -m "Add production backend URL for Vercel"
git push origin main
```

Verify on GitHub that the file was updated.

## 5.2: Go to Vercel

1. Open [vercel.com](https://vercel.com) in browser
2. Log in to your Vercel account (create if needed - FREE tier available)

## 5.3: Create New Project from GitHub

1. Click **"Add New..."** (top left)
2. Click **"Project"**
3. You'll see a page asking to connect GitHub
4. Click **"Continue with GitHub"**
5. GitHub will ask to authorize Vercel - click **"Authorize"**

## 5.4: Import Your Repository

1. Find your `landsight` repository in the list
2. Click **"Import"** button

Vercel will ask about import settings.

## 5.5: Configure Project Settings

Fill out the configuration form:

| Setting | Value | Purpose |
|---------|-------|---------|
| **Project Name** | `landsight-frontend` | Name in Vercel dashboard |
| **Framework Preset** | `Vite` | Build tool for React |
| **Root Directory** | `frontend` | ⚠️ CRITICAL - Must be `frontend/` |
| **Build Command** | (leave as auto-detected) | Usually `npm run build` |
| **Output Directory** | (leave as auto-detected) | Usually `dist` |
| **Environment Variables** | (we'll add next) | Configuration secrets |

## 5.6: Add Environment Variables

**CRITICAL STEP!** Before clicking Deploy:

1. Click **"Environment Variables"** section
2. Add one variable:

| Name | Value |
|------|-------|
| `VITE_API_URL` | `https://YOUR-BACKEND-URL/api` |

Replace `YOUR-BACKEND-URL` with your Render URL from Stage 4.7.

**Example:**
```
VITE_API_URL=https://landsight-api.onrender.com/api
```

3. Click **"Add"** to confirm

## 5.7: Deploy to Vercel

1. Click **"Deploy"** button (big button at bottom)
2. Watch the deployment progress:

```
⏳ Analyzing...  →  🔨 Building...  →  ✅ Ready
```

This takes 2-5 minutes.

## 5.8: Get Your Frontend URL

When deployment shows **"Ready"** (with green checkmark):

1. You'll see your URL like: `https://landsight.vercel.app`
2. **COPY THIS URL** - This is your live app!
3. Click the URL to open your app in browser

✅ **Congratulations! Your frontend is live!**

## 5.9: Check Frontend Loads Correctly

When you open your frontend URL:

1. ✅ Should see homepage with header
2. ✅ Should see "Sample Classifications" section
3. ✅ Should see 5 sample images:
   - Urban (PNG)
   - Vegetation (PNG)
   - Water (PNG)
   - Agriculture (JPG)
   - Bare Land (JPG)

### If you see errors:

- **Images not loading**: Check `frontend/assets/` folder has all files
- **API errors**: Check the backend URL in `VITE_API_URL` is correct
- **Build errors**: Check Vercel dashboard → Deployments → Logs

---

---

# 🧪 STAGE 6: FULL TESTING (15 mins)

## 6.1: Test Frontend Loads Without Errors

1. Go to your Vercel URL: `https://landsight.vercel.app`
2. Open Developer Tools: **F12** key
3. Go to **Console** tab
4. Should see NO red errors

### Common errors to fix:

```
❌ "Failed to fetch from https://landsight-api.onrender.com"
   → Backend might be asleep (Render free tier)
   → Go to Render → Click your service → It will wake up
   
❌ "CORS error: Access-Control-Allow-Origin"
   → Backend CORS not configured
   → Check `app/__init__.py` has CORS enabled
   
❌ "404: /assets/Urban.png not found"
   → Assets not in correct folder
   → Check `frontend/assets/` has all image files
```

## 6.2: Test Sample Classifications Load

1. Scroll down to "Sample Classifications" section
2. You should see 5 images:
   - ✅ Urban (PNG)
   - ✅ Vegetation (PNG)
   - ✅ Water (PNG)
   - ✅ Agriculture (JPG)
   - ✅ Bare Land (JPG)

### If images don't load:

1. Open DevTools → **Network** tab
2. Refresh page
3. Look for 404 errors on image requests
4. Verify image files exist in `frontend/assets/`

## 6.3: Test Image Classification

### Option A: Upload Your Own Image

1. Look for **"Upload Image"** or file input
2. Select a satellite/land image (JPG, PNG)
3. Click **"Classify"** or "Analyze"
4. Wait 15-30 seconds

### Option B: Use Sample Image

1. Click any of the 5 sample images
2. It should auto-select and classify
3. Wait for results

### Expected Results:

```json
{
  "classification": "Urban",
  "confidence": 0.89,
  "label": "Urban area",
  "features": {...}
}
```

## 6.4: Check Network Requests

1. Open DevTools: **F12**
2. Go to **Network** tab
3. Make a classification:
   - Upload image
   - Click Classify
4. Look for `/classify` request
5. Should show:
   - Status: **200** ✅ (success)
   - Response: Classification results

### If you see 502/504:

- Backend service might be asleep
- **On Render dashboard**: Click your service to wake it up
- Wait 30 seconds
- Try again

## 6.5: Test Backend Directly

Go to this URL in browser (replace with your backend URL):

```
https://landsight-api.onrender.com/api/health
```

Should return:
```json
{"status":"ok"}
```

### If you see error:

- Status: **503 Service Unavailable** → Backend is asleep on free tier
  - Go to Render → Click service → Waits 30 seconds for wake-up
- Status: **502 Bad Gateway** → Check Render logs for Python errors
- Status: **404** → Wrong URL

## 6.6: Test Map Tiles (if applicable)

If your app shows maps:

1. Go to map view
2. Should see satellite imagery
3. Drag marker to select location
4. Should update coordinates

### If map is black:

- Esri tile server might be down
- Check browser console for CORS errors
- This is normal on first load - wait 10 seconds

## 6.7: Full Workflow Test

Complete this full workflow:

1. ✅ Open frontend URL
2. ✅ See homepage loads
3. ✅ See sample images
4. ✅ Click a sample image
5. ✅ System classifies it
6. ✅ See results appear
7. ✅ No errors in console

---

---

# 📊 SUCCESS CHECKLIST

- [ ] GitHub repository created (private) with all files
- [ ] PostgreSQL database on Render showing "Available"
- [ ] Backend service on Render showing "Live"
- [ ] Backend health check returns `{"status":"ok"}`
- [ ] Frontend service on Vercel showing "Ready"
- [ ] Frontend URL opens without errors
- [ ] Sample images load correctly (5 images visible)
- [ ] Can upload and classify images
- [ ] Classification returns results
- [ ] No 502, 504, or CORS errors in console

---

---

# 🎯 YOUR LIVE APP URLS

Once everything is working:

| Component | URL | Status |
|-----------|-----|--------|
| **Frontend** | `https://landsight.vercel.app` | 🟢 Live |
| **Backend API** | `https://landsight-api.onrender.com/api` | 🟢 Live |
| **Health Check** | `https://landsight-api.onrender.com/api/health` | 🟢 Response: `{"status":"ok"}` |
| **Database** | PostgreSQL on Render | 🟢 Connected |

---

---

# 🆘 CRITICAL FIXES FOR COMMON ISSUES

## Issue 1: "502 Bad Gateway" on Classification

**Cause:** Render backend is asleep (free tier sleeps after 15 mins of inactivity)

**Fix:**
```
1. Go to Render dashboard
2. Click your "landsight-api" service
3. Wait 30 seconds (it wakes up)
4. Try classifying again
```

Free tier services auto-sleep to save resources. This is normal.

---

## Issue 2: "CORS Error" When API Calls Fail

**Cause:** Backend CORS not properly configured

**Fix - Check `backend/app/__init__.py`:**

Should have this line:
```python
CORS(app, resources={r"/api/*": {"origins": "*"}})
```

If missing, add it and redeploy:
```powershell
git add backend/app/__init__.py
git commit -m "Fix CORS configuration"
git push origin main

# On Render: Manual Deploy → Deploy latest commit
```

---

## Issue 3: Images Don't Load (404 Errors)

**Cause:** Assets folder missing or wrong path

**Fix:**

Verify `frontend/assets/` has these files:
```
✅ Urban.png
✅ Vegetation.png
✅ Water.png
✅ Agriculture.jpg
✅ Bareland.jpg
```

Update `frontend/src/components/SampleClassifications.jsx` to match filenames exactly (including .png vs .jpg).

Then:
```powershell
git add frontend/
git commit -m "Fix image asset paths"
git push origin main

# On Vercel: Auto redeploys on push
```

---

## Issue 4: "Cannot reach backend" from Frontend

**Cause:** Wrong `VITE_API_URL` in Vercel environment variables

**Fix:**

1. Go to Vercel dashboard
2. Click your project
3. Go to **Settings** → **Environment Variables**
4. Check `VITE_API_URL` matches your Render URL exactly
5. Redeploy: **Deployments** → Click latest → **Redeploy**

---

## Issue 5: Database Connection Failed

**Cause:** Wrong DATABASE_URL in Render backend environment variables

**Fix:**

1. Go to Render database → **Info** tab
2. Copy "External Database URL" exactly
3. Go to backend service → **Environment** section
4. Update `DATABASE_URL` with correct value
5. Service auto-redeploys

---

---

# 📞 QUICK REFERENCE

| Problem | Where to Check |
|---------|-----------------|
| Backend not working | Render → Your service → **Logs** tab |
| Frontend not loading | Vercel → Your project → **Logs** tab |
| API calls failing | Browser DevTools → **Network** tab |
| Images missing | Vercel → Deployments → **Build Logs** |
| Database errors | Render → Backend service → **Logs** |

---

---

# 🎉 CONGRATULATIONS!

**Your app is now live!**

You have successfully deployed:
- ✅ React frontend on Vercel
- ✅ Flask backend on Render
- ✅ PostgreSQL database on Render
- ✅ Custom ML model for land classification

**Next steps:**
1. Share URL with users
2. Monitor logs for errors
3. Collect feedback
4. Iterate on features

---

**All stages complete!** 🚀
