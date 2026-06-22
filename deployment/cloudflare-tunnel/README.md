# Cloudflare Tunnel — Pravartee CRM (`crm.pravarteesales.com`)

## Why the site did not load

A CNAME at **WordPress DNS** pointing to `<tunnel-id>.cfargotunnel.com` is **not enough**.

Cloudflare only routes tunnel traffic for hostnames whose DNS is managed **in the same Cloudflare account** with the **proxy enabled** (orange cloud). A raw CNAME at WordPress resolves to an internal address (`fd10:…`) that browsers cannot reach.

**Fix:** Use Cloudflare as authoritative DNS (change nameservers), then set the `crm` record in Cloudflare DNS as a **proxied** CNAME to your tunnel.

Your main WordPress site (`@`, `www`) keeps working — Cloudflare imported those records when you added the domain.

---

## One-time setup

### 1. Tunnel (already done)

```bash
cloudflared tunnel login
cloudflared tunnel create pravartee-crm
```

Tunnel ID: `a501b843-12a3-4feb-83e5-d166e1aeb7a4`

### 2. Local config (`~/.cloudflared/config.yml`)

```yaml
tunnel: pravartee-crm
credentials-file: /home/development/.cloudflared/a501b843-12a3-4feb-83e5-d166e1aeb7a4.json

ingress:
  - hostname: crm.pravarteesales.com
    service: https://127.0.0.1:3034
    originRequest:
      noTLSVerify: true
  - service: http_status:404
```

Validate: `cloudflared tunnel ingress validate`

### 3. Switch nameservers to Cloudflare

In **WordPress Domains** (or your registrar), change nameservers to the two Cloudflare nameservers shown in:

**Cloudflare Dashboard → pravarteesales.com → Overview**

Example format: `ada.ns.cloudflare.com` and `bob.ns.cloudflare.com` (use yours exactly).

Wait until Cloudflare shows the zone as **Active** (not Pending). Usually 15 minutes to a few hours.

### 4. Cloudflare DNS records

Go to **Cloudflare → pravarteesales.com → DNS → Records**.

| Type | Name | Content | Proxy |
|------|------|---------|-------|
| A / CNAME | `@` | WordPress (keep imported value) | DNS only or proxied per WordPress docs |
| CNAME | `www` | WordPress (keep imported value) | as above |
| **CNAME** | **`crm`** | **`a501b843-12a3-4feb-83e5-d166e1aeb7a4.cfargotunnel.com`** | **Proxied (orange cloud ON)** |

Remove the duplicate `crm` CNAME from **WordPress DNS** after nameservers point to Cloudflare (optional — WordPress DNS is ignored once NS switch).

Or run (after NS is on Cloudflare):

```bash
cloudflared tunnel route dns pravartee-crm crm.pravarteesales.com
```

### 5. Run CRM + tunnel

Terminal 1:

```bash
cd /path/to/pravartee-crm-main
./start-https.sh
```

Terminal 2:

```bash
cloudflared tunnel run pravartee-crm
```

### 6. CRM public URL

In `backend/.env`:

```env
FRONTEND_PUBLIC_URL=https://crm.pravarteesales.com
```

Restart the app after changing.

---

## Verify

```bash
./scripts/check-crm-dns.sh
```

`dig crm.pravarteesales.com A +short` should return **Cloudflare IPv4** (`104.x.x.x` or `172.67.x.x`), **not** `cfargotunnel.com` or `fd10:…`.

```bash
curl -I https://crm.pravarteesales.com
```

Should return `HTTP/2 200` or `307`.

---

## Troubleshooting: "Unable to connect" / DNS shows `fd10:…`

**Symptom:** Tunnel is running and healthy, but `crm.pravarteesales.com` won't load.  
`dig crm.pravarteesales.com A +short` returns `…cfargotunnel.com` instead of public IPs.

**Cause:** The `crm` record is **DNS only (grey cloud)**. The "Tunnel" record type in the dashboard can show orange but still not proxy public DNS correctly.

**Fix in Cloudflare → DNS → Records:**

1. **Delete** the `crm` **Tunnel** type record.
2. **Add record:** Type **CNAME**, Name **crm**, Target **`a501b843-12a3-4feb-83e5-d166e1aeb7a4.cfargotunnel.com`**
3. Turn **Proxied (orange cloud) ON**.
4. Wait 1–2 minutes, then run `./scripts/check-crm-dns.sh` again.

Or from the server (after deleting the Tunnel record in the dashboard):

```bash
cloudflared tunnel route dns --overwrite-dns pravartee-crm crm.pravarteesales.com
```

---

## Quick test (no DNS change)

For temporary public URL without nameserver change:

```bash
cloudflared tunnel --url https://127.0.0.1:3034 --no-tls-verify
```

Use the printed `*.trycloudflare.com` URL.

---

## Run tunnel on boot (optional)

```bash
sudo cloudflared service install
sudo systemctl enable --now cloudflared
```

Ensure `config.yml` is in `/etc/cloudflared/` or the service unit points to your config.
