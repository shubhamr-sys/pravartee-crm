# PostgreSQL Setup — Pravartee CRM

Production-oriented PostgreSQL **16+** configuration for Django 5.x with **python-decouple**.

| Setting | Value |
|---------|--------|
| Database | `pravartee_crm` |
| Application user | `crm_user` |
| Encoding | UTF-8 |
| Timezone | UTC |

---

## 1. PostgreSQL SQL commands

### Option A — Two-step scripts (recommended for bare-metal / VPS)

**Step 1** — Edit the password in `01_create_role_and_database.sql`, then run as superuser:

```bash
psql -U postgres -v ON_ERROR_STOP=1 \
  -f deployment/postgresql/01_create_role_and_database.sql
```

**Step 2** — Schema grants (connected to the new database):

```bash
psql -U postgres -d pravartee_crm -v ON_ERROR_STOP=1 \
  -f deployment/postgresql/02_schema_grants.sql
```

### Option B — Single psql session with password variable

```bash
psql -U postgres -v ON_ERROR_STOP=1 \
  -v crm_password="'YourStrongPasswordHere'" \
  -f deployment/postgresql/init_all.sql
```

### Option C — Manual SQL (superuser)

```sql
CREATE ROLE crm_user WITH
    LOGIN
    PASSWORD 'YourStrongPasswordHere'
    NOSUPERUSER
    NOCREATEDB
    NOCREATEROLE
    INHERIT
    CONNECTION LIMIT 50;

CREATE DATABASE pravartee_crm
    WITH
    OWNER = crm_user
    ENCODING = 'UTF8'
    TEMPLATE = template0;

GRANT CONNECT, TEMPORARY ON DATABASE pravartee_crm TO crm_user;
```

Then connect to `pravartee_crm` and run `02_schema_grants.sql`.

### Option D — Docker (local development)

```bash
cd deployment/postgresql
export POSTGRES_PASSWORD='YourStrongPasswordHere'
docker compose up -d
docker compose ps    # wait for healthy
```

Docker creates `pravartee_crm`, user `crm_user`, and the password from `POSTGRES_PASSWORD` automatically.

---

## 2. `.env` configuration

From `backend/`:

```bash
cp .env.example .env
```

Required database variables:

```env
DB_NAME=pravartee_crm
DB_USER=crm_user
DB_PASSWORD=YourStrongPasswordHere
DB_HOST=localhost
DB_PORT=5432
DB_CONN_MAX_AGE=60
DB_CONN_HEALTH_CHECKS=True
DB_CONNECT_TIMEOUT=10
DB_OPTIONS=-c search_path=public
DB_SSLMODE=
```

**Production** (`DJANGO_SETTINGS_MODULE=config.settings.production`):

```env
DEBUG=False
DB_SSLMODE=require
DB_HOST=your-db-host
```

`python-decouple` loads `.env` when you run `manage.py` from the `backend/` directory.

---

## 3. Django `DATABASES` configuration

Settings are built in `backend/config/settings/db.py` and imported in:

- `config.settings.base` — development / shared defaults
- `config.settings.production` — enforces `DB_SSLMODE=require` by default

```python
# config/settings/db.py (summary)
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": "pravartee_crm",
        "USER": "crm_user",
        "PASSWORD": "<from DB_PASSWORD>",
        "HOST": "localhost",
        "PORT": "5432",
        "CONN_MAX_AGE": 60,
        "CONN_HEALTH_CHECKS": True,
        "OPTIONS": {
            "connect_timeout": 10,
            "options": "-c search_path=public",
            # "sslmode": "require"  # production
        },
    }
}
```

**Important:** Run Django migrations **as `crm_user`** so tables are owned by the application role:

```bash
# .env must use DB_USER=crm_user
python manage.py migrate
```

---

## 4. Connection testing commands

### Django management command

```bash
cd backend
source .venv/bin/activate
python manage.py test_db_connection
```

### Django system check (includes database)

```bash
python manage.py check --database default
```

### Native `psql`

```bash
psql -h localhost -p 5432 -U crm_user -d pravartee_crm -c "SELECT 1 AS ok;"
```

You will be prompted for `DB_PASSWORD` unless `PGPASSWORD` is set:

```bash
export PGPASSWORD='YourStrongPasswordHere'
psql -h localhost -U crm_user -d pravartee_crm -c "SELECT version();"
```

### Docker health

```bash
cd deployment/postgresql
docker compose exec postgres pg_isready -U crm_user -d pravartee_crm
```

---

## 5. Migration commands

Always activate the virtualenv and use `crm_user` credentials in `.env`:

```bash
cd backend
source .venv/bin/activate

# Verify connection first
python manage.py test_db_connection

# Apply all migrations
python manage.py migrate

# Optional: show migration plan without applying
python manage.py migrate --plan

# Seed reference data (stages, categories)
python manage.py seed_crm_data

# Create admin user
python manage.py createsuperuser
```

### New migrations after model changes

```bash
python manage.py makemigrations accounts leads activities
python manage.py migrate
```

### Production deploy

```bash
export DJANGO_SETTINGS_MODULE=config.settings.production
python manage.py migrate --no-input
python manage.py collectstatic --no-input
```

---

## 6. Troubleshooting

| Symptom | Likely cause | Fix |
|---------|----------------|-----|
| `FATAL: role "crm_user" does not exist` | User not created | Run `01_create_role_and_database.sql` |
| `FATAL: database "pravartee_crm" does not exist` | DB not created | Run Part 1 SQL or `docker compose up` |
| `password authentication failed` | Wrong `.env` password | Align `DB_PASSWORD` with `ALTER ROLE ... PASSWORD` |
| `permission denied for schema public` | Grants missing | Run `02_schema_grants.sql` |
| `relation does not exist` | Migrations not applied | `python manage.py migrate` |
| `SSL error` / `sslmode` | Prod SSL required | Set `DB_SSLMODE=require` or disable only in local dev |
| `connection refused` | PostgreSQL not running | `brew services start postgresql@16` or `docker compose up -d` |
| `too many connections` | Pool + PG limit | Lower `DB_CONN_MAX_AGE` or raise `max_connections` |
| Migrations fail as `postgres` but app uses `crm_user` | Table ownership | Re-run migrations as `crm_user` or `GRANT` on tables |
| `decouple.UndefinedValueError: DB_PASSWORD` | Missing `.env` | `cp .env.example .env` and set `DB_PASSWORD` |

### Verify role and database exist

```sql
\du crm_user
\l pravartee_crm
```

### Reset database (development only)

```bash
psql -U postgres -c "DROP DATABASE IF EXISTS pravartee_crm;"
psql -U postgres -c "DROP ROLE IF EXISTS crm_user;"
# Re-run provisioning scripts
```

### macOS — install PostgreSQL 16

```bash
brew install postgresql@16
brew services start postgresql@16
```

### Logs

- Native: check PostgreSQL log directory (`log_directory` in `SHOW config_file;`)
- Docker: `docker compose logs -f postgres`

---

## Security checklist (production)

- [ ] Strong unique `DB_PASSWORD` (32+ characters)
- [ ] `DB_SSLMODE=require` (or `verify-full` with CA cert)
- [ ] `crm_user` is not a superuser
- [ ] Database not exposed publicly without firewall / VPN
- [ ] Daily automated backups (`pg_dump` / managed service snapshots)
- [ ] `DEBUG=False` in production settings
- [ ] Rotate credentials periodically

---

## Related files

| File | Purpose |
|------|---------|
| `01_create_role_and_database.sql` | Role + database |
| `02_schema_grants.sql` | Schema privileges + role limits |
| `init_all.sql` | Combined psql bootstrap |
| `docker-compose.yml` | Local PostgreSQL 16 |
| `backend/.env.example` | Application env template |
| `backend/config/settings/db.py` | Django DATABASES builder |
| `backend/DEVELOPMENT.md` | Full dev workflow |
