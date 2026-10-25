# Pharmacy System — review and deployment

## Included fixes
- PostgreSQL adapter DATE_FORMAT and DATEDIFF column substitution corrected (previously emitted literal `$1`).
- MySQL `CAST(... AS CHAR)` converted to PostgreSQL TEXT.
- Reservation aggregation adds customer ID to GROUP BY.
- PostgreSQL count values converted to Number for delete guards.
- Reject non-integer stock inputs.
- Synthetic 3-month SQL seed in `database/demo_3_months.sql`: 20 medicines, 60 customers, 240 reservations, 25 July–24 October 2026. DEMO ONLY.

## Run
1. Create Supabase project; run `database/supabase_schema.sql` in SQL Editor.
2. **Only on empty test DB**, run `database/demo_3_months.sql`. Never run on real customer data.
3. Copy `backend/.env.example` to `backend/.env`, set Supabase pooler `DATABASE_URL` and `FRONTEND_URL` (no secrets in Git).
4. `cd backend && npm ci && npm run dev`.
5. `cd frontend && npm ci && npm run dev`.
6. Test `http://localhost:5000/api/health`, then CRUD and reservation lifecycle.
7. GitHub: push only sanitized source; deploy backend to Render (root `backend`, build `npm ci`, start `npm start`); set `DATABASE_URL`, `FRONTEND_URL` in Render environment.
8. Deploy frontend to Vercel (root `frontend`, build `npm run build`, output `dist`); set `VITE_API_URL=https://YOUR-RENDER-SERVICE.onrender.com/api` and update backend `FRONTEND_URL` to Vercel domain.

## Still required before real public launch
- **Authentication/authorization is absent**: API is currently unsafe for public write access. Do NOT deploy publicly with real customer data until backend auth and role-based access controls are implemented and tested.
- Add rate limiting, audit logging, backup/recovery, end-to-end tests, and production monitoring.
- Existing design is roughly 3NF for reservation headers/items; **4NF, 5NF and 6NF cannot be claimed just by adding tables**. Functional, multivalued, join and temporal dependencies must be documented and tested. For a 1NF–6NF academic demonstration, produce a separate normalization report with dependency proofs and suitable temporal data examples.
- These changes have not been tested against your Supabase instance; no credentials or live deployment access were provided.
