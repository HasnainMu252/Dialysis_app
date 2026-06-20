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
