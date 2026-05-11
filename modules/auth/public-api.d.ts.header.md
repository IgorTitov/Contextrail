---
fileId: contextrail-template:modules:auth:public-api.d
module: modules/auth
stability: evolving
steward: shared
api: file-local
hexLayer: application
boundedContext: auth
summary: Public Api.D implementation for the auth module.
owns: Public Api.D implementation within the auth module.
boundaries: Scoped to the auth module. Do not use outside this module boundary.
invariants: Must remain consistent with the auth module's port contracts.
notesForLLM: Part of the auth module. Access through public-api.mjs from outside the module.
linkedDocs: modules/auth/README.md
---

# public-api.d.ts
