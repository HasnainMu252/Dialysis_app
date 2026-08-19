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

---

## Revision 19 — Home medications, medication-usage report, full patient tabs, popup fix

### 1. Home Medications (NEW — meds the patient takes at home, separate from dialysis)
- New model `models/HomeMedication.js`: a standing home-medication list per patient
  (name, dose, unit, route, frequency, quantity, prescribedBy, start/end date,
  status active/discontinued, notes, addedBy/Name/Role). This is separate from
  `MedicationAdministration` (which stays the per-dialysis-session record).
- New `controllers/homeMedicationController.js` + routes:
  - `GET  /patients/:idOrMrn/home-medications` — list (all staff who read patients)
  - `POST /patients/:idOrMrn/home-medications` — add (**nurse, doctor, admin**)
  - `PATCH /home-medications/:id` — edit / discontinue / reactivate (nurse, doctor, admin)
  - `DELETE /home-medications/:id` — hard delete (**admin only**)
- Frontend: new **Home Medications** patient tab with an add form (visible to
  nurse/doctor/admin), an active/discontinued table, discontinue/reactivate and
  admin delete. API in `api/homeMedicationApi.js`.

### 2. Medication Usage report (NEW — "how much dialysis medicine was used")
- New endpoint `GET /medications/usage` (admin/biller/doctor):
  - **Daily** (end-of-day) with `?date=YYYY-MM-DD`, or **Monthly** (end-of-month)
    with `?month=&year=`.
  - **All patients** or a single patient via `?patient=<id|mrn>`.
  - Returns per-medication totals (total dose, total qty, administrations,
    patient count), a per-patient breakdown, and grand totals.
  - `?format=xlsx` (professional 2-sheet ExcelJS workbook: "Medication Usage" +
    "By Patient") or `?format=csv`.
- New util `utils/medicationUsageExcel.js` (validated in-container — workbook
  generates successfully).
- Frontend: new **Medication Usage** tab in the Reports hub
  (`pages/reports/MedicationUsageReport.jsx`) with Day/Month toggle, All/Individual
  patient toggle, summary cards, totals table, per-patient breakdown, Excel/CSV export.

### 3. Patient view tabs — Front Desk, Nurse, Technician now see ALL tabs (like Admin)
- `utils/permissions.js`: Admin, Front Desk, Nurse and Technician now share one
  `FULL_TABS` set (overview, full profile, medical history, insurance form,
  documents, schedules, sessions, claims, treatment, doctor rounds, cqi,
  medication history, home medications, billing history). Doctor keeps its focused
  set + medication history + home medications.
- NOTE (HIPAA minimum-necessary): this deliberately shows billing/claims tabs to
  clinical roles per request. Data still loads via `Promise.allSettled`, so any
  endpoint the role isn't authorized for simply renders empty rather than erroring.
  If you want those roles to see the tabs but not billing PHI, say so and I'll gate
  the sensitive tabs back down.

### 4. Treatment-history "View detail" popup fix (was overlapping / mis-positioned)
- Root cause: the global `.card` utility uses `backdrop-blur`. A `backdrop-filter`
  makes an element the containing block for `position: fixed` descendants, so a
  modal rendered inside a card was being trapped/positioned relative to the card
  instead of the viewport.
- Fix: new `components/common/Portal.jsx` renders modals into `document.body`.
  `SessionDetailModal`, `RoundDetailModal`, and the in-card document viewer are now
  portaled, so `fixed inset-0` overlays the full screen correctly.

All changes syntax-validated (backend `node --check`, frontend JSX check) and the
new Excel builder was run in-container. Run `npm install` (no new deps) then
`npm run build` / start the API and test end-to-end.

---

## Revision 20 — Home meds at dialysis time, tech access, remove Billing History from staff

- **Add Home Medications during dialysis (Treatment Workflow):** the workflow now
  has a "Home Medications" card (add form + current home-med chips) that loads the
  selected patient's home meds. Visible to **nurse, technician, admin**.
- **Technician access:** technicians can now add/edit home medications.
  - Backend: `POST /patients/:idOrMrn/home-medications` and
    `PATCH /home-medications/:id` now allow `technician` (in addition to
    admin/nurse/doctor). Delete stays admin-only.
  - Frontend: `canManageHomeMedication` now includes `technician`, so the Home
    Medications add form shows for technicians in both the patient tab and the
    workflow.
- **Removed Billing History tab from Front Desk, Nurse, Technician:** these three
  roles now use `STAFF_FULL_TABS` = the full Admin tab set **minus Billing
  History**. Everything else stays synchronized with Admin (overview, full profile,
  medical history, insurance form, documents, schedules, sessions, claims,
  treatment, doctor rounds, cqi, medication history, home medications). Admin still
  keeps Billing History.

Syntax-validated (backend `node --check`, frontend JSX check). No new dependencies.

---

## Revision 21 — Scalable dashboards, schedule expiry, buffer cleaning, claims removal, date-wise reports, login redesign

### Dashboards (Nurse / Technician / Front Desk)
- New shared `components/common/PatientBoard.jsx`: searchable + paginated + responsive
  patient grid that stays clean at any patient count (no more jumbled/overlapping
  cards at 20+). "View more" opens full patient bio data; "Open full profile"
  takes staff to the editable detail page (documents + forms). Wired into the
  Nurse, Technician and Front Desk dashboards.
- Nurse/Technician dashboards no longer fetch or show Claims.

### Schedule expiry (app-wide)
- A schedule whose end time has passed and was never checked in is treated as
  **expired**: it drops out of the treatment/workflow list (`GET /sessions` filters
  out still-'scheduled' sessions whose schedule endAt < now; pass `?includeExpired=1`
  to override) but remains in the Schedule list flagged "Expired".

### Schedule details in the list
- `formatSchedule` + `listSchedules` now return **booked-by name/role**, **booking
  time**, **check-in time** (batched single-query join from the linked session) and
  an **expired** flag. Surfaced in `ScheduleCard` (dashboards + Schedules page) and
  the journey panel.

### Buffer / cleaning (Technician)
- Finding: completion already set the chair to `cleaning`, but nothing used
  `bufferMinutes` or returned the chair to service. Now: on completion the chair
  enters a cleaning window of `schedule.bufferMinutes` (default 30) via new
  `Chair.cleaningUntil`; `listChairs` lazily auto-releases chairs whose window has
  elapsed back to `available` (also releases finished maintenance windows).

### Home medications in previews
- The session preview (`SessionDetailModal`) now shows the patient's home
  medications alongside the dialysis medications given.

### Removals
- **Claims removed from the app UI**: patient Claims tab, "Billing Claims" nav
  links, and the "Claims / Payment" + "Payment Snapshot" preview sections are gone.
  (Biller's Physician/Dialysis/Medication Billing pages were left intact so the
  biller role still functions — say the word to remove those too.)
- **Treatment History tab removed** — the Sessions tab is now the single
  treatment/session view (roles that only had Treatment now use Sessions).

### Reports — date-wise
- `GET /medications/usage` now supports a **date range** (`?from=&to=`) and always
  returns a **byDate** breakdown (per-day medications, administrations, qty,
  patients). The usage Excel gains a **By Date** sheet. The Reports > Medication
  Usage page adds a "Date range (date-wise)" mode and a Date-wise table; for an
  individual patient it shows exactly which dates medications were given.

### Performance
- Added compound indexes on MedicationAdministration (`year+month`, `patient+date`,
  `date`) for report/usage aggregation under concurrent load. Schedule check-in
  enrichment uses a single batched query. (Note: true load testing / Atlas
  connection-pool tuning is an environment task, not code.)

### Login
- Redesigned as a two-panel screen: left auto-rotating image/slider panel, right
  login form (`AuthLayout` is now full-bleed).

Syntax-validated (backend `node --check` × 79 files, frontend JSX check) and the
usage Excel (now 3 sheets) was run in-container. No new dependencies.

---

## Revision 22 — Technician is medication read-only; session notes; medication add+delete (no edit)

### Technician: NO medication write access (reverses Rev 20)
- Technicians can **view** dialysis medications and home medications, but can no
  longer add or edit either.
- Backend: `TECHNICIAN` removed from `POST /medications/session/:sessionId`,
  `POST /patients/:idOrMrn/home-medications` and `PATCH /home-medications/:id`.
  Enforced server-side, not just hidden in the UI.
- Frontend: `canManageDialysisMedication` / `canManageHomeMedication` exclude
  technician, so both add forms hide and the med lists render read-only for them.

### Technician's write surface: session notes during dialysis
- New `technicianNotes[]` on `DialysisSession`: **accessType dropdown**
  (Fistula / Graft / Catheter / AV Fistula / AV Graft / Other) **+ free-text comment**,
  with author name, role and timestamp.
- New endpoints: `POST /sessions/:id/technician-notes`,
  `DELETE /sessions/:id/technician-notes/:noteId` (technician, nurse, doctor, admin).
- Treatment Workflow gains a **"Session Notes / Comments"** card (dropdown + free
  text + add, and a list with ✕ delete).
- Notes render **alongside the SOAP notes** in the Session Detail popup, so nurses,
  doctors and admins see any technician comment for that dialysis session.

### Medications: CRUD is now add + delete (no edit)
- New `DELETE /medications/:id` (nurse / doctor / admin, audit-logged).
- Every saved dialysis medication chip in the workflow now has a small **✕** to
  delete it; a "Given this session (n)" list shows what's recorded so far and
  refreshes after each save.
- Home medications: **nurse and doctor** (and admin) can now delete as well as add —
  each row has a ✕ Delete, in the patient tab and as a ✕ on the workflow chips.
  To correct an entry, delete it and add a new one.

### Net permission matrix (medications)
| Action | Admin | Doctor | Nurse | Technician |
|---|---|---|---|---|
| View dialysis + home meds | ✔ | ✔ | ✔ | ✔ (view only) |
| Add / delete dialysis meds | ✔ | ✔ | ✔ | ✘ |
| Add / edit / delete home meds | ✔ | ✔ | ✔ | ✘ |
| Add session note (access type + comment) | ✔ | ✔ | ✔ | ✔ |

Syntax-validated (backend `node --check` × 79 files, frontend JSX check).
No new dependencies.

---

## Revision 23 — Session notes show WHO added them (Nurse / Technician / Doctor)

- Session notes already stored the author, but the UI barely surfaced it and the
  session detail hard-labelled every note "Technician notes" even when a nurse
  wrote it.
- New `components/common/NoteAuthor.jsx`: a colour-coded role badge + author name
  + timestamp, derived from the note's stored `authorRole`. A note added by a nurse
  reads **Nurse · <name>**; one added by a technician reads **Technician · <name>**
  (Doctor and Admin also supported).
- Wired into the Treatment Workflow note list and the Session Detail popup.
- Session Detail heading renamed "Technician notes" -> **"Session notes / comments"**,
  since nurses and doctors can author notes too.
- Verified at runtime that a nurse's note persists `authorRole: 'nurse'` and a
  technician's persists `authorRole: 'technician'`.

Syntax-validated. No new dependencies.

---

## Revision 24 — Workflow refactor, medication history/soft-delete, role SOAP presets, CQI comments, biller med activity

### TreatmentWorkflow refactored into components
- Extracted the medication and session-notes sections out of the 2.4k-line page
  into `components/workflow/MedicationCard.jsx` and
  `components/workflow/SessionNotesCard.jsx` (page ~400 lines lighter). Same UI,
  modular and easier to maintain.

### Medication list is vertical + full lifecycle (never lose the record)
- Medication entry rows are now **vertical** (label-over-field), not a wide grid.
- **Soft-delete:** `DELETE /medications/:id` keeps the row (`status='deleted'`,
  `deletedAt/By/Name/Role`) instead of hard-removing.
- **Cancel/stop:** new `PATCH /medications/:id/cancel` (doctor/nurse/admin) sets
  `status='cancelled'` with `cancelledAt/By` + optional reason.
- Every medication stamps `addedAt/By/Name/Role`. The saved-med list shows a
  status badge (Active / Cancelled / Removed) with the full add/stop/remove trail,
  plus **Stop** and **Delete** actions.
- New `GET /medications/history` returns the full trail (biller-readable).
- Reports/usage now exclude soft-`deleted` meds but keep `cancelled` ones (so a
  stopped med still shows in monthly/individual reports with its stop date).

### Role-specific access presets + "Other"
- **Nurse SOAP** gains an Access-site picker: **Catheter, Tunnel, Quinton, Other**
  (Other -> free text). Persisted on the SOAP note and shown in session detail.
- **Technician session notes**: **AV, Fistula, AV Graft, Other** (Other -> free text).
- `accessType` on session notes is now free-form (any preset or custom value),
  with a dedicated `accessOther` field.

### CQI comments — nurse / technician / social worker
- New `CqiComment` model + endpoints: `GET/PUT /patients/:id/cqi-comments`,
  `DELETE /cqi-comments/:id`. Each of the 3 roles keeps ONE editable comment per
  patient (upsert; unique on patient+author), with a phase (during / after / general).
- New reusable `components/common/CqiPanel.jsx` shown in three places:
  the **Treatment Workflow** (during dialysis), a new **CQI Comments** patient tab,
  and **instantly on the Social Worker dashboard** patient panel.

### Biller can watch medication activity
- New `components/common/MedicationActivity.jsx` on the Medication History tab: a
  read-only timeline of when each med was added / stopped / removed and by whom
  (reads `GET /medications/history`).

Syntax-validated (backend `node --check` × 82, frontend JSX check) and model
lifecycle transitions verified in-container. No new dependencies. Note: the new
CqiComment unique index (patient+author) builds automatically on first write.

---

## Revision 25 — Home-med lifecycle history + medication changes in reports (weekly too)

### Home medications now have the same lifecycle trail as dialysis meds
- Model gains `addedAt`, cancel trail (`cancelledAt/By/Name/Role`, `cancelReason`),
  soft-delete trail (`deletedAt/By/Name/Role`) and statuses
  active / discontinued / cancelled / deleted.
- Stopping a home med (Stop button) now records who/when + optional reason; delete
  is now a SOFT delete (row kept, `status='deleted'`). List hides soft-deleted by
  default (`?includeInactive=1` to include).
- Patient Home Medications tab shows the status (Active / Stopped / Removed) with
  the stop/removed trail and the added date.

### Medication changes in reports (monthly, weekly, individual)
- Usage report gains a **Weekly** scope (`?week=YYYY-MM-DD`, Mon–Sun) alongside
  daily / monthly / date-range.
- New **lifecycle events** in the usage payload: every add / stop / remove for both
  dialysis and home meds within the period, with medication, patient, who and when,
  plus an added/stopped/removed summary. Respects the individual-patient filter.
- Reports > Medication Usage renders a **"Medication changes (added / stopped /
  removed)"** table; the usage Excel gains a **"Med Changes"** sheet.
- `GET /medications/history` now also includes home-medication activity, so the
  biller's **Medication Activity** timeline shows dialysis + home meds with a
  Source column.

Syntax-validated (backend `node --check` × 82, frontend JSX) and home-med lifecycle
transitions + the 4-sheet usage Excel verified in-container. No new dependencies.

---

## Revision 26 — Home meds in the workflow now match the dialysis card (timestamp + history)

- The Treatment Workflow's home-medication saved list was still plain cards with
  only Active/Discontinued and no trail. Replaced with new
  `components/workflow/HomeMedicationCard.jsx` matching the dialysis MedicationCard:
  **Active / Stopped / Removed** badge, added timestamp + author, stop/removed
  trail (who + when + reason), and **Stop / Reactivate + Delete** actions.
- Workflow + patient Home Medications tab now load with `includeInactive=1`, so
  stopped and soft-removed home meds stay visible with their full history instead
  of disappearing.
- Added `homeMedicationApi.cancel()` / `.reactivate()`; the workflow header badge
  now shows the ACTIVE count.

Syntax-validated (frontend JSX, backend node --check). No new dependencies.

---

## Revision 27 — Cancel/status detail in the Medication Report + home meds in completed summary

### Medication Report (medication-report-*.xlsx / individual) now shows lifecycle
- The session-grouped Medication Report workbook med table gains **Status** and
  **Stopped / Note** columns: each medication shows Active / Stopped / Removed, and
  stopped rows show the reason + who + when (e.g. "due to issue in vain — nurse
  (2026-07-16 12:19)"). Status cell is colour-coded.
- CSV export of the same report gains Status, Stopped/Removed By, Stop Reason and
  Stopped/Removed At columns.
- (The Usage report already carried this in its "Med Changes" sheet; now the
  individual/monthly Medication Report is in sync too.)

### Completed treatment summary shows what was recorded
- After completing a treatment, the read-only summary now shows both the
  **Medications** (with Active/Stopped markers + stop reason) AND a new
  **Home Medications** block (active/stopped/removed), so you can see exactly which
  dialysis and home meds were on the patient for that session.

Syntax-validated (backend node --check × 82, frontend JSX) and the report workbook
status/reason columns verified in-container. No new dependencies.

---

## Revision 28 — Laboratory module, shifts + session codes, Station rename, nurse review sign-off

### Laboratory Management (new)
- New `LabReport` model: patient-scoped, optionally linked to a dialysis session.
  Fields: testName, category, testDate, result, notes, files[], plus a full
  uploader trail (`uploadedAt/By/Name/Role`) and soft-delete trail.
- Uploads accept **images and documents**: PNG, JPG/JPEG, WEBP, GIF, HEIC, PDF,
  Word (doc/docx), Excel (xls/xlsx), CSV, TXT — up to 20 MB, multiple files.
- Endpoints: `GET /labs` (any authenticated role), `POST /labs`, `DELETE /labs/:id`
  (**nurse / doctor / admin only** — everyone else is view-only, enforced server-side).
- New `components/common/LabPanel.jsx` used in **two places**: inside the Treatment
  Workflow (uploads attach to the running session and are tagged "During dialysis")
  and on a new **Lab Reports** patient tab (standalone uploads). Every report shows
  who uploaded it and when.

### Shifts + shift filter
- `SHIFTS` constant (backend + frontend): 1st **05:00-08:00**, 2nd **09:00-12:00**,
  3rd **12:30-16:00**. The gaps (08:00-09:00, 12:00-12:30) are station
  cleaning/buffer time; a booking inside a gap groups with the upcoming shift.
- `Schedule` now stores a derived `shift` (1/2/3).
- `GET /schedules?shift=N` filters by shift, with a `startTime` fallback so
  schedules created before this field existed still resolve.
- Treatment Workflow gains a **Shift** dropdown that filters the session list.

### Session codes
- `Schedule.sessionCode` = **{station}-{shift}-{YYYYMMDD}**, unique per station,
  shift and day. Verified: station 1 / 2nd shift / 23 Jul 2026 -> `1-2-20260723`.
- Shown as a badge on schedule cards and in the workflow session header, next to
  a shift label.

### Chair -> Station (UI only)
- All user-visible "Chair"/"Chairs" text renamed to "Station"/"Stations" across 16
  files, plus prose strings. Database models, fields and API names (`Chair`,
  `chairCode`, `chairApi`, `CHAIR_STATUS`) are unchanged — no migration needed.

### Technician submits -> Nurse reviews and signs off
- New session status **`pending_review`**.
- When a **technician** completes a treatment, the session moves to
  `pending_review` with `submittedForReviewAt/By/Name/Role`. The station is NOT
  released and the session is NOT closed.
- New `PATCH /sessions/:id/finalize` (**nurse / admin only**) requires a typed
  **digital signature** plus an attestation checkbox. It closes the session,
  records `nurseReview` (signature, reviewer identity, timestamp, notes), releases
  the station into its cleaning/buffer window and sends to billing.
- New `components/workflow/NurseReviewCard.jsx` shows who submitted and when, with
  the signature + attestation form. The complete button now reads
  "Submit for Nurse Review" for technicians and
  "Complete Treatment + Clean Station" for nurses.
- A nurse running the session herself still completes directly (no review step).

Syntax-validated (backend `node --check` x 86, frontend JSX) and models + shift/
sessionCode derivation verified in-container. No new dependencies.

---

## Revision 29 — Nurse review queue, corrected session code format, lab document viewer

### Session code format fixed
- Was rendering like `ASDASD-0-20260723`. Two bugs:
  1. the station segment fell back to the free-text `chairCode` ("ASDASD"),
  2. the slot resolved to `0` when the start time fell outside a shift window.
- New `utils/sessionCode.js`:
  - **Station** now comes from the chair's auto-generated `chairNumber`
    ("CH-07" -> 7), falling back to digits in the chair code.
  - **Slot** never resolves to 0 — gap/out-of-range times clamp to a real shift.
  - **Date** is now **DD-MM-YYYY**.
- Result: `1-1-23-07-2026` (station-slot-date). Verified in-container.
- `formatSchedule` recomputes the code on read when it is missing or in the old
  format, so existing schedules display correctly without a migration.

### Nurse review queue
- New **Pending Review** tab in the Treatment Workflow (next to Scheduled and
  Completed) with a live count, listing only technician-submitted sessions
  awaiting sign-off. `pending_review` added to the active statuses.
- New **"Dialysis Pending Your Review"** panel on the Nurse Dashboard listing each
  submitted session with patient, session code, station, and who submitted it and
  when, plus a "Review & Sign Off" button through to the workflow.

### Lab document viewer
- Lab file chips now open an in-app **viewer popup** instead of a raw link:
  images render inline, PDFs use the existing PdfViewer, and Word/Excel/other
  documents get a download/open panel. Includes an "Open in new tab" action.
- Images are fetched through the authenticated axios instance and rendered from a
  blob URL, because the `/files` route requires an Authorization header that a
  plain `<img src>` cannot send.

Syntax-validated (backend `node --check` x 87, frontend JSX). No new dependencies.

---

## Revision 30 — Pending-review sessions now show the full record; schedule detail; session code in session views

### Bug: a session pending review showed only the header card
- Root cause: the entire working area (vitals, SOAP, medications, home
  medications, labs, session notes — and even the nurse review card) was wrapped
  in `{isInProgress && ...}`. A `pending_review` session matched none of the
  state flags, so nothing rendered.
- Fixed: the block now renders for `isInProgress || isPendingReview`. The nurse
  sees and can **edit/correct** medications, home medications, labs, vitals, SOAP
  and notes before signing off.
- The **NurseReviewCard moved to the top** of the panel so the sign-off is the
  first thing the nurse sees.
- The Complete button is hidden while pending review (the review panel is the
  action); it is replaced by a short instruction line.

### Schedule detail added to the session header
- New **Schedule Detail** block showing appointment date, time (start-end),
  shift, station, booked-by, checked-in time, duration and session code.
  Previously only Created / Started / Completed were visible.

### Session code corrected in session views
- Sessions embed the populated schedule directly and never passed through
  `formatSchedule`, so they still rendered the old `2-3-20260724` format.
- `listSessions` now normalises the embedded schedule: it recomputes the shift
  and rebuilds any code that is missing or stale (slot `0` or an 8-digit date).
- Verified: `2-3-20260724` -> **`2-3-24-07-2026`** (station-shift-appointment date).

Syntax-validated (backend `node --check` x 87, frontend JSX) and the code
normalisation verified in-container. No new dependencies.

---

## Revision 31 — Lab file 404 fix, submitted-vs-completed timestamps, patient form changes

### Lab document 404 fixed (uploads path mismatch)
- `app.js` served static uploads from `process.cwd()/uploads`, while multer wrote
  to `<backend>/uploads` (resolved from the middleware file) and the `/files`
  route resolved from `<backend>/uploads` too. When the API process is started
  from a different working directory these diverge, and lab images 404'd.
- New `utils/uploadsPath.js` is now the single source of truth:
  `UPLOADS_ROOT` (resolved from the source tree, not the cwd), `ensureUploadDir()`
  and `resolveUploadFile()` which checks the canonical root **and** the
  cwd-relative folder before giving up.
- Wired into the `/files` route, the lab upload middleware and the static mount,
  so all three now agree. Path-traversal guard verified in-container.

### Submitted vs completed timestamps
- The session header showed a single "Completed" box, which was ambiguous for
  technician-submitted sessions. It is now split:
  - **Submitted by technician** — `submittedForReviewAt` + the technician's name
  - **Completed (nurse sign-off)** — `completedAt` + "Signed by <signature>"
- Confirmed the technician submit path never sets `completedAt`; only the nurse
  finalize (or a nurse completing directly) does.

### Patient form
- **Removed "Renal Failure Due To Accident"** from the create form, the patient
  edit form, the read-only medical history view and the form preview.
- **"Had Dialysis Before" is now a yes / no / unknown select.** The
  **Previous Dialysis Location** and **Previous Dialysis Date** fields only appear
  when it is set to **yes**; choosing anything else clears them. The read-only
  view and the form preview hide those rows unless the answer is yes.

Syntax-validated (backend `node --check` x 88, frontend JSX). No new dependencies.

---

## Revision 32 — Dialysis prescription (hemodialysis order) + home-med quick add

### Dialysis prescription (doctor-authored order)
- New `DialysisPrescription` model + controller + routes. Holds the clinically
  important order fields (frequency, duration, dialysate/bath, bicarb, Na+, Na+
  variation/modeling, dialyzer, temperature, blood & dialysate flow rate, fluid
  removal, tubing, needle size, access site, keep-systolic-above, abnormal K+/Na+,
  comments). The EMR chrome from the source form (app header, nav tabs, accept
  bar) was intentionally left out.
- **Only a doctor (or admin) can create/edit.** One **active** prescription per
  patient; saving supersedes the previous active one, which is **kept as history**.
  Endpoints: `GET/POST /patients/:id/dialysis-prescription`,
  `GET /patients/:id/dialysis-prescription/history`.
- **Doctor form** (`DialysisPrescriptionForm`) uses chip-style selectors with
  "Other -> free text" for each option group, matching the order look.
- **Read-only viewer popup** (`DialysisPrescriptionViewer`, "View Prescription"
  button) for nurse / technician / everyone, so they run the treatment to the
  doctor's order. Surfaced in:
  - the patient profile via a new **Dialysis Prescription** tab (doctor sees the
    form, others see the viewer), and
  - the **Treatment Workflow** session header (View Prescription button) for the
    patient whose dialysis is booked.

### Home-medication quick add
- New `HomeMedQuickAdd` popup seeded from the clinic's Current Medicines list
  (20 meds across Anti-hypertensives, Cardiovascular, GI, Miscellaneous, Pain,
  Vitamin), each with its usual dose/unit/route/frequency. Searchable; tapping a
  medicine adds it to the patient's Home Medications immediately (stays open so
  several can be added quickly).
- A **Quick Add** button was placed on both the patient **Home Medications** tab
  and the **Treatment Workflow** home-medications section.

Syntax-validated (backend `node --check` x 90, frontend JSX) and the prescription
model verified in-container. No new dependencies.

---

## Revision 33 — Prescription: doctor patient-list button, dashboard stat, bio history

### Doctor dashboard
- New **Add Prescription / Edit Prescription** action on every patient (in the
  pending-rounds table and the all-patients grid), linking straight to that
  patient's Dialysis Prescription tab. The label flips to "Edit Prescription"
  when an active order already exists. These are on the doctor dashboard only.
- New **With Prescription** stat card showing how many patients currently have an
  active order.
- New lightweight endpoint `GET /dialysis-prescriptions/active-patient-ids`
  returns the set of patient ids with an active prescription (one call, used for
  the stat and the per-row label) instead of fetching every prescription.

### Prescription history in the patient bio
- The prescription model already superseded the previous active order on save;
  this now surfaces it. The **View Prescription** popup gains a **History** toggle
  showing every version newest-first, the current one flagged Active and the rest
  Superseded, each with who wrote it and when. Visible to nurses and technicians.
- The doctor's Dialysis Prescription tab now shows the order form plus a
  "View History & Current" button beneath it.
- Verified: repeated saves keep exactly one active (newest on top) and retain all
  older versions as history.

Syntax-validated (backend `node --check` x 91, frontend JSX). No new dependencies.

---

## Revision 34 — Quick-add fixes: route enum, edit-before-add, friendly duplicate

### Enum mismatch fixed
- The quick-add seed used real route abbreviations (PO, SL, Transdermal,
  Ophthalmic) that were not in the HomeMedication `route` enum, so adding them
  failed validation. The enum was expanded to include PO, SL, Transdermal,
  Ophthalmic, Rectal and IM (the frontend route/unit dropdowns were aligned to
  match, and `gm` / `patch` units added). All 20 seed meds now validate.
- Mongoose validation errors on add are now converted to a clear message instead
  of surfacing as a raw error.

### Quick add now prefills for editing (not instant add)
- Picking a medication from Quick Add loads it into the add form (name, dose,
  unit, route, frequency) so the user can **adjust the dose/volume** before
  clicking Add, on both the patient Home Medications tab and the Treatment
  Workflow. The popup closes on pick and shows a hint.

### Friendly duplicate handling
- Adding a medication that is already on the patient's ACTIVE home-medication list
  (case-insensitive) now returns a clear 409 message ("<name> is already on this
  patient's active home medications. Stop the existing one first...") instead of a
  confusing error. Stopped/removed meds don't block re-adding.

Syntax-validated (backend `node --check` x 91, frontend JSX) and all seed meds +
the route enum verified in-container. No new dependencies.

---

## Revision 35 — Fix home-med 500 and billing/claims 403 console errors (UI from user retained)

Adopted the user's uploaded build as the base (their DoctorDashboard and
TechnicianDashboard UI tweaks retained; backend was identical).

### home-medications PATCH 500 fixed
- A home-med row whose `route` was outside the enum caused `med.save()` to fail
  the whole-document re-validation on any update (stop / reactivate / edit),
  returning 500. `route` is now free-form (still driven by the UI dropdown), so a
  stale or abbreviated value can never block an unrelated update again.
- The update handler also converts any remaining validation error into a clear
  400 message instead of a raw 500.

### billing/claims 403 fixed
- `/billing/claims` is biller/admin only, but several dashboards requested it for
  every role, producing 403s in the console. Removed the call for roles that can't
  access it: the Social Worker dashboard and Patient dashboard no longer request
  claims, and PatientDetails only fetches claims for biller/admin (null-safe when
  skipped). Biller pages and the already-guarded DashboardStats are unchanged.

Syntax-validated (backend `node --check` x 91, frontend JSX) and the route-save fix
verified in-container. No new dependencies.

---

## Revision 36 — Patient bulk-upload Excel template

- Added a ready-to-fill **patient bulk-upload template** (`patient_bulk_upload_template.xlsx`)
  whose column headers match the existing `/patients/bulk-upload` importer exactly
  (First Name, Last Name, MRN, DOB, Gender, Phone, Email, Address, Status,
  Referral Source, Diagnosis, Dialysis Frequency, Access Type, Allergies, Medical
  Notes, Emergency Contact Name/Relation/Phone, Provider Name, Insurance / Payer,
  Policy/Group Number, Member ID, Plan Type, Coverage Status, Insurance Expiry
  Date, IPA / Medical Group, PCP Name, Dialysis Coverage, Authorization Required,
  Transportation Benefits, Deductible, Coinsurance, OOP Max, Care Coordination
  Flags). Verified every importer header is present and the sheet parses through
  the importer's XLSX logic.
- The template has three sheets: **Patients** (fill-in, with a formatted header row,
  an example row, dropdowns for Gender/Status/Coverage Status/Authorization
  Required, and green = required / navy = optional headers), **Instructions**, and
  **Field Reference**.
- The importer now **skips the template's example row** (John Smith) so it never
  becomes a real patient.

Backend `node --check` x 91. No new dependencies. (Bulk-upload UI and API already
existed in PatientList / patientApi.)

---

## Revision 37 — Nurses can add dialysis prescriptions

- The dialysis prescription (hemodialysis order) write endpoint now allows the
  NURSE role in addition to doctor/admin:
  `POST /patients/:id/dialysis-prescription` authorizes DOCTOR, NURSE, ADMIN.
- The patient's Dialysis Prescription tab now shows the editable order form to
  nurses (previously view-only for them); technicians and other roles remain
  view-only. History/supersede behaviour is unchanged — a nurse saving a new
  order supersedes the previous active one and keeps it in history, attributed to
  the nurse.

Backend `node --check` x 91, frontend JSX clean. No new dependencies.

---

## Revision 38 — Patient registration field cleanup (client request)

- **Removed "Secondary Payer Address"** from the patient create form, the patient
  edit form and the form preview.
- **Removed the duplicate "Member ID"** from the "Quick Insurance / Payer" block
  (create + edit forms and preview). Member ID is now entered once, in the
  detailed Primary Insurance section. The patient record's quick `insurance.memberId`
  is derived from that Primary Insurance entry on save, so lists/search that read
  it still work.
- **No double typing:** editing Provider Name, Payer Name, Policy Number, Group
  Number or Plan Type in the Quick Insurance block now mirrors the value into the
  detailed Primary Insurance section — but only when that field is still empty
  there, so it never overwrites something already entered.

Backend fields remain in the schema (no migration needed); they are simply no
longer collected in the UI. Frontend JSX clean, backend node --check passing.
No new dependencies.

---

## Revision 39 — Remove demo accounts from the frontend

- Removed the demo / quick-login system from the login page: the `quickUsers`
  array of test credentials (admin@test.com, nurse@test.com, etc.), the
  "Quick role login / Select test account" dropdown UI, the `selectQuickUser`
  handler, its show/ref state and the click-outside effect.
- The email and password fields no longer come pre-filled with
  admin@test.com / 12345678 — the form now starts empty.
- Removed the now-unused ChevronIcon helper. The normal login form (email,
  password, show/hide, MFA, submit) is unchanged.

Frontend JSX clean; no demo remnants remain (verified). No backend or dependency
changes.

---

## Revision 40 — Patient shift, sidebar patient view, treatment-flow action popups, past-booking block

### Patient shift (synced with treatment-flow shift logic)
- New **shift** field on the patient (1 = 05:00-08:00, 2 = 09:00-12:00,
  3 = 12:30-16:00), selectable by everyone on the create and edit forms.
- Shown when a patient is opened: in the header subtitle, an Overview stat card,
  and as a chip on each patient-list row.
- The Treatment Workflow's Schedule Detail now shows the patient's assigned shift
  alongside the schedule, so staff recognise it at a glance. The workflow shift
  filter continues to use the schedule shift (derived from start time when older).

### Patient list — filter by shift
- Segmented **All / 1st / 2nd / 3rd** filter on the patient list, backed by a new
  `?shift=` query param on `GET /patients`. Shift is visible to all roles.

### Patient detail view — sidebar navigation
- The patient detail tab bar changed from a horizontal top bar to a **vertical
  side menu** (Overview, Full Profile, Medical History, ...). Patient detail view
  only; the rest of the app navigation is unchanged.

### CQI + Insurance Form hidden for nurse/technician
- The CQI, CQI comments and Insurance Form tabs are removed from the patient
  detail view for the nurse and technician roles.

### Treatment flow — action popups (simpler view)
- Home Medications, Session Notes / Comments, Laboratory Reports and Medication
  Administration are now **buttons** in a compact grid (each showing a count),
  shown to the roles with treatment-flow access. Clicking opens a focused
  **popup** to add/submit; a successful submit closes the popup. New
  `WorkflowActionModal` wrapper.

### Block past-dated schedule bookings
- Creating a schedule with a start time in the past is now rejected
  (400, "Cannot book a schedule in the past."), with a 2-minute grace window.
  Editing an existing schedule is unaffected. Enforced inside
  `assertScheduleAvailable`, so all create paths (and the station/bed availability
  sync) are covered. Verified in-container.

Syntax-validated (backend node --check x 91, frontend JSX) and the patient shift
enum + past-booking block verified in-container. No new dependencies.
