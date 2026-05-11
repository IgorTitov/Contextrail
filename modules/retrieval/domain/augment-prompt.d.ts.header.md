---
fileId: contextrail-template:modules:retrieval:domain:augment-prompt.d
module: modules/retrieval
stability: evolving
steward: shared
api: file-local
hexLayer: domain
boundedContext: retrieval
owns: TypeScript declaration for createAugmentPrompt, mirroring augment-prompt.mjs exports.
boundaries: Must stay in sync with augment-prompt.mjs exports; must not add logic.
invariants: Must export createAugmentPrompt with the same signature as types.d.ts.
risks: Signature drift from augment-prompt.mjs silently breaks TypeScript consumers.
notesForLLM: This is the .d.ts sidecar for augment-prompt.mjs. Update only when augment-prompt.mjs exports change.
tests: _n/a_
specRefs: TPL-091
related:
  - modules/retrieval/domain/augment-prompt.mjs
  - modules/retrieval/types.d.ts
summary: Augment Prompt.D implementation for the retrieval module.
allowedDependencies:
  - ./
  - "../ports/*"
  - "../types.*"
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

# augment-prompt.d.ts
