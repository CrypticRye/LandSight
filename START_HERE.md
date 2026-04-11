# 🚀 START HERE - Deployment Overview

**Goal**: Deploy your Flask + React app online for testing  
**Time Required**: 30-45 minutes  
**Cost**: FREE (Render + Vercel both have free tiers)  
**Difficulty**: Beginner-friendly ✓

---

## What You Have Right Now

Your app has **3 parts**:

```
Your Browser
    ↓
Frontend (React + Vite) 
    ↓
Backend (Flask API)
    ↓
Database (PostgreSQL)
```

**Currently**: All running on `localhost` (only you can access)  
**Goal**: All running online (anyone can access)

---

## Where It Will Live

After deployment, your 3 parts move to different services:

| Component | Current | After Deployment |
|-----------|---------|------------------|
| **Frontend** | `localhost:5173` | **Vercel** (Free hosting) |
| **Backend** | `localhost:5000` | **Render** (Free hosting) |
| **Database** | Your computer | **Render's DB** (Free tier) |

---

## What Was Prepared For You

✅ **Files already created** in your project:
- `backend/Procfile` - tells Render how to start Flask
- `backend/render-build.sh` - build script for Render
- `backend/.gitignore` - keeps secrets out of GitHub
- `backend/.env.production` - template for environment variables
- `frontend/.env.production` - connects frontend to backend

✅ **Your existing code**:
- Already has CORS configured ✓
- Frontend already reads from env variables ✓
- Requirements.txt has everything needed ✓

---

## 3 Documents to Guide You

### 📋 **Read in this order:**

1. **This file** (you're reading it now) - Overview
2. **QUICK_CHECKLIST.md** - Step-by-step actions (follow this!)
3. **DEPLOYMENT_GUIDE.md** - Detailed explanations (refer if stuck)
4. **SETUP_FOR_DEPLOYMENT.md** - Why each file exists

---

## Quick Overview of Steps

### Step 1: Prepare (GitHub)
```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```
(**Time**: 2 mins)

### Step 2: Database Setup (Render)
1. Sign up at render.com (FREE)
2. Create PostgreSQL database
3. Copy the database URL
(**Time**: 10 mins)

### Step 3: Deploy Backend (Render)
1. Create Web Service on Render
2. Connect your GitHub repo
3. Set environment variables
4. Deploy!
(**Time**: 15 mins + 10 min wait)

### Step 4: Update Frontend Config
1. Copy your backend URL from Render
2. Paste into `frontend/.env.production`
3. Push to GitHub
(**Time**: 2 mins)

### Step 5: Deploy Frontend (Vercel)
1. Sign up at vercel.com (FREE)
2. Import your GitHub repo
3. Set environment variables
4. Deploy!
(**Time**: 5 mins + 5 min wait)

### Step 6: Test
1. Test backend: Visit `/api/health`
2. Upload test image
3. Verify it works
(**Time**: 5 mins)

---

## The KEY Point: Environment Variables

**Why this matters**: Your code needs to know:
- WHERE is the backend? (backend URL)
- HOW do I connect to database? (database credentials)

**How it works**:
1. You create `.env.production` file (template) ← Already done ✓
2. You enter values in Render/Vercel dashboards (secure)
3. Render/Vercel pass them to your app (when it runs)

**Why not in code?** Because GitHub is public, and credentials would be stolen!

---

## Important Files You MUST NOT Forget

### Before Deploying - Fill These Out:

#### 1. `backend/.env.production`
Fill in the values (copy from Render dashboard when you create database):
```
DATABASE_URL=postgresql://...
SECRET_KEY=generate-random-string
COPERNICUS_USER=your-email
COPERNICUS_PASS=your-password
```

#### 2. `frontend/.env.production`
Update after backend is deployed:
```
VITE_API_URL=https://your-backend-url.onrender.com/api
```

### During Deployment - Use These:

#### 3. `backend/Procfile`
✅ Already correct - don't change

#### 4. `backend/render-build.sh`
✅ Already correct - don't change

#### 5. `backend/.gitignore`
✅ Already created - makes sure `.env` never leaks to GitHub

---

## Common Questions

**Q: Will my models/datasets upload to the cloud?**  
A: Yes! If they're in `backend/models/` and `backend/datasets/`, they go too. (If too large, might need different approach - see DEPLOYMENT_GUIDE.md)

**Q: Do I need a credit card?**  
A: No! Both Render and Vercel have free tiers. No credit card needed.

**Q: How long until it goes live?**  
A: Usually 10-15 minutes for first deployment. After that, updates take 2-5 mins when you `git push`.

**Q: What if it breaks?**  
A: Check the logs in Render/Vercel dashboards - they show exact error messages.

**Q: Can people access it from their phones?**  
A: Yes! Just share the Vercel URL. Works on any device.

**Q: Can I share it with 100 people?**  
A: Yes! Free tier handles ~150k requests/month (way more than enough for testing).

---

## Next Steps

### Right Now:
1. [ ] Read **QUICK_CHECKLIST.md** (next)
2. [ ] Have these saved somewhere:
   - Render.com account credentials
   - Vercel.com account credentials
   - GitHub account credentials

### Then Follow QUICK_CHECKLIST.md:
1. Prepare project (push to GitHub)
2. Create database on Render
3. Deploy backend to Render
4. Update frontend config
5. Deploy frontend to Vercel
6. Test everything

### Estimated Timeline:
- **5 mins**: Prepare locally
- **10 mins**: Create database
- **15 mins**: Deploy backend (+ 10 min wait)
- **2 mins**: Update frontend
- **5 mins**: Deploy frontend (+ 5 min wait)
- **5 mins**: Test

**Total**: ~50 mins ⏱️

---

## Troubleshooting Quick Links

- Backend won't deploy? → See "Common Errors & Fixes" in DEPLOYMENT_GUIDE.md
- Frontend won't build? → See "Common Errors & Fixes" in DEPLOYMENT_GUIDE.md
- API calls fail? → See "Testing" section in DEPLOYMENT_GUIDE.md
- CORS errors? → See "Phase 4" in DEPLOYMENT_GUIDE.md

---

## Success Looks Like This ✅

When you're done, you'll have:

```
Frontend URL: https://landsight-frontend.vercel.app
Backend URL:  https://landsight-backend.onrender.com

You can:
✓ Share frontend URL with anyone
✓ They access your app from any device
✓ They upload images
✓ They get predictions
✓ It all works!
```

---

## Your Deployment Roadmap

```
You (on computer)          Render.com              Vercel.com
        ↓                      ↓                       ↓
    Push to Git ────→ Database (PostgreSQL)          
                      Backend (Flask API)
                            ↑ ────→ Frontend (React)
                            ↑            ↓
                    connects            ↓
                            ↓ ────← API calls
                            
Result:
┌─────────────────────────────────────────────────┐
│  Browser → Frontend (Vercel)                     │
│             → Backend (Render)                   │
│             → Database (Render PostgreSQL)       │
└─────────────────────────────────────────────────┘

THIS IS WHAT HAPPENS AFTER DEPLOYMENT! 🎉
```

---

## 👉 Next Step: Open & Follow QUICK_CHECKLIST.md

That file has the exact steps you need to follow in order.

**Reading time**: 2 minutes  
**Execution time**: 30-45 minutes

Good luck! You've got this! 🚀

---

## Still Have Questions?

| Question | Answer |
|----------|--------|
| Where do I start? | QUICK_CHECKLIST.md (read it NOW!) |
| I don't understand a step | DEPLOYMENT_GUIDE.md (detailed explanations) |
| Why is a file needed? | SETUP_FOR_DEPLOYMENT.md (explanations) |
| Something went wrong | Check logs in Render/Vercel, then DEPLOYMENT_GUIDE.md |
| It actually worked! | Go celebrate, then test with real users! 🎉 |

