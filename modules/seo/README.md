<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Overview and navigation guide for the seo hex module.
@sidecar README.md.header.md
@layer module | @hex _none_ | @ctx seo
@public false
@edit careful -->

# seo

Hexagonal SEO module — pure meta-tag descriptor with safe HTML attribute escaping, pure `sitemap.xml` renderer per the sitemaps.org protocol with XML entity escaping, pure `robots.txt` renderer with rule ordering and sitemap footer, a `SeoPublisherPort` for publishing the rendered assets, and an in-memory adapter for tests and dev. Zero external dependencies and zero Node builtins.

## Why

SEO is a TOP-100 starter staple that most templates either hard-wire into a framework plugin (Next.js metadata, Nuxt SEO, Astro SEO) or skip entirely. When the rendering pipeline, CDN, or framework changes, every caller has to change with it. This module keeps meta-tag / sitemap / robots generation as a pure domain that returns strings (never touches `document.head`, `fs`, or any publisher), wraps publishing behind a 4-method `SeoPublisherPort`, and ships a zero-dependency in-memory adapter. Real deployments plug a filesystem-, S3-, or CDN-upload adapter behind the same port without touching the renderers.

The renderers escape every user-controlled value — meta attribute values, sitemap `<loc>` URLs, and anything that could otherwise break the output — so titles, descriptions, and canonical URLs from user input cannot inject HTML or malformed XML into the emitted documents.

## Structure

```text
modules/seo/
├── domain/
│   ├── meta-tags.mjs              # createMetaTags + renderMetaTagsHtml + escapeAttribute
│   ├── sitemap.mjs                # createSitemap + renderSitemapXml + escapeXml
│   └── robots.mjs                 # createRobotsTxt + renderRobotsTxt
├── ports/
│   └── seo-publisher-port.mjs     # SeoPublisherPort + assertSeoPublisherPort
├── adapters/
│   └── memory-seo-publisher.mjs   # In-memory Map-backed publisher (tests + api-starter demo)
├── public-api.mjs                 # Cross-module entry point
├── messages.mjs                   # i18n keys (seo.*)
├── manifest.json                  # Module metadata + capability surface
└── README.md
```

## Hexagonal layers

| Layer        | Folder           | Rule                                                                |
| ------------ | ---------------- | ------------------------------------------------------------------- |
| **Domain**   | `domain/`        | Pure functions, no I/O, no framework imports.                       |
| **Ports**    | `ports/`         | `SeoPublisherPort` contract (4 methods)                             |
| **Adapters** | `adapters/`      | In-memory publisher (defensive copies, injectable clock).           |
| **Public**   | `public-api.mjs` | The only file other modules may import.                             |

## Usage

### Render meta tags for a page

```javascript
import { createMetaTags, renderMetaTagsHtml } from './modules/seo/public-api.mjs';

const meta = createMetaTags({
  title: 'Contextrail Starter — Home',
  description: 'Hexagonal starter with 38 modules and zero dependencies.',
  canonical: 'https://example.com/',
  openGraph: {
    title: 'Contextrail Starter',
    description: 'Hexagonal starter for AI-assisted teams.',
    image: 'https://example.com/og.png',
    url: 'https://example.com/',
    type: 'website',
  },
  twitter: { card: 'summary_large_image', site: '@contextrail' },
});

const html = renderMetaTagsHtml(meta);
// → <title>Contextrail Starter — Home</title>
//   <meta name="description" content="…">
//   <link rel="canonical" href="https://example.com/">
//   <meta property="og:title" content="…">
//   …
```

### Render a sitemap.xml

```javascript
import { createSitemap, renderSitemapXml } from './modules/seo/public-api.mjs';

const sitemap = createSitemap({
  urls: [
    { loc: 'https://example.com/', lastmod: '2026-04-09', changefreq: 'daily', priority: 1.0 },
    { loc: 'https://example.com/about', changefreq: 'monthly', priority: 0.5 },
  ],
});
const xml = renderSitemapXml(sitemap);
```

### Render a robots.txt

```javascript
import { createRobotsTxt, renderRobotsTxt } from './modules/seo/public-api.mjs';

const robots = createRobotsTxt({
  rules: [
    { userAgent: '*', disallow: ['/admin/', '/private/'] },
    { userAgent: 'Googlebot', allow: ['/public/'] },
  ],
  sitemaps: ['https://example.com/sitemap.xml'],
});
const txt = renderRobotsTxt(robots);
```

## Rules

- Domain is pure. No `document`, no `window`, no `fs`, no framework imports.
- Every rendered attribute or XML text value is escaped at the boundary.
- Adapters validate every input through the pure domain before publishing.
- Cross-module consumers import from `public-api.mjs` only. Deep imports are forbidden.
- All user-facing copy uses i18n keys via `messages.mjs`.

## Tests

- `tests/unit/seo.test.mjs` — proves meta tag validation + escaped rendering, sitemap XML validation + rendering, robots rule ordering + rendering, port assertion, memory adapter lifecycle.
- `tests/contract/seo-hex-contract.test.mjs` — proves the hex folder structure and public-api surface.
