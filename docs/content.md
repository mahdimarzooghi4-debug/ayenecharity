# Site content manager — V1

## Scope

The CMS is intentionally limited to the content frozen for V1. It does not duplicate project management, transparency/report management, or Settings.

Editable homepage blocks:

- `home.hero.title`
- `home.hero.description`
- `home.services.title`
- `home.projects.title`
- `home.finalCta.text`

When no row exists in `SiteContent`, the public homepage uses the approved frozen copy as its default. Editing a block upserts only that approved key.

Footer/contact/social content remains owned by Settings. The Site Content screen shows only the read-only note:

`این اطلاعات از تنظیمات عمومی مرکز دریافت می‌شوند.`

## Hero slider

Admin endpoints:

- `GET /api/admin/content`
- `POST /api/admin/content/hero-slides`
- `PATCH /api/admin/content/hero-slides/:id`
- `DELETE /api/admin/content/hero-slides/:id`
- `PUT /api/admin/content/hero-slides/reorder/all`
- `PATCH /api/admin/content/blocks/:key`

Hero fields:

- image asset
- title
- description
- CTA label
- internal CTA target
- display order
- active flag

Hero images use the existing `HERO_IMAGE` media policy: JPEG/PNG/WebP, public object storage, up to 8 MB.

A maximum of four Hero slides may be active at once. The admin list supports saved drag ordering, and create/edit uses the separate drawer state defined in Figma. Delete uses the separate confirmation modal state.

## Permissions

- Super Admin: view and edit
- Content Manager: view and edit
- Project Manager: no CMS access
- Finance: no CMS access

The existing media permission map allows `CONTENT_UPDATE` users to upload `HERO_IMAGE` assets.

## Audit

The following changes write `AuditLog` rows:

- Hero slide created
- Hero slide updated
- Hero slide deleted
- Hero slide reordered
- Site content block updated

Project/report/settings content is not edited by this module.
