# Dialysis Management System — Optimization & Production Pass

This revision covers a full audit + cleanup across the frontend (React/Vite) and
backend (Express/Mongoose).

## Backend

### Removed the 5-step treatment-clearance restriction (whole app)
- Deleted `models/Clearance.js`, `controllers/clearanceController.js`,
  `routes/clearanceRoutes.js` and unmounted `/clearances`.
- `services/schedulingService.js`: removed `createSessionWithClearances` and
  `canStartTreatment`; sessions are now created with a plain `createSession`.
- `controllers/sessionController.js`: removed the
  "cannot start until all 5 clearances are cleared" gate. Treatment can start
  after check-in.
- `utils/constants.js`: removed `CLEARANCE_TYPES` / `CLEARANCE_STATUS` and the
  `clearance_pending` session status.
- Chair-maintenance clearance (`ChairClearance`) is a separate system and was
  left intact.

### Removed PCT remnants / broken role refs
- Eliminated all references to the undefined `ROLES.PCT` and `ROLES.INSURANCE`
  in `fileRoute.js`, `chairRoutes.js`, and the (now-deleted) clearance routes,
  which were silently failing authorization.

### Fixed PDF / CORS file-serving conflict
- Removed the duplicate **public** `/api/v1/files/:folder/:file` route from
  `app.js` that was shadowing the authenticated file route.
- `routes/fileRoute.js` is now the single, authenticated file endpoint
  (valid staff roles only) and sets proper CORS/range headers.

### Roles, permissions & role-relevant data
- Rewrote `utils/permissions.js` into one clean role→capability matrix
  (single source of truth) and added `reports` / `doctorRounds` permissions.
- `visiblePatientFields` confirmed to return **full patient bio** for
  Biller (and Admin / Insurance / Front Desk / Doctor).

### New report generation system
- `controllers/reportController.js` + `routes/reportRoutes.js` mounted at
  `/api/v1/reports`:
  - `GET /reports/overview` — operational + billing snapshot.
  - `GET /reports/sessions/monthly?month=&year=` — treatment volume.
  - `GET /reports/soap/monthly?month=&year=&format=json|xlsx` —
    calendar-based monthly SOAP report (doctor name, patient names, SOAP
    details, completion count x/4). Excel export uses the existing `xlsx` dep.

### Security / hygiene
- Removed real `.env` (contained live Atlas credentials); shipped
  `.env.example` instead, and fixed a bug where `MONGO_MAX_POOL_SIZE` was glued
  onto the end of `MONGO_URI` (missing newline).
- Cleared `uploads/` of real patient files (PHI); kept the folder structure.

## Frontend

### Role-based UI (single source of truth)
- Extended `utils/permissions.js` with `patientTabsForRole`, `navForRole`,
  `canAddDoctorRound`, `canViewReports`, and read-only tab handling.
- Sidebar (`layouts/DashboardLayout.jsx`) is now generated from the role nav
  matrix — clearance and irrelevant links removed per role.

### Patient detail tabs by role
`pages/patients/PatientDetails.jsx` now shows only the tabs each role should see:
- **Admin:** Overview, Full Profile, Insurance Form, Documents, Schedules, Sessions, Claims, Treatment History, Doctor Rounds
- **Biller:** Overview, **Full Profile (full bio)**, Insurance Form, Documents, Schedules, Sessions, Claims, Treatment History
- **Insurance:** Overview, Full Profile, Insurance Form, Documents, Schedules, Treatment History (read-only), Doctor Rounds (read-only)
- **Doctor:** Overview, Full Profile, Medical History, Doctor Rounds, Documents, Schedules, Treatment History
- **Nurse:** Overview, Medical History, Schedules, Sessions, Treatment History
- **Technician:** Overview, Schedules, Treatment History
- **Social Worker:** Overview, Documents, Schedules, Treatment History
- Added a new **Medical History** tab.

### Doctor module
- Doctor "View" now routes through the unified patient detail page, so doctors
  see **full bio + insurance + schedules + treatment + SOAP**, not SOAP only.
- The **Doctor Rounds** tab includes an interactive "Add SOAP Round" form with
  **multiple-file document upload** (wired to `uploadDoctorDocument.array`).
- Removed the standalone SOAP-only `DoctorPatientDetail.jsx`.

### Reports page
- `pages/reports/DashboardReports.jsx` rewired to the new `/reports` endpoints
  (no more pulling every list client-side), with a Monthly SOAP table and an
  **Export Excel** button (auth-aware blob download). Visible to Admin / Biller
  / Doctor; SOAP section limited to Admin / Doctor.

### Cleanup
- Removed the 5-clearance gating UI from `TreatmentWorkflow.jsx` and the
  clearance panel from `ScheduleList.jsx`; deleted dead `clearanceApi.js`,
  `ClearanceList.jsx`, and the junk `*.md` / `Notifications.jsx.tmp` files.
- Added "Showing X of Y patients" count under patient lists.
- Gated the "Send To Biller" button to Admin / Front Desk.

## Notes
- The frontend was syntax-validated but not run in this environment. After
  unzipping: `npm install && npm run build` (frontend) and
  `npm install && npm run dev` (backend, after copying `.env.example` → `.env`).

---

## Revision 2 — role UX, reports, sessions, user management

### Backend
- **Session documents:** `documents[]` added to the session model; new
  `POST /sessions/:id/documents` (multi-file) so nurses can attach files/photos
  during a treatment. `createdAt` / `startedAt` / `completedAt` are recorded.
- **Admin user management:** new `userController` + `userRoutes` (admin-only):
  list, create-by-role, edit, **password reset**, delete.
- **Patient Excel export:** `GET /patients/export` produces an `.xlsx` using the
  exact column headers the bulk-upload importer reads, so the file round-trips.
- **Monthly SOAP report** widened to the **biller** role (month-wise rounds page).

### Frontend
- **Critical fix:** the PDF/file popup now sends the auth token (`pdfViewer.jsx`),
  fixing "can't view file" across the whole app; image mime types preserved.
- **Sidebar → top bar** with a quick-access menu popup, a notifications popup
  (bell), and a full-menu page at `/menu`. Notifications removed from nav.
- **Schedule cards** redesigned (patient name on top, **bold date/time**,
  clickable) and applied to schedule list/history and dashboards.
- **Nurse dashboard:** today's schedule pinned on top.
- **Social worker dashboard:** Total Schedules / Total Patients / Today /
  This Month stats + numbered, latest-first cards (today / tomorrow / all).
- **Doctor:** per-row **Add SOAP** button in the patient list (deep-links to the
  Doctor Rounds tab with the form open); Add SOAP button visible in Doctor Rounds.
- **Insurance dashboard:** removed the ≤6-month, Documents, Schedules and
  Notifications items; Schedules removed from insurance nav.
- **Patient list:** one-click **Export Excel** (admin / insurance / front desk /
  biller).
- **Biller:** new month-wise **Doctor Rounds** page with Excel export.
- **Admin:** new **User Management** page (create, edit, reset password, delete).
- **Reports:** clickable **month calendar** to generate the monthly SOAP report.
- **Treatment workflow / Treatment tab:** nurses upload documents/photos during a
  session; session **created/started/completed** times and uploaded documents are
  shown in the patient's Treatment tab (viewable via the file popup).

---

## Revision 3 — sidebar restored + mobile responsive
- **Sidebar brought back** as the primary navigation (only the Notifications
  entry stays removed — it lives in the header bell popup as requested).
- Sidebar is **fixed on desktop** and becomes a **smooth slide-in drawer on
  mobile/tablet** via the hamburger button; it auto-closes on navigation.
- Notification **bell popup** and profile dropdown remain in the header.
- Global mobile polish: no horizontal overflow, smooth scrolling, touch-friendly
  tap targets, and tables scroll horizontally instead of breaking the layout.

---

## Revision 4 — mobile viewport fix
- **Root cause of "shows desktop on mobile":** `index.html` had no `<head>` and
  was missing the viewport meta tag, so phones rendered the page at desktop width
  and scaled it down (a shrunk desktop, not a real mobile layout).
- Rebuilt `index.html` with `<meta name="viewport" content="width=device-width,
  initial-scale=1">`, charset, title and theme-color. The existing responsive
  grids and the sidebar drawer now actually engage on phones.

---

## Revision 5 — console error, chair timeline, responsive tables, pagination
- **Fixed the 403 console error:** the dashboard stats widget no longer requests
  billing claims for roles that aren't allowed to see them (insurance, nurse,
  etc.) — it only calls billing for admin/biller.
- **Chair clearance rebuilt** with a responsive **24-hour occupancy timeline per
  chair**, synced with the day's schedules (free vs reserved hours, patient name
  + time on hover), a date picker, a legend, and paginated history. No more
  jumbled list.
- **Doctor "Pending Monthly Rounds" table** made responsive (horizontal scroll,
  no overlapping badges/buttons) with a combined "Open / Add SOAP" action.
- **Pagination (15 per page) + search added to every major list:** patients,
  schedules (current + history), sessions, claims, doctor pending + all-patients,
  biller monthly rounds, and user management — via a reusable Pagination
  component and paging hook.

---

## Revision 6 — Doctor Module V2 (Physician Management System)
**Backend**
- Expanded `DoctorCheckup` with the structured monthly round (`physicianRound`:
  subjective/ROS, physical exam, access evaluation, lab review), `doctorComments`,
  `socialWorkerComments`, `dietitianComments`, `cqi` {patient, social, dietitian},
  `approval` {status, reviewedBy, history}, and `templateUsed`.
- New endpoints: `POST /doctors/checkups/batch` (batch create),
  `PATCH /doctors/checkups/batch` (batch edit), `GET /doctors/checkups`
  (flat list/filter), `PATCH /doctors/checkups/:id/approval` (biller approval),
  and `GET /reports/dialysis-billing` (completed sessions w/ duration + count).
- Monthly rounds export now includes Doctor/Social/Dietitian comments, CQI, Lab
  Review, Blood Pressure, Access Evaluation, status and approval, in **Excel and
  CSV**.

**Frontend**
- **Structured Monthly Physician Round form** (Sections A–D with checkboxes /
  dropdowns), multi-disciplinary comments, CQI, and **built-in templates** that
  auto-fill the form (Stable Dialysis, Weekly Review, CKD Stable, Routine Monthly).
- **Batch Monthly Round** (select many patients, fill once, apply) and **Batch
  Edit** (update many existing rounds at once).
- **CQI page** (edit Patient/Social/Dietitian CQI per round).
- **Physician Billing** (biller approval workflow) and **Dialysis Billing**
  (completed sessions → CDMS) pages.
- Doctor dashboard stats updated to: Total Patients, Round 1–4 Pending,
  Completed This Month, Missing Monthly.
- Renamed "Doctor Notes" → "Doctor Comments".

**Simplified / next phase (called out honestly):** single structured round is
currently reached via Batch Round (select one patient); the patient-tab quick
SOAP form remains for fast entry. PDF export and a scheduled missing-round
notification job are not yet included (Excel/CSV export and on-dashboard missing
counts are). Round-history rendering of the full structured fields in the patient
tab is summarized rather than fully expanded.

---

## Revision 7 — Doctor V2 fixes & refinements
- **Chair grid made compact** (smaller cards, denser columns) on the Schedule
  Patient screen and Chairs Status page, so all chairs fit on one screen.
- **Batch Monthly Round**: patient picker now shows a **4-column grid (16 per
  page)** with search, plus an **"Only missing Round N"** filter so you can't
  create duplicate rounds — pick a round, see only patients still missing it.
- **Fixed batch edit not updating:** the backend now **deep-merges only the
  fields you actually filled** into each selected round (instead of replacing the
  whole object with blanks), so Round 1 edits apply correctly and untouched
  fields are preserved.
- **View detail on rounds:** every round in Doctor Rounds now has a **"View
  detail"** button opening a modal with all structured fields (Sections A–D,
  comments, CQI, vitals, documents, approval) — the same fields as the batch form.
- **CQI tab in patient detail** (doctor/admin) for quick per-round CQI editing,
  alongside the dedicated CQI page.
- **Admin access:** Batch Monthly Round, Batch Edit, CQI, Physician Billing and
  Dialysis Billing are now in the admin sidebar (admin already had route access).

---

## Revision 8 — structured form everywhere, roles, mobile, CQI visibility
- **Individual "Add SOAP Round" now uses the full structured form** (Sections
  A–D, comments, CQI, templates) — identical to the batch form — plus vitals and
  multi-file upload.
- **Batch round form is pre-filled** with a sensible default template (Routine
  Monthly Review) so the doctor only edits what changed before applying to all
  selected patients.
- **Nurse can cancel appointments** (backend permission + a dedicated Cancel
  button on the schedule view for nurses).
- **Social worker no longer sees full patient bio/insurance/claims** — their
  dashboard panel is limited to schedules + support info, and they still have no
  Full Profile tab.
- **Mobile polish:** reduced the overall on-screen scale on phones (root font
  size) so it isn't "zoomed in" after deploy, and made the logo smaller on mobile.
- **Doctor comments + CQI visibility for billing:** Physician Billing now has a
  **View** button (full round detail incl. all comments + CQI) and **Export Excel
  / CSV** (report includes Doctor / Social Worker / Dietitian comments and CQI),
  available to admin and biller.
## Revision 9 — removed Section D (Laboratory Review) from the monthly batch round forms (Batch Monthly Round + Batch Edit); it remains on the individual Add SOAP form.

---

## Revision 10 — security hardening (HIPAA technical safeguards)
- **Automatic logoff:** users are signed out after inactivity (default 15 min,
  configurable via VITE_IDLE_TIMEOUT_MIN) — a HIPAA technical safeguard.
- **Multi-Factor Authentication (opt-in TOTP):** authenticator-app based (Google
  Authenticator / Authy / Microsoft Authenticator). New Security page (profile
  menu → Security & MFA) to enable/disable; login prompts for the 6-digit code
  when MFA is on. Implemented with Node crypto (no new dependency).
- **Account lockout:** 5 failed logins locks the account for 15 minutes
  (brute-force protection); last-login timestamp recorded.
- **Password policy** enforced on register, admin-create and password-reset:
  min 8 chars with upper, lower, number and symbol.
- (Already present and retained: bcrypt cost-12 hashing, helmet security headers
  incl. HSTS, CORS allow-list, auth rate limiting, authenticated file route,
  role-based access.)

NOTE: encryption-at-rest, TLS/HTTPS, backups/DR, comprehensive audit-log
retention, and the administrative/legal parts of HIPAA (risk analysis, BAAs,
policies, training, third-party attestation) are deployment/organizational and
are covered in the compliance guidance, not shippable app code.

---

## Revision 11 — audit logging + MFA QR code
- **Comprehensive audit trail:** a global middleware now records every
  state-changing request (create/update/delete) and every PHI document access
  (/files) with user, role, action, path, status code, IP and user-agent. The
  AuditLog model was expanded accordingly; existing per-action audit calls are
  kept.
- **Append-only / tamper-resistant:** there are no update or delete audit
  endpoints. New read-only **GET /api/v1/audit-logs** (admin only) with
  pagination and filters (search, area, status, date range).
- **Admin "Audit Trail" page** (sidebar) to browse the log with filters and
  paging.
- **MFA via QR code:** the Security page now shows a scannable **QR code**
  (Google Authenticator / Authy / Microsoft Authenticator) plus the manual key.
  Adds the `qrcode.react` dependency — run `npm install` before building.

---

## Revision 12 — Medication Administration & Billing Module (core)
**Backend**
- New `MedicationAdministration` collection (patient, session, name, dose, unit,
  route, quantity, time, given-by, notes, facility, month/year, billing status).
- Endpoints: record meds for a session (nurse), list, patient medication history
  (grouped by session), patient monthly summary (sessions + doctor rounds + med
  totals), medication administration report (pivot: patient × medication, with
  Excel/CSV export), and medication billing list.
- Recording once feeds history, monthly summary, the report and billing — no
  duplicate entry.

**Frontend**
- **Nurse workflow:** a Medication Administration step (quick-add buttons for
  Epogen/Heparin/Venofer/Calcitriol/Benadryl/Oxygen/LiquaCel, plus custom rows:
  name, dose, unit, route, qty) between Vitals and SOAP.
- **Patient "Medication History" tab** (doctor/biller/nurse/admin) with the
  grouped-by-session history and a monthly summary (sessions, doctor rounds,
  medication totals).
- **Medication Billing** page (biller/admin).
- **Medication Administration Report** page (pivot table) with Excel/CSV export.
- Admin sidebar includes the new billing + report pages.

**Simplified / next phase:** PDF export (Excel/CSV done); a single unified Reports
page with the full facility/doctor/nurse/shift/insurance filter set (the
individual Dialysis, Medication and Doctor-Round reports exist separately);
per-medication billing status editing; and shift/facility fields depend on those
being captured on the patient/session records.

---

## Revision 13 — session detail view, billing grouping, export fix
- **Session detail view:** each session in the patient's Sessions/Treatment tab
  now has a "View detail" button opening a modal with the full timeline
  (booked/created, checked-in, started, completed), vitals, SOAP notes, documents,
  and the **medications administered during that session**.
- **Fixed:** nurses (and managers) can no longer cancel a session/appointment
  that is already completed/cancelled/no-show — the cancel action is hidden with
  a clear message.
- **Medication Billing** now shows **one row per patient** (no more repeated
  rows per medicine) with a **View** button opening that patient's full
  medication list.
- **Physician Billing** now shows **one row per patient** (name appears once)
  with round summary (which rounds, approved/pending counts) and a **View**
  button to review/approve each round and open full round detail.
- **Physician Billing Excel/CSV export fixed:** CQI is now three separate columns
  (Patient / Social / Dietitian) and Access Evaluation is split into its own
  columns (type, infection, bruit, thrill, ulceration, steal, motor/sensory) —
  no longer crammed into one cell.

---

## Revision 14 — workflow revision (status-driven, cleanup)
- **Treatment Workflow is now status-driven:** Scheduled → only Check In;
  Checked In → only Start Treatment; In Progress → Vitals, Medication, SOAP,
  Complete, Upload; **Completed → a read-only Treatment Summary** (patient,
  chair, start/end, duration, nurse, status, medications, vitals, SOAP,
  documents) with all action buttons hidden. No editing after completion.
- **Sessions module removed** from the sidebar; `/sessions` now redirects to
  Treatment Workflow (everything is handled there).
- **Modal z-index fix:** session/round/billing detail modals now render above
  everything (z-index raised) so they never open behind tables.
- **Nurse dashboard stats:** Treatments Completed, Patients Treated, Medications
  Given, Today's Treatments, Monthly Treatments.
- **Role-based CQI editing:** doctor edits Patient/Doctor CQI, social worker edits
  Social CQI, technician edits Dietitian/Technical CQI; admin edits all; everyone
  else is view-only. The patient profile still shows all CQIs together.
- **Billing History tab** added to the patient profile (admin/biller).
- **Reports consolidated** into one Reports hub with tabs (Dialysis & Rounds,
  Medication); duplicate report nav entries removed.

SIMPLIFIED / NEXT PHASE (stated honestly): the full unified Reports filter matrix
(facility/nurse/shift/insurance/date-range on every report), PDF export and Print,
and dedicated Patient-Summary and consolidated Billing report tabs are not all in
yet — Excel/CSV export and the existing report pages remain. Full per-role sidebar
restructure was limited to removing duplicates (Sessions, Medication Report) to
avoid breaking route access.

---

## Revision 15 — individual (per-patient) monthly reports
- Report endpoints now accept a `patient` filter (id or MRN): Medication Report,
  Doctor Rounds Report (soap/monthly), and Dialysis Report (dialysis-billing).
- **Dialysis Report** now supports Excel/CSV export (previously JSON only).
- New **Individual Patient** tab in Reports: pick a patient + month, then download
  that patient's whole-month **Medication**, **Doctor Rounds**, and **Dialysis**
  reports as Excel or CSV.

---

## Revision 16 — medication report: one line per administration
- The Medication Report Excel/CSV export now writes **one row per medication
  administration** with separate **Date** and **Time** columns, instead of
  summing everything onto a single patient row. Columns: Patient, MRN, Date,
  Time, Medication, Dose, Unit, Route, Quantity, Nurse, Notes — sorted by date.
- The on-screen summary table still shows the per-patient pivot overview.

---

## Revision 17 — medication views: grouped by date + time
- **Medication Billing → View popup** now groups administrations by day with a
  bold date header and shows the **time** for each medication underneath (no more
  day-3/day-4 mixed together).
- **Patient Medication History tab** now shows the **time** on each medication.
- **Individual medication Excel** is one line per administration (Date + Time
  columns) sorted newest-first, matching the Medication History layout.

---

## Revision 18 — Medication Excel redesign (grouped by session)
- The Medication Report **Excel** export is fully redesigned with ExcelJS (new
  backend dependency — run `npm install`):
  - Data is **grouped by dialysis session**. Each session has a merged
    **"Dialysis Session #N"** heading, a session info table (Patient, MRN, Date,
    Time, Nurse, Shift), a medication table (#, Medication, Dose, Unit, Route,
    Qty, Time), and a **"Total Medications"** count row.
  - A final **Monthly Summary** sheet: total dialysis sessions, total medications
    administered, and per-medication totals (dose/qty + times given).
  - Professional formatting: merged/filled section headers, bold titles, thin
    borders, alternating row colors, auto-fit columns, frozen title row, and
    print-ready **A4 landscape** page setup.
- **CSV** export stays flat (one row per administration) for data processing.
- Validated end-to-end in-container (sample workbook generated successfully:
  "Medication Sessions" + "Monthly Summary" sheets).

NOTE: Excel times use the stored (UTC) time; if the clinic isn't on UTC these may
differ from the browser-local on-screen views — tell me the timezone to convert.
