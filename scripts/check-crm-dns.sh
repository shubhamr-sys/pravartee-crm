#!/usr/bin/env bash
# Check whether crm.pravarteesales.com DNS is ready for Cloudflare Tunnel.
set -euo pipefail

HOST="${1:-crm.pravarteesales.com}"
TUNNEL_CNAME="${2:-a501b843-12a3-4feb-83e5-d166e1aeb7a4.cfargotunnel.com}"

echo "=== CNAME for $HOST ==="
dig "$HOST" CNAME +short || true

echo ""
echo "=== A / AAAA (what browsers use) ==="
A=$(dig "$HOST" A +short | head -1)
AAAA=$(dig "$HOST" AAAA +short | head -1)
echo "A:    ${A:-<none>}"
echo "AAAA: ${AAAA:-<none>}"

echo ""
echo "=== Authoritative (Cloudflare NS) ==="
AUTH_A=$(dig @ned.ns.cloudflare.com "$HOST" A +short | head -1)
AUTH_CNAME=$(dig @ned.ns.cloudflare.com "$HOST" CNAME +short | head -1)
echo "A:     ${AUTH_A:-<none>}"
echo "CNAME: ${AUTH_CNAME:-<none>}"

echo ""
if [[ "$AUTH_A" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "OK: Authoritative DNS returns Cloudflare IPs — proxy is active."
elif [[ "$AAAA" == fd10:* ]] || [[ "$A" == *cfargotunnel.com* ]] || [[ "$AUTH_A" == *cfargotunnel.com* ]]; then
  echo "PROBLEM: crm is DNS-only (grey cloud) on Cloudflare authoritative DNS."
  echo "  dig @ned.ns.cloudflare.com returns CNAME, not 104.x / 172.67.x IPs."
  echo ""
  echo "Fix:"
  echo "  1. Cloudflare → DNS → DELETE every crm record."
  echo "  2. Run on this machine:"
  echo "       cloudflared tunnel route dns pravartee-crm $HOST"
  echo "     OR add CNAME crm → $TUNNEL_CNAME, toggle ORANGE ON, click Save."
  echo "  3. Verify:"
  echo "       dig @ned.ns.cloudflare.com $HOST A +short"
  echo "     Must show 104.x.x.x or 172.67.x.x (NOT cfargotunnel.com)."
  echo ""
  echo "If orange cloud won't stay on: tunnel and zone may be in different"
  echo "Cloudflare accounts — re-run: cloudflared tunnel login (same account as DNS)."
  echo "See: deployment/cloudflare-tunnel/README.md"
  exit 1
else
  echo "WARN: Unexpected DNS — check propagation or record setup."
fi

echo ""
echo "=== HTTPS probe ==="
if curl -fsI --max-time 15 "https://$HOST" >/dev/null 2>&1; then
  echo "OK: https://$HOST responds."
else
  echo "FAIL: https://$HOST not reachable yet."
  exit 1
fi
