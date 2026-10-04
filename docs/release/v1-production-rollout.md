# V1 Production Deployment and Rollback

## Release prerequisites

Production deployment is allowed only when:

1. the commit is on `main`;
2. CI is green;
3. the staging V1 Release Gate is green;
4. the manual QA checklist has no P0/P1 failure;
5. the release approval record is marked `GO`.

## Production deployment

1. Record the exact Git commit SHA.
2. Verify provider backup status and run a fresh manual database backup.
3. Confirm production secrets are configured in the deployment secret store.
4. Apply database migrations with `pnpm db:migrate:deploy`.
5. Deploy API from the approved commit.
6. Wait for `/api/health/ready` to return healthy.
7. Deploy Web from the same approved commit.
8. Run `pnpm qa:smoke` against production URLs.
9. Verify login, public project browsing, one non-destructive public form validation, and admin read paths.
10. Begin the monitoring window and watch 5xx logs, readiness, latency and failed auth spikes.

Do not bootstrap a new Super Admin during routine production deployment.

## Application rollback

If the release fails without a database incompatibility:

1. stop further deploys;
2. redeploy the last known-good application commit;
3. keep the database at the migrated version when the migration is backward compatible;
4. run readiness and smoke checks;
5. document the incident before retrying.

## Database rollback

Prisma migrations are forward-only by default. Do not use `migrate reset` in production.

For a destructive or incompatible migration:

1. place the application in maintenance/no-write mode;
2. preserve the failed database state for investigation;
3. restore the verified pre-release database backup into a new database instance;
4. point the last known-good API release at the restored database;
5. verify health and critical reads;
6. re-enable traffic only after validation.

The restore target should be a new database instance whenever possible; overwriting the only production copy increases recovery risk.

## Object storage rollback

Application rollback must not delete objects created by the failed release. Media deletion is a separate, audited cleanup task after database consistency is confirmed.

## Stop conditions

Immediately halt or roll back for:

- authentication/permission bypass;
- data loss or migration inconsistency;
- receipt/privacy exposure;
- database or object-storage readiness failure;
- sustained 5xx errors on critical routes;
- broken contribution receipt submission/review.
