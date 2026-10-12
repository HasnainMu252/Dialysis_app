# Phase E — Refinements (access, flow sheet, Biomed stations, billing drill-down, sessions, CQI)

Date: 2026-10-09

## E1 — Access: bio ↔ flow sheet + fistula/catheter + evaluation checklist
- The flow-sheet **access list now auto-seeds from the patient's bio fistula/catheter**
  (type, site, placement date) when a session has none yet — no re-entry — and stays
  fully editable on the flow sheet.
- Added a structured **Access Evaluation** (Yes/No checklist) that changes with the
  chosen access type:
  - **Permacath** — no local infection; no discharge at/around cath; dressing no skin infection.
  - **AV fistula** — puncture no infection; no pseudoaneurysm; no ulceration; warm circulation/no steal; no motor/sensory deficit.
  - **AV graft** — no steal; good bruit; mature/no edema.
- Backend: `DialysisSession.flowSheet.accessEvaluation` ({type, checks, note}) + saved by the flow-sheet endpoint.
- Fistula stays the fixed bio record (edited on the patient's Vascular Access card); catheter is replaceable; both flow into treatment.

## E2 — Flow sheet: fields, popup, buttons
- Removed **Machine Brand** and **Machine No.** fields from the flow sheet.
- Flow sheet now **opens as a popup when treatment starts**, plus an **"Open Flow Sheet"** button to reopen it during treatment (inline card removed).

## E3 — Biomed = stations/chairs (synced)
- Biomed dashboard rebuilt on the real **Chairs/stations** (no separate disconnected registry):
  shows every station, **live status**, the **patient currently in treatment** on it,
  per-station **maintenance flow sheet/history**, quick status changes, record-maintenance,
  and add-station. Everything syncs with the stations the rest of the app uses.
- Biomed menu: **Stations**, **Station Maintenance**, **Inventory**, add-station.
- Backend: Biomed added to chair create/status, chair-clearance, and inventory permissions;
  fixed a latent `notifyStationStatus` ReferenceError in `listChairs`.

## E4 — Billing click-through detail (modals)
- **Dialysis billing** → "Session detail" opens the full session (fetched by id).
- **Medication billing** → each administration has a "Session" button opening its session.
- **Physician billing** already had per-round detail (RoundDetailModal) — unchanged.
- Backend: `GET /sessions/:id`; medication-billing rows now carry `sessionId`.

## E5 — Sessions tab: completed only
- Patient **Sessions** tab now shows **only completed** sessions with details; scheduled
  (past-incomplete or future) ones are hidden.

## E6 — CQI merged into one
- The two tabs (CQI + CQI Comments) are now **one "CQI" tab** (the append log).
- Doctor / nurse / technician / social worker / dietitian entries save with **role, date/time
  and session**; the **DON** sees them on the CQI Review page (now shows time + a "session" marker).

## E7 — Social work
- Already behaves as requested: fields are entered by the **social worker**, show as filled,
  and **admin has master edit access**. (No change needed; confirmed.)

## Files
Backend: `models/DialysisSession.js`, `controllers/sessionController.js`,
`routes/sessionRoutes.js`, `controllers/chairController.js`, `routes/chairRoutes.js`,
`routes/chairClearanceRoutes.js`, `utils/permissions.js`,
`controllers/cqiCommentController.js`, `controllers/medicationController.js`.
Frontend: `api/sessionApi.js`, `utils/permissions.js`, `app/routes.jsx`,
`pages/patients/PatientDetails.jsx`, `pages/workflow/TreatmentWorkflow.jsx`,
`components/workflow/FlowSheetCard.jsx`, `components/common/CqiReviewPanel.jsx`,
`pages/biomed/BiomedDashboard.jsx`, `pages/biller/DialysisBilling.jsx`,
`pages/biller/MedicationBilling.jsx`.

## Verify
- `npm install && npm run build` — builds clean; backend files pass `node --check`.
- Start a treatment → flow sheet pops up; access list pre-filled from bio; pick access type → checklist.
- Biomed → stations list with live patient + maintenance history; record maintenance.
- Dialysis/Medication billing → open session detail. Patient Sessions tab → completed only.
- One CQI tab; DON CQI Review shows time + session marker.
