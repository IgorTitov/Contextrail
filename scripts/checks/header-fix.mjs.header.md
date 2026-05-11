---
fileId: contextrail-template:scripts:checks:header-fix
module: scripts/checks
stability: evolving
steward: shared
api: "CLI: node scripts/checks/header-fix.mjs [--changed] [--json]"
dependsOn:
  - scripts/checks/_shared.mjs
  - VERSION
  - package.json
summary: Add, upgrade, or repair structured header v2 blocks and sidecars for repository files while preserving canonical insertion order.
owns: Deterministic repair and upgrade of the repository header surface.
boundaries: This script repairs structure and safe carry-forward semantics. It does not pretend to infer perfect Purpose, Owns, Boundaries, or NotesForLLM.
invariants: Must preserve file validity, shebang position, markdown frontmatter position, and sidecar naming while normalizing to header v2.
risks: Overwriting real semantics would be worse than leaving a file for human review.
securityPrivacy: Local file writes only.
notesForLLM: Preserve good existing semantics when possible, but always stamp the current repository version into the version line.
tests: scripts/checks/header-check.mjs
linkedDocs:
  - .claude/skills/header-sidecar/SKILL.md
  - .claude/agents/header-guardian.md
related:
  - scripts/checks/_shared.mjs
  - scripts/checks/header-create.mjs
  - scripts/checks/header-check.mjs
---

# header-fix.mjs
