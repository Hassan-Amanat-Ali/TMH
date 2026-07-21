# TMH Production Provisioning Pack - thaimyheart.com

Status: DNS confirmed on 2026-07-21.

- `thaimyheart.com` A record resolves to `195.110.58.111`.
- `www.thaimyheart.com` resolves via CNAME to `thaimyheart.com`, then A `195.110.58.111`.
- Target VPS: Hostinger shared Ubuntu 22.04 server at `195.110.58.111`.
- App directory: `/var/www/websites/tmh`
- App port: `127.0.0.1:3031`
- Repo: `https://github.com/Hassan-Amanat-Ali/TMH.git`

Important safety rules:

- Run the read-only preflight block first and paste the output for review.
- Do not alter existing websites, Nginx vhosts, Docker services, MongoDB, global Node, or mail services.
- Keep MySQL port `3306` private. Do not open it in UFW or Hostinger firewall.
- Confirm before each state-changing block on the shared VPS.
- Do not paste real generated passwords or secrets into chat.

## Block 0 - Read-Only Preflight

Run this first on the VPS as `root`, then paste the output back to Codex/Claude.

```bash
set -u

echo "=== DOMAIN DNS FROM VPS ==="
getent ahostsv4 thaimyheart.com || true
getent ahostsv4 www.thaimyheart.com || true

echo
echo "=== OS / RESOURCES ==="
cat /etc/os-release | grep PRETTY || true
free -h || true
df -h / /var /var/www 2>/dev/null || true
nproc || true

echo
echo "=== PORTS ==="
ss -tlnp || true
echo
ss -tlnp | grep ':3031' || echo "3031 appears free"
ss -tlnp | grep ':3306' || echo "3306 not visible in ss output"

echo
echo "=== SERVICES ==="
systemctl status nginx --no-pager 2>/dev/null | head -30 || true
systemctl status mysql mariadb --no-pager 2>/dev/null | head -60 || true

echo
echo "=== BINARIES ==="
which git node npm pm2 nginx certbot mysql mysqldump 2>/dev/null || true
node -v 2>/dev/null || true
npm -v 2>/dev/null || true
pm2 -v 2>/dev/null || true
mysql --version 2>/dev/null || true

echo
echo "=== NGINX SITES ==="
ls -la /etc/nginx/sites-available 2>/dev/null || true
ls -la /etc/nginx/sites-enabled 2>/dev/null || true

echo
echo "=== APP DIRECTORY CHECK ==="
ls -la /var/www 2>/dev/null || true
ls -la /var/www/websites 2>/dev/null || true
test -e /var/www/websites/tmh && echo "TMH directory already exists" || echo "TMH directory does not exist yet"

echo
echo "=== FIREWALL ==="
ufw status verbose 2>/dev/null || true
```

## Block 1 - Prepare Secrets Locally On The VPS

Run only after Block 0 is reviewed.

This creates root-only secret files on the VPS. It does not print the actual secret values.

```bash
set -euo pipefail
install -d -m 700 /root/tmh-secrets

if [ ! -f /root/tmh-secrets/db_password ]; then
  openssl rand -hex 24 | tr -d '\n' > /root/tmh-secrets/db_password
  chmod 600 /root/tmh-secrets/db_password
fi

if [ ! -f /root/tmh-secrets/nextauth_secret ]; then
  openssl rand -base64 48 | tr -d '\n' > /root/tmh-secrets/nextauth_secret
  chmod 600 /root/tmh-secrets/nextauth_secret
fi

if [ ! -f /root/tmh-secrets/admin_password ]; then
  openssl rand -base64 24 | tr -d '\n' > /root/tmh-secrets/admin_password
  chmod 600 /root/tmh-secrets/admin_password
fi

if [ ! -f /root/tmh-secrets/admin_email ]; then
  printf 'admin@thaimyheart.com' > /root/tmh-secrets/admin_email
  chmod 600 /root/tmh-secrets/admin_email
fi

echo "Secret files ready under /root/tmh-secrets."
echo "Admin email is stored in /root/tmh-secrets/admin_email. Edit that file before Block 3 if you want a different real admin email."
```

## Block 2 - Create MySQL Database And Local User

Run only after confirmation that MySQL is healthy on this server.

This block is additive: it creates only the `thaimyheart` database and `tmh@localhost` user if missing.

```bash
set -euo pipefail
DB_PASS="$(cat /root/tmh-secrets/db_password)"

mysql <<SQL
CREATE DATABASE IF NOT EXISTS thaimyheart CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'tmh'@'localhost' IDENTIFIED WITH mysql_native_password BY '${DB_PASS}';
ALTER USER 'tmh'@'localhost' IDENTIFIED WITH mysql_native_password BY '${DB_PASS}';
GRANT ALL PRIVILEGES ON thaimyheart.* TO 'tmh'@'localhost';
FLUSH PRIVILEGES;
SQL

mysql -u tmh -p"${DB_PASS}" -e "SELECT DATABASE();" thaimyheart
echo "TMH database and local user are ready."
```

## Block 3 - Clone App And Create Production Env

Run only after Block 2 passes.

If `/var/www/websites/tmh` already exists, stop and ask Codex/Claude before overwriting anything.

```bash
set -euo pipefail

test ! -e /var/www/websites/tmh
mkdir -p /var/www/websites
cd /var/www/websites
git clone https://github.com/Hassan-Amanat-Ali/TMH.git tmh
cd /var/www/websites/tmh

DB_PASS="$(cat /root/tmh-secrets/db_password)"
NEXTAUTH_SECRET_VALUE="$(cat /root/tmh-secrets/nextauth_secret)"
ADMIN_PASSWORD_VALUE="$(cat /root/tmh-secrets/admin_password)"
ADMIN_EMAIL_VALUE="$(cat /root/tmh-secrets/admin_email)"

cat > .env <<EOF
SEED_MODE="production"
DATABASE_URL="mysql://tmh:${DB_PASS}@localhost:3306/thaimyheart"
NEXTAUTH_SECRET="${NEXTAUTH_SECRET_VALUE}"
NEXTAUTH_URL="https://thaimyheart.com"
ALLOWED_ORIGINS="https://thaimyheart.com,https://www.thaimyheart.com"
NEXT_PUBLIC_APP_URL="https://thaimyheart.com"
APP_URL="https://thaimyheart.com"
SMTP_HOST=""
SMTP_PORT="465"
SMTP_USER=""
SMTP_PASS=""
SMTP_SECURE="true"
GOOGLE_CLOUD_TRANSLATE_API_KEY=""
EMAIL_VERIFICATION_CODE=""
ADMIN_EMAIL="${ADMIN_EMAIL_VALUE}"
ADMIN_PASSWORD="${ADMIN_PASSWORD_VALUE}"
EOF

chmod 600 .env
npm ci
npm run db:generate
npx prisma migrate deploy
SEED_MODE=production npm run db:seed
npm run build
echo "TMH app installed and built."
```

## Block 4 - Start TMH With PM2 On Localhost Port 3031

Run only after Block 3 passes.

```bash
set -euo pipefail
cd /var/www/websites/tmh

ss -tlnp | grep ':3031' && { echo "Port 3031 is already in use. Stop and ask for review."; exit 1; } || true

HOSTNAME=127.0.0.1 PORT=3031 pm2 start "npm run start" --name tmh
pm2 save
pm2 list
curl -I http://127.0.0.1:3031 || true
```

If PM2 says startup is not configured, run:

```bash
pm2 startup
```

Then copy and run the exact command PM2 prints.

## Block 5 - Add Nginx Vhost For thaimyheart.com

Run only after Block 4 returns an HTTP response from `127.0.0.1:3031`.

```bash
set -euo pipefail

cat > /etc/nginx/sites-available/tmh <<'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name thaimyheart.com www.thaimyheart.com;

    client_max_body_size 25m;

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
EOF

ln -sfn /etc/nginx/sites-available/tmh /etc/nginx/sites-enabled/tmh
nginx -t
systemctl reload nginx

curl -I http://thaimyheart.com || true
curl -I http://www.thaimyheart.com || true
```

## Block 6 - Issue HTTPS Certificate

Run only after the HTTP vhost responds correctly.

```bash
set -euo pipefail

certbot --nginx -d thaimyheart.com -d www.thaimyheart.com
nginx -t
systemctl reload nginx

curl -I https://thaimyheart.com
curl -I https://www.thaimyheart.com
```

## Block 7 - Root-Owned DB Backup Config

Run only after the site is live and after confirming there is no existing backup policy conflict.

```bash
set -euo pipefail
DB_PASS="$(cat /root/tmh-secrets/db_password)"

cat > /root/.tmh-my.cnf <<EOF
[client]
user=tmh
password=${DB_PASS}
host=localhost
database=thaimyheart
EOF
chmod 600 /root/.tmh-my.cnf

mkdir -p /var/backups/tmh
mysqldump --defaults-extra-file=/root/.tmh-my.cnf thaimyheart | gzip > /var/backups/tmh/tmh-$(date +%F).sql.gz
ls -lh /var/backups/tmh
```

Add nightly cron after review:

```bash
(crontab -l 2>/dev/null; echo '7 3 * * * /usr/bin/mysqldump --defaults-extra-file=/root/.tmh-my.cnf thaimyheart | gzip > /var/backups/tmh/tmh-$(date +\%F).sql.gz && find /var/backups/tmh -name "*.sql.gz" -mtime +14 -delete') | crontab -
crontab -l
```

## Post-Deploy Checks

```bash
pm2 status tmh
pm2 logs tmh --lines 80 --nostream
curl -I https://thaimyheart.com
curl -I https://www.thaimyheart.com
cd /var/www/websites/tmh && npm run build
```

Expected app URLs:

- `https://thaimyheart.com`
- `https://thaimyheart.com/login`
- `https://thaimyheart.com/signup`
- `https://thaimyheart.com/search`
- `https://thaimyheart.com/reels`
- `https://thaimyheart.com/admin`

## Redeploy Later

```bash
set -euo pipefail
cd /var/www/websites/tmh
git pull origin master
npm ci
npx prisma migrate deploy
npm run build
pm2 restart tmh
pm2 logs tmh --lines 80 --nostream
```
