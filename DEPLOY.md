# Deployment Guide

The error you saw ("File not found") happens because **GitHub Pages only serves static HTML/CSS/JS files** — it cannot run the Node.js backend (server.js). The login, challenges, AI, analytics, and achievements ALL need the backend.

You have three real options. I recommend **Option 2** (Railway) because it gets you a working public URL in 5 minutes.

---

## ✅ Already fixed in this commit

- **`index.html`** at the project root — GitHub Pages now finds a homepage instead of erroring out. It redirects to `frontend/pages/loading.html`.
- **`.nojekyll`** — tells GitHub Pages to serve files as-is (no Jekyll processing).
- **`frontend/js/config.js`** — lets you point the frontend at a backend hosted elsewhere.
- **Auto-detect API base** — `app.js` now uses `window.ABOOD_API_BASE` if set, otherwise falls back to same-origin.

---

## Option 1: GitHub Pages — STATIC SHOWCASE ONLY ⚠️

What works: the landing page, the cinematic `demo.html`, the loading animation, page navigation.
What does **NOT** work: login, register, challenges, AI, analytics, social, achievements.

If you just want to show the design to people without real accounts:

1. Push the repo to GitHub (commit everything including `index.html` and `.nojekyll`).
2. Repo → **Settings → Pages → Source: main branch / root**.
3. Wait ~1 min. Your URL: `https://USERNAME.github.io/REPO-NAME/`.

To make login/etc. work too, you must also deploy the backend (Option 2 or 3) and edit `frontend/js/config.js`:

```js
window.ABOOD_API_BASE = 'https://your-backend.up.railway.app';
```

---

## Option 2: Railway — RECOMMENDED ⭐ (full app, free tier, 5 minutes)

Railway runs Node.js and serves your frontend too. One URL for everything.

### Step-by-step

1. **Push your project to GitHub** (private repo is fine).
2. Go to **railway.app** and sign in with GitHub (free).
3. Click **New Project → Deploy from GitHub repo** → pick your repo.
4. Railway auto-detects Node. In the service settings:
   - **Root directory:** `backend`
   - **Build command:** `npm install`
   - **Start command:** `node server.js`
5. Add an environment variable:
   - Key: `JWT_SECRET`  Value: any long random string (≥ 32 chars)
6. Click **Generate Domain** under Settings → Networking. You get a URL like `abood-test.up.railway.app`.
7. Visit it. Done — the whole site (including login + 400 challenges) works publicly.

### One thing to harden first

In `backend/server.js` line ~13, change:

```js
const JWT_SECRET = 'medplay-nexus-secret-change-in-production';
```

to:

```js
const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-secret';
```

So Railway's env variable is actually used in production.

---

## Option 3: Render — alternative to Railway

1. **render.com → New → Web Service** → connect GitHub.
2. Settings:
   - **Root Directory:** `backend`
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Environment:** add `JWT_SECRET` (long random string)
3. Free tier sleeps after 15 min of no traffic (first request after sleep takes ~30s to wake).

URL will be like `abood-test.onrender.com`.

---

## Option 4: Split — GitHub Pages frontend + Railway backend

Cleanest if you want to keep using GitHub Pages.

1. Deploy backend on Railway (Option 2). Note its URL.
2. Edit `frontend/js/config.js`:
   ```js
   window.ABOOD_API_BASE = 'https://abood-test.up.railway.app';
   ```
3. Push and let GitHub Pages serve the frontend.
4. Frontend requests will hit Railway. CORS is already enabled in `server.js` (`app.use(cors())`).

---

## After deploying — getting on Google search

1. Once your site has a stable public URL, register at **Google Search Console** (search.google.com/search-console).
2. **Add a property** → use the URL → verify ownership (DNS record OR a small `google-site-verification.html` file at the root).
3. Submit a sitemap. Quick sitemap you can create at the root as `sitemap.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://your-url/</loc></url>
  <url><loc>https://your-url/frontend/pages/landing.html</loc></url>
  <url><loc>https://your-url/frontend/pages/demo.html</loc></url>
</urlset>
```

4. It typically takes a few days to a few weeks before pages appear in search results.

To improve discoverability:
- Add `<meta name="description">` tags (already added in `index.html` and `landing.html`).
- Add Open Graph tags for social previews (already added in `index.html`).
- Get a real domain (Namecheap, ~$10/year) and point it at Railway → looks more legit than `*.up.railway.app`.

---

## What to commit / not commit

✅ **Commit**: everything except `backend/node_modules`, `backend/medplay.db`, and `.env` files.

Create `.gitignore` at the repo root:
```
backend/node_modules/
backend/medplay.db
.env
*.log
```

The database (`medplay.db`) will be re-created automatically when Railway starts the server, and the 400 challenges will be re-seeded.

---

## Quick troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| File not found on GH Pages | Missing `index.html` at root | Fixed — `index.html` now exists |
| Login does nothing on GH Pages | No backend reachable | Use Option 2 or 4 |
| `Failed to fetch` in console | Wrong `ABOOD_API_BASE` or CORS | Check URL in `config.js`, restart backend |
| Site loads but no challenges | DB didn't seed | Check Railway logs for `Seeded 400 total challenges` |
| Loading page hangs | JS error blocks redirect | Open DevTools → Console |
| "Invalid token" on every page | `JWT_SECRET` changes between restarts | Set env var on Railway so it stays constant |

---

## TL;DR

For the **fastest** public deployment:

1. Add `process.env.JWT_SECRET` to `server.js` (one line change).
2. Push to GitHub.
3. Railway → New Project from repo → root=`backend`, start=`node server.js`, env `JWT_SECRET=...`.
4. Generate domain → share the URL.

The whole app (frontend + 400 challenges + AI + analytics) will be live in 5 minutes for everyone.
