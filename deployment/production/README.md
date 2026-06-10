# Pravartee CRM — Production on Ubuntu 24.04

HTTPS deployment with **Nginx**, **Gunicorn**, **Next.js**, and **PostgreSQL**.  
Fixes browser **“Not Secure”** warnings and enables **GPS** for attendance punch on phones.

## Architecture

```text
Internet (HTTPS :443)
        │
     Nginx  ── /api/, /admin/, /static/ ──► Gunicorn (127.0.0.1:8084) ──► Django
        │
        └── /* ──► Next.js (127.0.0.1:3034)
```

Users open: `https://crm.yourdomain.com`  
API and app share one origin → secure context → GPS works.

---

## 1. Server prerequisites

```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx \
  python3.12 python3.12-venv postgresql postgresql-contrib \
  git curl

curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

Open firewall:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

---

## 2. PostgreSQL

```bash
sudo -u postgres psql -v ON_ERROR_STOP=1 \
  -f /opt/pravartee-crm/deployment/postgresql/01_create_role_and_database.sql
sudo -u postgres psql -d pravartee_crm -v ON_ERROR_STOP=1 \
  -f /opt/pravartee-crm/deployment/postgresql/02_schema_grants.sql
```

Edit the password in `01_create_role_and_database.sql` before running.

---

## 3. Install application

```bash
sudo mkdir -p /opt/pravartee-crm
sudo chown "$USER":"$USER" /opt/pravartee-crm
git clone <your-repo-url> /opt/pravartee-crm
cd /opt/pravartee-crm

python3.12 -m venv backend/.venv
source backend/.venv/bin/activate
pip install -r backend/requirements.txt

cp deployment/production/env/backend.env.example backend/.env
# Edit backend/.env — SECRET_KEY, domain, DB password

cp deployment/production/env/frontend.env.production.example frontend/.env.production
# Edit — set NEXT_PUBLIC_API_URL=https://your-domain

cd frontend && npm ci && cd ..
```

---

## 4. Initial Django setup

```bash
cd /opt/pravartee-crm/backend
source .venv/bin/activate
export DJANGO_SETTINGS_MODULE=config.settings.production

python manage.py migrate
python manage.py seed_crm_data
python manage.py collectstatic --no-input
python manage.py createsuperuser
```

---

## 5. Build frontend

```bash
cd /opt/pravartee-crm/frontend
set -a && source .env.production && set +a
npm run build
```

---

## 6. Systemd services

```bash
sudo cp deployment/production/systemd/pravartee-backend.service /etc/systemd/system/
sudo cp deployment/production/systemd/pravartee-frontend.service /etc/systemd/system/

sudo chown -R www-data:www-data /opt/pravartee-crm
sudo systemctl daemon-reload
sudo systemctl enable pravartee-backend pravartee-frontend
sudo systemctl start pravartee-backend pravartee-frontend
```

Check:

```bash
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8084/api/v1/
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3034/
```

---

## 7. Nginx + HTTPS (Let’s Encrypt)

Replace `CRM_DOMAIN` in the config:

```bash
export CRM_DOMAIN=crm.pravarteesales.com
sed "s/CRM_DOMAIN/${CRM_DOMAIN}/g" deployment/production/nginx/pravartee-crm.conf \
  | sudo tee /etc/nginx/sites-available/pravartee-crm

sudo ln -sf /etc/nginx/sites-available/pravartee-crm /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

Obtain certificate:

```bash
sudo certbot --nginx -d crm.pravarteesales.com
```

Certbot auto-renews via systemd timer.

---

## 8. Verify

| URL | Expected |
|-----|----------|
| `https://crm.yourdomain.com` | Login page, padlock icon |
| `https://crm.yourdomain.com/api/v1/` | API (404 or DRF root is OK) |
| `https://crm.yourdomain.com/admin/` | Django admin |
| Attendance → Punch In | GPS permission prompt on phone |

---

## 9. Updates (redeploy)

```bash
cd /opt/pravartee-crm
git pull
chmod +x deployment/production/deploy.sh
./deployment/production/deploy.sh
```

---

## Environment checklist

| Variable | Example |
|----------|---------|
| `ALLOWED_HOSTS` | `crm.pravarteesales.com` |
| `CSRF_TRUSTED_ORIGINS` | `https://crm.pravarteesales.com` |
| `CORS_ALLOWED_ORIGINS` | `https://crm.pravarteesales.com` |
| `NEXT_PUBLIC_API_URL` | `https://crm.pravarteesales.com` |
| `CORS_ALLOW_ALL_ORIGINS` | `False` |
| `DEBUG` | `False` |
| `DB_SSLMODE` | `prefer` (local PG) or `require` (remote) |

---

## Security notes

- Superuser (`admin@...`) is excluded from CRM User Management — use Django `/admin/`.
- Business CEOs should have `is_superuser=False`.
- Never commit `.env` files.
- Point DNS **A record** to your server IP before running Certbot.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| 502 Bad Gateway | `sudo systemctl status pravartee-backend pravartee-frontend` |
| Login works on HTTP not HTTPS | Complete Certbot step; set `NEXT_PUBLIC_API_URL` to `https://...` and rebuild frontend |
| GPS still blocked | Must use `https://` URL, not `http://<ip>` |
| CSRF error on admin | Add domain to `CSRF_TRUSTED_ORIGINS` |
| Static files 404 | Run `python manage.py collectstatic`; check Nginx `alias` path |
