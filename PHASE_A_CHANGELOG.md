# Phase A — Clinical capture (flow sheet, machine checks, access age)

Date: 2026-10-08

Scope delivered: the treatment **flow sheet** (machine checks, solution mixing,
access list, access assessment), **manual machine checks**, and **fistula /
catheter age** on the patient — editable by nurse & doctor, shown in the
booked-session / treatment detail.

## Backend
- **models/Patient.js** — new `vascularAccess` { fistula, catheter } sub-doc
  (present, type, site, placementDate, ageText, note) + updatedBy trail. Age is
  derived from `placementDate`; `ageText` is a manual fallback.
- **models/DialysisSession.js** — new embedded `flowSheet`:
  `machineCheck` (brand, no., conductivity machine/meter, Dicap hrs, temp, pH,
  alarm/air/pressure checks), `solutionMixing` (water, bicarb, mixing, temp,
  verified), `accessList[]` (type, site, placement, surgeon, side, BFR,
  infiltrations, washes, catheter verification), `accessAssessment`
  (eval time, bruit, thrill, swelling, dressing, infection flags) + updatedBy trail.
- **utils/permissions.js** — added `vascularAccess` to `visiblePatientFields`
  (so nurse/tech/doctor can read it); new `vascularAccessWrite` = [admin, nurse, doctor].
- **controllers/patientController.js** — `updateVascularAccess` (PATCH).
- **controllers/sessionController.js** — `updateFlowSheet` (PATCH, upserts the
  single flow sheet, re-populates patient).
- **routes** — `PATCH /patients/:id/vascular-access` (admin/nurse/doctor),
  `PATCH /sessions/:id/flow-sheet` (admin/nurse/technician).

## Frontend
- **api** — `patientApi.updateVascularAccess`, `sessionApi.flowSheet`.
- **utils/accessAge.js** — derive readable age from placement date.
- **components/workflow/FlowSheetCard.jsx** — full flow-sheet entry (machine
  checks / solution mixing / access list add-remove / assessment); read-only mode.
- **components/common/VascularAccessCard.jsx** — fistula/catheter with derived
  age; inline edit for nurse/doctor/admin.
- **pages/workflow/TreatmentWorkflow.jsx** — flow sheet entry during
  in-progress / pending-review; read-only on completed sessions.
- **pages/patients/PatientDetails.jsx** — vascular access card on the Overview tab.
- **pages/patients/PatientCreate.jsx** — "Vascular Access (Fistula / Catheter)"
  section in the registration wizard.
- **components/common/SessionDetailModal.jsx** — read-only Vascular Access +
  Flow Sheet summary on the booked-session detail.

## Who can do what
- Technician/nurse/admin: enter the flow sheet during treatment.
- Nurse/doctor/admin: edit fistula/catheter on the patient profile.
- Admin/front_desk: set vascular access during registration.
- Everyone who can open a patient/session: view both.

## Verify
- `npm install && npm run build` — builds clean.
- Backend changed files pass `node --check`.
- Manual: open an in-progress session → Flow Sheet card → save; open a patient →
  Overview → Vascular Access → Edit → save; both show in the booked-session detail.

## Deferred to later phases (as agreed)
- Phase B: Dietitian/DON/Biomed roles; Biomed machine registry; functional CQI.
- Phase C: social-worker fields; Medical Background bio tab; dietitian module.
- Phase D: billing rework (session/MD/med logs, inventory, med reconciliation).
