---
fileId: contextrail-template:modules:retrieval:public-api.d
module: modules/retrieval
stability: evolving
steward: shared
api: module-public
hexLayer: application
boundedContext: retrieval
dependsOn:
  - modules/retrieval/types.d.ts
  - modules/retrieval/ports/chunker-port.d.ts
owns: TypeScript type declarations for the full retrieval module public surface, mirroring every export of public-api.mjs.
boundaries: Must stay in exact sync with public-api.mjs exports; must not add new type definitions that belong in types.d.ts; must not expose internal symbols not present in public-api.mjs.
invariants: Every runtime export in public-api.mjs must have a matching type declaration accessible from this file; factory return types must reference ChunkerPort from types.d.ts.
risks: Any drift from public-api.mjs removes TypeScript type coverage for that symbol in all consuming modules without a runtime warning.
notesForLLM: This is the .d.ts sidecar for public-api.mjs. Update whenever public-api.mjs gains or loses exports. All interface types delegate to types.d.ts; assertChunkerPort re-exports from ports/chunker-port.js; the four chunker factories are declared inline here using import() references into types.js.
tests: _n/a_
linkedDocs: docs/prd/retrieval.md
specRefs:
  - TPL-087
  - TPL-092
  - TPL-098
  - TPL-099
  - TPL-100
  - TPL-101
  - TPL-102
related:
  - modules/retrieval/public-api.mjs
  - modules/retrieval/types.d.ts
  - modules/retrieval/ports/chunker-port.d.ts
  - modules/retrieval/domain/chunker.d.ts
allowedDependencies:
  - modules/retrieval/types.d.ts
  - modules/retrieval/ports/chunker-port.d.ts
summary: Public Api.D implementation for the retrieval module.
---

# public-api.d.ts
