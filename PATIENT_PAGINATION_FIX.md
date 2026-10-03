# Patient list — pagination & bulk-action fix

Date: 2026-10-03

## What was broken
The Patients screen showed only 25 records even though the database held 94
(the Excel export proved all 94 were there). Pagination only paged through
those 25, "select all / delete all" acted on ≤25, and a bulk upload looked
like a no-op ("screen just refreshes").

## Root causes
1. **Response shape mismatch.** `sendSuccess` spreads `meta` onto the body
   root (`body.total`), but `PatientList` read `response.data.meta.total`,
   which was `undefined`, so it fell back to `patients.length` (25).
2. **No server-side pagination on the client.** `PatientList` fetched the
   list with no `page`/`limit`, got the server's default first 25, then
   paginated *those 25* client-side with `usePagedList`. Records 26–94 were
   never requested.
3. **Page-scoped selection.** Select-all and the row checkboxes resolved
   against the 25 loaded rows, so bulk delete could only ever touch one page.

## Changes

### Backend
- `controllers/patientController.js`
  - Extracted `buildPatientQuery()` (search + shift + dayPattern) shared by
    the list and the new ids endpoint, so list / select-all / export stay in
    sync. (The list was already correctly paginated with `skip/limit/
    countDocuments` — left intact.)
  - Added `listPatientIds` → returns every matching `{_id, mrn}` with **no
    limit**, to power "select all N patients".
- `routes/patientRoutes.js`
  - Added `GET /patients/ids` (placed before `/:id` so it isn't captured by
    the param route).

### Frontend
- `api/patientApi.js` — added `listIds(params)`.
- `pages/patients/PatientList.jsx`
  - Real **server-side pagination**: sends `page` + `limit` (25/page), reads
    `total`/`pages` from the body root (with `body.meta` fallback), renders
    the server page directly, and drives `<Pagination>` from the server's
    `pages`/`total`. Navigating a page keeps your selection.
  - **Total patients** card now shows the true grand total; **Current
    results** shows the filtered total; the directory count uses `total`.
  - **Select all N patients** now selects every match across all pages (via
    `/patients/ids`); the header checkbox selects the current page only.
  - **Bulk delete** acts on the full selection (all matches when "select all"
    is on), and reports the real deleted count.
  - **Bulk upload** now shows the real uploaded/failed counts instead of a
    silent refresh.
  - Removed the client-side `usePagedList` slicing for this screen.

## Verify
- `npm install && npm run build` — builds clean.
- Backend files pass `node --check`.
- Manual: load Patients → all 94 across 4 pages; "Select all 94" → Delete →
  removes all; upload 94 → toast shows "Uploaded N patients".

## Note (not changed)
Other list screens (Schedules, CQI, etc.) still fetch their full set and
paginate client-side via `usePagedList`; they work as long as their endpoints
return all rows. If any of those grow large, apply the same server-side
pattern used here.
