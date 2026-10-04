# Security, audit and observability — V1

## Audit coverage

Sensitive business actions already write `AuditLog` rows with actor, action, entity type/id and the database `createdAt` timestamp:

- successful and failed admin login
- contribution receipt approve/reject
- project create/update/state change
- transparency create/update/publish/unpublish/delete
- Settings changes
- admin user create/update/role/status changes
- Hero/content changes
- cooperation request status changes

Passwords, password hashes, session tokens and file bodies are never written to AuditLog. The central donation card number is explicitly redacted from Settings audit payloads.

## Browser/session security

Admin authentication continues to use an HttpOnly, Secure-in-production, SameSite=Lax session cookie.

V1 CSRF strategy is layered:

1. SameSite=Lax admin session cookie.
2. Production `POST/PUT/PATCH/DELETE` requests under `/api/admin` must carry an `Origin` or `Referer` whose origin exactly matches `WEB_ORIGIN`.
3. CORS only allows configured web origins and credentials.
4. Admin mutations still pass session authentication and RBAC.

Multiple production web origins may be configured as a comma-separated `WEB_ORIGIN` list.

## Security headers

API responses set:

- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- Referrer-Policy: no-referrer
- Permissions-Policy with camera/microphone/geolocation/payment disabled
- a restrictive API Content-Security-Policy
- HSTS in production

Admin API responses additionally use `Cache-Control: no-store` and `X-Robots-Tag: noindex, nofollow`.

The Next.js app applies equivalent browser-facing security headers, and all `/admin/*` pages also have noindex metadata and response headers.

## Validation and rate limits

The global Nest ValidationPipe keeps whitelist + forbidNonWhitelisted + transform enabled and never includes rejected field values in validation errors.

Current V1 public abuse limits remain:

- admin login: per IP + hashed email identity window
- public contribution submission: 5 attempts / 10 minutes / observed IP
- public cooperation request: 5 attempts / 10 minutes / observed IP

The in-memory implementation is appropriate for the single-instance V1 deployment. A multi-replica deployment must move these buckets to a shared store before horizontal scaling.

`TRUST_PROXY_HOPS` defaults to 0. Only set it when the API is actually behind the stated number of trusted reverse-proxy hops so client-IP based limits cannot be spoofed through arbitrary forwarded headers.

## Structured logs and redaction

The API emits one-line JSON logs with:

- timestamp
- level
- service
- event
- requestId
- method/path/status
- request duration

Request bodies are never logged.

The redaction layer masks password/secret/token/cookie/session/card-number keys, bearer tokens, admin session cookie values, credential-bearing URLs and common API/access-key text patterns.

Production 5xx responses return only a generic error code/message plus requestId; stack traces and internal exception messages are never sent to clients.

## Error tracking integration point

`StructuredErrorTracker` is the V1 provider seam used by the global exception filter. It currently emits a redacted `error.capture` structured event. A hosted error tracker adapter can replace it later without changing controller/service code.

## Health / uptime

Endpoints:

- `GET /api/health/live`: process liveness only
- `GET /api/health/ready`: PostgreSQL + object-storage readiness
- `GET /api/health`: alias of readiness

Readiness returns HTTP 503 with only dependency status names when PostgreSQL or object storage is unavailable. Raw provider/database errors are not exposed.

Uptime/load-balancer configuration should target `/api/health/ready`; container liveness should target `/api/health/live`.

## Secrets

Production startup fails when:

- DATABASE_URL is missing or uses the known development credentials
- SESSION_SECRET is missing, short or an obvious placeholder
- WEB_ORIGIN is missing/non-HTTPS
- S3_BUCKET is missing

Secrets must be injected through the deployment environment or secret store. They are never committed to the repository or embedded in frontend `NEXT_PUBLIC_*` values.
