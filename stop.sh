#!/usr/bin/env bash
# Stop Pravartee CRM dev processes started by start.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
RUN_DIR="$ROOT/.run"

if [[ -f "$RUN_DIR/backend.pid" ]]; then
  pid="$(cat "$RUN_DIR/backend.pid")"
  if kill "$pid" 2>/dev/null; then
    echo "Stopped backend (pid ${pid})"
  fi
  rm -f "$RUN_DIR/backend.pid"
else
  echo "No backend pid file found."
fi

# Clean up stale listeners from previous start.sh runs
if command -v lsof >/dev/null 2>&1 && [[ -f "$ROOT/.env" ]]; then
  # shellcheck disable=SC1091
  source "$ROOT/.env"
  for port in "${BACKEND_PORT:-8084}" "${FRONTEND_PORT:-3034}"; do
    while read -r pid; do
      [[ -n "$pid" ]] && kill "$pid" 2>/dev/null && echo "Stopped process on port ${port} (pid ${pid})"
    done < <(lsof -ti ":${port}" 2>/dev/null || true)
  done
fi

# Optional: stop PostgreSQL Docker
if [[ "${1:-}" == "--all" ]]; then
  if command -v docker >/dev/null 2>&1; then
    (cd "$ROOT/deployment/postgresql" && docker compose down)
    echo "Stopped PostgreSQL container."
  fi
fi

echo "Done. (Frontend stops when you Ctrl+C the start.sh terminal.)"
