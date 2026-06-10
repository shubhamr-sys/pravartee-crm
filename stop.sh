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

# Optional: stop PostgreSQL Docker
if [[ "${1:-}" == "--all" ]]; then
  if command -v docker >/dev/null 2>&1; then
    (cd "$ROOT/deployment/postgresql" && docker compose down)
    echo "Stopped PostgreSQL container."
  fi
fi

echo "Done. (Frontend stops when you Ctrl+C the start.sh terminal.)"
