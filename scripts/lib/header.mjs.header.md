---
fileId: contextrail-template:scripts:lib:header
module: scripts/lib
stability: evolving
steward: shared
api: Header v2 engine for scripts
dependsOn:
  - node:path
  - node:child_process
  - scripts/lib/fs-helpers.mjs
  - scripts/lib/output.mjs
  - scripts/lib/repo-meta.mjs
summary: Header v2 engine — schema constants, comment-style decisions, file discovery, regex, parsing, rendering, injection, and validation for structured inline and sidecar headers.
owns: The canonical header v2 schema, parser, renderer, file selection, insertion-order rules, and validation for deterministic repo scripts.
boundaries: This file defines header mechanics only. No CLI parsing, output formatting, trace parsing, or script-specific business logic.
invariants: Marker names stay exact; sidecar naming stays <file>.header.md; shebang lines stay first; markdown frontmatter stays before headers; parsing stays deterministic; enum validation stays centralized.
risks: Marker drift, shebang breakage, duplicate headers, or inconsistent enum handling will break multiple repo scripts at once.
securityPrivacy: Local filesystem and git-only helpers; no network access.
notesForLLM: Preserve exact markers and deterministic placement behavior. This is the canonical header engine extracted from _shared.mjs.
tests:
  - tests/unit/shared-helpers.test.mjs
  - tests/contract/header-warning-signal.test.mjs
  - tests/contract/header-version-stamp.test.mjs
  - tests/contract/header-sidecar-contract.test.mjs
linkedDocs:
  - .claude/skills/header-sidecar/SKILL.md
  - .claude/agents/header-guardian.md
  - scripts/lib/README.md
related:
  - scripts/checks/_shared.mjs
  - scripts/checks/header-create.mjs
  - scripts/checks/header-check.mjs
  - scripts/checks/header-fix.mjs
---

# header.mjs
