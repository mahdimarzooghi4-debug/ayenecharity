# Ayene Charity V1 — single-server staging deployment

This runbook provisions the isolated staging environment on the existing Ayene server without changing the current sites.

## Topology

- Caddy remains the only public listener on ports 80/443.
- Web binds to `127.0.0.1:3200`.
- API binds to `127.0.0.1:3201`.
- PostgreSQL is Docker-internal only.
- MinIO API binds to `127.0.0.1:9200`; its console binds to `127.0.0.1:9201`.
- `stage.ayenecharity.ir` routes to Web.
- `api-stage.ayenecharity.ir` routes API requests to NestJS and the staging bucket path to MinIO.

The staging database and object store must not be shared with production or other projects.

## Required DNS

Both A records must resolve to the server:

- `stage.ayenecharity.ir`
- `api-stage.ayenecharity.ir`

## Secrets

Copy `deploy/staging.env.example` to `.env.staging` on the server and replace every placeholder.

Generate secrets locally on the server, for example:

```bash
openssl rand -hex 32
```

Do not commit `.env.staging`.

## Caddy routes

Add these site blocks only after the containers are healthy:

```caddyfile
stage.ayenecharity.ir {
    encode zstd gzip
    reverse_proxy 127.0.0.1:3200
}

api-stage.ayenecharity.ir {
    encode zstd gzip

    @stage_media path /ayenecharity-stage /ayenecharity-stage/*
    handle @stage_media {
        reverse_proxy 127.0.0.1:9200
    }

    handle {
        reverse_proxy 127.0.0.1:3201
    }
}
```

Validate Caddy before reloading:

```bash
caddy validate --config /etc/caddy/Caddyfile
systemctl reload caddy
```

Never restart Caddy when a validated reload is sufficient.

## Build and start dependencies

From the exact approved commit:

```bash
docker compose --env-file .env.staging -f compose.staging.yaml build
docker compose --env-file .env.staging -f compose.staging.yaml up -d postgres minio minio-init
docker compose --env-file .env.staging -f compose.staging.yaml ps
```

## Migration

Do not expose PostgreSQL publicly.

Before applying migrations, take and verify a backup according to the V1 migration runbook. Then:

```bash
docker compose --env-file .env.staging -f compose.staging.yaml run --rm api pnpm db:migrate:deploy
docker compose --env-file .env.staging -f compose.staging.yaml run --rm api pnpm --filter @ayene/api exec prisma migrate status
```

## Start application

```bash
docker compose --env-file .env.staging -f compose.staging.yaml up -d api web
docker compose --env-file .env.staging -f compose.staging.yaml ps
```

After Caddy is reloaded:

```bash
curl -fsS https://api-stage.ayenecharity.ir/api/health/live
curl -fsS https://api-stage.ayenecharity.ir/api/health/ready
curl -I https://stage.ayenecharity.ir/
```

Then run the repository staging smoke checks and the manual QA checklist.

## First admin

Bootstrap the first staging Super Admin only once and only after the deployment is healthy. Pass the bootstrap variables to the one-off API command without storing them in Git.

## Rollback

Application rollback uses the last known-good Git SHA and must not delete newly created object-storage data. Database rollback follows the existing V1 production rollback rules; never run `prisma migrate reset` on staging or production.
