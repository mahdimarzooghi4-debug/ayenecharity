# V1 Release Approval

Current status: **PRODUCTION DEPLOYED — GO**

Release candidate commit: `6548ed985f5ca4a69557bba659b569eaf2abd532`

## Required evidence

- Main CI: **PASS** — workflow run `37512783995` on the exact release candidate SHA.
- Staging V1 Release Gate:
  - **PASS** on application SHA `2c8ec3521300202cd6f723b19ca7006bf130a5dd` — workflow run `37511629529`.
  - On the final deployment-assets SHA `6548ed985f5ca4a69557bba659b569eaf2abd532`, workflow run `37515481190` failed twice only at the external staging smoke connection because the GitHub-hosted runner timed out connecting to `api-stage.ayenecharity.ir:443`.
  - The exact-SHA failure did not report an application, migration, database, object-storage, auth, or build failure.
- Staging URL: `https://stage.ayenecharity.ir`
- Staging API: `https://api-stage.ayenecharity.ir`
- Staging database: kept private; host-local backup/restore verification and migration-status verification were completed before production cutover.
- Production pre-migration backup: completed.
- Production migrations: applied successfully; Prisma reported the schema up to date.
- Production readiness: **PASS** — database and object storage both reported `ok`.
- Production smoke: **PASS** against `https://ayenecharity.ir` and `https://api.ayenecharity.ir`.
- Production admin bootstrap: completed once; Super Admin login verified.
- Open P0 bugs: none known at production handoff.
- Open P1 bugs: none known at production handoff.

## Production endpoints

- Web: `https://ayenecharity.ir`
- Web alias: `https://www.ayenecharity.ir`
- API: `https://api.ayenecharity.ir`
- Staging remains isolated and available on its own domains and data stores.

## Approval

- Product/Release owner: explicit human approval recorded during the deployment session.
- Decision: `GO`
- Date: `2026-10-07`
- Notes:
  - Production was deployed from the exact recorded commit above.
  - The final GitHub-hosted Release Gate connectivity failure is recorded as runner-to-staging network evidence, not silently treated as a pass.
  - Equivalent host-local staging checks and production readiness/smoke checks passed before the release was closed.
  - PostgreSQL remained private throughout deployment.
