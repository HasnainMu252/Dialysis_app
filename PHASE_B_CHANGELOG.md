# Phase B — New roles (Dietitian, DON, Biomed) + functional CQI

Date: 2026-10-08

## New roles
Added **Dietitian**, **DON (Director of Nursing)** and **Biomed** end to end:
constants (frontend + backend), User enum (auto via `Object.values(ROLES)`),
permissions, sidebar nav, routes, dashboards, the login role picker and the
login hint. They are selectable in User Management automatically.

- **Dietitian** — dashboard with patient search → opens each patient's Labs &
  CQI; can author CQI comments. (Full nutrition module: education materials +
  food-hurdle notes come in Phase C.)
- **DON** — dashboard with the monthly CQI review built in; read access to
  Billing and Reports; CQI Review page. (Purchasing access lands with the
  Phase D inventory module.)
- **Biomed** — Machine Registry: add/edit/delete machines, record maintenance,
  view maintenance history, track status and next-due.

## CQI — now functional (was effectively blank)
Root problem: CQI stored **one comment per author per patient** (unique index),
so it couldn't be the running, monthly-reviewable log the clinic needs.

- **Model** (`CqiComment`) — removed the unique `{patient, author}` index; CQI is
  now an **append log** (many timestamped entries per author).
- **Authoring expanded** to every role that meets the patient: nurse,
  technician, social worker, **doctor**, **dietitian**.
- **Controller/routes** — `addCqiComment` (append), `updateCqiComment` (edit own),
  `deleteCqiComment` (own/admin), and `listAllCqiComments` (admin/DON monthly
  review across all patients, filter by month/role/patient). New permissions:
  `cqiAuthors`, `cqiReview`.
- **CqiPanel** rewritten: add new entries, see the full thread, edit/delete your
  own. Nurses/technicians now keep the **CQI Comments** tab on patient detail
  (previously hidden) — they meet the patient.
- **CQI Review** page + panel (admin/DON): month/year/role filters, per-role
  counts, table of all comments, **CSV export**. Linked from Admin and DON nav.

## Biomed machine registry
- **Model** `Machine` extended: brand, model, serial, location, installedAt,
  next-due, notes, and a `maintenance[]` log.
- **Controller/routes** `/machines` — list, get, create, update, delete, and
  `POST /:id/maintenance`. Managed by Biomed + admin (`machineManage`); readable
  by any authenticated user.
- **BiomedDashboard** — registry UI with inline add/edit, maintenance entry and
  history, status + counts.

## Files
Backend: `utils/constants.js`, `utils/permissions.js`, `models/CqiComment.js`,
`models/Machine.js`, `controllers/cqiCommentController.js`,
`controllers/machineController.js` (new), `routes/cqiCommentRoutes.js`,
`routes/machineRoutes.js` (new), `routes/patientRoutes.js`, `routes/index.js`.
Frontend: `constants/index.js`, `utils/permissions.js`, `api/cqiApi.js`,
`api/machineApi.js` (new), `components/common/CqiPanel.jsx`,
`components/common/CqiReviewPanel.jsx` (new), `app/routes.jsx`,
`pages/cqi/CqiReview.jsx`, `pages/don/DonDashboard.jsx`,
`pages/dietitian/DietitianDashboard.jsx`, `pages/biomed/BiomedDashboard.jsx` (new),
`pages/auth/RolePicker.jsx`, `pages/auth/Login.jsx`.

## Verify
- `npm install && npm run build` — builds clean.
- Backend changed files pass `node --check`.
- Create users with the 3 new roles in User Management; each lands on its
  dashboard. Add CQI comments as nurse/doctor/dietitian → review them for the
  month as admin/DON and export CSV. Add a machine + maintenance as Biomed.

## Deferred (as agreed)
- Phase C: social-worker fields; Medical Background bio tab; full Dietitian
  module (education materials, food-hurdle notes).
- Phase D: billing rework + purchasing/inventory (DON purchasing access).
