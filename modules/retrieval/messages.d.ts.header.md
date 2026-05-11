---
fileId: contextrail-template:modules:retrieval:messages.d
module: modules/retrieval
stability: evolving
steward: shared
api: file-local
boundedContext: retrieval
owns: TypeScript declarations for messages.mjs exported functions.
boundaries: Must stay in sync with messages.mjs exports; must not add logic or constants.
invariants: Function signatures must match messages.mjs exactly.
risks: Signature drift from messages.mjs silently breaks TypeScript consumers.
notesForLLM: This is the .d.ts sidecar for messages.mjs. Update only when messages.mjs signatures change.
specRefs: TPL-087
related: modules/retrieval/messages.mjs
summary: Messages.D implementation for the retrieval module.
linkedDocs: modules/retrieval/README.md
---

# messages.d.ts
