#!/usr/bin/env bash
# Restore Pravartee CRM PostgreSQL from a .sql.gz backup.
#
# Usage:
#   ./scripts/restore-db.sh /path/to/pravartee_crm_YYYYMMDD_HHMMSS.sql.gz
#
# WARNING: Overwrites data in the target database. Stop the CRM or ensure no writes during restore.

set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <backup.sql.gz>" >&2
  exit 1
fi

BACKUP_FILE="$1"
if [[ ! -f "$BACKUP_FILE" ]]; then
  echo "File not found: ${BACKUP_FILE}" >&2
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
if [[ -f "$ROOT/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/.env"
  set +a
fi

POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-pravartee_crm_postgres}"
DB_NAME="${DB_NAME:-pravartee_crm}"
DB_USER="${DB_USER:-crm_user}"

echo "This will restore ${BACKUP_FILE} into database '${DB_NAME}'."
read -r -p "Type yes to continue: " confirm
if [[ "$confirm" != "yes" ]]; then
  echo "Aborted."
  exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -qx "$POSTGRES_CONTAINER"; then
  echo "PostgreSQL container '${POSTGRES_CONTAINER}' is not running." >&2
  exit 1
fi

echo "Restoring ..."
gunzip -c "$BACKUP_FILE" | docker exec -i "$POSTGRES_CONTAINER" \
  psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1

echo "Restore complete."
