# VPS Audit Findings - Thai My Heart

Status: **audit received; plan reviewed; local migration SQL generated; DB-backed validation still blocked by missing local Docker/MySQL**

Target VPS: Hostinger KVM4, Ubuntu 22.04, shared production box, `195.110.58.111`.

## Raw Audit Output

The owner pasted the audit output from the VPS on 2026-07-19. Key raw lines:

```text
OS:
PRETTY_NAME="Ubuntu 22.04.5 LTS"

RAM:
Mem: 15Gi total, 1.8Gi used, 172Mi free, 13Gi buff/cache, 13Gi available
Swap: 0B

DISK:
/dev/sda1 194G size, 34G used, 161G available, 18% mounted on /

WEB SERVER:
/usr/sbin/nginx
nginx version: nginx/1.18.0 (Ubuntu)
apache2 not installed

DATABASE:
mysql Ver 8.0.46-0ubuntu0.22.04.3 for Linux on x86_64 ((Ubuntu))

NODE:
node v22.22.2
npm 10.9.7
pm2 at /usr/bin/pm2

FIREWALL:
ufw active; default deny incoming
allowed: 22, 80, 443, 465, 587, 993, 3001, 3030/tcp

SITES:
/var/www/html
/var/www/websites
nginx sites-enabled:
be.taskfri
default
jinnar
mail.jinnar.com
portal.towellshaulage.co.uk
taskfri
truckokay
viral.jinnar.com
```

Listening ports of note:

```text
80, 443: nginx
22: sshd
25, 110, 143, 587, 993, 995, 8080, 8443: docker-proxy mail/service stack
27017: mongod on 127.0.0.1 only
3000: node
3001: next-server
3002: next-server
3020, 6190: docker-proxy
8020: uvicorn
```

## Findings Summary

- OS/kernel: Ubuntu 22.04.5 LTS.
- Available CPU/RAM under current live-site load: RAM is healthy: 15Gi total, about 13Gi available. CPU core count was not included in the simplified audit output; KVM4 expectation is 4 vCPU.
- Disk headroom: healthy: 194G total, 34G used, 161G free, 18% usage on `/`.
- Existing web server: Nginx 1.18.0. Apache is not installed.
- Existing vhosts/sites: multiple existing production sites are enabled under `/etc/nginx/sites-enabled`. This confirms the VPS is shared and we must only add a new vhost.
- Existing DB engine: MySQL 8.0.46 client/server package is present. The simplified output did not show MySQL service status or port 3306 listening.
- DB bind/listening address: port 3306 was not present in `ss -tlnp` output. Need one follow-up check before provisioning: `systemctl status mysql --no-pager` and `ss -tlnp | grep 3306`.
- Existing Node/npm/pm2/nvm: system Node is v22.22.2, npm 10.9.7, pm2 installed. This satisfies Next 16's Node >=20 need; do not change system Node.
- Free app port candidate: 3000, 3001, and 3002 are already in use; 3020, 6190, 8020, 8080, and 8443 are also in use. Port 3030 is firewall-allowed but did not appear as listening in this audit. Prefer a localhost-only app port such as `3031` after confirming it is free.
- Firewall status: UFW is active with default deny incoming. 3306 is not listed as allowed, which is correct. Ports 3001 and 3030 are publicly allowed; avoid adding any public app port for TMH. Use Nginx proxy to a localhost port.
- TLS/certbot status: not captured by the simplified audit. Need check only when adding the new domain/vhost.
- Existing backup/cron setup: not captured by the simplified audit. Need check before adding backup cron.
- Shared-site risks: high enough to require additive-only deployment. Existing nginx sites, Docker mail/services, MongoDB, Node apps, and uvicorn are all running. Do not restart/disable shared services, do not alter MongoDB, and do not replace system Node.

## Box-Specific Deploy Plan

This plan has been reviewed by Claude and is approved in direction with required adjustments. Do not provision the VPS until the local DB validation gap is resolved or the owner explicitly approves owner-run VPS provisioning commands.

### 1. DB Decision

Use the existing MySQL 8.0 installation if the service is present and can be started/reused safely. Do **not** install MariaDB unless a follow-up check proves no MySQL service exists.

Important Prisma driver note: the app currently uses `@prisma/adapter-mariadb` + `mariadb`. Because MySQL 8 defaults users to `caching_sha2_password`, the app DB user should be created with `mysql_native_password` unless local adapter validation proves another auth path works:

```sql
CREATE USER 'tmh'@'localhost' IDENTIFIED WITH mysql_native_password BY 'STRONG_UNIQUE_PASSWORD_HERE';
```

Follow-up read-only/low-impact checks:

```bash
systemctl status mysql --no-pager
ss -tlnp | grep 3306 || true
sudo mysql -e "SELECT VERSION(); SHOW DATABASES;"
```

If MySQL is already running or can be safely started without affecting other sites, create only a new DB and localhost user:

```sql
CREATE DATABASE thaimyheart CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'tmh'@'localhost' IDENTIFIED WITH mysql_native_password BY 'STRONG_UNIQUE_PASSWORD_HERE';
GRANT ALL PRIVILEGES ON thaimyheart.* TO 'tmh'@'localhost';
FLUSH PRIVILEGES;
```

Keep DB access localhost-only. Do not open 3306 in UFW or Hostinger firewall.

### 2. App Location

Recommended app directory:

```text
/var/www/websites/tmh
```

Reason: `/var/www/websites` already exists and appears to hold hosted projects.

### 3. Node / Process Manager

Use existing Node v22.22.2 and existing pm2. Do not upgrade Node globally.

Recommended app port:

```text
127.0.0.1:3031
```

Before using it:

```bash
ss -tlnp | grep ':3031' || echo "3031 appears free"
```

Do not open port 3031 in UFW. Nginx should be the only public entry point.

### 4. Nginx

Use Nginx. Add a new server block only; do not edit existing vhosts.

Domain is still needed from owner. Placeholder:

```text
your-tmh-domain.com
```

Draft vhost:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name your-tmh-domain.com www.your-tmh-domain.com;

    location / {
        proxy_pass http://127.0.0.1:3031;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Then, after DNS points to the VPS:

```bash
nginx -t
systemctl reload nginx
certbot --nginx -d your-tmh-domain.com -d www.your-tmh-domain.com
```

### 5. Environment

Create `.env` in the app directory only:

```dotenv
DATABASE_URL="mysql://tmh:STRONG_UNIQUE_PASSWORD_HERE@localhost:3306/thaimyheart"
NEXTAUTH_SECRET="GENERATED_SECRET"
NEXTAUTH_URL="https://your-tmh-domain.com"
NEXT_PUBLIC_APP_URL="https://your-tmh-domain.com"
ALLOWED_ORIGINS="https://your-tmh-domain.com"
ADMIN_EMAIL="owner-admin-email"
ADMIN_PASSWORD="STRONG_ADMIN_PASSWORD"
```

### 6. Migrations

The first migration has not been generated yet. Generate and commit it from a safe development/staging DB before production deployment if possible.

The initial migration SQL has now been generated locally from the Prisma schema:

```text
prisma/migrations/20260719000000_init/migration.sql
prisma/migrations/migration_lock.toml
```

It was generated with `prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script`, because this Windows environment does not have Docker, local MySQL, WSL, or a `.env`. It still needs validation by applying it to MySQL 8 before production. Do **not** run `prisma migrate dev` on the shared production VPS.

Future VPS deploys should use only:

```bash
npx prisma migrate deploy
```

### 7. PM2 Start

After install/build:

```bash
HOSTNAME=127.0.0.1 PORT=3031 pm2 start "npm run start" --name tmh
pm2 save
```

### 8. Backups

Need a follow-up check of existing cron/backups before adding anything. Do not put DB passwords inline in cron or process arguments. Use a root-owned defaults file, for example `/root/.tmh-my.cnf` with `chmod 600`, then run `mysqldump --defaults-extra-file=/root/.tmh-my.cnf`.

```bash
mkdir -p /var/backups/tmh
mysqldump --defaults-extra-file=/root/.tmh-my.cnf thaimyheart | gzip > /var/backups/tmh/tmh-$(date +%F).sql.gz
```

Add nightly cron only after confirming it will not conflict with existing backup policy.

## Approval Gate

Do not provision database users, migrations, pm2 processes, or vhosts until Claude/owner approve the next exact command block.

## Local I1a Status - 2026-07-19

Completed:

- Generated initial migration SQL under `prisma/migrations/20260719000000_init/migration.sql`.
- Added `prisma/migrations/migration_lock.toml`.
- `npx prisma validate` passed.
- `npm run db:generate` passed.
- `npm run lint` passed.
- `npx tsc --noEmit` passed.
- `npm run build` passed.

Blocked:

- Docker is not installed locally (`docker` command not found).
- MySQL client/server is not installed locally (`mysql` command not found).
- WSL is not available from this shell.
- `.env` does not exist locally.
- Therefore adapter validation against MySQL 8, `prisma migrate dev --name init`, `db:seed`, and end-to-end flows could not be run here.

Recommended unblock choices:

1. Install Docker Desktop locally, then run a local `mysql:8` container for adapter/migration/seed/E2E testing.
2. Install MySQL 8 locally on Windows and create a dev DB.
3. Owner-run a temporary staging DB on the VPS after explicit approval, using copy-paste commands from Codex. This is less ideal than local Docker but can work if local setup is unavailable.

## Open Questions For Owner

- What final domain/subdomain should serve TMH?
- Can we use `/var/www/websites/tmh` as the app directory?
- Should the app port be `3031`, assuming it is free?
- Should we keep using MySQL 8.0 instead of installing MariaDB? This is recommended because MySQL is already present.
- Do you want to set up SSH key access before provisioning, so Codex can give repeatable commands without password friction?
