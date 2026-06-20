# Dialysis Management System Backend

Clean MERN backend API foundation based on the SRS.

## Setup
```bash
cp .env.example .env
npm install
npm run dev
```

## Main Flow
1. Register users by role.
2. Create patient profile + insurance + medical history.
3. Send patient to biller and update insurance approval.
4. Create chair and schedule dialysis.
5. Schedule creation automatically creates a dialysis session and 5 clearances.
6. Patient check-in creates queue entry.
7. Treatment can start only when all five clearances are `cleared`.
8. Complete session sends chair to cleaning and marks session for billing.

## API Base
`/api/v1`

## Important Endpoints
- `POST /auth/register`
- `POST /auth/login`
- `POST /patients`
- `PATCH /patients/:id/send-to-biller`
- `POST /chairs`
- `POST /schedules`
- `GET /clearances?session=<sessionId>`
- `PATCH /clearances/:id`
- `PATCH /sessions/:id/check-in`
- `PATCH /sessions/:id/start`
- `POST /sessions/:id/vitals`
- `POST /sessions/:id/soap`
- `PATCH /sessions/:id/complete`
- `POST /billing/claims`
# Dialysis-CRM-MERN
