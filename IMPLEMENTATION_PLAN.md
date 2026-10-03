# School Management System — Implementation Plan (Frontend Only, Mock Data)

## 1. Scope & Constraints

| Item | Decision |
| --- | --- |
| Rendering | Next.js 15 (App Router), full client-side interactivity |
| Backend | None. No API routes used at runtime for data. |
| Database | None. No Prisma/Drizzle/DB connection. |
| Data | Hand-authored mock data in TypeScript modules + a mock "DB" layer that mimics async APIs (latency, CRUD) so UI code is written exactly as it would be with a real backend. |
| Auth | Fake auth: pick a role/persona from a mock session stored in `localStorage`/cookie. Role-gated UI only — **not** security. |
| Persistence | Optional `localStorage` overlay so edits survive reloads; "Reset mock data" button. |
| Styling | Tailwind CSS v4 + shadcn/ui (Radix primitives), `lucide-react` icons, `recharts` for charts. |
| Language | TypeScript, strict. |

### Target structure

```
schoole-ms/
├─ src/
│  ├─ app/
│  │  ├─ (auth)/login/page.tsx
│  │  ├─ (portal)/layout.tsx              # sidebar + topbar shell
│  │  │  ├─ dashboard/page.tsx
│  │  │  ├─ students/…  teachers/…  families/…  staff/…  admissions/…
│  │  │  ├─ academics/…  attendance/…  timetable/…  exams/…
│  │  │  ├─ finance/…  announcements/…  messages/…
│  │  │  └─ settings/…
│  │  └─ page.tsx                         # redirect -> /dashboard
│  ├─ components/ui/…                     # shadcn primitives
│  ├─ components/shared/…                 # DataTable, PageHeader, StatCard, FormDialog…
│  ├─ lib/
│  │  ├─ mock/
│  │  │  ├─ seed/                        # raw seed records (students.ts, …)
│  │  │  ├─ server.ts                    # fake async data gateway
│  │  │  ├─ store.ts                     # localStorage persistence + reset
│  │  │  └─ factories.ts                 # makeStudent(), faker helpers
│  │  ├─ auth/                           # session context, permissions map
│  │  ├─ utils.ts  schema.ts (zod)
│  ├─ hooks/                             # useQuery-like useResource, usePermission
│  └─ types/
└─ package.json / tailwind / tsconfig / components.json
```

## 2. Roles & Permission Model

`Role` union: `admin`, `director`, `teacher`, `student`, `family`, `staff`, `accountant`.

Single source of truth: `src/lib/auth/permissions.ts` maps role → capability strings
(`students.read`, `students.write`, `grades.write`, `finance.read`, …).
`<Can do="grades.write">` component + `usePermission(do)` hook gate UI.
Default rule:

| Role | Sees |
| --- | --- |
| Admin | Everything + settings + user management |
| Director | Dashboard (academic KPIs), teachers, students, academics, finance (read), reports |
| Teacher | Dashboard (own classes), my students, attendance, grades, timetable, messages |
| Student | Dashboard (own), my courses, attendance, grades, timetable, announcements |
| Family | Dashboard (children overview), attendance, grades, fees, messages |
| Staff | Dashboard (ops), admissions, students registry (basic), timetable, assets |
| Accountant | Dashboard (finance), fees, payroll, invoices, reports |

## 3. Core Feature Modules (pages)

1. **Dashboard** — per-role widget set
   - Admin/Director: KPI cards (students, staff, attendance %, fee collection, pass rate), enrollment trend line chart, grade distribution bar chart, top performers list, recent activity feed, upcoming events.
   - Teacher: today’s timetable, attendance-to-mark quick action, pending grades, at-risk students.
   - Student: next class, today’s schedule, attendance %, recent grades, announcements.
   - Family: children switcher, per-child summary cards, pending fees.
   - Staff: admissions pipeline funnel, birthdays this month, asset/maintenance queue.
   - Accountant: fees collected vs outstanding, monthly collection chart, overdue list, payroll summary.
2. **Students** — directory table (search, filter by class/status/gender, sort, pagination, CSV export), profile page (tabs: overview, attendance, grades, guardians, documents, fees, timeline), create/edit form (zod validated), promotion/transfer action, soft-delete with confirm.
3. **Teachers** — directory, profile (qualifications, subjects, classes, workload, performance), workload chart, schedule.
4. **Families / Guardians** — family list, family detail with children, parent portal links, contact management.
5. **Staff** — directory (department, designation, join date), attendance/payroll-lite, documents.
6. **Admissions** — inquiry → application → review → enrolled pipeline (kanban board), applicant form, document checklist.
7. **Academics** — Classes/Grades, Sections, Subjects, Curriculum; class detail (students, subjects, teachers, performance, class teacher).
8. **Attendance** — daily register (take by class, present/absent/late/leave), monthly register grid, editable by date, rate summary.
9. **Timetable** — weekly grid per class / per teacher, drag-free editor (replace cell), conflict detection, period/subject/teacher CRUD.
10. **Exams** — exam CRUD, exam schedule, marks entry grid (per class per subject), gradesheet with GPA, publish results (state change visible to students/families), report cards.
11. **Finance** — fee structure (grade-based), invoices, payment records, expenses, payroll summary, discounts/scholarships; charts: collected vs outstanding, monthly trend.
12. **Announcements** — list, composer with audience targeting (all/students/parents/teachers/staff), read receipts.
13. **Messages / Announcements feed** — simple in-app chat threads (teacher↔family, admin↔staff).
14. **Calendar & Events** — school events, birthdays, exams, fee deadlines.
15. **Reports** — filter-driven mock analytics page (enrollment, attendance, academics, finance) with export.
16. **Settings** — school profile, academic year, roles & permissions table (view-only), session/persona switcher, reset mock data.

## 4. Mock Data Layer

- `seed/` exports typed arrays: ~60 students, 12 teachers, 6 classes × 3 sections, 10 subjects, 10 families, 8 staff, 6 admin-ish users, 1 academic year, attendance for 30 days (generated by a seeded PRNG, deterministic), exam results per subject, fee invoices for 3 months, ~20 announcements, ~15 events, message threads.
- `mock/server.ts` exposes `db.<entity>.list({page,search,filters,sort})`, `.get(id)`, `.create()`, `.update()`, `.remove()` — all `async` with 150–400ms artificial delay, returning Promises. UI code and hooks are written against this interface so swapping in `fetch('/api/...')` later is a one-file change.
- `store.ts` — in-memory mutable copy hydrated from `localStorage`; `resetAll()`.
- `hooks/useResource.ts` — `useList(entity, params)`, `useItem(entity, id)`, `useMutation(entity)` with loading/error/refresh.
- Relationship helpers resolve ids → objects for display (`student.class` → section name, etc.) with memoized lookup maps.

## 5. Shared UI

- `DataTable<T>`: columns config, search, sort, filters, row selection, pagination, empty state, skeleton loading, responsive card mode on mobile.
- `StatCard`, `PageHeader`, `FormDialog`, `ConfirmDialog`, `StatusBadge`, `EmptyState`, `Avatar`, `ChartCard`, `Tabs`, `Breadcrumbs`, `PermissionGate`.
- Toast notifications, optimistic updates on edits.

## 6. Phases & Steps — Status: All complete

| Phase | Scope | Status |
| --- | --- | --- |
| 0 | Scaffold (Next.js 15, Tailwind v4, shadcn/Base UI, structure) | ✅ |
| 1 | Domain types, seeded PRNG, seed data, mock gateway, auth/permissions | ✅ |
| 2 | App shell, role-aware nav, guard, global search, login | ✅ |
| 3 | Seven role dashboards + analytics layer | ✅ |
| 4 | Students, Teachers, Families, Staff + DataTable + profiles | ✅ |
| 5 | Classes, Subjects, Timetable, Attendance, Exams & results | ✅ |
| 6 | Fees & invoices, Payroll, Expenses | ✅ |
| 7 | Announcements, Messages, Events, Admissions, Assets, Reports | ✅ |
| 8 | Settings (profile, calendar, permission matrix, data tools) + polish | ✅ |

Delivered: 26 routes, 20 navigable feature pages, 88 tests, README.


**Phase 0 — Setup** (scaffold Next.js + Tailwind + shadcn, tsconfig paths, folder structure, layout shell, theme).

**Phase 1 — Foundations**
1. Domain types + enums (`Student`, `Teacher`, `Class`, `Section`, `Subject`, `Attendance`, `Exam`, `Grade`, `Invoice`, `Announcement`, …).
2. Seeded PRNG + seed data files.
3. Mock data gateway (`mock/server.ts`) + `store.ts` + reset.
4. Auth/session context (persona switcher) + permissions map + guards.
5. `useResource` hooks, `lookup` helpers.

**Phase 2 — App shell** — sidebar with role-filtered nav, topbar (search, notifications, persona switcher), breadcrumbs, mobile drawer.

**Phase 3 — Dashboards** — reusable widget components + 7 role variants (switch persona to verify each).

**Phase 4 — People modules** — Students, Teachers, Families, Staff (+ CRUD, filters, export, profiles).

**Phase 5 — Academics** — Classes/Sections/Subjects, Timetable, Attendance, Exams & grades.

**Phase 6 — Finance** — fee structure, invoices, payments, expenses, charts.

**Phase 7 — Communication & ops** — Announcements, Messages, Calendar/Events, Reports.



## 7. Validation Checklist

- Each role sees only permitted nav/pages; direct URL access redirects.
- Every module: list → filter/search → create → edit → delete round-trip works via mock gateway.
- Cross-entity relationships render correctly (student → class → teacher → grades → fees).
- Charts render with seeded data and no console errors; build (`next build`) and `tsc --noEmit` pass.
- Refresh persists localStorage edits; "Reset mock data" restores seed.
- Mobile + desktop layouts verified for tables and timetable.

## 8. Risks / Notes

- Seeded PRNG must be deterministic so charts/grades are stable across reloads.
- Large seed files: keep generation in code (factories) rather than raw literals.
- Client components dominate; keep `"use client"` at page/feature level, shared UI server-safe.
- Not a security boundary — role gating is UX-level only.