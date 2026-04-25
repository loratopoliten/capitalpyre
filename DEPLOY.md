# 🚀 Capital Pyre — Free Deployment Guide
## Vercel + Supabase + Railway + Render

Total cost: **$0/month**

---

## Step 1 — Supabase (Database)

1. Go to [supabase.com](https://supabase.com) → Sign up free
2. Create new project → choose a region close to Botswana (choose **South Africa** or **Europe**)
3. Wait for project to provision (~2 minutes)
4. Go to **SQL Editor** → paste the contents of `db/migrations/001_schema_postgres.sql` → Run
5. Paste `db/seeds/001_seed_postgres.sql` → Run
6. Go to **Settings → Database** → copy the **Connection string (URI)**
   - It looks like: `postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres`
7. Save this — you'll need it for Railway

---

## Step 2 — Railway (Backend API)

1. Go to [railway.app](https://railway.app) → Sign up with GitHub
2. Click **New Project → Deploy from GitHub repo**
3. Select `loratopoliten/capitalpyre`
4. Click **Add service** → select the repo → set **Root Directory** to `backend`
5. Add these environment variables:
   ```
   DB_CLIENT=pg
   DATABASE_URL=<your Supabase connection string>
   JWT_SECRET=<generate a long random string>
   NODE_ENV=production
   CLIENT_URL=https://your-app.vercel.app
   CRS_SERVICE_URL=https://your-scoring.onrender.com
   PORT=5000
   ```
6. Deploy — Railway will build and give you a URL like `https://capitalpyre-backend.railway.app`
7. Run the password reset: in Railway dashboard → **Shell** tab → run:
   ```
   node scripts/reset_admin.js
   ```
   Wait — scripts folder is in root. Instead run directly:
   ```
   node -e "const b=require('bcryptjs');b.hash('Admin@1234',12).then(h=>{require('pg').Pool({connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:false}}).query('UPDATE users SET password_hash=$1 WHERE email=$2',[h,'admin@capitalpyre.com']).then(()=>process.exit())})"
   ```

---

## Step 3 — Render (CRS Scoring Service)

1. Go to [render.com](https://render.com) → Sign up with GitHub
2. Click **New → Web Service**
3. Connect `loratopoliten/capitalpyre` → set **Root Directory** to `scoring`
4. Runtime: **Python 3**
5. Build command: `pip install -r requirements.txt`
6. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
7. Instance type: **Free**
8. Deploy → copy the URL (e.g. `https://capitalpyre-scoring.onrender.com`)
9. Add this URL as `CRS_SERVICE_URL` in Railway environment variables

---

## Step 4 — Vercel (Frontend)

1. Go to [vercel.com](https://vercel.com) → Sign up with GitHub
2. Click **New Project** → import `loratopoliten/capitalpyre`
3. Set **Root Directory** to `frontend`
4. Add environment variable:
   ```
   VITE_API_URL=https://your-backend.railway.app
   ```
5. Deploy → Vercel gives you a URL like `https://capitalpyre.vercel.app`
6. Copy this URL and update `CLIENT_URL` in Railway environment variables
7. Update `frontend/vercel.json` — replace the Railway URL with your actual one:
   ```json
   { "source": "/api/(.*)", "destination": "https://YOUR-RAILWAY-URL.railway.app/api/$1" }
   ```
8. Push the change → Vercel auto-redeploys

---

## Done ✅

Your app is live at `https://capitalpyre.vercel.app`

- Frontend: Vercel (free, forever)
- Backend: Railway (~$1-2/month within $5 free credit)
- Database: Supabase (free, forever)
- Scoring: Render (free, 30s cold start on compute)

---

## Custom domain (optional)

In Vercel → Project Settings → Domains → add `capitalpyre.co.bw` or any domain you own.
