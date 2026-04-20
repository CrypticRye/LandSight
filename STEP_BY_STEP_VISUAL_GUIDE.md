# 🎯 STEP-BY-STEP VISUAL DEPLOYMENT GUIDE

**Follow these exact steps in order. Each stage has one clear task.**

---

# 📌 STATUS: YOU ARE HERE

```
✅ Stage 1-2: Code on GitHub
   ↓
→  Stage 3: Create Database ← START HERE
   ↓
   Stage 4: Deploy Backend
   ↓
   Stage 5: Deploy Frontend
   ↓
   Stage 6: Test Everything
   ↓
   🎉 LIVE!
```

---

---

# 🗄️ STAGE 3: CREATE DATABASE ON RENDER

**Time: 10 minutes**
**What you'll do: Create a PostgreSQL database**

## STEP 3.1: Open Render Website

1. Open browser
2. Go to: [render.com](https://render.com)
3. Log in (use GitHub login for easy setup)

## STEP 3.2: Create New Database

1. Click **"New"** button (top left, next to Render logo)
2. A dropdown menu appears
3. Click **"PostgreSQL"** option

You should now see a form with blue "Create Database" button at bottom.

## STEP 3.3: Fill Out the Form

Enter these values EXACTLY:

```
Name:                    landsight-db
Database:                land_classification
User:                    postgres
Password:                ← (AUTO-GENERATED - you'll copy it)
Region:                  Ohio (free tier) or your closest region
PostgreSQL Version:      16
Datadog API Key:         ← (LEAVE BLANK)
IP Whitelist:            ← (LEAVE BLANK)
```

Leave everything else as default.

## STEP 3.4: Click Create

Click the blue **"Create Database"** button

You'll see: **"Building"** status

## STEP 3.5: WAIT FOR DATABASE TO BE READY

⏳ This takes **5-10 minutes**

Status will change:
```
"Creating" → "Building" → "Available"
```

**KEEP THIS PAGE OPEN** - Don't close it!

Once you see 🟢 **"Available"** in green, proceed to next step.

## STEP 3.6: SAVE YOUR DATABASE URL

Click on the database name to open its page.

Go to **"Info"** tab (you might need to click it)

Look for: **"External Database URL"**

It looks like:
```
postgresql://postgres:abc123password@dpg-xyz123.render-instances.com:5432/land_classification
```

### 📌 COPY THIS ENTIRE STRING

Right-click → Copy, or select all (Ctrl+A) → Copy

### Create a temporary text file and PASTE it there

(We'll use it in Stage 4)

**⚠️ IMPORTANT: Never share or commit this URL - it contains your password!**

## ✅ STAGE 3 COMPLETE

Your database is now LIVE and waiting for backend to connect!

---

---

# ⚙️ STAGE 4: DEPLOY BACKEND TO RENDER

**Time: 25 minutes**
**What you'll do: Deploy your Flask API to Render**

## STEP 4.1: Go Back to Render Dashboard

Click Render logo (top left) to go back to dashboard

## STEP 4.2: Create Web Service

1. Click **"New"** button (top left)
2. Click **"Web Service"**
3. You see: **"Connect a repository"** message

## STEP 4.3: Connect Your GitHub Repository

1. Click **"Connect account"** button
2. GitHub asks: "Authorize Render to access GitHub?"
3. Click **"Authorize"** (green button)
4. GitHub asks for your password or 2FA - enter it

You're back on Render page.

## STEP 4.4: Select Your Repository

1. Look for list of repositories
2. Find **"landsight"** in the list
3. Click on it to select

**If you don't see it:**
- Click **"Refresh"** button
- Or click **"Configure account"** to give Render more permissions

## STEP 4.5: Fill Configuration Form

After selecting repository, you see configuration form:

| Field | Value to Enter | Why |
|-------|-----------------|-----|
| **Name** | `landsight-api` | Identifier for your service |
| **Environment** | `Python 3` | Runtime for Flask |
| **Region** | `Ohio` | Same as database ⚠️ |
| **Branch** | `main` | Deploy from main branch |
| **Build Command** | `pip install -r requirements.txt` | Install Python packages |
| **Start Command** | `gunicorn -w 4 -b 0.0.0.0:$PORT run:app` | Start Flask server |
| **Plan** | `Free` | Free tier |

**CRITICAL:** Make sure **Root Directory** shows: `backend/`

If it shows root directory instead, you need to set it to `backend/`

## STEP 4.6: Click "Create Web Service"

Click the big button at bottom.

You'll see deployment progress screen with:
- "Building" message
- Live logs showing installation
- Takes 2-3 minutes

**Let it complete!** Even if you see warnings, this is normal.

## STEP 4.7: Wait for Service to Show "Live"

Keep watching until you see 🟢 **"Live"** status (green circle)

Can take 3-5 minutes.

## STEP 4.8: Add Environment Variables

Once service is running (Live status):

1. On this service page, scroll DOWN
2. Find **"Environment"** section
3. Click **"Add Environment Variable"** button

You'll add 5 variables. For EACH one:
- Enter the Key (left box)
- Enter the Value (right box)
- Click **"Save"** button

### Variable 1: FLASK_ENV
```
Key:   FLASK_ENV
Value: production
```
Click Save.

### Variable 2: FLASK_DEBUG
```
Key:   FLASK_DEBUG
Value: false
```
Click Save.

### Variable 3: DATABASE_URL (CRITICAL!)
```
Key:   DATABASE_URL
Value: [PASTE the URL from Stage 3.6]
```

Paste the PostgreSQL URL you copied from Stage 3.6 exactly as-is.
Click Save.

### Variable 4: SECRET_KEY
```
Key:   SECRET_KEY
Value: landsight-secret-key-production-2024
```
Click Save.

### Variable 5: PORT
```
Key:   PORT
Value: 5000
```
Click Save.

**After adding each variable, service auto-redeploys!** ⏳

## STEP 4.9: Wait for Redeployment

After adding all variables:

Status shows: "Building" again
Watch logs for services restarting
Wait 2-3 minutes
Status changes to "Live" again ✅

## STEP 4.10: Get Your Backend URL

At the top of the page, you see your URL:

```
https://landsight-api.onrender.com
```

**📌 COPY THIS URL** - You'll need it for Stage 5!

## STEP 4.11: Test Backend Health Check

1. Open NEW browser tab
2. Go to: `https://landsight-api.onrender.com/api/health`

**You should see:**
```json
{"status":"ok"}
```

✅ **If you see this, your backend is working!**

### If you see error instead:

- **502 Bad Gateway**: Backend crashed. Check Render logs for error message. Common: wrong DATABASE_URL.
- **503 Unavailable**: Service still starting. Wait 30 seconds and try again.
- **404 Not Found**: Wrong URL. Check it matches exactly.

Go to Render service → **Logs** tab to see detailed error messages.

## ✅ STAGE 4 COMPLETE

Your Flask backend is now running on Render, connected to PostgreSQL!

---

---

# 🎨 STAGE 5: DEPLOY FRONTEND TO VERCEL

**Time: 20 minutes**
**What you'll do: Deploy your React app to Vercel**

## STEP 5.1: Update Frontend Configuration

1. Open your project folder: `c:\Users\Acera\Documents\MLFINALAPPNATHIS`
2. Navigate to: `frontend/.env.production` file
3. Open it in editor (VS Code, Notepad, etc.)
4. Find this line:
   ```
   VITE_API_URL=https://landsight-api.onrender.com/api
   ```
5. **Replace** the URL with your backend URL from Stage 4.10:
   ```
   VITE_API_URL=https://YOUR-BACKEND-URL/api
   ```
   
   For example:
   ```
   VITE_API_URL=https://landsight-api.onrender.com/api
   ```

6. **Save the file** (Ctrl+S)

## STEP 5.2: Push Changes to GitHub

Open PowerShell in your project folder:

```powershell
cd c:\Users\Acera\Documents\MLFINALAPPNATHIS
git add frontend/.env.production
git commit -m "Add production backend URL"
git push origin main
```

Wait for it to complete.

**Verify on GitHub:** Go to GitHub repo, check file was updated.

## STEP 5.3: Go to Vercel Website

1. Open browser
2. Go to: [vercel.com](https://vercel.com)
3. Log in (use GitHub login)

## STEP 5.4: Create New Project

1. Click **"Add New..."** button (top left)
2. Click **"Project"** option
3. You see: "Connect GitHub account" message
4. Click **"Continue with GitHub"**
5. GitHub asks to authorize Vercel
6. Click **"Authorize"** button

## STEP 5.5: Select Your Repository

1. You see list of your GitHub repositories
2. Find **"landsight"** in the list
3. Click **"Import"** button next to it

Vercel loads your repo settings.

## STEP 5.6: Configure Project Settings

You see project configuration form:

| Setting | Value | Notes |
|---------|-------|-------|
| **Project Name** | `landsight-frontend` | Name in Vercel |
| **Framework Preset** | `Vite` | Build tool for React |
| **Root Directory** | `frontend/` | ⚠️ MUST be `frontend/` |
| **Build Command** | (auto-detected) | Usually `npm run build` |
| **Output Directory** | (auto-detected) | Usually `dist` |

Make sure **Root Directory** is set to `frontend/`

## STEP 5.7: Add Environment Variables

**BEFORE deploying, you MUST add environment variable:**

1. Look for **"Environment Variables"** section on this form
2. Click it to expand
3. You should see boxes for Name and Value

Enter:
```
Name:  VITE_API_URL
Value: https://landsight-api.onrender.com/api
```

Replace the URL with your Render backend URL from Stage 4.10.

Click **"Add"** to confirm.

## STEP 5.8: Deploy

Click the big **"Deploy"** button (usually at bottom of form or top right)

You'll see deployment progress:

```
⏳ Analyzing...
🔨 Building...
✅ Ready
```

This takes 2-5 minutes.

## STEP 5.9: Wait for "Ready" Status

Watch until it shows 🟢 **"Ready"** (green)

## STEP 5.10: Get Your Frontend URL

When Ready appears:

1. You see your URL (like): `https://landsight.vercel.app`
2. **📌 COPY THIS URL** - This is your live app!
3. Click it to open (or open in new tab)

## STEP 5.11: Check Frontend Loads

1. Opens your app in browser
2. Should see:
   - ✅ Homepage with header
   - ✅ "Sample Classifications" section
   - ✅ 5 images visible:
      - Urban (PNG)
      - Vegetation (PNG)
      - Water (PNG)
      - Agriculture (JPG)
      - Bare Land (JPG)

3. Open DevTools: Press **F12**
4. Go to **Console** tab
5. Should see **NO red error messages**

### If you see errors:

Most common:
- **"Failed to fetch from backend"** → Check VITE_API_URL is correct
- **"404 images not found"** → Check image files in frontend/assets/
- **"CORS error"** → Backend CORS not configured

## ✅ STAGE 5 COMPLETE

Your React frontend is now running on Vercel!

---

---

# 🧪 STAGE 6: TEST EVERYTHING

**Time: 15 minutes**
**What you'll do: Verify the entire system works end-to-end**

## STEP 6.1: Test Frontend Loads

1. Go to your Vercel URL in browser: `https://landsight.vercel.app`
2. Page should load and show homepage
3. Press **F12** to open Developer Tools
4. Click **Console** tab
5. Should see NO red errors

### Common errors to fix:

```
❌ "Failed to fetch" or "502"
   → Backend service asleep. Go to Render → Click service → Wait 30 secs

❌ "421" or "CORS error"
   → Backend CORS misconfigured. Check app/__init__.py

❌ "404: /assets/Urban.png"
   → Wrong image filenames. Check frontend/assets/ folder
```

## STEP 6.2: Test Sample Images Display

1. Scroll down to "Sample Classifications" section
2. You should see 5 images clearly displayed:
   - ✅ Urban (PNG image)
   - ✅ Vegetation (PNG image)
   - ✅ Water (PNG image)
   - ✅ Agriculture (JPG image)
   - ✅ Bare Land (JPG image)

If any image shows "broken" icon:
- Check image file exists in `frontend/assets/`
- Check filename matches exactly (including .png vs .jpg)
- Check console for 404 errors

## STEP 6.3: Test Image Classification

### Option 1: Upload Your Own Image

1. Look for "Upload Image" button or file input area
2. Click to select file
3. Choose a satellite/land image (JPG or PNG)
4. Click "Classify" or "Analyze" button
5. **WAIT 15-30 seconds** for processing
6. Should see results:
   ```
   Land Type: Urban
   Confidence: 89%
   ```

### Option 2: Use Sample Image

1. Click any of the 5 sample images
2. System auto-classifies it
3. Wait 15-30 seconds
4. See results appear

## STEP 6.4: Check Network Requests

1. DevTools still open (F12)
2. Go to **Network** tab
3. Make a classification request (upload image, click classify)
4. You'll see new requests appearing
5. Look for `/classify` request
6. Click it to see details:
   - **Status**: Should be **200** ✅ (not 502, 404, etc.)
   - **Response**: Should show classification JSON

### If you see 502 error:

1. Backend service is asleep (free tier)
2. Go to Render → landsight-api service
3. Click it to wake up
4. Wait 30 seconds
5. Try classification again

## STEP 6.5: Test Backend Directly

1. Open NEW browser tab
2. Go to: `https://landsight-api.onrender.com/api/health`
3. Should show:
   ```json
   {"status":"ok"}
   ```

If this fails:
- Render backend might be sleeping
- Go to Render → Click service to wake up
- Wait 30 seconds
- Refresh browser

## STEP 6.6: Full Workflow Test

Complete this entire workflow without errors:

```
✅ Step 1: Open https://landsight.vercel.app
✅ Step 2: See homepage loads
✅ Step 3: See 5 sample images
✅ Step 4: Click a sample image
✅ Step 5: Wait 15-30 seconds
✅ Step 6: See classification result
✅ Step 7: No errors in console (F12)
✅ Step 8: No 502/404 errors
```

If you complete all steps without errors: **🎉 YOU'RE DONE!**

---

---

# 📊 FINAL VERIFICATION CHECKLIST

- [ ] Frontend URL loads: `https://landsight.vercel.app`
- [ ] Backend health check works: `https://landsight-api.onrender.com/api/health`
- [ ] Sample images display (5 of them)
- [ ] Can classify sample images
- [ ] Can upload custom images
- [ ] Classification returns results
- [ ] No red errors in console (F12)
- [ ] No 502/504 errors
- [ ] No CORS errors

---

---

# 🎯 YOUR LIVE APPLICATION URLS

| Component | URL | Status |
|-----------|-----|--------|
| **Frontend** | `https://landsight.vercel.app` | 🟢 Live |
| **Backend** | `https://landsight-api.onrender.com` | 🟢 Live |
| **Health Check** | `https://landsight-api.onrender.com/api/health` | 🟢 Works |
| **Database** | PostgreSQL on Render | 🟢 Connected |

---

# 🚀 SUCCESS!

**Your machine learning land classification application is now live and accessible to the world!**

### What you've accomplished:

✅ Deployed React frontend on Vercel (global CDN)
✅ Deployed Flask backend on Render (serverless)
✅ Set up PostgreSQL database on Render
✅ Configured CI/CD (GitHub → Vercel/Render)
✅ Integrated machine learning model
✅ Built end-to-end application pipeline

### Next steps:

1. **Share the frontend URL** with users: `https://landsight.vercel.app`
2. **Monitor logs** for any errors
3. **Collect feedback** from users
4. **Iterate and improve** features
5. **Deploy updates** by pushing to main branch (GitHub)

---

**Congratulations! 🎉 Your app is in production!**
