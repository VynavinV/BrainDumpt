# BrainDumpt Start Here

## 1) Open Two Terminal Tabs

### Terminal 1: START BACKEND
```bash
cd backend
../.venv/bin/python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Terminal 2: START FRONTEND
```bash
cd frontend
npm run dev
```

## 2) Open the app
Once the frontend command runs, it will give you a local URL (usually http://localhost:5173/).
Command/Ctrl click that link.

## 3) Multiplayer
- First visit: enter a username, a fresh board is created and you land at `/?board=<id>`.
- Click **Share** in the top bar to copy the link.
- Anyone who opens the link enters their username and joins live.
- Edits, drags, refines, synthesis, audio, images, etc. all sync in real time.
- Live cursors are shown for each connected user.

If you need a reset, delete `backend/boards_data/` and restart.
