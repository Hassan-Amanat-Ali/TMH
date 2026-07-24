# VPS Ports & Services Map — 195.110.58.111 (Hostinger, host `mail`)

_Based on the VPS audit + deploy preflight (2026-07-21). Refresh anytime with:_
```bash
ss -tlnp                                   # everything listening
docker ps --format '{{.Names}} | {{.Ports}}'   # container-published ports
```

## Two kinds of ports
1. **Standard/reserved** — fixed by convention, same on every server (443 = HTTPS, 3306 = MySQL/MariaDB, 27017 = MongoDB, 25/465/587/993 = mail). You don't choose these.
2. **App ports** — chosen when someone starts a custom Node/Python app (the 3000-series). These are the ones we can keep tidy.

## Current map

### Public (internet-facing — open in UFW, or published by Docker)
| Port | Service | Belongs to | Notes |
|---|---|---|---|
| 22 | SSH | system | admin login |
| 80 / 443 | Nginx (HTTP/HTTPS) | **all websites** | routed by domain name, not port |
| 25 / 465 / 587 | SMTP / SMTPS / submission | iRedMail (Docker) | mail send/receive |
| 110 / 143 / 993 / 995 | POP3/IMAP(S) | iRedMail (Docker) | mailbox access |
| 8080 / 8443 | iRedMail web admin/webmail | iRedMail (Docker) | container 80/443 → host 8080/8443 |
| 3001 | a Node/Next app | existing site | **exposed directly** (not behind Nginx) |
| 3030 | (reserved/app) | existing | allowed in UFW |

### Internal (localhost only — not reachable from the internet)
| Port | Service | Belongs to | Notes |
|---|---|---|---|
| 27017 | **MongoDB** | existing sites (MERN preset) | the other sites' database |
| 3000 | Node app | existing site | behind Nginx |
| 3002 | Next app | existing site | behind Nginx |
| 3020 / 6190 | docker-proxy | containers | internal |
| 8020 | uvicorn (Python) | existing site | behind Nginx |

### Thai My Heart (to be added — both localhost-only)
| Port | Service | Notes |
|---|---|---|
| **3003** | TMH Next.js app | localhost only; Nginx fronts it at thaimyheart.com:443 |
| **3306** | MariaDB (TMH database) | localhost only; **firewall keeps 3306 closed**; standard MySQL port |

> ⚠️ **Docker + UFW note:** Docker-published ports (the mail stack on 0.0.0.0) bypass the UFW firewall — they're reachable even if not in `ufw status`. This affects the existing mail stack, not TMH. **TMH's app + database bind to `127.0.0.1` only**, so they are never internet-exposed regardless of firewall.

## Request flow for thaimyheart.com
```
Visitor → :443 (Nginx, public) → :3003 (TMH app, localhost) → :3306 (MariaDB, localhost)
```
Only :443 faces the world.

## Port convention going forward (keep it tidy)
- **Web/app processes:** allocate the **3000-series sequentially** — 3000, 3001, 3002 (existing) → **3003 = TMH** → 3004, 3005… for future projects. No gaps.
- **Databases:** keep on standard ports — MySQL/MariaDB **3306**, MongoDB **27017**, Postgres **5432**. Multiple projects share ONE database server; each gets its own database (by name + user), not its own port.
- **Public entry:** always **443** via Nginx, routed by domain. New apps stay on localhost behind Nginx — do **not** expose app ports directly (unlike the legacy 3001 site).
- Existing running sites are **left as-is** (renumbering a live service risks breaking it); the convention applies to new work.

## Count
- **~14 ports currently in use** on the host (see tables above).
- **TMH adds 2:** 3003 (app) + 3306 (database) — both localhost-only.
