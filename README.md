# Schoole MS — School Management System

A **frontend-only** school management portal built with Next.js 15 (App Router), React 19, TypeScript and Tailwind CSS v4.

There is **no backend, no database and no API layer**. All data is generated deterministically in the browser from a seed, and every edit is persisted to `localStorage` through a mock gateway that mirrors a REST API.

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000
```

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest suite (88 tests, jsdom) |

## Signing in

The login page ships seven personas, each pre-filled. Every account uses the password **`demo1234`**.

| Role | Sees |
| --- | --- |
| Administrator | Everything, including settings and data tools |
| Director | School-wide academic and operational oversight |
| Teacher | Own classes, attendance register, marks entry |
| Student | Own attendance, subjects, results and notices |
| Parent | Children's attendance, grades and fees |
| Staff | Admissions pipeline, registry, asset register |
| Accountant | Fees, payroll, expenses and financial reports |

Role gating is **UX-level only** — the data lives in the browser, so it is not a security boundary.

## Architecture

```
src/
├─ app/
│  ├─ (auth)/login/          persona picker
│  ├─ (portal)/              guarded app shell + 24 feature routes
│  │  ├─ error.tsx           render-error boundary with data reset
│  │  └─ loading.tsx         route-level suspense fallback
│  └─ not-found.tsx
├─ components/
│  ├─ dashboard/             charts and role widgets
│  ├─ finance/               invoice + expense visuals
│  ├─ layout/                sidebar, topbar, guard, search, nav config
│  ├─ settings/
│  ├─ shared/                DataTable, cards, badges, states
│  └─ ui/                    shadcn/ui (Base UI) primitives
├─ hooks/                    data, lookup, table and dashboard hooks
├─ lib/
│  ├─ auth/                  session context + permission map
│  └─ mock/                  seed, gateway, store, analytics, generators
└─ types/                    domain model (13 modules)
```

### The mock data layer

`src/lib/mock/` is the only module that would change to move to a real backend.

| File | Role |
| --- | --- |
| `prng.ts` | Seeded mulberry32 PRNG — generated data is stable across reloads |
| `seed/` | Typed builders producing 610 students, 58 teachers, 24 sections, 840 timetable slots, invoices, exams, notices and messages |
| `generators.ts` | Attendance and exam marks derived from hashes of `(studentId, date)` — no storage cost |
| `analytics.ts` | Pure aggregation functions used by dashboards and reports |
| `server.ts` | The gateway: async `list` / `get` / `create` / `update` / `remove` with pagination, search, filters, sorting and simulated latency |
| `store.ts` | In-memory records + `localStorage` overlay (create/update/delete) with `reset` |

Swapping to a real API means replacing `server.ts` alone — page and hook code already talks to this interface.

### Derived vs stored

Only user-entered records are persisted. Attendance (~18k records) and exam marks are **computed on demand** from a seeded PRNG, so any date range or subject combination is free and deterministic. Manual edits layer on top via `attendanceOverrides` and `resultOverrides`.

## Testing

88 tests across 8 files:

- `lib/mock/seed/seed.test.ts` — id uniqueness, referential integrity, timetable coverage, invoice arithmetic, gateway CRUD
- `lib/mock/analytics.test.ts` — attendance bounds, ranking, grade bucketing, finance reconciliation
- `components/dashboard.test.tsx` — all seven dashboards render with role-specific widgets
- `components/people.test.tsx` — listing, pagination, filtering, role scoping
- `components/academics.test.tsx` — timetable grid, attendance override, exam publishing
- `components/finance.test.tsx` — billing summaries, payments, payroll, expense approvals
- `components/communication.test.tsx` — audience targeting, replies, pipeline transitions
- `components/settings.test.tsx` — profile persistence, academic year, permission map integrity

## Notable behaviours

- **Reset** — *User menu → Reset mock data* or *Settings → Data & Demo* restores the seed.
- **Search** — `Cmd/Ctrl + K` opens a palette across students, teachers and pages.
- **CSV export** — available on every directory and report.
- **Theming** — indigo brand palette with dark mode support.