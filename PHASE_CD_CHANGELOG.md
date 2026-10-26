# Phase C + D — Social work / Medical background / Nutrition, and Billing logs + Inventory

Date: 2026-10-08

## Phase C — Social worker fields, Medical Background tab, Dietitian module

New patient sub-records (all on the Patient model, readable by clinical roles):
`socialWork`, `medicalBackground`, `nutrition`. Each has its own role-gated PATCH
endpoint (editing doesn't require full patient-write), and its own patient-detail tab.

- **Social Work** tab — patient evaluation, transportation, family dynamics,
  transplant information, and **complaints** (entered by social worker, visible to
  the doctor). Edit: social worker + admin.
  `PATCH /patients/:id/social-work`.
- **Medical Background** tab — vaccinations (Hepatitis / TB / isolations),
  hospitalizations (dated list), cardiac workup, cancer workup, other pertinent
  info. View + **edit/delete** for social worker, nurse, doctor (+ admin).
  `PATCH /patients/:id/medical-background`.
- **Nutrition** tab (Dietitian module) — food hurdles (social issues with food),
  education materials given, notes. Edit: dietitian + admin. Dietitian also has
  Labs review via the existing Lab Reports tab + the Dietitian dashboard.
  `PATCH /patients/:id/nutrition`.

Tabs registered in `patientTabsForRole`; shown to the relevant roles (doctor,
social worker, nurse, dietitian, DON, admin). `visiblePatientFields` updated so the
new fields are returned. New permissions: `socialWorkWrite`, `medicalBackgroundWrite`,
`nutritionWrite`.

Frontend: `SocialWorkCard`, `MedicalBackgroundCard`, `NutritionCard` (view +
inline edit), wired into `PatientDetails` as three new tabs.

## Phase D — Billing rework (logs, no fees) + inventory + reconciliation

No fees/CPT (per your call) — billing is now **activity records**.

- **Billing Activity** page (`/billing/activity`, biller/admin/DON):
  - **Per-patient** — dialysis sessions, MD rounds and drugs given per patient for
    a month, with totals + CSV export.
  - **Daily services** — per-day counts of dialysis services, MD services and drugs given.
  - **Medication reconciliation** — pick a patient → standing **home meds** vs
    **in-unit administrations** for the month, side by side.
  - Endpoints: `GET /billing/activity`, `/billing/daily`, `/billing/med-reconciliation`
    (aggregated from DialysisSession, DoctorCheckup, MedicationAdministration, HomeMedication).
- **Purchasing & Supply Inventory** page (`/billing/inventory`):
  - Drug / non-drug items, quantity on hand, reorder level, supplier.
  - Stock transactions: **purchase (+)**, **usage (−)**, **adjustment (±)**, with
    history and a low-stock flag.
  - New `InventoryItem` model + `/inventory` CRUD + `POST /inventory/:id/transaction`.
    Permission `inventoryManage` = admin/biller/DON.
- The billing router now authorizes by `PERMISSIONS.billing` (adds **DON**), and the
  biller route group includes DON — so DON has the billing + purchasing access requested.

The three existing per-stream biller pages (Physician / Dialysis / Medication
Billing) are unchanged and remain the per-stream views; Billing Activity adds the
cross-stream per-patient + daily rollups and reconciliation on top.

## Files
Backend: `models/Patient.js`, `models/InventoryItem.js` (new),
`utils/permissions.js`, `controllers/patientController.js`,
`controllers/billingController.js`, `controllers/inventoryController.js` (new),
`routes/patientRoutes.js`, `routes/billingRoutes.js`, `routes/inventoryRoutes.js` (new),
`routes/index.js`.
Frontend: `api/patientApi.js`, `api/billingApi.js`, `api/inventoryApi.js` (new),
`utils/permissions.js`, `app/routes.jsx`, `pages/patients/PatientDetails.jsx`,
`pages/billing/BillingActivity.jsx` (new), `pages/billing/Inventory.jsx` (new),
`components/common/SocialWorkCard.jsx`, `MedicalBackgroundCard.jsx`, `NutritionCard.jsx` (new).

## Verify
- `npm install && npm run build` — builds clean.
- Backend changed files pass `node --check`.
- As a social worker: open a patient → Social Work / Medical Background tabs → edit.
- As a dietitian: Nutrition tab → edit; Labs via Lab Reports.
- As biller/DON: Billing Activity (per-patient / daily / reconciliation) and
  Inventory (add item + record purchase/usage).
