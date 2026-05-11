---
fileId: contextrail-template:docs:adr:0015-test-isolation-enforcement:md
module: docs/adr
stability: stable
steward: shared
api: Documentation
summary: ADR-0015 — Defense-in-depth test isolation enforcement (R1) closing the Zvenix incident vector with static check, runtime guard, pre-commit gate, and sanctioned safeGit helper.
linkedDocs:
  - docs/adr/README.md
  - docs/adr/0008-inter-agent-coordination-protocol.md
  - docs/adr/0014-per-file-version-semantics.md
  - scripts/checks/test-isolation-check.mjs
  - tests/_setup/no-live-git.mjs
  - tests/_setup/safe-git.mjs
related:
  - .githooks/pre-commit
  - .claims/config.json
generated: false
---

# 0015-test-isolation-enforcement.md
