---
fileId: contextrail-template:scripts:checks:instruction-integrity-check
module: scripts/checks
stability: stable
steward: shared
api: "CLI: node scripts/checks/instruction-integrity-check.mjs [--json]"
dependsOn:
  - node:fs/promises
  - node:path
summary: Validate instruction-layer integrity — settings.json safety, hook existence, and adapter sync anchors.
owns: CI and pre-commit gate for instruction-layer tampering detection.
boundaries: Reads control-plane files; never writes or modifies them.
invariants: Exit 0 only when all three checks pass; exit 1 with clear per-check error messages on any failure.
risks: If this gate is removed from CI, control-plane drift or permission escalation could go undetected.
securityPrivacy: Reads local files only; no network access. Validates that no wildcard shell permissions are granted.
notesForLLM: Pure validation script. Exported functions (checkPermissions, checkHookExists, checkAnchor) are testable without filesystem access.
tests: tests/unit/instruction-integrity-check.test.mjs
linkedDocs:
  - .claude/CLAUDE.md
  - docs/agent-contract/compatibility-contract.json
related:
  - .claude/settings.json
  - .githooks/pre-commit
  - AGENTS.md
  - .cursorrules
  - .agents/README.md
  - .github/CODEOWNERS
---

# instruction-integrity-check.mjs
