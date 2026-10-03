# Database design — V1

## Core rules

- PostgreSQL is the system of record.
- Prisma schema lives in `apps/api/prisma/schema.prisma`.
- Timestamps are stored as `TIMESTAMPTZ` and treated as UTC at persistence boundaries.
- Contribution money is stored as `BigInt` in **rial**. Floating-point types are not used for money.
- Project slug is unique and is the public URL key.
- Contribution review uses an integer `version` field for optimistic concurrency.
- A transparency document may belong to a project or to the center as a whole.

## Retention / deletion policy

- **Project:** operational records are not hard-deleted; lifecycle ends with `ARCHIVED`.
- **Contribution:** never hard-delete through product flows.
- **AdminUser:** disable with `DISABLED`; do not remove historical actors.
- **TransparencyDocument:** drafts may be removed by a future controlled application flow; published records should be unpublished/retained rather than silently destroyed.
- **AuditLog:** append-only from the application perspective.
- **MediaAsset:** deletion must be coordinated with object storage and referencing entities to avoid orphaned files.

## Public visibility

Database rows are not public merely because they exist.

- Project must be `ACTIVE` and `visibility=true`.
- TransparencyDocument must be `PUBLISHED`.
- Receipts are always private media.
- Settings use `isPublic` to distinguish values safe for public API exposure.

## Main relationships

- Project → many Contributions
- Project → many TransparencyDocuments (optional on document)
- Project → many MediaAssets
- Contribution → exactly one Receipt MediaAsset
- Contribution → optional reviewer AdminUser
- TransparencyDocument → optional MediaAsset file
- HeroSlide → one image MediaAsset
- SiteContent / Setting → optional last updater AdminUser
- AuditLog → optional actor AdminUser

Business invariants that depend on state (for example: “published document must have a file” or “active project must have required content”) are enforced in the application/service layer and tested there.
