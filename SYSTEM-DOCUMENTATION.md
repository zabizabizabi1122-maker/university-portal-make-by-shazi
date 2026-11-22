# UniPortal — Complete System Documentation

**Project:** UniPortal — University Management System
**Type:** Web application (role-based academic portal)
**Location:** `E:\antigravity-Ide gravity\university-portal`
**Local address:** http://localhost:3000
**Version:** 0.1.0

This document explains **what technologies the system uses**, **what the system does**, and **how it works** from the moment a user opens the page to the moment data is saved in the database.

---

## 1. Project at a glance

| Item | Value |
|---|---|
| Purpose | Manage a university's users, departments, courses, enrollments, grades and attendance |
| Users | 3 roles — Administrator, Faculty, Student |
| Pages | 5 (login, admin dashboard, faculty dashboard, student dashboard, role redirect) |
| Backend endpoints | 4 (login, logout, admin actions, faculty actions) |
| Database tables | 8 (User, Department, StudentProfile, FacultyProfile, Course, Enrollment, Attendance, Announcement) |
| Source files | 24 TypeScript/CSS files, about 3,200 lines |
| Platform | Windows, runs locally on the computer |

---

## 2. Technology stack

### 2.1 Main technologies

| Technology | Version | What it does in this project | Where it is used |
|---|---|---|---|
| **Next.js** | 16.4.6 | The web framework. Serves pages, handles routing, runs server code, builds the app | Everywhere — `src/app`, `src/proxy.ts` |
| **React** | 19.3.0 | Builds the user interface from components (buttons, tables, forms) | All screen files (`.tsx`) |
| **TypeScript** | 5.9.3 | JavaScript with types, so mistakes are caught before the app runs | Every `.ts` / `.tsx` file |
| **Prisma ORM** | 5.22.0 | Talks to the database safely. You write `prisma.user.findMany()` instead of raw SQL | `prisma/schema.prisma`, `src/lib/queries.ts`, all API routes |
| **MySQL / MariaDB** | 10.4.32 (XAMPP) | Stores all permanent data (users, courses, grades, attendance) | Database `university_portal` |
| **Tailwind CSS** | 3.4.19 | Styling — colours, spacing, layout, dark theme | All screens + `tailwind.config.js` |
| **jose** | 6.2.17 | Creates and verifies the signed login token (JWT) | `src/lib/jwt.ts` |
| **Node.js `crypto`** | built-in | Hashes passwords with scrypt so real passwords are never stored | `src/lib/crypto.ts` |
| **lucide-react** | 1.73.0 | The icon set (users, books, bell, shield, etc.) | All screens |
| **PostCSS + Autoprefixer** | 8.5 / 10.6 | Converts Tailwind styles into normal CSS the browser understands | `postcss.config.js` |
| **ESLint** | 9 | Checks code quality and catches common mistakes | `npm run lint` |
| **Node.js** | 24.17.0 | Runs the server and the seed script | Runtime |

### 2.2 Special Next.js 16 features used

| Feature | Why it matters here |
|---|---|
| **App Router** | Each page is a folder inside `src/app`. Next.js decides which code runs on the server and which in the browser. |
| **React Server Components** | Admin, Faculty and Student pages load their data **on the server** — the database password never reaches the browser. |
| **`proxy.ts`** | Next.js 16 renamed "middleware" to "proxy". It runs before a page opens and checks who is logged in. |
| **Route Handlers** | Files named `route.ts` behave like small web APIs (login, logout, admin actions, faculty actions). |
| **`next/font`** | Downloads and serves the Geist font locally, so text looks the same everywhere. |

### 2.3 Development tools

| Tool | Purpose |
|---|---|
| `npm` 11.13.0 | Installs packages and runs scripts |
| `prisma db push` | Creates/updates tables from `prisma/schema.prisma` |
| `prisma db seed` | Fills the database with demo data |
| `next build` | Produces the optimised production version |
| `tsc --noEmit` | Type-check only, no output files |

---

## 3. What the system does

The system is a **single website with three different dashboards**. After logging in, each person is sent to the dashboard that matches their role.

### 3.1 Administrator (`/admin`)

The administrator runs the university's records.

| Capability | Details |
|---|---|
| See totals | Students, faculty, courses, departments, enrollments, notices |
| Manage users | Create Admin/Faculty/Student accounts, set the first password, reset any password, delete users |
| Manage courses | Create, edit (code, title, credits, department, instructor), delete |
| Manage departments | Create, edit, delete — but only when nothing depends on it |
| Manage enrollments | Enroll a student in a course, remove an enrollment |
| Manage announcements | Publish notices to everyone, students only, or faculty only; delete notices |
| Safety rules | Cannot delete own account; cannot delete a department that still has courses/students/faculty |

### 3.2 Faculty (`/faculty`)

A teacher only sees and touches the courses assigned to them.

| Capability | Details |
|---|---|
| See courses | Only their own assigned courses, with enrolled students |
| Enter marks | A number from 0 to 100 per student, saved automatically when leaving the field |
| Enter grades | A letter grade (A+ … F) per student, saved immediately |
| Mark attendance | Choose a date (defaults to today) and press Present / Late / Absent for each student |
| Read notices | Notices addressed to everyone and to faculty |
| Safety rules | Cannot grade or mark attendance for a course they do not teach |

### 3.3 Student (`/student`)

A read-only academic view.

| Capability | Details |
|---|---|
| See profile | Name, roll number, department, semester |
| See results | Every enrolled course with marks and letter grade |
| See attendance | Overall percentage, classes attended, late arrivals, per-course percentage |
| See standing | Excellent / Good / Satisfactory / Needs Improvement, calculated from CGPA |
| See notices | Notices addressed to everyone and to students |
| Attendance log | The most recent 8 attendance records with dates and status |

### 3.4 What the system does **not** do

- No online registration (the admin creates accounts)
- No file uploads (photos, documents)
- No email sending / password reset by email
- No fee, library or exam-scheduling modules
- No multi-campus or multi-semester history

These are deliberate scope limits, not bugs.

---

## 4. How it works

### 4.1 The big picture

```
        BROWSER (what the user sees)
                │
                │  HTTPS/HTTP request
                ▼
   ┌──────────────────────────────┐
   │  src/proxy.ts                │  ← step 1: is there a valid login cookie?
   │  (runs before every page)    │     no  → send to /login
   └──────────────┬───────────────┘     wrong role → send to own dashboard
                  │
                  ▼
   ┌──────────────────────────────┐
   │  Page (Server Component)     │  ← step 2: re-check the role on the server
   │  /admin /faculty /student    │
   └──────────────┬───────────────┘
                  │  asks for data
                  ▼
   ┌──────────────────────────────┐
   │  src/lib/queries.ts          │  ← step 3: one function per dashboard
   └──────────────┬───────────────┘
                  │  Prisma query
                  ▼
   ┌──────────────────────────────┐
   │  MySQL  university_portal    │  ← step 4: real data
   └──────────────────────────────┘
```

When a user **changes** something (adds a course, saves a grade), the browser sends a request to an **API route**, the route checks the role again, writes to MySQL with Prisma, and the page refreshes itself with the new data.

### 4.2 The life of a login

1. The user types an email and password on `/login`.
2. The browser sends `POST /api/auth/login` with the two values.
3. The server looks up the user by email.
4. The password is checked against the stored hash (scrypt, or the old SHA-256 format).
5. If it is a legacy hash, it is silently replaced with a modern scrypt hash.
6. The server creates a **JWT** (a signed token containing user id, email, name and role) valid for **7 days**.
7. The token is placed in an **httpOnly cookie** named `auth_token` — JavaScript in the browser cannot read it.
8. The response tells the browser the role; the login page redirects to `/admin`, `/faculty` or `/student`.
9. Every later request carries the cookie automatically.
10. Logging out deletes the cookie.

### 4.3 Three layers of protection

The app never trusts the browser. Access is checked three separate times:

| Layer | File | What it stops |
|---|---|---|
| 1. Proxy | `src/proxy.ts` | Strangers and wrong-role visitors before a page even renders |
| 2. Page guard | `src/lib/auth.ts` → `requireRole()` | Anyone who somehow reaches the page anyway |
| 3. API guard | `src/app/api/*/route.ts` | Direct calls to the backend that skip the UI entirely |

Example: a student who types `/admin` is redirected to `/student` by the proxy. If they disable the proxy somehow, `requireRole('ADMIN')` still redirects. If they call the admin API directly, it answers **403 Forbidden**.

### 4.4 Why data is loaded on the server

The dashboards are *Server Components*. They call `getAdminData()` / `getFacultyData()` / Prisma directly on the server before the page is sent. Benefits:

- The browser never receives database credentials.
- The page arrives already filled with data (no loading spinner).
- After a save, the client calls `router.refresh()` — Next.js re-runs the server part and re-renders with fresh data, without a full page reload.

### 4.5 Example: adding a course

```
Admin form
   │  POST /api/admin/data  {action:"create_course", code, title, credits, departmentId, facultyId}
   ▼
is the session valid and role ADMIN?   ──no──► 403
   │ yes
validate: code and title not empty, department exists
   │
   ▼
prisma.course.create(...)
   │
   ├─ success → {success:true, id} → toast "Course created" + router.refresh()
   └─ duplicate code → MySQL rejects it → friendly message:
                      "That code is already in use."
```

### 4.6 Example: marking attendance

```
Faculty picks a date and presses "Present"
   │  POST /api/faculty/data {action:"mark_attendance", courseId, studentId, status, date}
   ▼
role FACULTY?  →  do they teach this course?  →  is the student enrolled?
   │
   ▼
prisma.attendance.upsert(  courseId + studentId + date  )
   │
   ├─ no record today  → create one
   └─ record exists    → update its status (never a duplicate)
```

The database enforces this too: the table has a unique rule on **course + student + date**.

---

## 5. The data model

### 5.1 Diagram

```
Department ──1:N── Course ──1:N── Enrollment ──N:1── StudentProfile ──1:1── User
     │                │                                      │
     │                └──1:N── Attendance ──N:1───────────────┘
     │
     ├──1:N── StudentProfile
     └──1:N── FacultyProfile ──1:N── Course
                                   │
User ──1:1── FacultyProfile         └── (facultyId on Course)

User ──1:N── Announcement
```

### 5.2 Tables explained

| Table | Holds | Important rules |
|---|---|---|
| **User** | Login identity: email, hashed password, name, role | Email is unique; role is ADMIN, FACULTY or STUDENT |
| **Department** | Name, short code, description | Name and code are unique (e.g. `CSE`) |
| **StudentProfile** | Extra student data: roll number, semester, CGPA, department | One per user; roll number unique |
| **FacultyProfile** | Extra teacher data: designation, department | One per user |
| **Course** | Code, title, credits, department, optional instructor | Code unique (e.g. `CS-301`) |
| **Enrollment** | Links a student to a course, with grade and marks | A student can enroll in a course only once |
| **Attendance** | One day's status for one student in one course | Unique per course + student + **date**; status PRESENT / LATE / ABSENT |
| **Announcement** | Title, body, audience, author | Audience is ALL, STUDENT or FACULTY |

### 5.3 Why profiles are separate from users

`User` only knows how to log in. A student has a roll number and CGPA that a teacher does not; a teacher has a designation. Splitting them keeps the login table small and the role-specific data clean.

### 5.4 Rules the database enforces

- Deleting a user deletes their student/faculty profile automatically (cascade).
- Deleting a course deletes its enrollments and attendance (cascade).
- Deleting a department is **refused by the app** while it still has courses, students or faculty.
- Attendance cannot be duplicated for the same student, course and day.
- A grade is optional (NULL means "not graded yet"), and marks are optional too.

---

## 6. Pages and routes

| URL | Who can open it | What it is |
|---|---|---|
| `/` | Everyone | Sends you to the dashboard for your role, or to `/login` |
| `/login` | Guests only | Email + password form, demo quick-fill buttons |
| `/admin` | ADMIN only | Management dashboard (5 tabs) |
| `/faculty` | FACULTY only | Teaching dashboard |
| `/student` | STUDENT only | Read-only academic dashboard |
| `/api/auth/login` | Everyone (POST) | Checks credentials, sets the cookie |
| `/api/auth/logout` | Logged-in users (POST) | Deletes the cookie |
| `/api/admin/data` | ADMIN only (POST) | All administrator actions |
| `/api/faculty/data` | FACULTY only (POST) | Grading, marks and attendance |

The proxy watches `/`, `/login`, `/admin/*`, `/faculty/*` and `/student/*`.

---

## 7. API reference

### 7.1 Login

`POST /api/auth/login`

```json
{ "email": "admin@university.edu", "password": "password123" }
```

| Result | Meaning |
|---|---|
| 200 | `{ "success": true, "user": { id, email, name, role } }` + cookie |
| 400 | Email or password missing |
| 401 | Wrong email or password |
| 500 | Unexpected server error |

### 7.2 Logout

`POST /api/auth/logout` → always `{ "success": true }`, cookie removed.

### 7.3 Administrator actions

`POST /api/admin/data` — the body always contains `action` plus the fields it needs.

| `action` | Fields | Notes |
|---|---|---|
| `create_course` | code, title, credits, departmentId, facultyId? | Code is upper-cased; credits 1–6 |
| `update_course` | id + the same fields | Changes are saved immediately |
| `delete_course` | id | Enrollments/attendance are removed with it |
| `create_department` | name, code, description? | Codes are unique |
| `update_department` | id, name, code, description? | |
| `delete_department` | id | Refused if still in use |
| `create_enrollment` | studentId, courseId | Duplicate enrollment refused |
| `delete_enrollment` | id | |
| `create_user` | name, email, password, role, departmentId?, rollNumber?, designation? | Password ≥ 6 characters; students need a roll number |
| `reset_password` | id, password | Password ≥ 6 characters |
| `delete_user` | id | Refused for your own account |
| `create_announcement` | title, content, target | Target ALL / STUDENT / FACULTY |
| `delete_announcement` | id | |

### 7.4 Faculty actions

`POST /api/faculty/data`

| `action` | Fields | Checks |
|---|---|---|
| `update_grade` | enrollmentId, grade | Grade must be in the allowed list or empty; the course must be yours |
| `update_marks` | enrollmentId, marks | 0–100 (one decimal); the course must be yours |
| `mark_attendance` | courseId, studentId, status, date | Status PRESENT/LATE/ABSENT, date `YYYY-MM-DD`, course yours, student enrolled |

---

## 8. Security

| Concern | How it is handled |
|---|---|
| Password storage | scrypt with a random 16-byte salt per user. Older SHA-256 hashes still work and are upgraded at login |
| Session | Signed JWT (HS256), 7-day expiry, inside an httpOnly + SameSite=Lax cookie; `Secure` in production |
| Role abuse | Checked in the proxy, on the page, and in every API route |
| Cross-account edits | Faculty actions verify the course belongs to the signed-in teacher |
| SQL injection | All queries go through Prisma's parameterised API — no string-built SQL |
| Cross-site scripting | React escapes all displayed text; no `dangerouslySetInnerHTML` |
| Input validation | Every field is trimmed, length-limited and type-checked on the server |
| Accidental destruction | Self-delete blocked, in-use departments blocked, deletes require confirmation |
| Secrets | `JWT_SECRET` and `DATABASE_URL` live in `.env`, which `.gitignore` excludes |

> **For a real deployment** you would also: use HTTPS, put a strong random `JWT_SECRET`, change all demo passwords, and add rate-limiting on the login endpoint.

---

## 9. Project structure

```
university-portal/
├─ prisma/
│  ├─ schema.prisma          Database model (8 tables)
│  └─ seed.mts               Demo data: 3 departments, 4 accounts, 3 courses, notices
├─ src/
│  ├─ proxy.ts               Route guard that runs before pages
│  ├─ app/
│  │  ├─ layout.tsx          Shared HTML shell, fonts, page title
│  │  ├─ page.tsx            "/" → redirect by role
│  │  ├─ globals.css         Tailwind entry + base colours
│  │  ├─ login/page.tsx      Login screen
│  │  ├─ admin/
│  │  │  ├─ page.tsx         Server guard + data loading
│  │  │  └─ AdminDashboard.tsx   All admin tabs and forms
│  │  ├─ faculty/
│  │  │  ├─ page.tsx         Server guard + data loading
│  │  │  └─ FacultyDashboard.tsx Grading and attendance UI
│  │  ├─ student/page.tsx    Read-only student dashboard
│  │  └─ api/
│  │     ├─ auth/login/route.ts
│  │     ├─ auth/logout/route.ts
│  │     ├─ admin/data/route.ts
│  │     └─ faculty/data/route.ts
│  ├─ components/
│  │  ├─ Navbar.tsx          Top bar with user info and logout
│  │  └─ Modal.tsx           Reusable popup
│  └─ lib/
│     ├─ prisma.ts           One shared database client
│     ├─ auth.ts             getCurrentUser / requireUser / requireRole
│     ├─ jwt.ts              Create and verify tokens
│     ├─ roles.ts            Role constants and home routes
│     ├─ crypto.ts           Password hashing and checking
│     ├─ academics.ts        Grades, attendance maths, CGPA standing
│     ├─ queries.ts          Server-side data loaders
│     └─ types.ts            Shared TypeScript shapes
├─ .env                      DATABASE_URL + JWT_SECRET (not committed)
├─ .env.example              Template for new machines
├─ package.json              Packages and scripts
├─ tailwind.config.js        Which files Tailwind scans
├─ postcss.config.js         Tailwind + Autoprefixer pipeline
├─ next.config.ts            Next.js configuration
└─ README.md                 Short setup guide
```

---

## 10. Running the system

### 10.1 Requirements

- Windows with XAMPP (Apache not needed — only MySQL)
- Node.js 22.18 or newer (tested on 24.17)
- MySQL/MariaDB running on `localhost:3306`

### 10.2 First-time setup

```bash
# 1. install packages
npm install

# 2. create .env from .env.example, then fill in:
#    DATABASE_URL="mysql://root:@localhost:3306/university_portal"
#    JWT_SECRET="a-long-random-string"

# 3. create the database (XAMPP MySQL must be running)
mysql -u root -e "CREATE DATABASE IF NOT EXISTS university_portal;"

# 4. create the tables
npm run db:push

# 5. add demo data (optional — this erases existing data)
npm run db:seed

# 6. start
npm run dev
```

Open **http://localhost:3000**.

### 10.3 Daily use

```bash
npm run dev      # development, with hot reload
npm run build    # production build
npm run start    # serve the production build
npm run lint     # code-quality check
```

> Use `localhost`, not `127.0.0.1` — XAMPP's MySQL listens on IPv6 only, so `127.0.0.1` is refused.

### 10.4 Demo accounts

Password for all: `password123`

| Role | Email |
|---|---|
| Admin | `admin@university.edu` |
| Faculty | `prof.smith@university.edu` |
| Student | `john.doe@student.university.edu` |
| Student | `sarah.connor@student.university.edu` |

Demo data: 3 departments (CSE, EE, SBM), 3 courses (CS-301, CS-304, CS-202), 4 enrollments with grades, 5 attendance days, 2 announcements.

---

## 11. How the system was tested

| Test | Result |
|---|---|
| Production build | Passes |
| TypeScript type-check | 0 errors |
| ESLint | 0 problems |
| Automated end-to-end run (all three roles, redirects, every action, error cases) | 56 / 56 checks passed |
| Seed script on a separate empty database | Creates the expected 4 users / 3 courses / 5 attendance rows |
| Rendered styles and console errors in a real browser | Styles applied, 0 console errors |
| Production dependency audit | 0 vulnerabilities |

The automated run also verified the important failure cases: wrong password (401), student calling the admin API (403), faculty touching another teacher's course (403), duplicate enrollment, duplicate department code, out-of-range marks, invalid grade, malformed date, and self-deletion.

---

## 12. Behaviour rules worth knowing

1. **One department per student and per teacher.** Transferring is done by editing the database, not the UI.
2. **Course and department codes are unique and stored in upper case** (`cs-301` becomes `CS-301`).
3. **A student appears in a course only once.** The admin removes the enrollment to undo it.
4. **Attendance is one record per day.** Marking the same day again replaces the earlier status.
5. **Late counts as attended**, but is reported separately.
6. **CGPA standing** is calculated as: ≥ 3.5 Excellent, ≥ 3.0 Good, ≥ 2.0 Satisfactory, below 2.0 Needs Improvement.
7. **Passwords are never shown** — an admin can only set a new one.
8. **`npm run db:seed` deletes all data** and recreates the demo set.
9. **Sessions last 7 days**; after that the user must log in again.
10. **The app is single-institution** — one database, one university.

---

## 13. Glossary

| Term | Plain meaning |
|---|---|
| **Server** | The part of the app that runs on the computer, not in the browser. It can read the database. |
| **Client / browser** | The screen the user interacts with. |
| **Server Component** | A page section that is prepared on the server before being sent. Used here to load dashboard data safely. |
| **API route** | A small web address the browser calls to perform an action (`/api/admin/data`). |
| **ORM (Prisma)** | A tool that turns database rows into objects and prevents SQL mistakes. |
| **Schema** | The blueprint of tables and columns (`prisma/schema.prisma`). |
| **Migration / `db push`** | Applying the schema to the real database. |
| **Seed** | Filling an empty database with demo data. |
| **Hash** | A one-way scramble of a password. You can check a password but not reverse a hash. |
| **Salt** | Random text added before hashing so two equal passwords produce different hashes. |
| **JWT** | A signed token that proves who the user is without asking the database every time. |
| **Cookie (httpOnly)** | A small value the browser stores and sends automatically. httpOnly means page scripts cannot read it. |
| **Proxy / middleware** | Code that runs before a page opens to decide whether to allow, redirect or block. |
| **Environment variable** | A setting stored outside the code (`.env`), used for the database address and the secret key. |

---

*End of document.*
