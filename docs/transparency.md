# Transparency management — V1

## Admin model

Transparency uses the existing `TransparencyDocument` entity with three types:

- `PERFORMANCE_REPORT`
- `LICENSE`
- `FINANCIAL_DOCUMENT`

A document may optionally reference a Project. Documents start as `DRAFT`.

Admin endpoints:

- `GET /api/admin/transparency`
- `GET /api/admin/transparency/:id`
- `POST /api/admin/transparency`
- `PATCH /api/admin/transparency/:id`
- `PATCH /api/admin/transparency/:id/publish`
- `PATCH /api/admin/transparency/:id/unpublish`
- `DELETE /api/admin/transparency/:id`

The list supports type/status/project/search filters, pagination and sorting.

## Publish rules

Publishing requires:

- a valid title
- a document date
- one `TRANSPARENCY_DOCUMENT` media asset

Uploads are private while the document is a draft. Publishing atomically changes the document to `PUBLISHED` and its attached file to public visibility. Unpublishing returns the file to private visibility.

Publish and unpublish transitions are written to `AuditLog` with previous/new publish state plus request context.

Published documents cannot be hard-deleted. They must be unpublished first.

## Public contract

`GET /api/public/transparency` returns only `PUBLISHED` documents, grouped into the three public categories. Drafts never appear in this payload.

Public file URLs are returned only when the attached asset is:

- `visibility = PUBLIC`
- `purpose = TRANSPARENCY_DOCUMENT`

The public page renders only stored document data. Empty categories use a neutral completion state and do not invent licenses, dates, amounts or document titles.

Project detail continues to expose only published documents related to that Project.
