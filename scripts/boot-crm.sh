#!/usr/bin/env bash
# Pravartee CRM — start stack after server reboot (for cron @reboot or manual use).
#
# Usage:
#   ./scripts/boot-crm.sh
#
# Optional in root .env:
#   BOOT_USE_HTTPS=true   — run ./start-https.sh instead of ./start.sh
#   BOOT_START_POSTGRES=true — ensure Docker Postgres is up first (default true)

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -f "$ROOT/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/.env"
  set +a
fi

BOOT_USE_HTTPS="${BOOT_USE_HTTPS:-true}"
BOOT_START_POSTGRES="${BOOT_START_POSTGRES:-true}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-change_me_strong_password}"
LOG_FILE="${BOOT_LOG_FILE:-/var/log/pravartee-boot.log}"

log() {
  echo "$(date -Is) $*" | tee -a "$LOG_FILE"
}

mkdir -p "$(dirname "$LOG_FILE")" 2>/dev/null || LOG_FILE="$ROOT/.run/boot.log"

log "boot-crm: waiting for network ..."
sleep 15

if [[ "$BOOT_START_POSTGRES" == "true" ]] && command -v docker >/dev/null 2>&1; then
  log "boot-crm: starting PostgreSQL ..."
  export POSTGRES_PASSWORD POSTGRES_PORT
  (cd "$ROOT/deployment/postgresql" && docker compose up -d)
  for _ in $(seq 1 60); do
    if docker compose -f "$ROOT/deployment/postgresql/docker-compose.yml" exec -T postgres \
      pg_isready -U crm_user -d pravartee_crm >/dev/null 2>&1; then
      log "boot-crm: PostgreSQL ready."
      break
    fi
    sleep 2
  done
fi

if [[ -f "$ROOT/.run/backend.pid" ]]; then
  old_pid="$(cat "$ROOT/.run/backend.pid")"
  if kill -0 "$old_pid" 2>/dev/null; then
    log "boot-crm: CRM already running (backend pid ${old_pid})."
    exit 0
  fi
fi

LAUNCHER="$ROOT/start.sh"
if [[ "$BOOT_USE_HTTPS" == "true" ]]; then
  LAUNCHER="$ROOT/start-https.sh"
fi

log "boot-crm: launching ${LAUNCHER} ..."
nohup "$LAUNCHER" >> "$LOG_FILE" 2>&1 &
log "boot-crm: started (pid $!). Log: ${LOG_FILE}"
