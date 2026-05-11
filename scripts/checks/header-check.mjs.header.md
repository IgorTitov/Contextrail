---
fileId: contextrail-template:scripts:checks:header-check
module: scripts/checks
stability: evolving
steward: shared
api: "CLI: node scripts/checks/header-check.mjs [--changed] [--json]"
dependsOn: scripts/checks/_shared.mjs
summary: Validate structured header v2 presence, canonical placement, schema consistency, and minimum semantic quality.
owns: Deterministic validation of structured headers, sidecars, placement rules, and minimum schema quality.
boundaries: This script validates. It does not author rich semantic content, silently rewrite files, or replace the repo traceability checks.
invariants: Every meaningful file has one header only; markdown frontmatter stays before the header; FileId stays in the repo namespace; legacy markers do not survive.
risks: Weak validation lets bad headers through; overly broad validation can create noisy failures and slow routine work.
securityPrivacy: Reads local files only.
notesForLLM: Keep checks crisp and actionable. Fail on structural contradictions, not on style preferences, and avoid duplicating traceability warnings already owned elsewhere.
tests:
  - Used directly in agent hooks and commit workflow
  - tests/contract/header-warning-signal.test.mjs
linkedDocs:
  - .claude/agents/header-guardian.md
  - .claude/skills/header-sidecar/SKILL.md
  - scripts/checks/spec-check.mjs
related:
  - scripts/checks/_shared.mjs
  - scripts/checks/header-fix.mjs
  - scripts/checks/header-create.mjs
  - scripts/checks/spec-check.mjs
---

# header-check.mjs
