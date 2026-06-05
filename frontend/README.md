# Pravartee CRM — Frontend

Next.js authentication layer for the Pravartee CRM API.

## Setup

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

Open http://localhost:3000

Ensure the Django API is running at `http://127.0.0.1:8000`.

## Auth features

- Email/password login (`POST /api/v1/auth/login/`)
- JWT access + refresh token storage in `localStorage`
- Automatic token refresh on `401`
- Session restore via `GET /api/v1/auth/me/`
- Protected routes with redirect to `/login`
- Logout with refresh token blacklist
- Role-aware navigation (CEO, Sales Head, Salesperson)

## Routes

| Route | Access |
|-------|--------|
| `/login` | Public |
| `/dashboard` | Protected |
| `/leads` | Protected |
| `/activities` | Protected |
| `/users` | Protected (CEO nav) |
| `/reports` | Protected (Sales Head nav) |
