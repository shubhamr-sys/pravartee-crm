#!/usr/bin/env bash
# Pravartee CRM — start stack after server reboot (for cron @reboot or manual use).
#
# Usage:
#   ./scripts/boot-crm.sh
#
# Optional in root .env:
#   BOOT_USE_HTTPS=true        — run ./start-https.sh instead of ./start.sh
#   BOOT_START_POSTGRES=true   — ensure Docker Postgres is up first (default true)
#   BOOT_LOG_FILE=...          — boot log path (defaults to .run/boot.log if /var/log not writable)
#   BOOT_WAIT_SECONDS=15       — seconds to wait for network/Docker after boot

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# Cron @reboot runs with a minimal environment — extend PATH for docker/node/python.
export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:${HOME}/.local/bin:${PATH}"
if [[ -f "${HOME}/.nvm/nvm.sh" ]]; then
  # shellcheck disable=SC1091
  source "${HOME}/.nvm/nvm.sh"
fi

_cli_boot_wait="${BOOT_WAIT_SECONDS:-}"

if [[ -f "$ROOT/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/.env"
  set +a
fi

if [[ -n "$_cli_boot_wait" ]]; then
  BOOT_WAIT_SECONDS="$_cli_boot_wait"
fi
BOOT_WAIT_SECONDS="${BOOT_WAIT_SECONDS:-15}"

BOOT_USE_HTTPS="${BOOT_USE_HTTPS:-true}"
BOOT_START_POSTGRES="${BOOT_START_POSTGRES:-true}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-change_me_strong_password}"

init_log_file() {
  local preferred="${BOOT_LOG_FILE:-/var/log/pravartee-boot.log}"
  local fallback="$ROOT/.run/boot.log"
  mkdir -p "$ROOT/.run"
  if touch "$preferred" 2>/dev/null; then
    LOG_FILE="$preferred"
  else
    LOG_FILE="$fallback"
    touch "$LOG_FILE"
  fi
}

init_log_file

log() {
  echo "$(date -Is) $*" | tee -a "$LOG_FILE"
}

log "boot-crm: waiting ${BOOT_WAIT_SECONDS}s for network ..."
sleep "$BOOT_WAIT_SECONDS"

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
elif [[ "$BOOT_START_POSTGRES" == "true" ]]; then
  log "boot-crm: docker not in PATH — assuming PostgreSQL is already running."
fi

if [[ -f "$ROOT/.run/backend.pid" ]]; then
  old_pid="$(cat "$ROOT/.run/backend.pid")"
  if kill -0 "$old_pid" 2>/dev/null; then
    log "boot-crm: CRM already running (backend pid ${old_pid})."
    exit 0
  fi
  rm -f "$ROOT/.run/backend.pid"
fi

LAUNCHER="$ROOT/start.sh"
if [[ "$BOOT_USE_HTTPS" == "true" ]]; then
  LAUNCHER="$ROOT/start-https.sh"
fi

log "boot-crm: launching ${LAUNCHER} (PATH=${PATH}) ..."
# Login shell so npm/npx/python from nvm or profile are available under cron.
nohup /bin/bash -lc "cd '$ROOT' && exec '$LAUNCHER'" >> "$LOG_FILE" 2>&1 &
log "boot-crm: started (pid $!). Log: ${LOG_FILE}"
