# Instagram Clone

Full-stack Instagram clone built with FastAPI + React.

## Quick Start

### Backend

```bash
cd FastapiINSTAGRAM
.venv\Scripts\pip install -r requirements.txt
.venv\Scripts\python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

API docs: http://127.0.0.1:8000/docs

### Frontend

```bash
cd frontend
npm install
npm run dev
```

App: http://localhost:5173

## Tech Stack

- **Backend:** FastAPI, SQLAlchemy, SQLite, JWT, WebSockets
- **Frontend:** React, TypeScript, Vite, TailwindCSS, Zustand, React Query

See [TZ.md](./TZ.md) for full technical specification.
