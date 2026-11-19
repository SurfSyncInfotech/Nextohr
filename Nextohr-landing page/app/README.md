# SurfSync HRMS — Admin (redesign)

A complete, clickable HRMS admin built from the walkthrough of the current product and redesigned from first principles.
Every screen works against a realistic in-browser mock database (24 employees, 75 days of attendance, leave, reports,
offers, assets, goals, payroll runs, announcements and mail), so the front end is ready to hand to developers and
point at a real API.

## Run it

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # production build → dist/ (static, deploy anywhere)
npm run build:single # one self-contained HTML file → dist-single/index.html
```

Uses hash routing (`/#/people`), so `dist/` works on any static host or CDN with no rewrite rules.
Use **Reset demo data** in the account menu to restore the sample company.

## Stack

React 18 · TypeScript · Vite · Tailwind CSS · React Router · Recharts · lucide-react. No UI kit — components live in `src/components/ui`.

```
src/
  data/
    types.ts       ← domain model = the API contract
    seed.ts        ← demo data generator (relative to today)
    db.ts          ← reactive in-memory store, persisted to localStorage
    api.ts         ← every write the UI makes (swap for HTTP calls)
    selectors.ts   ← derived data shared by screens
  lib/             ← dates, money, payroll maths
  components/
    ui/            ← Button, Form controls, Modal/Drawer/Menu, DataTable, Toast, Badge, Card…
    layout/        ← App shell, sidebar, command palette, logo, theme
  pages/           ← one file (or folder) per module
```

## Connecting the backend

1. **Reads** — screens read through `useDb(selector)`. Replace `db.ts` with a data-fetching layer
   (e.g. TanStack Query) that returns the same shapes as `types.ts`; selectors keep working.
2. **Writes** — every mutation goes through `api.ts` and already returns a `Promise`. Replace each body with a `fetch`
   to the matching endpoint. Suggested REST mapping:

| UI call | Endpoint |
|---|---|
| `api.employees.create / update / setStatus / remove / bulkImport` | `POST/PATCH/DELETE /employees`, `POST /employees/import` |
| `api.attendance.regularize` | `PUT /attendance/{empId}/{date}` |
| `api.leaves.decide / create`, `api.leaveTypes.*` | `POST /leave-requests/decision`, `POST /leave-requests`, `/leave-types` |
| `api.reports.decide / remove` | `POST /work-reports/decision`, `DELETE /work-reports` |
| `api.offers.save / setStatus / convert / remove` | `/offers`, `POST /offers/{id}/send`, `POST /offers/{id}/convert` |
| `api.assets.create / update / assign / setStatus / remove` | `/assets`, `POST /assets/{id}/assign` |
| `api.goals.create / checkIn / update / remove` | `/goals`, `POST /goals/{id}/check-ins` |
| `api.payroll.saveSalary / syncFromOffers / createRun / markPaid / removeRun / saveStatutory` | `/salary-structures`, `/payroll-runs`, `/statutory-settings` |
| `api.announcements.*` | `/announcements` |
| `api.mail.send / saveDraft / patch / remove`, `api.mailTemplates.*` | `/mail`, `/mail-templates` |
| `api.settings.*`, `api.branches/departments/teams/workLocations/shifts/policies/roles/holidays.*` | `/company`, `/branding`, `/settings/{collection}` |

3. **Auth** — `pages/Login.tsx` accepts any password in the demo; call your auth endpoint in `submit`.
4. Payroll maths in `lib/payroll.ts` mirrors what the server should compute (PF ceiling, ESI limit, PT slabs, LWP = gross ÷ 30 per day).
   Keep the server as the source of truth and use this only for previews.

## Design system

| Token | Light | Use |
|---|---|---|
| `primary` | **#F68713** (brand orange) | Primary actions, active nav, focus of attention |
| `accent` | **#2A9CB8** (brand blue) | Data, links, informational states, charts |
| `on-primary` | #FFFFFF | Text & icons on orange (light theme). CTAs use an orange → #E26C04 gradient with a soft text shadow so white stays legible |
| `primary-ink` / `accent-ink` | #B65807 / #1D667C | Orange/blue *text* on light surfaces (AA compliant) |
| success / warning / danger | #16A34A / #CA8A04 / #DC2626 | Status only, never decoration |

- Typeface: **Manrope** (400–800), tabular numbers for figures.
- Every colour is a CSS variable in `src/styles/index.css` with a full **dark theme** (toggle in the top bar).
- 4-pt spacing, 14–24 px radii, two shadow levels (card, pop). Motion respects `prefers-reduced-motion`.
- Accessibility: visible focus rings, labelled icon buttons, focus-trapped modals, `aria-sort` on tables, skip link, 44 px touch targets on mobile.

## What was rethought (vs. the current HRMS)

| Before | After |
|---|---|
| Dashboard was a long scroll of equal-weight green tables | KPI row → live “today” → prioritised **Needs your attention** → plain-language insights → forecast, celebrations, payroll, activity |
| Approvals scattered across Leaves and Daily Work Report | One **Approvals** inbox with context (balance, team overlap, waiting time) and safe bulk-approve of routine reports |
| “Add Employee” nav item opened the directory | **Employees** directory (table/cards, filters, bulk actions, export) + a 4-step add flow, bulk import with row validation, self-onboarding invite |
| No single view of a person | **Employee profile** with attendance calendar, leave, pay & payslips, assets, goals, documents and a completeness checklist |
| Offer letters in a 7-column table | **Hiring pipeline** (Draft → Sent → Accepted → Declined), side-by-side editor with live letter preview, one-click “start onboarding” and a joiner checklist |
| Attendance list only | Daily board with status filters, GPS trail + activity drawer, regularisation with audit note, **monthly register**, missing check-outs |
| Leave table with huge reason cells | Requests (clamped reasons, bulk decisions with notes), **team calendar**, balances, leave types — one source of truth with Settings |
| Payroll “generate” modal | 3-step **pay-run wizard** (period → LWP review → preview), run detail with payslips and bank transfer file, gross-first salary editor |
| Performance = assign target only | **Goals** with measurable targets, check-ins, timeline, at-risk detection and a by-person view |
| Settings was a separate layout | Settings live inside the app with a progress tracker; holiday calendar is click-to-toggle; roles use a permission matrix |
| — | Global search & command palette (Ctrl K), Create menu, notifications, dark mode, toasts with undo, fully responsive |
