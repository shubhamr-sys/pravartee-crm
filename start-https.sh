#!/usr/bin/env bash
# Pravartee CRM — HTTPS launcher for LAN / mobile GPS (attendance punch).
# Browsers block geolocation on http://<LAN-IP> — this uses a self-signed HTTPS cert.
#
# Usage: ./start-https.sh
# Open:  https://<your-server-ip>:3034  (accept the certificate warning once per device)

set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
export ENABLE_HTTPS=true
exec "${ROOT}/start.sh"
