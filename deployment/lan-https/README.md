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

1. Use the **server IP**, not `localhost` — e.g. `https://172.16.16.24:3034` (phones cannot reach `localhost` on your PC).
2. Accept the **self-signed certificate** warning:
   - **Chrome / Edge:** Advanced → Proceed to … (unsafe)
   - **Chrome desktop:** on the certificate error page, type `thisisunsafe`
   - **Safari (iPhone):** Show Details → visit this website
3. Allow **location** when prompted.
4. Use Attendance → Punch In.

> Cursor’s built-in browser may show wrong certificate dates (e.g. 1970). Use Chrome, Safari, or Edge on the phone instead.

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
