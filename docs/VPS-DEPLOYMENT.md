# Thai My Heart — VPS Deployment & Database Runbook

Target VPS: **Hostinger KVM 4** — Ubuntu 22.04, 4 vCPU / 16 GB RAM, Manchester UK, IPv4 `195.110.58.111`.
Decision: **MariaDB co-located on the VPS, bound to `localhost`** (app + DB on the same box → localhost socket = fastest; no cross-network query latency). Prisma 7 uses `@prisma/adapter-mariadb`, so MariaDB is the natural fit.

> ⚠️ Security first: the DB is **never** exposed to the internet. Bind it to `127.0.0.1` and keep firewall **port 3306 CLOSED**. Only 22 (SSH), 80, 443 should be open.

> 🔴 **SHARED VPS — other live websites already run here.** Every step below is **additive**: a NEW database + user, a NEW web-server virtual host, a UNIQUE app port. **Never** re-run global initializers (`mariadb-secure-installation`, changing MySQL root) or disable shared services the other sites depend on. Check what exists and reuse it.

### Pre-flight — see what's already running (do this first)
```bash
free -h; nproc                        # spare RAM/CPU (16 GB total, shared with other sites)
sudo ss -tlnp                         # ports in use → pick a FREE port for this app (e.g. 3001)
which mariadb mysql nginx apache2 node pm2 mongod 2>/dev/null
systemctl list-units --type=service --state=running | grep -Ei 'mysql|maria|nginx|apache|mongo|node'
```

---

## 0. Node version (don't break other Node sites)
```bash
node -v          # Next 16 needs >= 20.
# If it's older AND other sites rely on the current Node, DO NOT replace system Node globally.
# Install Node 20 just for this app with nvm (per-user), or containerize this app:
#   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
#   nvm install 20 && nvm use 20
# A global NodeSource upgrade is fine ONLY if nothing else on the box needs the old version.

# MongoDB (MERN preset): DO NOT disable it — another hosted site may use it.
# Leave it alone unless you've confirmed nothing listens on 27017:  sudo ss -tlnp | grep 27017
```

## 1. MariaDB — REUSE if the other sites already run one, else install
```bash
systemctl status mariadb mysql 2>/dev/null | grep -i active
```
- **If a MySQL/MariaDB is already running** (likely, given the other sites) → **do NOT install, do NOT run `mariadb-secure-installation`** (it would touch the other sites' server). **Skip to §3** and just add a NEW database + user.
- **Only if none exists**, install a fresh one:
```bash
sudo apt update
sudo apt install -y mariadb-server
sudo systemctl enable --now mariadb
sudo mariadb-secure-installation      # FRESH install only — never on a server the other sites use
#   → set a root password, remove anonymous users, disallow remote root, remove test DB.
```

## 2. Confirm it listens on localhost only
```bash
sudo grep -R "bind-address" /etc/mysql/ 2>/dev/null
# Should be 127.0.0.1 (Ubuntu MariaDB default). If not, set it:
#   /etc/mysql/mariadb.conf.d/50-server.cnf  →  bind-address = 127.0.0.1
sudo systemctl restart mariadb
ss -tlnp | grep 3306      # should show 127.0.0.1:3306, NOT 0.0.0.0:3306
```

## 3. Create the database + a dedicated (localhost) user
```bash
sudo mariadb
```
```sql
CREATE DATABASE thaimyheart CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'tmh'@'localhost' IDENTIFIED BY 'REPLACE_WITH_A_STRONG_PASSWORD';
GRANT ALL PRIVILEGES ON thaimyheart.* TO 'tmh'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

## 4. Deploy the app
```bash
sudo mkdir -p /var/www && sudo chown $USER:$USER /var/www
cd /var/www
git clone <YOUR_REPO_URL> tmh    # the TMH project
cd tmh
npm ci
```

Create `.env` (copy from `.env.example`, fill values):
```bash
cp .env.example .env
nano .env
```
```dotenv
DATABASE_URL="mysql://tmh:REPLACE_WITH_A_STRONG_PASSWORD@localhost:3306/thaimyheart"
NEXTAUTH_SECRET="<run: openssl rand -base64 32>"
NEXTAUTH_URL="https://your-domain.com"          # or http://195.110.58.111 for now
NEXT_PUBLIC_APP_URL="https://your-domain.com"
ALLOWED_ORIGINS="https://your-domain.com"
ADMIN_EMAIL="you@your-domain.com"
ADMIN_PASSWORD="<a strong admin password>"
# optional: SMTP_HOST/PORT/USER/PASS (real emails), GOOGLE_CLOUD_TRANSLATE_API_KEY (chat translate),
#           NEXT_PUBLIC_ADSENSE_CLIENT (real ads)
```

## 5. Create schema + seed
```bash
npm run db:generate
# FIRST TIME ONLY — generate + apply the initial migration:
npx prisma migrate dev --name init        # creates prisma/migrations/ and applies it
#   (commit prisma/migrations/ to the repo; future prod deploys then use:)
#   npx prisma migrate deploy
npm run db:seed                            # admin + coin packs + VIP plans + gifts + demo members
```

## 6. Build + run under a process manager
```bash
npm run build
sudo npm i -g pm2
# Use a port that is FREE on this shared box (checked in pre-flight). If 3000 is taken:
PORT=3001 pm2 start "npm run start" --name tmh    # (drop PORT= to use 3000 if it's free)
pm2 save
pm2 startup                                # follow the printed command to auto-start on boot
```

## 7. Reverse proxy + HTTPS — ADD a virtual host, don't touch the existing config
The other sites almost certainly already serve 80/443 via Nginx or Apache. **Add ONE new server block** for this site's domain → proxy to the app's port. Do **not** reinstall the web server or edit the other sites' vhosts.
```bash
which nginx apache2                          # which web server is already in use?
# NGINX: add a new server block only (server_name your-domain; proxy_pass http://127.0.0.1:3001;)
sudo nano /etc/nginx/sites-available/tmh
sudo ln -s /etc/nginx/sites-available/tmh /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d your-domain.com      # TLS for the NEW domain only
# If the box uses Apache instead, add an Apache <VirtualHost> with ProxyPass → the same port.
```

## 8. Firewall (Hostinger panel + UFW)
- Open **22 (SSH), 80 (HTTP), 443 (HTTPS)**. Keep **3306 CLOSED**.
```bash
sudo ufw allow 22 && sudo ufw allow 80 && sudo ufw allow 443
sudo ufw enable
```
- In the Hostinger firewall panel, ensure the group attached to this VPS allows 22/80/443 and does **not** allow 3306.

## 9. Nightly backups
```bash
sudo mkdir -p /var/backups/tmh
sudo crontab -e
# add (3:07am daily dump, keep 14 days):
7 3 * * * /usr/bin/mysqldump -u tmh -pREPLACE_WITH_A_STRONG_PASSWORD thaimyheart | gzip > /var/backups/tmh/tmh-$(date +\%F).sql.gz && find /var/backups/tmh -name '*.sql.gz' -mtime +14 -delete
```

## 10. Redeploying after code changes
```bash
cd /var/www/tmh && git pull
npm ci
npx prisma migrate deploy      # applies any new committed migrations (non-interactive)
npm run build
pm2 restart tmh
```

---

## Pre-launch: Email / SMTP (deferred — needs the domain)
Transactional email (verification code, welcome, password reset) is built (`nodemailer`, plain SMTP) but unconfigured. Set up at deploy time, **not before** — it depends on the domain for deliverability.
- **Use a transactional provider** (Resend / Brevo / SendGrid / Amazon SES — free tiers cover our volume). **Do NOT** send through the VPS mail server — a fresh IP has no reputation → verification emails land in spam/blocked.
- **Verify the sending domain**: add the provider's **SPF + DKIM** (and ideally DMARC) DNS records to the new domain. This is what makes inbox delivery reliable — can't be done until the domain is registered.
- **Wire it**: drop the provider's SMTP `host/port/user/pass` (+ `SMTP_SECURE`) into `.env`. No code change — the mailer already speaks SMTP.
- **Dev/testing before the domain exists**: read the verification code from the DB (`EmailVerificationCode` table), or point SMTP at a capture inbox (e.g. Mailtrap) to view emails without real delivery.

**Owner context (2026-07-20):** domain is purchased; owner has a separate InterServer "Slice One" VPS considered for a mail server. Split the two jobs:
- **App transactional email (verification/reset)** = deliverability-critical → **transactional service** (SES/Resend/Brevo). Avoid a cold self-hosted IP. If self-hosting on InterServer is required, run the mail server there but **relay outbound through a transactional smarthost** so deliverability borrows the service's reputation.
- **Business mailboxes** (`support@`, `info@`) → InterServer self-host is fine (owner maintains rDNS/PTR + SPF/DKIM/DMARC + updates), or managed email (Zoho/Workspace) for less upkeep.
- One domain serves both: **A record → Hostinger web VPS**, **MX/SPF/DKIM → mail host**. Independent of website deploy + Phase 7 dev; wire final SMTP creds into `.env` at pre-launch.

**DECISION (2026-07-20):** app transactional email → **Amazon SES now**, migrate to **self-hosted (InterServer) later** (clean swap: new SMTP creds + DNS, no code change). SES setup checklist: verify sending domain (add SES SPF/DKIM DNS records) → **request production access early** (new accounts start in sandbox: verified-recipients-only + low cap until approved, ~24h) → pick region near users (`eu-west-2` London) → put SMTP host/user/pass + `SMTP_SECURE` in `.env`.

## Dev database (to unblock testing NOW, without the VPS)
For local development on the Windows dev machine (so Claude Code can run migrations + exercise flows), run a **local** MySQL/MariaDB — do **not** point dev at the production VPS DB (keeps prod clean + dev fast):
- **Docker (simplest):** `docker run --name tmh-mysql -e MYSQL_ROOT_PASSWORD=devpass -e MYSQL_DATABASE=thaimyheart -p 3306:3306 -d mysql:8`
- then set `.env` `DATABASE_URL="mysql://root:devpass@localhost:3306/thaimyheart"` and run `npm run db:migrate && npm run db:seed`.

**Sizing note:** 16 GB RAM easily runs Next.js + MariaDB together. Give MariaDB a sane `innodb_buffer_pool_size` (e.g. 2–4 GB) in `50-server.cnf` once real data grows; defaults are fine to start.
