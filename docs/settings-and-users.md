# Settings and admin users — V1

## Settings source of truth

The `Setting` table is the single source of truth for center/footer/contact/social data and participation card information.

Canonical V1 keys:

- `center.name`
- `center.parentOrganization`
- `center.address`
- `center.phone`
- `center.email`
- `contribution.cardNumber`
- `contribution.accountHolderName`
- `social.instagram`
- `social.bale`
- `social.telegram`

Projects do not store card numbers or account-holder names. Public participation views read the central contribution settings.

Approved organization-name defaults may be shown when no Setting row exists:

- مرکز نیکوکاری آینه
- خانه خلاق آینه

Contact details, card information, email addresses and social URLs default to empty values; no realistic placeholder data is invented.

Social links must use HTTP/HTTPS and reserved placeholder hosts such as `.test`, `.example`, `.invalid`, localhost and example.com are rejected.

Admin settings endpoints:

- `GET /api/admin/settings`
- `PATCH /api/admin/settings/center`
- `PATCH /api/admin/settings/contribution`
- `PATCH /api/admin/settings/social`

Each section save is atomic and writes one `SETTINGS_UPDATED` audit record with previous/new values.

Only Super Admin receives `SETTINGS_VIEW` and `SETTINGS_UPDATE` in V1.

## Admin users

Admin user endpoints:

- `GET /api/admin/users`
- `POST /api/admin/users`
- `PATCH /api/admin/users/:id`
- `PATCH /api/admin/users/:id/status`

Supported roles remain fixed:

- Super Admin
- Finance
- Project Manager
- Content Manager

There is no dynamic Permission Matrix in V1.

New users require a strong initial password of at least 12 characters. The Settings UI generates this value in the browser, sends it once to the create endpoint, and shows the same local value once to the Super Admin after successful creation. The API never returns a password or password hash.

Password hashes, session tokens and other secrets are never included in API responses or audit payloads.

Changing a user's role revokes all active sessions. Disabling a user revokes active sessions immediately, and authentication already rejects both new logins and existing sessions for disabled users.

Safety rules:

- a Super Admin cannot disable their own account
- a Super Admin cannot change their own role
- at least one active Super Admin must remain

Audited user actions include:

- user created
- user updated
- role changed
- user activated
- user disabled

Only Super Admin has user-management permissions in V1.
