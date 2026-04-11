# 🎯 Quick Deployment Checklist

Follow these steps in order. Estimated time: **30-45 minutes**

---

## STEP 1: Prepare Your Project (5 mins)
- [ ] Open your project folder: `c:\Users\Acera\Documents\MLFINALAPPNATHIS`
- [ ] Initialize Git (if not already done):
  ```bash
  git init
  git add .
  git commit -m "Initial commit"
  ```
- [ ] Push to GitHub:
  - Create repo on github.com
  - Follow GitHub's push instructions
  - Verify files are on GitHub

---

## STEP 2: Set Up Database (10 mins)

### On Render.com:
- [ ] Create account at render.com (FREE)
- [ ] Create PostgreSQL database:
  - Click "New +" → "PostgreSQL"
  - Name: `land-classification-db`
  - Database: `land_classification`
  - Region: Choose closest to you
  - Click "Create Database"
- [ ] **SAVE** the External Database URL (copy and paste into a text file)
  - Format: `postgresql://user:PASSWORD@HOST:5432/land_classification`

---

## STEP 3: Deploy Backend (15 mins)

### Files Already Created (in `backend/` folder):
- ✅ `Procfile` - tells Render how to start Flask
- ✅ `render-build.sh` - build script for Render
- ✅ `.env.production` - environment variables template

### On Render.com:
- [ ] Create Web Service:
  - Click "New +" → "Web Service"
  - Connect your GitHub repo
- [ ] Configure:
  - **Name**: `landsight-backend`
  - **Root Directory**: `backend`
  - **Runtime**: Python 3
  - **Build Command**: `./render-build.sh`
  - **Start Command**: `gunicorn -w 4 -b 0.0.0.0:$PORT run:app`
- [ ] Add Environment Variables (click "Environment"):
  - `DATABASE_URL`: (paste your database URL)
  - `FLASK_DEBUG`: `false`
  - `PORT`: `5000`
  - `SECRET_KEY`: Generate a random string (use: https://www.uuidgenerator.net/)
  - `COPERNICUS_USER`: Your Copernicus Earth email
  - `COPERNICUS_PASS`: Your Copernicus password
- [ ] Click "Create Web Service"
- [ ] **Wait 10-15 minutes** for deployment
  - Look for **green checkmark ✓**
- [ ] Copy your backend URL (looks like: `https://landsight-backend.onrender.com`)

### Test Backend:
- [ ] Open in browser: `https://landsight-backend.onrender.com/api/health`
- [ ] Should see: `{"status":"ok"}`
- [ ] If error, check Render dashboard → Logs tab

---

## STEP 4: Update Frontend Configuration (2 mins)

### File Already Created:
- ✅ `frontend/.env.production` - needs your backend URL

### What to do:
- [ ] Edit `frontend/.env.production`
- [ ] Replace `https://landsight-backend.onrender.com/api` with your actual backend URL from Step 3
- [ ] Save file
- [ ] Commit and push:
  ```bash
  git add frontend/.env.production
  git commit -m "Update backend URL for production"
  git push origin main
  ```

---

## STEP 5: Deploy Frontend (10 mins)

### On Vercel.com:
- [ ] Create account at vercel.com (FREE)
- [ ] Add New Project:
  - Click "Add New" → "Project"
  - Import your GitHub repo
- [ ] Configure:
  - **Project Name**: `landsight-frontend`
  - **Framework**: `Vite`
  - **Root Directory**: `./frontend`
  - **Build Command**: `npm run build`
  - **Output Directory**: `dist`
- [ ] Click "Environment Variables" and add:
  - `VITE_API_URL`: Your backend URL (from Step 3)
    - Example: `https://landsight-backend.onrender.com/api`
- [ ] Click "Deploy"
- [ ] **Wait 5 minutes** for deployment
  - Look for **green checkmark ✓**
- [ ] Copy your frontend URL (looks like: `https://landsight-frontend.vercel.app`)

---

## STEP 6: Test Everything (5 mins)

### Test Backend:
- [ ] Open: `https://landsight-backend.onrender.com/api/health`
- [ ] Should return: `{"status":"ok"}`

### Test Frontend:
- [ ] Open: `https://landsight-frontend.vercel.app`
- [ ] Should see your app UI

### Test API Connection:
- [ ] Open frontend URL
- [ ] Press `F12` to open Developer Console
- [ ] Go to "Network" tab
- [ ] Try uploading an image
- [ ] In Network tab, you should see API call to your backend
- [ ] Should see ✓ green responses (not red errors)

### Test with Others:
- [ ] Share your frontend URL: `https://landsight-frontend.vercel.app`
- [ ] Ask them to test uploading images
- [ ] Should work from their computer/phone

---

## Troubleshooting Quick Fixes

| Problem | What to Check |
|---------|---------------|
| Backend shows 502 error | 1. Check Render Logs tab 2. Verify DATABASE_URL is correct 3. Wait 5 more mins |
| Frontend blank or 404 | 1. Check Vercel deployment logs 2. Verify root directory is `./frontend` 3. Check build succeeded |
| API calls fail in frontend | 1. Open DevTools → Network tab 2. Check API URL is correct 3. Look for CORS errors 4. Verify backend is running |
| Model/Dataset not found | 1. Make sure files pushed to GitHub (not in .gitignore) 2. Check they're in `backend/models/` or `backend/datasets/` |
| TensorFlow too large | Replace `tensorflow` with `tensorflow-cpu` in requirements.txt |

---

## After Successful Deployment

### To Make Changes:
```bash
# Make code changes on your computer
# Then:
git add .
git commit -m "Description of what you changed"
git push origin main

# Render and Vercel auto-redeploy!
# Check dashboards for deployment status
```

### Share with Testers:
Share this link with friends/colleagues:
```
https://landsight-frontend.vercel.app
```

They can use it without needing anything installed!

---

## 📞 Need Help?

1. **Check the logs**: Render dashboard → Your service → Logs tab
2. **Google the error** with "Render" or "Vercel" in search
3. **Read full guide**: Open `DEPLOYMENT_GUIDE.md` in your repo
4. **Join communities**: 
   - Render Discord
   - Vercel Discord
   - Stack Overflow (tag with render/vercel)

---

## 🎉 Success Indicators

You've deployed successfully when:
- ✅ Backend URL responds with `{"status":"ok"}`
- ✅ Frontend URL shows your app
- ✅ Can upload images through frontend
- ✅ No CORS errors in browser console
- ✅ Image classification works end-to-end
- ✅ Works on different browsers
- ✅ Works from different computers/phones

**Congratulations! Your app is now online for testing!** 🚀
