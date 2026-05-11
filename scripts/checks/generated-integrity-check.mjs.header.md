---
fileId: contextrail-template:scripts:checks:generated-integrity-check
module: scripts/checks
stability: evolving
steward: shared
api: "CLI: node scripts/checks/generated-integrity-check.mjs [--update|--check|--json]"
dependsOn:
  - node:crypto
  - node:fs
  - node:path
summary: SHA-256 hash verification for generated files.
owns: Hash storage in docs/_generated/.integrity.json and verification against current file content.
boundaries: Tracks only files under docs/_generated/. Does not auto-regenerate files.
invariants: Hash algorithm must stay SHA-256. Integrity file path must stay docs/_generated/.integrity.json.
risks: Stale hashes if generated files are updated without running --update.
securityPrivacy: Local filesystem only. Hashes are not security-sensitive.
notesForLLM: Run --update after regenerating files. Run --check in CI to catch uncommitted regeneration.
related:
  - docs/_generated/dependency-graph.json
  - scripts/checks/dependency-graph.mjs
---

# generated-integrity-check.mjs
