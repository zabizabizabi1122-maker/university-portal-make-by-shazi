# UniPortal — University Management System

A role-based academic portal built with Next.js 16 (App Router), Prisma and MySQL.

## Roles

| Role | Route | Capabilities |
|---|---|---|
| Admin | `/admin` | Create/edit/delete users, courses, departments, enrollments and announcements; reset passwords |
| Faculty | `/faculty` | Enter marks and letter grades, mark attendance (present / late / absent), read notices |
| Student | `/student` | View courses, grades, marks, attendance history, CGPA standing and notices |

## Requirements

- Node.js 22.18+ (the seed script runs TypeScript natively; tested on Node 24)
- MySQL 8 (or XAMPP / MariaDB)

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env` from `.env.example`. Set `DATABASE_URL` to the dedicated app
   user (see [Database user](#database-user-least-privilege)) and set a
   `JWT_SECRET` of at least 32 characters — the app refuses to start otherwise.
   Generate one with:

   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```

   > Use `localhost`, not `127.0.0.1`. XAMPP's MySQL binds to IPv6 only, so
   > `127.0.0.1` connections are refused.

3. Create the database and tables **with an administrative connection** (the app
   user is intentionally not allowed to change the schema):

   ```bash
   mysql -u root -e "CREATE DATABASE IF NOT EXISTS university_portal CHARACTER SET utf8mb4;"
   DATABASE_URL="mysql://root:@localhost:3306/university_portal" npx prisma db push
   ```

   In PowerShell:

   ```powershell
   $env:DATABASE_URL = "mysql://root:@localhost:3306/university_portal"
   npx prisma db push
   ```

4. Create the dedicated database user (one time, as an administrator):

   ```sql
   CREATE USER 'uni_portal_app'@'localhost' IDENTIFIED BY 'REPLACE_WITH_A_STRONG_PASSWORD';
   CREATE USER 'uni_portal_app'@'127.0.0.1' IDENTIFIED BY 'REPLACE_WITH_A_STRONG_PASSWORD';
   CREATE USER 'uni_portal_app'@'::1'       IDENTIFIED BY 'REPLACE_WITH_A_STRONG_PASSWORD';

   GRANT SELECT, INSERT, UPDATE, DELETE ON university_portal.* TO 'uni_portal_app'@'localhost';
   GRANT SELECT, INSERT, UPDATE, DELETE ON university_portal.* TO 'uni_portal_app'@'127.0.0.1';
   GRANT SELECT, INSERT, UPDATE, DELETE ON university_portal.* TO 'uni_portal_app'@'::1';
   FLUSH PRIVILEGES;
   ```

   Then put that password into `DATABASE_URL`:

   ```
   DATABASE_URL="mysql://uni_portal_app:REPLACE_WITH_A_STRONG_PASSWORD@localhost:3306/university_portal"
   ```

5. Seed demo data (optional — this resets the demo dataset and refuses to run
   when `NODE_ENV=production`):

   ```bash
   npm run db:seed
   ```

6. Start the dev server:

   ```bash
   npm run dev
   ```

## Database user (least privilege)

The app account can only `SELECT`, `INSERT`, `UPDATE` and `DELETE` rows inside
`university_portal`. It cannot create, alter or drop tables, and it cannot read
other schemas.

Schema commands (`npm run db:push`, and later `prisma migrate`) therefore need an
administrative connection:

```bash
# bash
DATABASE_URL="mysql://root:@localhost:3306/university_portal" npm run db:push
```

```powershell
# PowerShell
$env:DATABASE_URL = "mysql://root:@localhost:3306/university_portal"
npm run db:push
```

For a shared or hosted server, create a separate migration account instead of
using root:

```sql
GRANT CREATE, ALTER, DROP, INDEX, REFERENCES, SELECT, INSERT, UPDATE, DELETE
  ON university_portal.* TO 'uni_portal_migrator'@'localhost';
```

## Demo accounts

Password for all seeded accounts: `password123`

- `admin@university.edu` — Admin
- `prof.smith@university.edu` — Faculty
- `john.doe@student.university.edu` — Student
- `sarah.connor@student.university.edu` — Student

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint |
| `npm run db:push` | Push Prisma schema to the database |
| `npm run db:seed` | Reset and seed demo data |

## How it works

- Requests to `/admin`, `/faculty` and `/student` pass through `src/proxy.ts`, which reads the signed session cookie and redirects people to the dashboard that matches their role. Each page and every API route re-checks the role on the server, so a role can never be spoofed from the browser.
- Dashboards load their data on the server (`src/lib/queries.ts`) and refresh after each change, so what you see always matches the database.
- Attendance is a calendar day: one record per student, per course, per day. Marking the same day again updates the existing record instead of adding a duplicate. `LATE` counts as attended but is reported separately.
- Passwords use scrypt with a per-user salt. The demo seed writes the older SHA-256 format, and those hashes are upgraded automatically the first time each account signs in.

## Known issues after a corrupted npm cache

If packages fail to load with `is not a valid Win32 application` or
`Invalid or unexpected token`, the npm cache is corrupt. Fix it with:

```bash
npm cache clean --force
rm -rf node_modules
npm ci
```
