# Database backup & recovery

Automated PostgreSQL dumps for Pravartee CRM, with optional upload to **Google Drive** via [rclone](https://rclone.org/).

## Quick setup

```bash
chmod +x scripts/backup-db.sh scripts/boot-crm.sh scripts/restore-db.sh

# Test a local backup (no Google Drive)
./scripts/backup-db.sh
ls -lh backups/
```

## Google Drive (rclone)

### 1. Install rclone

```bash
sudo apt install rclone
# or: curl https://rclone.org/install.sh | sudo bash
```

### 2. Configure Google Drive

```bash
rclone config
```

| Step | Choice |
|------|--------|
| New remote | `n` |
| Name | `gdrive` |
| Storage | `drive` (Google Drive) |
| Scope | `1` (full access) or `2` (read-only — not for backups) |
| Auth | Follow browser login |

Create a folder on Drive (optional):

```bash
rclone mkdir gdrive:PravarteeCRM-Backups
```

Test:

```bash
rclone lsd gdrive:
```

### 3. Enable upload in `.env`

Add to the **root** `.env`:

```env
BACKUP_DIR=/var/backups/pravartee-crm
BACKUP_LOCAL_RETAIN_DAYS=14
BACKUP_RCLONE_REMOTE=gdrive:PravarteeCRM-Backups
BACKUP_RCLONE_RETAIN_DAYS=30
```

| Variable | Default | Description |
|----------|---------|-------------|
| `BACKUP_DIR` | `./backups` | Local dump directory |
| `BACKUP_LOCAL_RETAIN_DAYS` | `14` | Delete local files older than N days (`0` = keep all) |
| `BACKUP_RCLONE_REMOTE` | *(empty)* | rclone remote path, e.g. `gdrive:PravarteeCRM-Backups` |
| `BACKUP_RCLONE_RETAIN_DAYS` | `30` | Prune remote dumps older than N days |
| `POSTGRES_CONTAINER` | `pravartee_crm_postgres` | Docker container name |

Create backup directory (production):

```bash
sudo mkdir -p /var/backups/pravartee-crm
sudo chown "$USER":"$USER" /var/backups/pravartee-crm
```

### 4. Headless server (no browser)

Run `rclone config` on a machine with a browser, then copy `~/.config/rclone/rclone.conf` to the server.  
Or use [rclone remote setup](https://rclone.org/remote_setup/).

### 5. Optional encryption

```bash
rclone config   # add a "crypt" remote over gdrive:PravarteeCRM-Backups
```

Set `BACKUP_RCLONE_REMOTE=crypt-remote:` in `.env`.

---

## Cron (daily backup)

```bash
crontab -e
```

```cron
# Daily at 2:00 AM — local dump + Google Drive
0 2 * * * /home/development/Documents/pravartee-crm-main/scripts/backup-db.sh >> /var/log/pravartee-backup.log 2>&1
```

Replace the path with your repo location. Ensure the cron user is in the `docker` group:

```bash
sudo usermod -aG docker "$USER"
```

See `deployment/backup/crontab.example` for more entries.

---

## Auto-start after power cut

Cron `@reboot` (waits for Docker, then starts CRM):

```cron
@reboot /home/development/Documents/pravartee-crm-main/scripts/boot-crm.sh
```

In root `.env`:

```env
BOOT_USE_HTTPS=true
BOOT_START_POSTGRES=true
```

For production, prefer **systemd** (`deployment/production/systemd/`) plus `cloudflared` as a system service.

---

## Restore

From local file:

```bash
./scripts/restore-db.sh /var/backups/pravartee-crm/pravartee_crm_20260623_020000.sql.gz
```

From Google Drive:

```bash
rclone copy gdrive:PravarteeCRM-Backups/pravartee_crm_20260623_020000.sql.gz /tmp/
./scripts/restore-db.sh /tmp/pravartee_crm_20260623_020000.sql.gz
```

Test restores on a copy of the database before overwriting production.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `container is not running` | `cd deployment/postgresql && docker compose up -d` |
| `rclone not found` | Install rclone or clear `BACKUP_RCLONE_REMOTE` for local-only |
| `permission denied` on `/var/backups` | `sudo chown $USER /var/backups/pravartee-crm` |
| Cron silent failure | Check `/var/log/pravartee-backup.log` and `grep CRON /var/log/syslog` |
