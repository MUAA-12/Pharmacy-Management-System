# Review notes (2026-10-26)

This is a separate copy. No live deployment or database modifications were performed.

Changes: removed `.env` and `.git` from shared archive; corrected MySQL UI labels to PostgreSQL; updated PostgreSQL unique/FK error handling; corrected test terminology.

Verified by user: live dashboard and medicines API read successfully from Supabase.

Not yet verified: all create/update/delete endpoints, reservation atomicity and concurrency, rollback, report queries, normalization proof, production SSL certificate trust. `backend/tests/transactionTest.js` writes data and must only be run against a disposable test database, NOT the live database.

Before production: rotate any password exposed in screenshots, validate SSL certificates, avoid returning internal database errors publicly, and test all CRUD routes with a dedicated test database.
