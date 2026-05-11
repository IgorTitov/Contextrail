<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Overview and navigation guide for the prerender hex module.
@sidecar README.md.header.md
@layer module | @hex _none_ | @ctx prerender
@public false
@edit careful -->

# prerender

Hexagonal prerender module — a pure, zero-dependency SSG (static site generation) primitive. A validated `RouteManifest` lists the paths to prerender, a `PrerenderPlan` binds the manifest to an absolute base URL, a `RenderFunctionPort` typedef describes the pluggable render callable, a `StaticOutputPort` abstracts where the rendered HTML lands, and a sequential runner stitches the two together — walking the plan, invoking the render function per route, wrapping the result in a validated `RenderResult`, and writing it to the output sink. Zero external dependencies and framework-agnostic.

## Why

Most starter templates conflate "static site generation" with "a specific framework's static-site generator" — Next.js `next export`, Nuxt `nuxt generate`, Gatsby's build, Astro's static adapter. That couples the static-rendering concern to a huge dependency tree, pulls in a router, a template engine, a build tool, and a production HTTP server, and leaves downstream adopters with no clean seam between "I want to prerender these routes" and "I want to do so with Framework X".

This module proves that the prerender concern is small enough to live behind one tiny hex contract. The pure domain only knows how to validate routes, resolve a base URL, and model a render result. The `RenderFunctionPort` is a single typedef — callers pass any `(path, context) => { html, status?, headers? }` callable, including one that invokes their own server's router (as `apps/api-starter` does for its demo route). The `StaticOutputPort` keeps the persistence concern at the adapter edge — memory for tests, filesystem for a build, CDN for an edge deploy — without the domain importing any of those. Real deployments plug in a React/Vue/template-engine-backed render function and a filesystem-backed output adapter while reusing the same runner + plan shape.

Put differently: **hex modules work in static generation**. That is the architectural proof this module ships.

## Structure

```text
modules/prerender/
├── domain/
│   ├── route-manifest.mjs         # createRouteManifest + isRouteManifest
│   ├── render-result.mjs          # createRenderResult
│   └── prerender-plan.mjs         # createPrerenderPlan + planToTargets
├── ports/
│   ├── render-function-port.mjs   # RenderFunctionPort typedef + assertRenderFunction
│   └── static-output-port.mjs     # StaticOutputPort + assertStaticOutputPort
├── adapters/
│   ├── memory-static-output.mjs       # Map-backed in-memory output
│   └── sequential-prerender-runner.mjs # Walks plan, invokes renderFn, writes to output
├── public-api.mjs                 # Cross-module entry point
├── messages.mjs                   # i18n keys (prerender.*)
├── manifest.json                  # Module metadata + capability surface
└── README.md
```

## Hexagonal layers

| Layer        | Folder           | Rule                                                                          |
| ------------ | ---------------- | ----------------------------------------------------------------------------- |
| **Domain**   | `domain/`        | Pure value objects. No I/O, no transport, no framework, no `node:*` imports.  |
| **Ports**    | `ports/`         | `RenderFunctionPort` (function typedef) + `StaticOutputPort` (struct, 3 methods). |
| **Adapters** | `adapters/`      | Sequential runner + in-memory output sink. Filesystem / CDN / S3 adapters live in consumer code. |
| **Public**   | `public-api.mjs` | The only file other modules may import.                                       |

## Usage

### Declare a manifest, bind a plan, walk it

```javascript
import {
  createRouteManifest,
  createPrerenderPlan,
  createMemoryStaticOutput,
  createSequentialPrerenderRunner,
} from './modules/prerender/public-api.mjs';

const manifest = createRouteManifest({
  routes: [
    { path: '/', title: 'Home' },
    { path: '/about', title: 'About' },
    { path: '/contact', title: 'Contact' },
  ],
});

const plan = createPrerenderPlan({
  manifest,
  baseUrl: 'https://example.com',
});

const output = createMemoryStaticOutput();

const runner = createSequentialPrerenderRunner({
  renderFn: async (path) => ({
    html: `<!doctype html><title>${path}</title><h1>${path}</h1>`,
  }),
  output,
});

const summary = await runner.run(plan);
// summary.rendered === [{ path: '/', status: 200, size: ... }, ...]
// summary.failed   === []
// summary.durationMs >= 0

output.get('/');
// → '<!doctype html><title>/</title><h1>/</h1>'
```

### Failure handling — one broken route does not abort the run

```javascript
const runner = createSequentialPrerenderRunner({
  renderFn: async (path) => {
    if (path === '/broken') throw new Error('template missing');
    return { html: `<title>${path}</title>` };
  },
  output: createMemoryStaticOutput(),
});

const summary = await runner.run(plan);
// summary.rendered.length === 2
// summary.failed          === [{ path: '/broken', error: 'template missing' }]
```

## Rules

- Domain is pure. No transport, no framework, no `node:*` imports.
- `RenderFunctionPort` is a typedef — adapters are bare functions. Everything structured lives in the result shape (`createRenderResult`).
- The runner never throws for route-level failures; failures land in `summary.failed`.
- Cross-module consumers import from `public-api.mjs` only. Deep imports are forbidden.
- All user-facing copy uses i18n keys via `messages.mjs`.

## Tests

- `tests/unit/prerender.test.mjs` — proves manifest validation (path rules, duplicates, title/meta shape), result validation (status range, headers shape), plan base-URL rules, `planToTargets` projection, runner happy path with multiple routes, runner error aggregation (one failing route does not abort), and the memory output adapter lifecycle.
- `tests/contract/prerender-hex-contract.test.mjs` — proves the hex folder structure and public-api surface.
