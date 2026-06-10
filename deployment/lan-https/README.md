# LAN HTTPS — GPS for attendance on network devices

Browsers **block GPS** on `http://192.168.x.x` or `http://172.16.x.x`.  
They only allow geolocation on **HTTPS** or `http://localhost`.

## Quick fix (no Nginx, no domain)

From the project root:

```bash
chmod +x start-https.sh
./start-https.sh
```

Open on phones/tablets:

```text
https://YOUR_SERVER_IP:3034
```

1. Accept the **self-signed certificate** warning (Advanced → Proceed).
2. Allow **location** when prompted.
3. Use Attendance → Punch In.

The API is proxied through Next.js (`/api/*` → Django) so there is no mixed-content error.

## Production (trusted certificate)

For a padlock without warnings, use a real domain + Nginx + Let's Encrypt:

See [deployment/production/README.md](../production/README.md)

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| "GPS requires a secure connection" | Use `https://` URL, run `./start-https.sh` |
| Certificate warning | Normal for self-signed — accept once per browser |
| Login works but punch fails | Allow location in browser / phone settings |
| API errors after HTTPS | Restart with `./start-https.sh` (rewrites need `BACKEND_PORT` in `.env.local`) |
