# ⚡ QUICK START - ALL STAGES AT A GLANCE

## Stage-by-Stage Quick Commands & Links

---

## ✅ STAGE 1-2: GIT (COMPLETE)

```powershell
# Verify your repo is on GitHub
git status
# Should show: "Your branch is up to date with 'origin/main'"
```

**Your GitHub repo:** `https://github.com/YOUR-USERNAME/landsight`

---

## 🗄️ STAGE 3: CREATE DATABASE (10 mins)

### Quick Steps:
1. Go to [render.com](https://render.com)
2. Click **"New"** → **"PostgreSQL"**
3. Fill form:
   - Name: `landsight-db`
   - Database: `land_classification`
   - User: `postgres`
   - Region: `Ohio`
4. **WAIT 5-10 mins** for "Available" status
5. **COPY** the External Database URL

### Your Database URL Format:
```
postgresql://postgres:PASSWORD@dpg-xxx.render-instances.com:5432/land_classification
```

**Status Check:** Go to Render → Database → Should show 🟢 **"Available"**

---

## ⚙️ STAGE 4: DEPLOY BACKEND (25 mins)

### Quick Steps:
1. Go to [render.com](https://render.com)
2. Click **"New"** → **"Web Service"**
3. Select your `landsight` GitHub repo
4. **Fill settings:**
   - Name: `landsight-api`
   - Root Directory: `backend/` ⚠️
   - Build: `pip install -r requirements.txt`
   - Start: `gunicorn -w 4 -b 0.0.0.0:$PORT run:app`
5. **Add Environment Variables:**
   ```
   FLASK_ENV = production
   FLASK_DEBUG = false
   DATABASE_URL = [your PostgreSQL URL from Stage 3]
   SECRET_KEY = landsight-secret-key-production-2024
   PORT = 5000
   ```
6. **WAIT** for status to show 🟢 **"Live"**

### Test Backend Health:
```
https://landsight-api.onrender.com/api/health
  ↓
Should return: {"status":"ok"}
```

**Your Backend URL:** `https://landsight-api.onrender.com`

---

## 🎨 STAGE 5: DEPLOY FRONTEND (20 mins)

### Quick Steps:

**1. Update Frontend Config:**
```powershell
cd c:\Users\Acera\Documents\MLFINALAPPNATHIS

# Edit filename: frontend/.env.production
# Change this line:
VITE_API_URL=https://landsight-api.onrender.com/api
```

**2. Push to GitHub:**
```powershell
git add frontend/.env.production
git commit -m "Add backend URL for production"
git push origin main
```

**3. Go to [vercel.com](https://vercel.com):**
- Click **"Add New"** → **"Project"**
- Select `landsight` repo
- **Fill settings:**
  - Project Name: `landsight-frontend`
  - Framework Preset: `Vite`
  - Root Directory: `frontend/` ⚠️
  - Environment Variables:
    ```
    VITE_API_URL = https://landsight-api.onrender.com/api
    ```
- Click **"Deploy"**
- **WAIT** for 🟢 **"Ready"**

### Your Frontend URL:
```
https://landsight.vercel.app
```

---

## 🧪 STAGE 6: TEST EVERYTHING (15 mins)

### Quick Checklist:

```
Open DevTools: F12
Go to Console tab

✅ Open frontend URL
   https://landsight.vercel.app

✅ See homepage loaded
   (Look for header, samples section)

✅ See 5 sample images:
   - Urban.png
   - Vegetation.png
   - Water.png
   - Agriculture.jpg
   - Bareland.jpg

✅ NO red errors in console

✅ Click a sample image
   (Should send to backend)

✅ Wait 15-30 seconds
   (Backend processes image)

✅ See classification result
   (Land type + confidence)

✅ NO "502", "404", "CORS" errors
```

### Test Backend Directly:

Open in browser:
```
https://landsight-api.onrender.com/api/health
```

Should show:
```json
{"status":"ok"}
```

---

## 🎯 YOUR LIVE APP URLS

| Component | URL | Test |
|-----------|-----|------|
| **Frontend** | `https://landsight.vercel.app` | Open in browser |
| **Backend** | `https://landsight-api.onrender.com` | → `/api/health` |
| **Database** | Render PostgreSQL | Connected to backend |

---

## 🔧 TROUBLESHOOTING

### ❌ "502 Bad Gateway"
**Reason:** Backend asleep on free tier
**Fix:** Go to Render → Click your service → Wait 30 secs → Try again

### ❌ Images not loading (404)
**Reason:** Wrong filenames in SampleClassifications
**Fix:**
```
Check frontend/assets/ has:
✅ Urban.png
✅ Vegetation.png
✅ Water.png
✅ Agriculture.jpg
✅ Bareland.jpg
```

### ❌ "Cannot reach backend"
**Reason:** Wrong VITE_API_URL
**Fix:** Vercel dashboard → Settings → Environment Variables → Update URL

### ❌ Database connection error
**Reason:** Wrong DATABASE_URL
**Fix:** Render backend service → Environment → Update DATABASE_URL exactly

---

## 📊 FINAL CHECKLIST

- [ ] Git repo pushed to GitHub
- [ ] PostgreSQL database on Render (Available)
- [ ] Backend deployed to Render (Live)
- [ ] Backend health check works
- [ ] Frontend deployed to Vercel (Ready)
- [ ] Frontend loads without errors
- [ ] Sample images visible
- [ ] Can classify images successfully
- [ ] No console errors

---

## 🚀 YOU'RE DONE!

**Your machine learning app is LIVE and running on:**
- **Frontend:** Vercel (global CDN)
- **Backend:** Render (serverless)
- **Database:** PostgreSQL (Render managed)

**Share your frontend URL with others to use the app!**

```
👉 https://landsight.vercel.app
```

---

**Questions?** Check console logs in browser (F12) or Render/Vercel dashboards.
