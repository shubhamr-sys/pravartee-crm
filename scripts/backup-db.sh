#!/usr/bin/env bash
# Pravartee CRM — PostgreSQL backup (local + optional Google Drive via rclone).
#
# Usage:
#   ./scripts/backup-db.sh
#
# Configure in root .env (see deployment/backup/README.md):
#   BACKUP_DIR, BACKUP_LOCAL_RETAIN_DAYS, BACKUP_RCLONE_REMOTE, BACKUP_RCLONE_RETAIN_DAYS

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -f "$ROOT/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/.env"
  set +a
fi

BACKUP_DIR="${BACKUP_DIR:-$ROOT/backups}"
BACKUP_LOCAL_RETAIN_DAYS="${BACKUP_LOCAL_RETAIN_DAYS:-14}"
BACKUP_RCLONE_REMOTE="${BACKUP_RCLONE_REMOTE:-}"
BACKUP_RCLONE_RETAIN_DAYS="${BACKUP_RCLONE_RETAIN_DAYS:-30}"
POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-pravartee_crm_postgres}"
DB_NAME="${DB_NAME:-pravartee_crm}"
DB_USER="${DB_USER:-crm_user}"

log() {
  echo "$(date -Is) $*"
}

rclone_with_retry() {
  local tries=3
  local delay=45
  while (( tries > 0 )); do
    if rclone "$@"; then
      return 0
    fi
    tries=$((tries - 1))
    if (( tries > 0 )); then
      log "WARN: rclone failed, retrying in ${delay}s (${tries} left) ..."
      sleep "$delay"
    fi
  done
  return 1
}

if ! command -v docker >/dev/null 2>&1; then
  log "ERROR: docker not found."
  exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -qx "$POSTGRES_CONTAINER"; then
  log "ERROR: PostgreSQL container '${POSTGRES_CONTAINER}' is not running."
  exit 1
fi

mkdir -p "$BACKUP_DIR"

STAMP="$(date +%Y%m%d_%H%M%S)"
FILE="$BACKUP_DIR/pravartee_crm_${STAMP}.sql.gz"

log "Creating backup ${FILE} ..."
docker exec "$POSTGRES_CONTAINER" \
  pg_dump -U "$DB_USER" -d "$DB_NAME" --no-owner --no-acl \
  | gzip > "$FILE"

log "Backup size: $(du -h "$FILE" | awk '{print $1}')"

if [[ -n "$BACKUP_RCLONE_REMOTE" ]]; then
  if ! command -v rclone >/dev/null 2>&1; then
    log "ERROR: BACKUP_RCLONE_REMOTE is set but rclone is not installed."
    exit 1
  fi
  log "Uploading to ${BACKUP_RCLONE_REMOTE} ..."
  if ! rclone_with_retry copy "$FILE" "${BACKUP_RCLONE_REMOTE%/}/" --stats-one-line; then
    log "ERROR: Upload to ${BACKUP_RCLONE_REMOTE} failed after retries."
    exit 1
  fi
  if [[ "$BACKUP_RCLONE_RETAIN_DAYS" =~ ^[0-9]+$ ]] && [[ "$BACKUP_RCLONE_RETAIN_DAYS" -gt 0 ]]; then
    log "Moving remote backups older than ${BACKUP_RCLONE_RETAIN_DAYS} days to Google Drive trash ..."
    prune_args=(
      delete "${BACKUP_RCLONE_REMOTE%/}/"
      --min-age "${BACKUP_RCLONE_RETAIN_DAYS}d"
      --include "pravartee_crm_*.sql.gz"
      --stats-one-line
    )
    if [[ "${BACKUP_RCLONE_USE_TRASH:-true}" == "true" ]]; then
      prune_args+=(--drive-use-trash)
    fi
    rclone_with_retry "${prune_args[@]}" || log "WARN: Remote prune failed (upload succeeded)."
  fi
  log "Upload complete."
fi

if [[ "$BACKUP_LOCAL_RETAIN_DAYS" =~ ^[0-9]+$ ]] && [[ "$BACKUP_LOCAL_RETAIN_DAYS" -gt 0 ]]; then
  find "$BACKUP_DIR" -name 'pravartee_crm_*.sql.gz' -mtime +"$BACKUP_LOCAL_RETAIN_DAYS" -delete
fi

log "Done."
