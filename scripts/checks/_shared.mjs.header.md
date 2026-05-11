---
fileId: contextrail-template:scripts:checks:_shared
module: scripts/checks
stability: evolving
steward: shared
api: Shared functions for scripts/checks/*.mjs
dependsOn:
  - scripts/lib/fs-helpers.mjs
  - scripts/lib/cli-helpers.mjs
  - scripts/lib/output.mjs
  - scripts/lib/trace-helpers.mjs
  - scripts/lib/repo-meta.mjs
  - scripts/lib/header.mjs
summary: Re-export facade so existing scripts keep a single import path while actual implementations live in scripts/lib/.
owns: The single-import facade for deterministic repo scripts in scripts/checks/.
boundaries: This file re-exports only. It must not contain implementation code.
invariants: Every public symbol from scripts/lib/ that scripts/checks/*.mjs consumers need must be re-exported here for backward compatibility.
risks: Missing a re-export breaks consumers that import from this facade.
securityPrivacy: Re-exports only; no direct filesystem or network access.
notesForLLM: This is a pure facade. Add new implementation to the appropriate scripts/lib/ module, then re-export here if needed.
tests:
  - tests/unit/shared-helpers.test.mjs
  - tests/contract/header-warning-signal.test.mjs
  - tests/contract/header-version-stamp.test.mjs
linkedDocs:
  - scripts/lib/README.md
  - .claude/skills/header-sidecar/SKILL.md
related:
  - scripts/lib/header.mjs
  - scripts/lib/fs-helpers.mjs
  - scripts/lib/cli-helpers.mjs
  - scripts/lib/output.mjs
  - scripts/lib/trace-helpers.mjs
  - scripts/lib/repo-meta.mjs
---

# _shared.mjs
