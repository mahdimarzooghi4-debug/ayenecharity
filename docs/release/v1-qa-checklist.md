# V1 QA Checklist

Status values: `PASS`, `FAIL`, `N/A`.

## Automated gates

- [ ] Main CI is green: schema validation, migration deploy, lint, typecheck, unit tests, V1 HTTP E2E, backup/restore verification, build.
- [ ] Staging host-local database gate passes without exposing PostgreSQL publicly.
- [ ] V1 Release Gate workflow is green against the public staging origins.
- [ ] No open P0 or P1 release bug exists.

## Public site

- [ ] Home loads on desktop and mobile.
- [ ] Header/footer navigation works.
- [ ] Projects list shows only active + visible projects.
- [ ] Project detail opens by slug.
- [ ] Participation dialog is closed by default.
- [ ] Card/account details come from Settings and are not duplicated per project.
- [ ] Receipt form validates name, Iranian mobile, amount and file.
- [ ] Receipt submission creates a pending contribution.
- [ ] Transparency page shows only published documents.
- [ ] Contact/cooperation form submits successfully.
- [ ] No fabricated license, financial, account, contact or metric data is visible.
- [ ] `robots.txt` and `sitemap.xml` are reachable.
- [ ] Public pages have expected title/description/canonical metadata.
- [ ] Keyboard focus is visible and primary interactions work without a mouse.

## Admin

- [ ] Admin login works with an active account.
- [ ] Disabled admin login/session is rejected.
- [ ] Dashboard loads.
- [ ] Project create/edit/publish works.
- [ ] Finance can approve/reject receipts.
- [ ] Project Manager can view contributions but cannot review them.
- [ ] Transparency create/publish/unpublish works.
- [ ] Cooperation request status follows NEW → IN_REVIEW → RESPONDED → CLOSED.
- [ ] Content Manager can edit allowed CMS blocks.
- [ ] Content Manager cannot open Settings.
- [ ] Super Admin can edit Settings and manage admin users.
- [ ] Last active Super Admin safeguard works.
- [ ] User role/status changes revoke sessions where required.
- [ ] Admin pages are noindex.

## Files and privacy

- [ ] Public project/hero images are reachable.
- [ ] Private receipt files are not exposed by permanent public URL.
- [ ] Private receipt access uses a temporary signed URL.
- [ ] Published transparency files are public only after publish.
- [ ] Unpublished transparency files return to private visibility.

## Operations

- [ ] `/api/health/live` is healthy.
- [ ] `/api/health/ready` reports database and object storage healthy.
- [ ] Structured logs appear without passwords, session tokens, card data or file bodies.
- [ ] Failed 5xx responses do not expose production stack traces.
- [ ] Staging backup/restore verification passes on the staging host.
- [ ] Migration status is clean after deployment on the staging host.
- [ ] Rollback procedure has been reviewed by the release owner.

## Release decision

Any failed P0/P1, migration failure, backup/restore failure, broken auth/permissions, broken contribution flow, or unhealthy readiness endpoint is a **NO-GO**.
