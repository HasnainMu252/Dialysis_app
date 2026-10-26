# Phase F — DON access fix, billing umbrella, medical records, weekly evaluation

Date: 2026-10-10

## Bug fix — DON 403/404 on billing
DON could open the billing pages but the APIs rejected it. Added **DON** to:
- `GET /doctors/checkups`, `GET /doctors/patients/:id/checkups`,
  `GET /doctors/patients/:id/monthly-status`, `PATCH /doctors/checkups/:id/approval`
- `GET /medications/billing` (+ history/report/usage)
- `GET /reports/soap/monthly`, `GET /reports/dialysis-billing`
DON now loads Physician, Dialysis and Medication billing without 403s.

## Billing under one umbrella
- New **Billing** hub page (`/billing`) with tabs: **Physician · Dialysis · Medication · Activity**.
- Sidebar collapsed from four separate billing links to a single **Billing** item
  (for Admin, Biller, DON). Inventory stays its own item. Old `/biller/*` routes still work.

## Patient Medical Records (expanded)
Medical Background tab reworked into **Internal / External / Kidney Transplant**:
- **Internal** — History & Physical (with "updated every 6 months" date + a Due/Up-to-date badge), vaccinations (Hepatitis / TB / isolations / other).
- **External** — hospitalizations, cardiac workup, cancer workup, other pertinent info.
- **Kidney Transplant** — transplant information + correspondence from the transplant center.
- Editable by **MD, Nurse, Social Worker, Front Desk** (and admin) — front desk added.

## Dietitian role (completed)
- Dietitian dashboard now gives each patient **Review labs** and **Nutrition & education**
  links. The Nutrition tab already covers **education materials** and **food hurdles
  (social issues with food)**; labs are the Lab Reports tab. All three are reachable.

## Weekly Dialysis Evaluation (new template)
- New **Weekly Evaluation** tab (doctor / nurse / admin): a config-driven checkbox
  template matching the concise clinical template — Subjective, Physical Exam, Access
  (Permacath / AV fistula / AV graft), Labs/Treatment. Each evaluation is **logged with
  date and author**; past weeks are listed and expandable.
- Backend: `Patient.weeklyEvaluations[]` + `POST /patients/:id/weekly-evaluation`.

## Physician Monthly Round (already present)
- The detailed monthly round template you pasted (ROS, physical exam, access evaluation,
  lab review 1–11, transplant / vaccination / cancer / cardiac) **already exists** in the
  app's structured Doctor Round form (`constants/physicianRound.js`) — no rebuild needed.

## Files
Backend: `routes/doctorRoutes.js`, `routes/medicationRoutes.js`, `routes/reportRoutes.js`,
`models/Patient.js`, `utils/permissions.js`, `controllers/patientController.js`,
`routes/patientRoutes.js`.
Frontend: `pages/billing/BillingHub.jsx` (new), `app/routes.jsx`, `utils/permissions.js`,
`api/patientApi.js`, `components/common/MedicalBackgroundCard.jsx`,
`pages/dietitian/DietitianDashboard.jsx`, `constants/weeklyEvaluation.js` (new),
`components/common/WeeklyEvaluationCard.jsx` (new), `pages/patients/PatientDetails.jsx`.

## Verify
- `npm install && npm run build` — builds clean; backend passes `node --check`.
- Log in as DON → Billing hub loads all three streams with no 403.
- Patient → Medical Background shows Internal/External/Transplant; front desk can edit.
- Patient → Weekly Evaluation → New evaluation → checklist saves and lists.
- Dietitian dashboard → Review labs / Nutrition links per patient.
