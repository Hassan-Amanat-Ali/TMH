#!/usr/bin/env bash
# Thai My Heart - READ-ONLY VPS audit.
# Safe for a shared production VPS: installs nothing, edits nothing, restarts nothing.
#
# Run on the VPS from an SSH shell:
#   bash vps-audit.sh 2>&1 | tee tmh-vps-audit-$(date +%F-%H%M).log
#
# Paste the log into docs/vps-audit-findings.md for Claude/Codex review.
set +e

section() {
  printf '\n===== %s =====\n' "$1"
}

run() {
  printf '\n$ %s\n' "$*"
  "$@"
}

section "AUDIT SAFETY"
echo "READ-ONLY audit for a shared VPS. This script does not install, edit, restart, stop, enable, disable, or delete anything."
echo "Started: $(date -Is)"
echo "User: $(id -un) ($(id -u))"
echo "Host: $(hostname -f 2>/dev/null || hostname)"

section "OS / KERNEL / UPTIME"
run grep PRETTY /etc/os-release
run uname -a
run uptime
run timedatectl status 2>/dev/null

section "CPU / RAM / LOAD"
echo "cores: $(nproc 2>/dev/null)"
run free -h
run vmstat 1 3 2>/dev/null

section "DISK"
run df -hT / /var /home /tmp 2>/dev/null
run lsblk -f 2>/dev/null
run du -sh /var/www /srv /home 2>/dev/null

section "TOP PROCESSES"
echo "--- memory ---"
ps aux --sort=-%mem | head -16
echo "--- cpu ---"
ps aux --sort=-%cpu | head -16

section "RUNNING SERVICES (RELEVANT)"
systemctl list-units --type=service --state=running --no-pager 2>/dev/null \
  | grep -Ei 'nginx|apache|httpd|mysql|maria|mongo|postgres|php|node|pm2|docker|redis|caddy|certbot|cron' \
  || echo "(no matching running services or systemctl unavailable)"

section "LISTENING PORTS"
if command -v ss >/dev/null 2>&1; then
  sudo -n ss -tulpen 2>/dev/null || ss -tulpen 2>/dev/null || ss -tuln
else
  sudo -n netstat -tulpen 2>/dev/null || netstat -tuln 2>/dev/null || echo "(ss/netstat unavailable)"
fi

section "FIREWALL"
sudo -n ufw status verbose 2>/dev/null || ufw status verbose 2>/dev/null || echo "(ufw unavailable/inactive or sudo password required)"
sudo -n iptables -S 2>/dev/null | head -80 || true

section "WEB SERVER DISCOVERY"
echo "--- binaries ---"
command -v nginx apache2 httpd caddy 2>/dev/null || true
nginx -v 2>&1 | head -1
apache2 -v 2>&1 | head -1
httpd -v 2>&1 | head -1
caddy version 2>/dev/null

echo "--- nginx enabled/configured sites ---"
ls -la /etc/nginx/sites-enabled/ /etc/nginx/conf.d/ 2>/dev/null
grep -RhsE "server_name|listen |root |proxy_pass" /etc/nginx/sites-enabled/ /etc/nginx/conf.d/ 2>/dev/null | sed 's/[[:space:]]\+/ /g' | sort -u

echo "--- apache enabled/configured sites ---"
ls -la /etc/apache2/sites-enabled/ 2>/dev/null
grep -RhsE "ServerName|ServerAlias|<VirtualHost|DocumentRoot|ProxyPass" /etc/apache2/sites-enabled/ 2>/dev/null | sed 's/[[:space:]]\+/ /g' | sort -u

echo "--- caddy config hints ---"
grep -RhsE "reverse_proxy|root|:80|:443" /etc/caddy/ 2>/dev/null | sed 's/[[:space:]]\+/ /g' | head -120

section "EXISTING SITES / WEB ROOTS"
ls -la /var/www 2>/dev/null
ls -la /srv 2>/dev/null
find /var/www /srv -maxdepth 2 -type d 2>/dev/null | sort | head -120
find /home -maxdepth 2 -type d -name public_html 2>/dev/null | sort | head -80

section "DATABASE ENGINES"
mysql --version 2>/dev/null
mariadb --version 2>/dev/null
psql --version 2>/dev/null
mongod --version 2>/dev/null | head -1
redis-server --version 2>/dev/null

echo "--- mysql/mariadb status (best effort, no password prompts) ---"
sudo -n mysql -e "SELECT VERSION() AS version; SHOW DATABASES;" 2>/dev/null \
  || sudo -n mariadb -e "SELECT VERSION() AS version; SHOW DATABASES;" 2>/dev/null \
  || mysql -e "SELECT VERSION() AS version; SHOW DATABASES;" 2>/dev/null \
  || mariadb -e "SELECT VERSION() AS version; SHOW DATABASES;" 2>/dev/null \
  || echo "(mysql/mariadb query unavailable without credentials or not installed)"

echo "--- mysql/mariadb bind-address hints ---"
grep -Rhs "bind-address" /etc/mysql/ /etc/my.cnf* 2>/dev/null || echo "(no bind-address found/readable)"

section "NODE / NPM / PM2 / NVM"
echo "node: $(node -v 2>/dev/null || echo unavailable)"
echo "npm:  $(npm -v 2>/dev/null || echo unavailable)"
echo "pnpm: $(pnpm -v 2>/dev/null || echo unavailable)"
echo "pm2:  $(pm2 -v 2>/dev/null || echo unavailable)"
pm2 list 2>/dev/null || true
if [ -d "$HOME/.nvm/versions/node" ]; then
  echo "nvm node versions:"
  ls -1 "$HOME/.nvm/versions/node" 2>/dev/null
fi

section "PHP / PYTHON / DOCKER"
php -v 2>/dev/null | head -1
python3 --version 2>/dev/null
docker --version 2>/dev/null
docker ps 2>/dev/null || echo "(docker unavailable or no permission)"

section "TLS CERTIFICATES"
sudo -n certbot certificates 2>/dev/null | grep -E "Certificate Name|Domains|Expiry" || certbot certificates 2>/dev/null | grep -E "Certificate Name|Domains|Expiry" || echo "(certbot unavailable/no certs/no permission)"
find /etc/letsencrypt/live -maxdepth 2 -type l -o -type f 2>/dev/null | head -80

section "CRON / BACKUPS"
echo "--- user crontab ---"
crontab -l 2>/dev/null || echo "(no user crontab or unavailable)"
echo "--- system cron dirs ---"
ls -la /etc/cron.d /etc/cron.daily /etc/cron.hourly /etc/cron.weekly 2>/dev/null
echo "--- backup-looking paths ---"
find /var/backups /backup /backups /home -maxdepth 3 \( -iname '*backup*' -o -iname '*.sql.gz' -o -iname '*.dump' \) 2>/dev/null | head -100

section "CANDIDATE FREE APP PORTS"
for port in 3000 3001 3002 3003 3010 8080 8081; do
  if ss -tln 2>/dev/null | awk '{print $4}' | grep -qE "[:.]${port}$"; then
    echo "port $port: in use"
  else
    echo "port $port: appears free"
  fi
done

section "DONE"
echo "Finished: $(date -Is)"
