---
fileId: contextrail-template:scripts:checks:header-create
module: scripts/checks
stability: evolving
steward: shared
api: "CLI: node scripts/checks/header-create.mjs <file1> <file2> ... [--json]"
dependsOn:
  - scripts/checks/_shared.mjs
  - VERSION
  - package.json
summary: Create structured header v2 blocks or <file>.header.md sidecars for explicitly listed files.
owns: Explicit header creation for listed files.
boundaries: This script creates structure only. It does not try to infer all file semantics perfectly.
invariants: Must preserve file validity, sidecar naming, and shebang position.
risks: Overconfident auto-generated semantics would mislead future agents.
securityPrivacy: Local file writes only.
notesForLLM: Keep generation deterministic and conservative. Stamp the current repository version, not a file-local pseudo-version.
tests: scripts/checks/header-check.mjs
linkedDocs: .claude/skills/header-sidecar/SKILL.md
related:
  - scripts/checks/header-fix.mjs
  - scripts/checks/header-check.mjs
---

# header-create.mjs
