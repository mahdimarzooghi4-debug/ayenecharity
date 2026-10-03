# Public site content — V1

## Endpoints

- `GET /api/public/home`: homepage data needed for the public shell.
- `GET /api/public/settings`: allowlisted settings whose database rows are also marked `isPublic=true`.

Neither endpoint requires an admin session.

## Hero

The homepage API returns only active Hero slides with a public `HERO_IMAGE` asset. Results are ordered by `displayOrder` and capped at **4 slides**.

If public media/CDN configuration is missing, a slide without a resolvable public URL is omitted rather than exposing an object-storage key.

## Project preview

Homepage projects are limited to records where:

- `status = ACTIVE`
- `visibility = true`

The response is capped at four projects. Draft, inactive, archived, and hidden projects never appear in the public homepage response.

## Public settings

V1 exposes only these setting keys, and only when their row has `isPublic=true`:

- `center.address`
- `center.phone`
- `center.email`
- `social.instagram`
- `social.bale`
- `social.telegram`
- `contribution.cardNumber`
- `contribution.cardHolder`

Footer contact/social information must come from Settings. It must not be duplicated in `SiteContent`.

The public UI omits missing settings; it does not render realistic-looking placeholder addresses, phone numbers, social links, or card details.

## Transparency preview

The homepage returns published-document counts for:

- performance reports
- licenses
- financial documents

When a category has no published records, the UI may show a neutral “در دست تکمیل” state instead of fabricated document data.
