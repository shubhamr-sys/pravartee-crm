#!/usr/bin/env bash
# Public CRM URL via Cloudflare quick tunnel (*.trycloudflare.com).
# No DNS or nameserver changes required.
#
# Usage:
#   ./scripts/cloudflared-quick-tunnel.sh          # foreground (shows logs)
#   ./scripts/cloudflared-quick-tunnel.sh --bg     # background + updates backend/.env
#
# Requires ./start-https.sh on port 3034.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RUN_DIR="$ROOT/.run"
LOG_FILE="$RUN_DIR/quick-tunnel.log"
URL_FILE="$RUN_DIR/quick-tunnel.url"
PID_FILE="$RUN_DIR/quick-tunnel.pid"
ORIGIN="${QUICK_TUNNEL_ORIGIN:-https://127.0.0.1:3034}"

# shellcheck source=scripts/lib.sh
source "$ROOT/scripts/lib.sh"

mkdir -p "$RUN_DIR"

if ! ss -tulpn 2>/dev/null | grep -q ':3034'; then
  echo "Port 3034 is not listening. Start the CRM first:"
  echo "  cd $ROOT && ./start-https.sh"
  exit 1
fi

stop_quick_tunnel() {
  if [[ -f "$PID_FILE" ]]; then
    local pid
    pid="$(cat "$PID_FILE")"
    kill "$pid" 2>/dev/null || true
    rm -f "$PID_FILE"
  fi
}

wait_for_url() {
  local attempts=0
  while [[ $attempts -lt 60 ]]; do
    if [[ -f "$LOG_FILE" ]]; then
      local url
      url="$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$LOG_FILE" | head -1 || true)"
      if [[ -n "$url" ]]; then
        echo "$url"
        return 0
      fi
    fi
    sleep 1
    attempts=$((attempts + 1))
  done
  return 1
}

if [[ "${1:-}" == "--stop" ]]; then
  stop_quick_tunnel
  echo "Quick tunnel stopped."
  exit 0
fi

# Only one cloudflared tunnel at a time (quick vs named pravartee-crm).
stop_other_cloudflared() {
  pkill -f "cloudflared tunnel run" 2>/dev/null || true
  pkill -f "cloudflared tunnel --config /dev/null" 2>/dev/null || true
  sleep 1
}

wait_for_http() {
  local url="$1"
  local attempts=0
  while [[ $attempts -lt 30 ]]; do
    if curl -fsI --max-time 10 "${url}/login" >/dev/null 2>&1; then
      return 0
    fi
    sleep 2
    attempts=$((attempts + 1))
  done
  return 1
}

if [[ "${1:-}" == "--bg" ]]; then
  stop_other_cloudflared
  stop_quick_tunnel
  : > "$LOG_FILE"
  echo "Starting quick tunnel → $ORIGIN"
  nohup cloudflared tunnel --config /dev/null --url "$ORIGIN" --no-tls-verify >"$LOG_FILE" 2>&1 &
  echo $! >"$PID_FILE"
  if ! URL="$(wait_for_url)"; then
    echo "Timed out waiting for trycloudflare.com URL. Log:"
    tail -20 "$LOG_FILE" || true
    exit 1
  fi
  echo "$URL" >"$URL_FILE"
  set_env_value "$ROOT/backend/.env" FRONTEND_PUBLIC_URL "$URL"
  echo "Waiting for tunnel to accept traffic..."
  if ! wait_for_http "$URL"; then
    echo "Tunnel URL created but not reachable yet. Wait 30s and open:"
    echo "  $URL"
  fi
  echo ""
  echo "=============================================="
  echo " Quick tunnel ready"
  echo " Public URL: $URL"
  echo " Saved to:   $URL_FILE"
  echo " Updated:    backend/.env FRONTEND_PUBLIC_URL"
  echo ""
  echo " Open the URL above to use the CRM."
  echo " Pricing email links will use this URL until you change it."
  echo " Stop: ./scripts/cloudflared-quick-tunnel.sh --stop"
  echo " Note: do not run 'cloudflared tunnel run pravartee-crm' at the same time."
  echo "=============================================="
  exit 0
fi

stop_other_cloudflared

echo "Starting quick tunnel → $ORIGIN"
echo "Your public URL will appear below (https://….trycloudflare.com)"
echo "Tip: use --bg to run in background and auto-update backend/.env"
echo ""

exec cloudflared tunnel --config /dev/null --url "$ORIGIN" --no-tls-verify
