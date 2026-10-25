# Deployment checklist

1. Run `database/supabase_schema.sql` in Supabase SQL Editor.
2. Run `database/data.sql` only after verifying schema and existing records. Data is simulated for demonstration.
3. Deploy `backend` to Render (build `npm ci`, start `npm start`). Set `DATABASE_URL` and `FRONTEND_URL` in Render environment settings.
4. Deploy `frontend` to Vercel as Vite project (`npm run build`, output `dist`). Set `VITE_API_URL=https://YOUR_RENDER_SERVICE.onrender.com/api`.
5. Test medicines, customers, reservations, stock rules, reports, and API health.
6. Review migrations before enabling automatic production deployments in Supabase.

Never commit `.env` or secrets.
