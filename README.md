# NSS NMAMIT Web Application

A full-stack NSS member-zone application with a React frontend, FastAPI backend, MongoDB storage, Brevo email delivery, and Razorpay payments.

## Project structure

- `frontend/` — React application (Create React App + CRACO)
- `backend/` — FastAPI API using Motor/MongoDB
- `tests/` and `backend/tests/` — automated tests

## Prerequisites

- Node.js 18 or newer
- Yarn 1.22 (or npm)
- Python 3.10 or newer
- Access to the MongoDB database configured in `backend/.env`

## Environment setup

Local environment files are already present and ignored by Git: `backend/.env` and `frontend/.env`. Safe templates are provided as `backend/.env.example` and `frontend/.env.example`.

Never commit real API keys, database credentials, JWT secrets, or payment secrets. The backend requires MongoDB, JWT, initial admin, and frontend URL values. Brevo and Razorpay values enable email and payment features. The frontend uses `REACT_APP_BACKEND_URL` to locate the API.

## Install and run locally

Open two PowerShell terminals from the project root.

### Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements-local.txt
python -m uvicorn server:app --reload --host 127.0.0.1 --port 8000
```

The API is available at http://localhost:8000 and its interactive documentation at http://localhost:8000/docs.

### Frontend

```powershell
cd frontend
yarn install
yarn start
```

If Yarn is unavailable, use `npm install` followed by `npm start`. Open http://localhost:3000.

For npm 7 or newer, if the legacy Create React App peer dependencies conflict, install with `npm install --legacy-peer-deps`.

## Initial local accounts

On backend startup, the accounts configured by `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` and `OWNER_EMAIL` / `OWNER_PASSWORD` are created or updated. Change the placeholder local passwords in `backend/.env` before sharing or deploying the application.

## Verification

```powershell
# Backend tests
cd backend
.\.venv\Scripts\python.exe -m pytest

# Frontend production build
cd frontend
yarn build
```

## Security notes

- Keep all `.env` files local; the repository `.gitignore` excludes them.
- Use test-mode Razorpay credentials for local development whenever possible.
- Rotate any credential pasted into chat, logs, or another exposed location before production use.
- Restrict production CORS origins instead of allowing all origins.
