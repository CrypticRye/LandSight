# ✅ STEP-BY-STEP DEPLOYMENT CHECKLIST

## Stage 1: Local Preparation (Complete BEFORE pushing)

### Git Setup
- [ ] Opened terminal in `c:\Users\Acera\Documents\MLFINALAPPNATHIS`
- [ ] Ran `git config --global user.name "Your Name"`
- [ ] Ran `git config --global user.email "your@email.com"`
- [ ] Ran `git init` (if first time)
- [ ] Ran `git add .` to stage all files
- [ ] Ran `git commit -m "Initial commit"` to save locally

### Files Verified (Backend)
- [ ] `backend/Procfile` exists
- [ ] `backend/render-build.sh` exists
- [ ] `backend/requirements.txt` has all dependencies
- [ ] `backend/.env.production` exists (template only)
- [ ] `backend/.gitignore` exists

### Files Verified (Frontend)
- [ ] `frontend/.env.production` exists with backend URL placeholder
- [ ] `frontend/.env.development` exists with localhost API
- [ ] `frontend/.gitignore` exists
- [ ] `frontend/public/vite.svg` exists
- [ ] All image assets exist in `frontend/public/assets/`

---

## Stage 2: GitHub Setup (5 mins)

1. [ ] Created new repository on github.com
2. [ ] Repository is set to PRIVATE
3. [ ] Repository name: `landsight`
4. [ ] Ran git commands from GitHub instructions
5. [ ] Ran `git push -u origin main`
6. [ ] Verified all files visible on GitHub website

---

## Stage 3: Render Database Setup (10 mins)

1. [ ] Created account on render.com
2. [ ] Created PostgreSQL database
   - Name: `landsight-db`
   - Database: `land_classification`
   - User: `postgres`
3. [ ] Database status is "Available"
4. [ ] **SAVED** the External Database URL (keep secret!)

---

## Stage 4: Render Backend Deployment (20 mins)

1. [ ] Verified GitHub connection on Render
2. [ ] Created Web Service
   - Name: `landsight-api`
   - Root Directory: `backend`
   - Framework: Python
3. [ ] Set Environment Variables:
   - `FLASK_ENV=production`
   - `FLASK_DEBUG=false`
   - `DATABASE_URL=` [your PostgreSQL URL]
   - `SECRET_KEY=` [generate a random string]
   - `PORT=5000`
4. [ ] Service status shows "Live" (green)
5. [ ] **SAVED** the service URL (e.g., https://landsight-api.onrender.com)
6. [ ] Tested `/api/health` endpoint returns `{"status":"ok"}`

---

## Stage 5: Frontend Deployment to Vercel (15 mins)

1. [ ] Created account on vercel.com
2. [ ] Connected GitHub account to Vercel
3. [ ] Created new project
   - Repository: your landsight repo
   - Root Directory: `frontend`
   - Framework Preset: Vite
4. [ ] Set Environment Variable:
   - `VITE_API_URL=` [your Render backend URL]
5. [ ] Deployment status shows "Ready" (green)
6. [ ] **SAVED** the Vercel URL (e.g., https://landsight.vercel.app)

---

## Stage 6: Final Testing (10 mins)

1. [ ] Open Vercel URL in browser
2. [ ] Frontend loads without errors
3. [ ] Browser DevTools Console shows no errors
4. [ ] Can upload and classify an image
5. [ ] Image processing returns results
6. [ ] Map tiles load if applicable
7. [ ] No 502/504 errors in Network tab

---

## 🎉 Success! Your App is Live

- **Frontend**: [Your Vercel URL]
- **Backend API**: [Your Render URL]
- **Database**: PostgreSQL on Render

---

## 🆘 If Something Goes Wrong

Check these in order:

1. **502 Backend Error**
   - Check Render service logs for errors
   - Verify DATABASE_URL is correct in Render
   - Manual redeploy: Render dashboard → service → "Manual Deploy"

2. **Can't reach frontend**
   - Check Vercel deployment status
   - Clear browser cache (Ctrl+Shift+Delete)
   - Verify VITE_API_URL is correct

3. **API calls failing**
   - Check Network tab in DevTools
   - Verify backend VITE_API_URL matches Render URL exactly
   - Ensure CORS is enabled in backend

4. **Database connection error**
   - Verify DATABASE_URL format
   - Check it's set in Render environment variables
   - Test connection: Check Render logs for "connected to database"

---

**Follow this checklist step by step - don't skip any steps!**
