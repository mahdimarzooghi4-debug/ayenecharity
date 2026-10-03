# Admin authentication and RBAC — V1

## Session model

Admin authentication uses opaque, server-side sessions.

1. Admin submits email and password to `POST /api/admin/auth/login`.
2. The API verifies the bcrypt password hash.
3. A cryptographically random session token is generated.
4. Only an HMAC-SHA256 hash of the token is stored in PostgreSQL.
5. The raw token is returned only in an HttpOnly cookie.
6. Protected admin requests resolve the session and active user from PostgreSQL.

Cookie policy:
- HttpOnly
- Secure in production
- SameSite=Lax
- Path=/api/admin
- 12-hour fixed lifetime by default

Logout revokes the session in PostgreSQL and clears the cookie.

## Initial super admin

The first admin is created explicitly from environment variables:

```bash
BOOTSTRAP_ADMIN_EMAIL=admin@example.org \
BOOTSTRAP_ADMIN_PASSWORD='use-a-long-random-password' \
BOOTSTRAP_ADMIN_NAME='Admin' \
pnpm admin:bootstrap
```

Never commit a real bootstrap password.

## Roles

- SUPER_ADMIN: all V1 permissions.
- FINANCE: contribution review/approve/reject and transparency records needed by finance.
- PROJECT_MANAGER: project management, contribution read access, transparency read access.
- CONTENT_MANAGER: site content and transparency publishing; no financial approval, sensitive settings, or user administration.

The static V1 matrix is defined in `src/auth/permissions.ts`. Domain services still enforce business rules in addition to RBAC.

## Login rate limiting

The initial single-instance V1 API uses an application-level limiter:
- 5 failed attempts per normalized email per 15 minutes
- 20 failed attempts per IP per 15 minutes

Before horizontal API scaling, this state must move to shared infrastructure such as Redis.

## Audit

The API records:
- AUTH_LOGIN_SUCCESS
- AUTH_LOGIN_FAILED
- AUTH_LOGOUT

Failed login audit events store a SHA-256 hash of the normalized submitted email rather than the raw email.
