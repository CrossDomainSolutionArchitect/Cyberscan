# CyberScan D1 setup (not yet provisioned)
Run from backend after pulling main: `npx wrangler d1 create cyberscan-db`.
Add the returned real database ID to wrangler.jsonc under d1_databases using binding DB and database_name cyberscan-db. Do not invent an ID.
Apply migrations locally first: `npx wrangler d1 migrations apply cyberscan-db --local`.
Run npm test. Test simultaneous reservations in the actual D1 runtime before production.
Then apply remote migrations and deploy only after reviewing environment and secrets.
Google Web Risk key must be configured as a Worker secret. Configure the frontend API URL to the trusted HTTPS Worker URL.
The free allowance is three completed URL scans per Clerk subject; in-flight reservations temporarily consume capacity. Failed scans release capacity. Interrupted Worker executions can leave reservations pending: operational reconciliation is required before production. Do not automatically release pending reservations without proving execution has stopped.
Other scan types, paid plans, WhatsApp, Turnstile route enforcement, and abuse throttling are not yet enabled. No raw scan inputs or results are stored by this migration.
