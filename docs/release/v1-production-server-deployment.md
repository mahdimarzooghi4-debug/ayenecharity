# Ayene Charity V1 — production deployment on the shared server

## Safety boundary

Production is isolated from staging and all existing applications:

- Compose project: `ayenecharity-production`
- Web: `127.0.0.1:3300`
- API: `127.0.0.1:3301`
- Object storage API: `127.0.0.1:9300`
- Object storage console: `127.0.0.1:9301`
- PostgreSQL: Docker-internal only
- Production volumes are separate from staging volumes
- Production secrets are stored only in `.env.production` on the server

Do not reuse staging PostgreSQL, object-storage volumes, session secrets, database credentials or admin credentials.

## Approved release

Deploy only an exact `main` commit that has:

1. green CI;
2. green V1 Release Gate against staging;
3. passed host-local staging database backup/restore and migration verification;
4. explicit release-owner approval.

Before starting, record the approved SHA.

## Preflight on the server

Do not stop or restart any existing application.

```bash
free -h
df -h /
docker ps --format 'table {{.Names}}\t{{.Ports}}\t{{.Status}}'
ss -ltnp | grep -E ':(3300|3301|9300|9301)\b' || true
```

All four production host ports must be unused before continuing.

## Production checkout

Use a dedicated directory:

```bash
mkdir -p /opt/ayenecharity-production
cd /opt/ayenecharity-production
```

Clone or update the repository and detach at the exact approved SHA. Never deploy an unverified moving branch tip.

## Production secrets

Copy `deploy/production.env.example` to:

```text
/opt/ayenecharity-production/.env.production
```

Replace all placeholders with production-only secrets and then:

```bash
chmod 600 .env.production
```

Generate independent random values on the server, for example:

```bash
openssl rand -hex 32
```

Never print or commit the completed secret file.

## DNS and Caddy

Required production DNS:

- `ayenecharity.ir` -> production server
- `www.ayenecharity.ir` -> production server
- `api.ayenecharity.ir` -> production server

Caddy remains the only public listener on ports 80/443.

Add these blocks only after the production containers are healthy:

```caddyfile
ayenecharity.ir, www.ayenecharity.ir {
    encode zstd gzip
    reverse_proxy 127.0.0.1:3300
}

api.ayenecharity.ir {
    encode zstd gzip

    @prod_media path /ayenecharity /ayenecharity/*
    handle @prod_media {
        reverse_proxy 127.0.0.1:9300
    }

    handle {
        reverse_proxy 127.0.0.1:3301
    }
}
```

If `S3_BUCKET` is changed from `ayenecharity`, change the Caddy media path to match it exactly.

Always validate before reload:

```bash
caddy validate --config /etc/caddy/Caddyfile
systemctl reload caddy
```

Never restart Caddy when a validated reload is sufficient.

## Build production images

From the exact approved SHA:

```bash
docker compose \
  --env-file .env.production \
  -f compose.production.yaml \
  build
```

## Start private dependencies first

```bash
docker compose \
  --env-file .env.production \
  -f compose.production.yaml \
  up -d postgres object-storage

docker compose \
  --env-file .env.production \
  -f compose.production.yaml \
  ps
```

Do not proceed unless PostgreSQL is healthy and object storage is running.

## Pre-migration production backup

Before every production migration, create a fresh dump from the production PostgreSQL container:

```bash
mkdir -p /opt/ayenecharity-production/backups
set -a
. ./.env.production
set +a
docker compose --env-file .env.production -f compose.production.yaml exec -T postgres \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc \
  > "backups/pre-migration-$(date -u +%Y%m%dT%H%M%SZ).dump"
set +a
```

For the first deployment the database is empty, but the backup step is still required once the database exists and before subsequent migrations.

## Initialize object storage and migrate

```bash
docker compose \
  --env-file .env.production \
  -f compose.production.yaml \
  run --rm object-storage-init

docker compose \
  --env-file .env.production \
  -f compose.production.yaml \
  run --rm api pnpm db:migrate:deploy

docker compose \
  --env-file .env.production \
  -f compose.production.yaml \
  run --rm api pnpm --filter @ayene/api exec prisma migrate status
```

Never use `prisma migrate reset` or `db push --force-reset`.

## Start API and Web

```bash
docker compose \
  --env-file .env.production \
  -f compose.production.yaml \
  up -d api web

docker compose \
  --env-file .env.production \
  -f compose.production.yaml \
  ps
```

Before changing DNS/Caddy traffic, verify locally:

```bash
curl -fsS http://127.0.0.1:3301/api/health/live
curl -fsS http://127.0.0.1:3301/api/health/ready
curl -I http://127.0.0.1:3300/
```

## Public verification

After DNS and the validated Caddy reload:

```bash
curl -fsS https://api.ayenecharity.ir/api/health/live
curl -fsS https://api.ayenecharity.ir/api/health/ready
curl -I https://ayenecharity.ir/
```

Run repository smoke checks against production:

```bash
docker run --rm --network host \
  -e STAGING_WEB_URL=https://ayenecharity.ir \
  -e STAGING_API_URL=https://api.ayenecharity.ir \
  ayenecharity-production-api:latest \
  node scripts/smoke-stage.mjs
```

The smoke script uses legacy `STAGING_*` variable names but can validate the production origins without database exposure.

## First production Super Admin

Bootstrap the first production Super Admin only once, after production is healthy and only if no production admin exists yet.

Do not reuse the staging password. Supply bootstrap values privately for the one-off command and remove them immediately afterward.

## Monitoring window

Immediately after cutover, monitor:

- API readiness
- 5xx responses
- authentication failures
- database health
- object-storage health
- contribution receipt submission/review
- disk usage and container restarts

## Stop conditions

Stop or roll back immediately for:

- authentication/authorization bypass;
- migration inconsistency or data loss;
- private receipt exposure;
- unhealthy database/object storage;
- sustained critical-route 5xx errors;
- broken contribution flow.

Application rollback must not delete database rows or object-storage objects created after deployment.
