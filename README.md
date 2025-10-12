# GritGirls

- Frontend: Vite + React (`client/`)
- Backend: Flask + SQLAlchemy (`server/`)
- Dev servers:
  - API: http://127.0.0.1:8000
  - UI:  http://localhost:5173

## Quick start
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt   # when you add one
python server/run.py

cd client
npm install
npm run dev
