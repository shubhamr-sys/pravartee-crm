# Pravartee CRM — Frontend

Next.js authentication layer for the Pravartee CRM API.

## Setup

```bash
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

Open http://localhost:3034

Ensure the Django API is running at `http://127.0.0.1:8084`.

### Network access (same Wi‑Fi)

See [backend/DEVELOPMENT.md](../backend/DEVELOPMENT.md#access-from-another-device-on-your-network-phone-tablet-another-pc).

Quick version:

```bash
# Terminal 1 — backend (from backend/, after adding LAN IP to ALLOWED_HOSTS in .env)
python manage.py runserver 0.0.0.0:8084

# Terminal 2 — frontend (set NEXT_PUBLIC_API_URL in .env.local to http://YOUR_LAN_IP:8084)
npm run dev:network
```

Open `http://YOUR_LAN_IP:3034` on another device.

`next.config.ts` includes `allowedDevOrigins` for LAN IPs — **restart** `npm run dev:network` after changing it. Without this, login via IP does a page reload (`/login?`) instead of calling the API.

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
| `/reports/sales` | Protected (CEO & Sales Head) |
