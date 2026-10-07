# V1 Production Completion Record

## Release identity

- Release SHA: `6548ed985f5ca4a69557bba659b569eaf2abd532`
- Deployment date: `2026-10-07`
- Main CI run: `37512783995` — **SUCCESS**
- Repository: `mahdimarzooghi4-debug/ayenecharity`

## Production topology

Production is isolated from staging and the other applications on the shared server.

- Web: `127.0.0.1:3300` behind Caddy
- API: `127.0.0.1:3301` behind Caddy
- Object storage API: `127.0.0.1:9300`
- Object storage console: `127.0.0.1:9301`
- PostgreSQL: Docker-internal only
- Production database and object-storage volumes are separate from staging
- Production secrets are stored only in the server-side `.env.production`

## Public endpoints

- `https://ayenecharity.ir`
- `https://www.ayenecharity.ir`
- `https://api.ayenecharity.ir`

Caddy obtained TLS certificates for the production web domains and API routing was validated.

## Deployment evidence

- Production Compose configuration validated.
- Production PostgreSQL started healthy.
- Production object storage started and the production bucket policy was initialized.
- A pre-migration PostgreSQL backup was created successfully.
- All Prisma migrations were applied successfully.
- Prisma migration status reported the production schema up to date.
- API liveness returned `ok`.
- API readiness returned `ok` with:
  - database: `ok`
  - objectStorage: `ok`
- Web returned HTTP 200 through the production route.
- Full production smoke check passed using the production API image against the production HTTPS origins.
- First production Super Admin was bootstrapped once and login was verified.

## Staging Release Gate connectivity note

The final SHA's GitHub Actions V1 Release Gate run `37515481190` was attempted twice. Both attempts passed checkout, endpoint validation and Node setup, then failed because the GitHub-hosted runner timed out connecting to `api-stage.ayenecharity.ir:443`.

This was recorded rather than hidden. The same public staging gate had previously passed on application SHA `2c8ec3521300202cd6f723b19ca7006bf130a5dd` in run `37511629529`. Host-local staging backup/migration checks and subsequent production readiness/smoke checks passed.

## Operational state at handoff

- Production is live.
- Staging remains separate and available.
- Production PostgreSQL is not publicly exposed.
- Existing unrelated Caddy sites were not replaced.
- No destructive database reset was used.
- No staging database, object-storage volume, session secret, or admin password was reused for production.

## Follow-up

Continue with Production monitoring and improvement. Investigate GitHub-hosted runner connectivity to the staging API separately so future release-gate runs can regain exact-SHA remote smoke coverage without weakening the private-database boundary.
