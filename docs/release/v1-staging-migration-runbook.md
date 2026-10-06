# V1 Staging and Migration Runbook

## Purpose

This runbook is the release gate for Ayene Charity V1. It must be completed on the real staging environment before production approval.

## Staging topology

Use isolated staging resources:

- Web: Next.js service
- API: NestJS service
- Database: PostgreSQL 16+
- Object storage: a dedicated S3-compatible staging bucket
- HTTPS public URLs for Web and API

Staging must not reuse the production database, production bucket, production session secret, or production admin password.

The staging PostgreSQL service is intentionally private. Do not expose it to the Internet and do not create a public database URL only for CI.

## Required environment variables

### API

- `NODE_ENV=production`
- `PORT` supplied by the hosting platform
- `DATABASE_URL`
- `SESSION_SECRET` (32+ random characters)
- `SESSION_TTL_HOURS=12`
- `WEB_ORIGIN=https://<staging-web-host>`
- `TRUST_PROXY_HOPS=1` when one trusted proxy is in front of the API
- `S3_ENDPOINT`
- `S3_REGION`
- `S3_BUCKET`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `S3_FORCE_PATH_STYLE` when required by the provider
- `PUBLIC_MEDIA_BASE_URL`
- `MEDIA_SIGNED_URL_TTL_SECONDS=300`

### Web

- `API_BASE_URL=https://<staging-api-host>`
- `NEXT_PUBLIC_API_BASE_URL=https://<staging-api-host>`
- `SITE_URL=https://<staging-web-host>`
- `NEXT_PUBLIC_SITE_URL=https://<staging-web-host>`
- `NEXT_PUBLIC_MEDIA_BASE_URL=<public staging media origin>`

## Deploy commands

API build:

```bash
corepack enable
corepack prepare pnpm@10.17.1 --activate
pnpm install --frozen-lockfile
pnpm db:generate
pnpm --filter @ayene/api build
```

API start:

```bash
pnpm db:migrate:deploy
pnpm --filter @ayene/api start
```

Web build:

```bash
corepack enable
corepack prepare pnpm@10.17.1 --activate
pnpm install --frozen-lockfile
pnpm --filter @ayene/web build
```

Web start:

```bash
pnpm --filter @ayene/web start
```

## Release-gate split

The release gate has two intentionally separate parts.

### 1. Host-local database gate

Run this on the staging host, where PostgreSQL is reachable only through the private Docker network:

1. Confirm the staging API is not receiving release-test writes.
2. Run the backup/restore verifier against the current staging database.
3. Apply migrations from the exact approved commit.
4. Verify Prisma migration status is clean.
5. Confirm `/api/health/ready` reports both database and object storage healthy.

The database must remain private during these checks.

### 2. GitHub public staging gate

After the host-local database gate has passed, run the GitHub Actions workflow **V1 Release Gate** on the exact approved `main` commit.

The workflow intentionally uses only the public HTTPS staging origins:

- `https://stage.ayenecharity.ir`
- `https://api-stage.ayenecharity.ir`

It verifies API liveness/readiness, database and object-storage readiness as exposed by the API health contract, public routes, unauthenticated admin protection, security headers and admin noindex behavior.

The workflow does **not** receive `DATABASE_URL` and must never require `STAGING_DATABASE_URL`.

## Migration procedure

1. Complete the host-local database gate above.
2. Deploy API and Web from the exact commit that passed CI.
3. Run the GitHub **V1 Release Gate**.
4. Execute the manual QA checklist in `docs/release/v1-qa-checklist.md`.
5. Record the result in `docs/release/v1-release-approval.md`.

## Data-loss rule

Never run `prisma migrate reset`, `prisma db push --force-reset`, destructive SQL, or an unreviewed migration against staging or production.

If `prisma migrate deploy` fails, stop the release. Do not manually mark a failed migration as applied unless the SQL and database state have been reviewed.

## Backup verification

`pnpm qa:backup-restore` performs a real `pg_dump`, restores it into a temporary database on the same PostgreSQL server, compares critical-table row counts, verifies Prisma migration history, then deletes the temporary restore database.

A passing backup command proves that the dump is restorable; it does not replace the provider retention policy. Production must also have scheduled provider/database backups enabled.
