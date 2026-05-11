---
fileId: contextrail-template:modules:retrieval:domain:chunker.d
module: modules/retrieval
stability: evolving
steward: shared
api: file-local
hexLayer: domain
boundedContext: retrieval
dependsOn: modules/retrieval/types.d.ts
owns: TypeScript declarations for all chunker.mjs exports; the mapping from option interfaces (from types.d.ts) to ChunkerPort return types for all four strategies.
boundaries: Must stay in exact sync with chunker.mjs exports; must not contain runtime logic; option interfaces must be imported from types.d.ts rather than declared here.
invariants: All five exports in chunker.mjs must have corresponding declarations accessible from this file; return types must reference ChunkerPort from types.d.ts.
risks: Declaring a factory with the wrong return type here silently hides type errors in callers; missing a new factory export breaks TS consumers without a compile error at the missing site.
notesForLLM: This is the .d.ts sidecar for chunker.mjs. Update whenever chunker.mjs gains or changes exports. Option interfaces (ChunkerOptions, RecursiveCharacterChunkerOptions, SentenceChunkerOptions, MarkdownChunkerOptions) and ChunkerPort all live in types.d.ts.
tests: _n/a_
specRefs:
  - TPL-088
  - TPL-099
  - TPL-100
  - TPL-101
  - TPL-102
related:
  - modules/retrieval/domain/chunker.mjs
  - modules/retrieval/types.d.ts
  - modules/retrieval/public-api.d.ts
allowedDependencies: modules/retrieval/types.d.ts
summary: Chunker.D implementation for the retrieval module.
forbiddenDependencies:
  - "../adapters/**"
  - "../di/**"
  - react
  - next
  - electron
  - express
  - fastify
  - vite
  - "node:*"
  - fs
  - path
  - "modules/<other>/**"
linkedDocs: modules/retrieval/domain/README.md
---

# chunker.d.ts
