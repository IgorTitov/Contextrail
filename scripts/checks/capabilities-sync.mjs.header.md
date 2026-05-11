---
fileId: contextrail-template:scripts:checks:capabilities-sync
module: scripts/checks
stability: evolving
steward: shared
api: "CLI: node scripts/checks/capabilities-sync.mjs [--check] [--json]"
dependsOn:
  - scripts/checks/_shared.mjs
  - scripts/checks/lib/jsdoc-typedef-parser.mjs
  - modules/cache/ports/cache-port.mjs
  - modules/cache/manifest.json
summary: Generate the capabilities block in module manifests from JSDoc @typedef sources; TPL-179 pilot covers the cache module only.
owns: The cache-module capabilities-block generator and its --check drift detector.
boundaries: Pilot scope is the cache module. Other modules land in TPL-180+. No --fix mode; default invocation writes the manifest, --check is read-only.
invariants: Pure extraction, zero external dependencies, deterministic output, idempotent second run, no code execution or network I/O.
risks: Drift in the parser or serializer would produce false positives in --check and block commits.
securityPrivacy: Local filesystem reads and a single manifest write; no secrets, no network.
notesForLLM: Extend via TPL-180 (types.d.ts source), TPL-181/182 (knowledge-graph backfills), TPL-183 (PARTIAL ports). Do NOT add a --fix mode — regeneration runs explicitly.
specRefs:
  - TPL-179
  - TPL-178
tests:
  - tests/unit/capabilities-sync.test.mjs
  - tests/unit/jsdoc-typedef-parser.test.mjs
linkedDocs:
  - docs/prd/manifest-capabilities.md
  - docs/backlog/manifest-capabilities.md
  - docs/adr/0010-manifest-capabilities.md
related:
  - scripts/checks/spec-sync.mjs
  - scripts/checks/dependency-graph.mjs
  - scripts/checks/lib/jsdoc-typedef-parser.mjs
---

# capabilities-sync.mjs
