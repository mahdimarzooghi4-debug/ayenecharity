# Cooperation requests — V1

## Public submission

`POST /api/cooperation-requests` accepts JSON with:

- `fullName`
- optional `organizationOrProjectName`
- `phone`
- optional `email`
- `requestType`
- `message`

Supported request types:

- `VOLUNTEER` — همکاری داوطلبانه
- `ORGANIZATIONAL` — همکاری سازمانی
- `PROJECT_PROPOSAL` — پیشنهاد طرح

The public endpoint validates input and is rate-limited to 5 attempts per 10-minute window per observed client IP. Every successful submission is created with `status = NEW`.

The public response contains only:

- `id`
- `status`
- `submittedAt`

It never returns `internalNote` or other admin-only workflow data.

## Admin workflow

Admin endpoints:

- `GET /api/admin/requests`
- `GET /api/admin/requests/:id`
- `PATCH /api/admin/requests/:id`

The list supports search plus request-type, status, and created-at date filters with pagination.

V1 uses one compact workflow:

`NEW → IN_REVIEW → RESPONDED → CLOSED`

Skipping or moving backwards is rejected. There is no assignee, CRM pipeline, workflow builder, or automated messaging in V1.

Permissions:

- Super Admin: view, status updates, internal notes
- Content Manager: view, status updates, internal notes
- Project Manager: view only
- Finance: no request-management access

Every status change writes an `AuditLog` entry with previous/new status and request context. Internal-note content is intentionally excluded from public APIs and status audit payloads.

## Admin UI

The request list and detail drawer follow the frozen Figma admin design:

- search
- request type filter
- status filter
- date range
- pagination
- detail drawer closed by default
- status management
- private internal note

The page is deliberately not a full CRM.

## Public UI

The contact/cooperation page follows the frozen desktop and mobile Figma designs. Contact details and social links come only from public Settings; the implementation does not invent fallback addresses, phone numbers, email addresses, or social URLs.
