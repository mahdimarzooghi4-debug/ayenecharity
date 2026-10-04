# SEO, accessibility and public performance baseline — V1

## Canonical public origin

Set `SITE_URL` to the production public origin, for example:

`SITE_URL=https://charity.example.org`

`NEXT_PUBLIC_SITE_URL` may be set to the same value for environments that explicitly expose the public origin to the web build. If neither is set, the web app falls back to `WEB_ORIGIN` and finally localhost for development.

The canonical origin is used by:

- metadataBase
- canonical links
- OpenGraph URLs
- sitemap.xml
- robots.txt

## Public metadata

The following public routes expose title, description, canonical and OpenGraph/Twitter metadata:

- `/`
- `/projects`
- `/projects/:slug`
- `/transparency`
- `/contact`

Project detail metadata is generated from the published Project title, description and image. Unavailable/non-public project metadata is marked noindex.

Admin routes remain noindex/nofollow both through the Admin layout and the `X-Robots-Tag` response header.

## Sitemap and robots

`/sitemap.xml` contains only routes implemented in the public V1 plus currently public Project slugs returned by the Public Projects API.

`/robots.txt` allows the public site and disallows:

- `/admin`
- `/admin/`
- `/api/`

## Accessibility baseline

Public pages use Persian RTL document semantics and one main content landmark with `id="main-content"`.

The Public shell provides a keyboard skip link. Interactive controls use visible `:focus-visible` states, and reduced-motion preferences disable non-essential smooth scrolling/transitions.

Navigation exposes `aria-current` for the active public route/contact action. The Hero slider uses native buttons and carousel-region semantics.

## Image performance

Public Hero and Project content images use `next/image` with responsive `sizes`, AVIF/WebP output, explicit dimensions or fill layout, and meaningful alt text.

Set `PUBLIC_MEDIA_BASE_URL` for the API and set `NEXT_PUBLIC_MEDIA_BASE_URL` to the same public media origin for the Next.js optimizer. The web image allow-list is derived from this origin.

Public object uploads already use:

`Cache-Control: public, max-age=31536000, immutable`

because storage keys are unique.

## Data caching

Public API reads in the web application use a 60-second Next.js revalidation window. Public pages also use `revalidate = 60`, giving V1 a short ISR/cache baseline while allowing CMS, Project, Transparency and Settings changes to appear without a full redeploy.

Admin routes remain `Cache-Control: no-store`.
