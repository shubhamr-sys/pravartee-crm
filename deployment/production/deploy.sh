#!/usr/bin/env bash
# Build and deploy Pravartee CRM on Ubuntu (run on the server after initial setup).
# Usage: sudo -u www-data ./deployment/production/deploy.sh
# Or from repo root as a user with write access to /opt/pravartee-crm

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

echo "==> Backend: install dependencies"
cd "$ROOT/backend"
source .venv/bin/activate
pip install -q -r requirements.txt

echo "==> Backend: migrate & collect static"
export DJANGO_SETTINGS_MODULE=config.settings.production
python manage.py migrate --no-input
python manage.py collectstatic --no-input

echo "==> Frontend: install & production build"
cd "$ROOT/frontend"
npm ci
set -a
# shellcheck disable=SC1091
source .env.production
set +a
npm run build

echo "==> Reload services"
if systemctl is-active --quiet pravartee-backend; then
  sudo systemctl restart pravartee-backend
fi
if systemctl is-active --quiet pravartee-frontend; then
  sudo systemctl restart pravartee-frontend
fi
if systemctl is-active --quiet nginx; then
  sudo nginx -t && sudo systemctl reload nginx
fi

echo "Deploy complete."
