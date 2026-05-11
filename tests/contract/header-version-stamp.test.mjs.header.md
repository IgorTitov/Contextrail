---
fileId: contextrail-template:tests:contract:header-version-stamp-test
module: tests/contract
stability: evolving
steward: shared
api: node:test spec
dependsOn:
  - node:test
  - node:assert/strict
  - node:fs
  - scripts/checks/_shared.mjs
  - docs/adr/0002-trunk-based-delivery.md
summary: Prove that header creation and repair stamp the current repository version rather than preserving file-local pseudo-version values.
owns: Contract proof for repository-version stamping across header creation and header-fix-style normalization.
boundaries: This file is a contract spec only. Keep it deterministic and focused on version-stamp semantics.
invariants: Assertions remain local-only and fail when header tooling reverts to file-local pseudo-version stamping.
risks: If this spec weakens, the repository can silently reintroduce misleading header version lines.
securityPrivacy: Local test code only; avoid secrets and network access.
notesForLLM: Keep assertions narrow and semantic. This spec should fail when create or repair paths stop stamping the current repository version.
tests: pnpm test:contract
linkedDocs:
  - tests/contract/README.md
  - .claude/skills/header-sidecar/SKILL.md
related:
  - scripts/checks/_shared.mjs
  - scripts/checks/header-create.mjs
  - scripts/checks/header-fix.mjs
---

# header-version-stamp.test.mjs
