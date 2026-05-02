# Deployment Guide

This repo contains a Vite React frontend in `frontend/` and a FastAPI backend in `backend/`.

Files added to help deploy:
- [vercel.json](vercel.json) — Vercel build config for the frontend
- [render.yaml](render.yaml) — simple Render manifest to create a web service from the repo
- [backend/Dockerfile](backend/Dockerfile) — Docker image for the FastAPI backend

Quick steps — Frontend (Vercel)

1. Go to https://vercel.com and import this Git repository.
2. In the import settings set the project root to the repository root but ensure build points to `frontend`:

   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Root Directory: `frontend` (if asked)

3. Add any env vars the frontend needs via the Vercel dashboard.
4. Deploy — Vercel will run the build and serve the static site.

Quick steps — Backend (Render using Docker)

Option A — Render (recommended simple free option):

1. Create a free account at https://render.com.
2. Create a new Web Service and connect your repository.
3. When configuring the service:
   - Choose "Docker" (we included `backend/Dockerfile`).
   - Set the Dockerfile path to `backend/Dockerfile`.
   - Set the port (Render exposes `$PORT`, Dockerfile uses ${PORT:-8000}).
   - Set env vars (required): `GEMINI_API_KEY` (and any other keys from your `.env`).
4. Deploy. Render will build the Docker image and run the service.

Option B — Other free hosts

- Railway, Fly.io, or Railway can also run this backend; if you prefer those, you can either use the Dockerfile or use a Python service with start command:

  `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

Env variables

- Add any secrets (e.g., `GEMINI_API_KEY`) in the provider's dashboard; do NOT commit secrets to the repo.

Removing secrets from the repo

- If you accidentally committed `backend/.env`, remove it from the repo immediately:

   ```bash
   git rm --cached backend/.env
   git commit -m "Remove committed .env (secrets)"
   git push origin main
   ```

- To purge the secret from git history use the [BFG Repo Cleaner](https://rtyley.github.io/bfg-repo-cleaner/) or `git filter-repo`. Follow their docs carefully.

Notes and troubleshooting

- If your backend needs additional system libs, update the Dockerfile accordingly.
- Vercel auto-detects many frontends; using the `vercel.json` here forces the static-build to run from `frontend`.
- If you want, I can also add a GitHub Actions workflow to automatically deploy the backend to Render on push.
