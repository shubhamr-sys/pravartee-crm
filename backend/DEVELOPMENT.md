# Pravartee CRM — Development Setup

## Prerequisites

- Python 3.12
- PostgreSQL 16+ (local or Docker — see [deployment/postgresql/README.md](../deployment/postgresql/README.md))
- Git

## 1. Clone and enter the backend

```bash
cd pravartee-crm/backend
```

## 2. Create a virtual environment

```bash
python3.12 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install --upgrade pip
pip install -r requirements.txt
```

## 3. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` and set at minimum:

- `SECRET_KEY` — generate with: `python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"`
- `DB_PASSWORD` — must match the `crm_user` password from PostgreSQL setup

`python-decouple` reads `.env` from the current working directory when you run `manage.py` from `backend/`.

Default database credentials:

| Variable | Value |
|----------|--------|
| `DB_NAME` | `pravartee_crm` |
| `DB_USER` | `crm_user` |

## 4. Provision PostgreSQL

Choose one method (full guide: [deployment/postgresql/README.md](../deployment/postgresql/README.md)):

**Docker:**

```bash
cd deployment/postgresql
export POSTGRES_PASSWORD='your_strong_password'
docker compose up -d
```

**Native SQL:**

```bash
psql -U postgres -f deployment/postgresql/01_create_role_and_database.sql
psql -U postgres -d pravartee_crm -f deployment/postgresql/02_schema_grants.sql
```

## 5. Test connection

```bash
python manage.py test_db_connection
python manage.py check --database default
```

## 6. Run migrations

```bash
python manage.py migrate
```

## 7. Seed pipeline stages and categories

```bash
python manage.py seed_crm_data
```

## 8. Create a superuser

```bash
python manage.py createsuperuser
```

Set role in Django admin after creation, or extend `createsuperuser` in a later task.

## 9. Run the development server

```bash
python manage.py runserver
```

- Admin: http://127.0.0.1:8000/admin/
- API root: http://127.0.0.1:8000/api/v1/

### Access from another device on your network (phone, tablet, another PC)

1. **Find your computer’s LAN IP** (macOS):

   ```bash
   ipconfig getifaddr en0
   ```

   Example: `192.168.1.100`

2. **Backend** — add that IP to `ALLOWED_HOSTS` in `.env`:

   ```env
   ALLOWED_HOSTS=localhost,127.0.0.1,192.168.1.100
   ```

   Start Django bound to all interfaces:

   ```bash
   python manage.py runserver 0.0.0.0:8000
   ```

3. **Frontend** — copy and edit env (use the same LAN IP):

   ```bash
   cd ../frontend
   cp .env.local.example .env.local
   ```

   Set in `.env.local`:

   ```env
   NEXT_PUBLIC_API_URL=http://192.168.1.100:8000
   ```

   Start Next.js on the network:

   ```bash
   npm run dev:network
   ```

4. **On the other device** (same Wi‑Fi), open:

   - App: `http://192.168.1.100:3000`
   - API (optional): `http://192.168.1.100:8000/api/v1/`

5. **If it doesn’t connect**, allow incoming connections on ports **3000** and **8000** in your OS firewall.

> Development only. For production, use HTTPS, strict `ALLOWED_HOSTS`, and do not use `CORS_ALLOW_ALL_ORIGINS`.

### API endpoints (initial)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/accounts/me/` | Current user |
| GET/POST | `/api/v1/leads/` | List / create leads |
| GET/PATCH/DELETE | `/api/v1/leads/<uuid>/` | Lead detail |
| GET | `/api/v1/leads/categories/` | Product categories |
| GET | `/api/v1/leads/stages/` | Pipeline stages |
| GET | `/api/v1/activities/` | All activities |
| GET | `/api/v1/activities/lead/<uuid>/` | Activities for a lead |
| GET | `/api/v1/dashboard/summary/` | CEO dashboard metrics |

Log in via admin or session auth before calling protected API endpoints.

## Settings modules

| Module | Use |
|--------|-----|
| `config.settings.development` | Local development (default in `manage.py`) |
| `config.settings.production` | Production (`wsgi.py` default) |

Override for production:

```bash
export DJANGO_SETTINGS_MODULE=config.settings.production
```

## Project layout

```text
backend/
├── manage.py
├── requirements.txt
├── .env.example
├── config/                 # Project settings & URLs
│   └── settings/
│       ├── base.py
│       ├── development.py
│       └── production.py
└── apps/
    ├── core/               # UUID & timestamp base models
    ├── accounts/           # Custom User model
    ├── leads/              # Leads, stages, categories
    ├── activities/         # Audit trail
    └── dashboard/          # CEO metrics
```

## Common commands

```bash
python manage.py makemigrations
python manage.py migrate
python manage.py check
python manage.py test
python manage.py collectstatic   # production
```

## Production notes

- Set `DJANGO_SETTINGS_MODULE=config.settings.production`
- Set `DEBUG=False` and a strong `SECRET_KEY`
- Use Gunicorn behind Nginx
- Run `collectstatic` before deploy
- Configure PostgreSQL backups and `ALLOWED_HOSTS`
