---
fileId: contextrail-template:modules:prerender:adapters:memory-static-output
module: modules/prerender
stability: experimental
steward: prerender-module
api: Adapter
boundedContext: prerender
summary: In-memory StaticOutputPort adapter — Map-backed store for rendered HTML keyed by path.
owns: createMemoryStaticOutput.
boundaries: Adapter only. Backs a deterministic fake for tests, local dev, and the api-starter demo.
invariants: Satisfies StaticOutputPort. Exposes adapter-specific get(path) helper for readback. Defensive record clones.
specRefs:
  - TPL-001
---

# memory-static-output.mjs
