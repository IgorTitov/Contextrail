---
fileId: contextrail-template:docs:guides:server-adapters
module: docs/guides
stability: evolving
steward: shared
api: Documentation
summary: Guide for wiring server-side hex adapters in Node.js applications.
owns: Server-side adapter wiring examples for auth, cache, db, realtime, tenancy, log modules.
boundaries: Covers adapter wiring patterns only. Does not document adapter internals or port contracts.
invariants: Import paths must reference public-api.mjs, never adapter files directly.
risks: Stale factory signatures if adapter APIs change. Verify against actual public-api exports.
securityPrivacy: No secrets. Example code uses placeholder connection strings.
notesForLLM: When adding new server-side adapters, add a wiring example here.
related:
  - docs/guides/server-deployment.md
  - docs/guides/getting-started.md
---

# server-adapters.md
