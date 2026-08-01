# Suburban Insight

Helping newcomers choose where to live in Melbourne. FIT3163 DS01 Project 7.

This is the **initial scaffold** — see `docs/roadmap.md` for what's built vs.
planned, `docs/requirements.md` for the full requirements traced to the
project proposal, and `docs/architecture.md` for the technical design.

## Running the backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

Visit `http://localhost:8000/health` — should return `{"status": "ok"}`.

Run tests:

```bash
pytest
```

## Running the frontend

No build step — it's static HTML/CSS/JS. Serve it with any static file
server, e.g.:

```bash
cd frontend
python3 -m http.server 5500
```

Visit `http://localhost:5500`. The page will call the backend's `/health`
endpoint and show whether it's connected — make sure the backend is running
first, and that `frontend/js/config.js`'s `API_BASE_URL` matches where it's
running.

## Status

See the end-of-task report in the conversation (or `docs/roadmap.md`) for
what currently works and what's next.
