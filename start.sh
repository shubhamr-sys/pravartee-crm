#!/usr/bin/env bash
# Pravartee CRM — plug-and-play dev launcher (Ubuntu / Linux / macOS)
# Usage: ./start.sh
# Configure ports in .env (copy from .env.example)

set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

# shellcheck source=scripts/lib.sh
source "$ROOT/scripts/lib.sh"

RUN_DIR="$ROOT/.run"
mkdir -p "$RUN_DIR"

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "Created .env from .env.example — review ports/passwords, then run ./start.sh again."
  exit 0
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

BACKEND_PORT="${BACKEND_PORT:-8084}"
FRONTEND_PORT="${FRONTEND_PORT:-3034}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
BACKEND_HOST="${BACKEND_HOST:-0.0.0.0}"
FRONTEND_HOST="${FRONTEND_HOST:-0.0.0.0}"
START_POSTGRES="${START_POSTGRES:-true}"
RUN_SETUP="${RUN_SETUP:-true}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-change_me_strong_password}"
DEBUG="${DEBUG:-True}"
ENABLE_HTTPS="${ENABLE_HTTPS:-false}"

APP_HOST="$(detect_app_host)"
if [[ "$ENABLE_HTTPS" == "true" ]]; then
  FRONTEND_SCHEME="https"
  # API is proxied through Next.js on the same origin (see frontend/next.config.ts).
  API_URL="${FRONTEND_SCHEME}://${APP_HOST}:${FRONTEND_PORT}"
  FRONTEND_URL="${FRONTEND_SCHEME}://${APP_HOST}:${FRONTEND_PORT}"
else
  FRONTEND_SCHEME="http"
  API_URL="http://${APP_HOST}:${BACKEND_PORT}"
  FRONTEND_URL="http://${APP_HOST}:${FRONTEND_PORT}"
fi

echo "=============================================="
echo " Pravartee CRM"
echo " Backend:  http://127.0.0.1:${BACKEND_PORT} (proxied at /api when HTTPS)"
echo " Frontend: ${FRONTEND_URL}"
if [[ "$ENABLE_HTTPS" == "true" ]]; then
  echo " GPS:      enabled (HTTPS — accept the self-signed cert on each device)"
else
  echo " GPS:      localhost only — use ./start-https.sh for LAN devices"
fi
echo "=============================================="

# --- PostgreSQL (Docker) ---
if [[ "$START_POSTGRES" == "true" ]]; then
  if command -v docker >/dev/null 2>&1; then
    echo "Starting PostgreSQL on port ${POSTGRES_PORT}..."
    export POSTGRES_PASSWORD
    export POSTGRES_PORT
    (cd "$ROOT/deployment/postgresql" && docker compose up -d)
    echo "Waiting for PostgreSQL..."
    for _ in $(seq 1 30); do
      if (cd "$ROOT/deployment/postgresql" && docker compose exec -T postgres pg_isready -U crm_user -d pravartee_crm >/dev/null 2>&1); then
        break
      fi
      sleep 1
    done
  else
    echo "Warning: docker not found — assuming PostgreSQL is already running on port ${POSTGRES_PORT}"
  fi
fi

# --- Backend venv ---
if [[ ! -d backend/.venv ]]; then
  echo "Creating Python virtual environment..."
  python3.12 -m venv backend/.venv 2>/dev/null || python3 -m venv backend/.venv
fi

# shellcheck disable=SC1091
source backend/.venv/bin/activate

pip install -q --upgrade pip
pip install -q -r backend/requirements.txt

# --- Backend .env ---
if [[ ! -f backend/.env ]]; then
  cp backend/.env.example backend/.env
fi

SECRET_KEY="${SECRET_KEY:-}"
if [[ "$SECRET_KEY" == "change-me-generate-a-random-secret-key" || -z "$SECRET_KEY" ]]; then
  SECRET_KEY="$(generate_secret_key)"
fi

CORS_ORIGINS="http://localhost:${FRONTEND_PORT},http://127.0.0.1:${FRONTEND_PORT},http://${APP_HOST}:${FRONTEND_PORT}"
if [[ "$ENABLE_HTTPS" == "true" ]]; then
  CORS_ORIGINS="${CORS_ORIGINS},https://localhost:${FRONTEND_PORT},https://127.0.0.1:${FRONTEND_PORT},https://${APP_HOST}:${FRONTEND_PORT}"
fi
ALLOWED="localhost,127.0.0.1,${APP_HOST}"

set_env_value backend/.env DJANGO_SETTINGS_MODULE "config.settings.development"
set_env_value backend/.env SECRET_KEY "$SECRET_KEY"
set_env_value backend/.env DEBUG "$DEBUG"
set_env_value backend/.env ALLOWED_HOSTS "$ALLOWED"
set_env_value backend/.env DB_NAME "pravartee_crm"
set_env_value backend/.env DB_USER "crm_user"
set_env_value backend/.env DB_PASSWORD "$POSTGRES_PASSWORD"
set_env_value backend/.env DB_HOST "localhost"
set_env_value backend/.env DB_PORT "$POSTGRES_PORT"
set_env_value backend/.env CORS_ALLOWED_ORIGINS "$CORS_ORIGINS"
set_env_value backend/.env CORS_ALLOW_ALL_ORIGINS "True"

# --- Frontend .env.local ---
cat > frontend/.env.local <<EOF
# Browser uses same hostname as the page + BACKEND_PORT (localhost or LAN IP).
NEXT_PUBLIC_BACKEND_PORT=${BACKEND_PORT}
BACKEND_PORT=${BACKEND_PORT}
# SSR / server-side fallback only
NEXT_PUBLIC_API_URL=http://127.0.0.1:${BACKEND_PORT}
NEXT_PUBLIC_USE_SAME_ORIGIN_API=true
LAN_DEV_ORIGIN=${APP_HOST}
EOF

# --- Setup DB ---
if [[ "$RUN_SETUP" == "true" ]]; then
  echo "Running migrations and seed..."
  (cd backend && python manage.py migrate --no-input)
  (cd backend && python manage.py seed_crm_data 2>/dev/null || true)
fi

# --- Stop existing backend if running ---
if [[ -f "$RUN_DIR/backend.pid" ]]; then
  old_pid="$(cat "$RUN_DIR/backend.pid")"
  kill "$old_pid" 2>/dev/null || true
  rm -f "$RUN_DIR/backend.pid"
fi

# --- Start backend (localhost only when HTTPS — API reached via Next.js proxy) ---
BACKEND_BIND="${BACKEND_HOST}"
if [[ "$ENABLE_HTTPS" == "true" ]]; then
  BACKEND_BIND="127.0.0.1"
fi
echo "Starting backend on ${BACKEND_BIND}:${BACKEND_PORT}..."
(cd backend && python manage.py runserver "${BACKEND_BIND}:${BACKEND_PORT}") &
BACKEND_PID=$!
echo "$BACKEND_PID" > "$RUN_DIR/backend.pid"

cleanup() {
  echo ""
  echo "Stopping backend (pid ${BACKEND_PID})..."
  kill "$BACKEND_PID" 2>/dev/null || true
  rm -f "$RUN_DIR/backend.pid"
}
trap cleanup EXIT INT TERM

sleep 2

# --- Start frontend (foreground) ---
echo "Starting frontend on ${FRONTEND_HOST}:${FRONTEND_PORT}..."
cd frontend
if [[ ! -d node_modules ]]; then
  npm install
fi
NEXT_DEV_ARGS=(-H "${FRONTEND_HOST}" -p "${FRONTEND_PORT}")
if [[ "$ENABLE_HTTPS" == "true" ]]; then
  cert_paths="$(ensure_lan_https_cert "$ROOT" "$APP_HOST")"
  https_key="${cert_paths%%:*}"
  https_cert="${cert_paths##*:}"
  NEXT_DEV_ARGS+=(--experimental-https --experimental-https-key "$https_key" --experimental-https-cert "$https_cert")
fi
exec npx next dev "${NEXT_DEV_ARGS[@]}"
