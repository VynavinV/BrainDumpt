# Braindump Start Here

## What Is Already Created
- Backend FastAPI skeleton with Gemini AI synthesize endpoints
- Full architecture and 8-hour plan
- Real-time React frontend with tldraw canvas

## 1) Open Two Terminal Tabs

### Terminal 1: START BACKEND
```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
*(If you haven't yet, you can add your GEMINI_API_KEY to backend/.env)*

### Terminal 2: START FRONTEND
```bash
cd frontend
npm run dev
```

## 2) Open the app
Once the frontend command runs, it will give you a local URL (usually http://localhost:5173/ or http://localhost:5174/).
Command/Ctrl click that link.

## Notes
- If `npm run dev` complains about `@tldraw/tldraw` resolution errors, run `npm install --legacy-peer-deps` inside `frontend`.
- If uvicorn complains port 8000 is in use, run `killall -9 python`
