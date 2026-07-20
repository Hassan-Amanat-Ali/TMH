# Thai My Heart V2

Clean rebuild of Thai My Heart in the `TMH/` folder.

## Stack

- Next.js 16 App Router
- React 19
- Tailwind CSS v4
- NextAuth credentials auth with JWT sessions
- Prisma 7 with MySQL/MariaDB adapter

## Local Setup

```bash
npm.cmd install
npm.cmd run db:generate
npm.cmd run dev
```

Copy `.env.example` to `.env` and fill in local values before running database-backed flows.

After a database is configured, run:

```bash
npm.cmd run db:migrate
npm.cmd run db:seed
```

Dev-only seeded login for shared QA:

- Member: `member@tmh.com` / `Member123!`
- Admin: `admins@tmh.com` / `ChangeMe123`

## Verification

```bash
npm.cmd run lint
npx.cmd tsc --noEmit
npm.cmd run build
```
