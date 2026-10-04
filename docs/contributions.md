# Public contribution submission — V1

## Endpoint

`POST /api/contributions` accepts `multipart/form-data` with:

- `projectId`
- `contributorName`
- `contributorPhone`
- `amountRial`
- `receipt`
- optional `contributorNote`

The endpoint is public and rate-limited to 5 attempts per 10-minute window per observed client IP for the current API process.

## Business rules

- The target project must be `ACTIVE` and publicly visible.
- Mobile numbers are normalized to the Iranian local `09xxxxxxxxx` format.
- Persian and Arabic digits are normalized before validation.
- Amount is accepted and persisted as integer rial; floating-point values are never used.
- Amount must be positive and fit PostgreSQL `BIGINT`.
- A new contribution is always created with `status = PENDING`.
- Receipt is mandatory.

## Receipt storage

Receipt files use the existing Media policy:

- purpose: `RECEIPT`
- visibility: `PRIVATE`
- allowed MIME types: JPEG, PNG, WebP, PDF
- maximum size: 5 MiB

The uploaded receipt is stored before the Contribution row is created. If Contribution creation fails, the newly uploaded unreferenced receipt is deleted so no incomplete Contribution is finalized.

Public API responses never expose a storage key, private object URL, or receipt asset identifier.

## Public UI

The project-detail contribution flow reads card information from centralized public Settings:

- `contribution.cardNumber`
- `contribution.cardHolder`

The initial desktop modal and mobile bottom sheet follow the frozen Figma states for project participation. No realistic fallback card data is invented when Settings are missing.

After receipt submission, the UI states only that the receipt is awaiting center review. It does not claim the payment was bank-verified.

The browser posts to the same-origin Next.js route `/api/contributions`, which forwards the multipart payload to the Nest API. This keeps backend deployment URLs out of client-side flow configuration.
