# Public site content — V1

## Endpoints

- `GET /api/public/home`: homepage data needed for the public shell.
- `GET /api/public/site-settings`: public center contact and social settings used by shared public pages.
- `GET /api/public/settings`: broader allowlisted public settings contract, including contribution card information for contribution-specific flows.
- `GET /api/public/projects`: public project listing.
- `GET /api/public/projects/:slug`: public project detail and related published reports.
- `GET /api/public/transparency`: published center-wide/project-linked transparency documents grouped by category.

None of these endpoints requires an admin session.

## Hero

The homepage API returns only active Hero slides with a public `HERO_IMAGE` asset. Results are ordered by `displayOrder` and capped at **4 slides**.

If public media/CDN configuration is missing, a slide without a resolvable public URL is omitted rather than exposing an object-storage key.

## Public projects

Both the homepage project preview and the projects listing only return records where:

- `status = ACTIVE`
- `visibility = true`

The full projects listing is ordered by `displayOrder ASC`, then `publishedAt DESC`. The homepage preview follows the same ordering and is capped at four projects.

Draft, inactive, archived, and hidden projects never appear in public lists. The project-detail route applies the same visibility rules, so a slug for any non-public project resolves as the standard public `PROJECT_NOT_FOUND` response.

Project images are exposed only when the referenced media asset is both:

- `visibility = PUBLIC`
- `purpose = PROJECT_IMAGE`

The API never exposes object-storage keys.

## Project detail and related reports

`GET /api/public/projects/:slug` returns the public project title, slug, descriptions, public main image URL, publication time, and related transparency documents.

Only related documents with `publishStatus = PUBLISHED` are returned. A document file URL is exposed only when its media asset is public and has `purpose = TRANSPARENCY_DOCUMENT`; otherwise the document metadata may be shown without a file link.

The public UI uses real published documents only. When no related report exists it renders an empty state instead of fabricated report titles, dates, or files.

The project-detail participation CTA is present as part of the frozen Figma design, but contribution submission, card presentation, receipt upload, validation, and pending-contribution creation belong to V1-07.

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

The homepage and shared public-page shell use only center contact and social settings through `/api/public/site-settings`. Contribution card details are deliberately excluded from these general page payloads and remain available only through the broader public-settings contract for contribution-specific flows.

The public UI omits missing settings; it does not render realistic-looking placeholder addresses, phone numbers, social links, or card details.

## Transparency preview

The homepage returns published-document counts for:

- performance reports
- licenses
- financial documents

When a category has no published records, the UI may show a neutral “در دست تکمیل” state instead of fabricated document data.


## Public transparency page

The transparency page reads only from `GET /api/public/transparency`. Draft records are never rendered. Each category displays actual published records when available and a neutral empty state otherwise.

Published document files are linked only when their media asset is public and has `TRANSPARENCY_DOCUMENT` purpose. No placeholder license numbers, financial amounts, dates or document titles are generated.
