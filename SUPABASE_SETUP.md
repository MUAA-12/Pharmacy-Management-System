# Supabase connection (work in progress)
1. Create Supabase project and run `database/supabase_schema.sql` in SQL Editor.
2. Copy the **Postgres connection string** from Supabase Connect (session pooler recommended if IPv4-only host). Put it in `backend/.env` as `DATABASE_URL=...`. Do not share or commit it.
3. `cd backend && npm install && npm start`.
4. Set frontend `VITE_API_URL=http://localhost:5000/api` in `frontend/.env.local`, then `npm install && npm run dev`.
5. For deployment, set backend `DATABASE_URL`, `FRONTEND_URL` and frontend `VITE_API_URL=https://YOUR-BACKEND/api`.
**Security:** API has no authentication yet. Do not publicly deploy with real patient/customer data until server-side auth and authorization are added. This is a migration candidate, not a production-certified build.
