#!/usr/bin/env bash
# Shared helpers for start/stop scripts.

set_env_value() {
  local file="$1"
  local key="$2"
  local value="$3"
  if [[ ! -f "$file" ]]; then
    touch "$file"
  fi
  if grep -q "^${key}=" "$file" 2>/dev/null; then
    sed -i.bak "s|^${key}=.*|${key}=${value}|" "$file" && rm -f "${file}.bak"
  else
    echo "${key}=${value}" >> "$file"
  fi
}

detect_app_host() {
  if [[ -n "${APP_HOST:-}" ]]; then
    echo "$APP_HOST"
    return
  fi
  if command -v hostname >/dev/null 2>&1; then
    local ip
    ip="$(hostname -I 2>/dev/null | awk '{print $1}')"
    if [[ -n "$ip" ]]; then
      echo "$ip"
      return
    fi
  fi
  echo "127.0.0.1"
}

generate_secret_key() {
  python3 -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())" 2>/dev/null \
    || openssl rand -base64 48 | tr -d '/+=' | head -c 50
}

# Self-signed cert for LAN HTTPS (no sudo / mkcert). Browsers show a one-time warning.
ensure_lan_https_cert() {
  local root="$1"
  local app_host="$2"
  local cert_dir="${root}/frontend/certificates"
  local key="${cert_dir}/lan-key.pem"
  local cert="${cert_dir}/lan.pem"
  local san="DNS:localhost,DNS:127.0.0.1,IP:127.0.0.1"

  if [[ -n "$app_host" && "$app_host" != "127.0.0.1" && "$app_host" != "localhost" ]]; then
    san="${san},DNS:${app_host},IP:${app_host}"
  fi

  mkdir -p "$cert_dir"

  if [[ ! -f "$key" || ! -f "$cert" ]]; then
    echo "Generating self-signed HTTPS certificate (SAN: ${san})..." >&2
    openssl req -x509 -newkey rsa:2048 -nodes \
      -keyout "$key" \
      -out "$cert" \
      -days 825 \
      -subj "/CN=pravartee-crm" \
      -addext "subjectAltName=${san}" 2>/dev/null
  fi

  echo "${key}:${cert}"
}
