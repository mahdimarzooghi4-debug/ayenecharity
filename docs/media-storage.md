# Media storage — V1

## Storage model

Binary files are never stored in PostgreSQL. PostgreSQL contains only `MediaAsset` metadata and relationships.

All bytes are stored in one S3-compatible object store. The implementation supports AWS S3, Cloudflare R2, MinIO, and other compatible providers through environment configuration.

## Visibility policy

| Purpose | Visibility | Formats | Max size |
| --- | --- | --- | ---: |
| Project image | Public | JPEG, PNG, WebP | 8 MB |
| Hero image | Public | JPEG, PNG, WebP | 8 MB |
| Receipt | Private | JPEG, PNG, WebP, PDF | 5 MB |
| Transparency document | Private | JPEG, PNG, WebP, PDF | 15 MB |
| Other | Private | JPEG, PNG, WebP, PDF | 5 MB |

Visibility is derived by the backend from the media purpose. Clients do not choose whether a file is public or private.

## Public media

Project and Hero images are uploaded with:

```
Cache-Control: public, max-age=31536000, immutable
```

Object keys are content-instance keys containing a random UUID, so replacing an image creates a new URL and makes immutable CDN caching safe.

When `PUBLIC_MEDIA_BASE_URL` is configured, the API returns a CDN/public URL based on that origin.

## Private media

Receipts and private documents are uploaded with:

```
Cache-Control: private, no-store
```

Private object keys are never returned as public download URLs.

An authorized admin requests:

```
GET /api/admin/media/:id/access-url
```

The backend checks RBAC based on the media purpose and returns a short-lived signed object-storage URL. Signed URL TTL defaults to 300 seconds and is clamped to 60–900 seconds.

Receipt access requires `contributions:view`.

## Upload flow

The V1 upload path is intentionally:

```
Browser -> API -> S3-compatible object storage
```

This is appropriate for the current file size limits and keeps validation and authorization centralized.

The service:

1. validates purpose, MIME type, and size;
2. computes SHA-256 metadata;
3. creates a random storage key;
4. creates the `MediaAsset` metadata record;
5. uploads bytes to object storage.

If object upload fails, the metadata row is removed best-effort.

Creating metadata before the object means a crash cannot leave an uploaded object with no database ownership record. At worst it can leave metadata for a missing object, which is detectable and repairable.

## Deletion / orphan prevention

Generic media deletion is allowed only after the asset has been detached from its owning entity.

The deletion flow:

1. confirm no Project main-image, Contribution receipt, Transparency document, Hero slide, or project-media association still references the asset;
2. delete the storage object;
3. delete the `MediaAsset` row.

This ordering prioritizes avoiding unmanaged objects in storage. If the second database step fails, the recoverable condition is stale metadata pointing to a missing object rather than an untracked binary.

Entity services must detach/replace media deliberately before requesting deletion.

## Admin upload endpoint

```
POST /api/admin/media
Content-Type: multipart/form-data

file=<binary>
purpose=PROJECT_IMAGE | HERO_IMAGE | TRANSPARENCY_DOCUMENT
projectId=<optional UUID>
```

The generic admin endpoint intentionally does **not** accept `RECEIPT`. Public contribution receipt submission will use the same `MediaService.storeReceipt` policy through the contribution flow in Issue #7.

## Required environment

```
S3_ENDPOINT=
S3_REGION=auto
S3_BUCKET=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_FORCE_PATH_STYLE=false
PUBLIC_MEDIA_BASE_URL=
MEDIA_SIGNED_URL_TTL_SECONDS=300
```

AWS IAM/default credential providers may be used by leaving both explicit access-key variables empty. Supplying only one credential variable is treated as a configuration error.
