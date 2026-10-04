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

## Migration procedure

1. Confirm the staging API is not receiving release-test writes.
2. Run the backup/restore verifier against the current staging database:

```bash
DATABASE_URL="<staging database url>" pnpm qa:backup-restore
```

3. Apply migrations:

```bash
DATABASE_URL="<staging database url>" pnpm db:migrate:deploy
```

4. Verify migration history:

```bash
DATABASE_URL="<staging database url>" pnpm --filter @ayene/api exec prisma migrate status
```

5. Deploy API and Web from the exact commit that passed CI.
6. Run staging smoke tests:

```bash
STAGING_API_URL="https://<api>" \
STAGING_WEB_URL="https://<web>" \
pnpm qa:smoke
```

7. Execute the manual QA checklist in `docs/release/v1-qa-checklist.md`.
8. Record the result in `docs/release/v1-release-approval.md`.

The GitHub Actions workflow **V1 Release Gate** performs steps 2–4 and 6 when the `staging` environment secrets are configured.

## Data-loss rule

Never run `prisma migrate reset`, `prisma db push --force-reset`, destructive SQL, or an unreviewed migration against staging or production.

If `prisma migrate deploy` fails, stop the release. Do not manually mark a failed migration as applied unless the SQL and database state have been reviewed.

## Backup verification

`pnpm qa:backup-restore` performs a real `pg_dump`, restores it into a temporary database on the same PostgreSQL server, compares critical-table row counts, verifies Prisma migration history, then deletes the temporary restore database.

A passing backup command proves that the dump is restorable; it does not replace the provider retention policy. Production must also have scheduled provider/database backups enabled.
