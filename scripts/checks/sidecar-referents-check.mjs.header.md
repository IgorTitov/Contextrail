---
fileId: contextrail-template:scripts:checks:sidecar-referents-check
stability: evolving
steward: shared
summary: Pre-commit Phase 6 advisory gate verifying sidecar fileId/tests/module referents resolve. Defends F9 metadata hallucination.
owns: Sidecar referent integrity verification (advisory mode).
boundaries: Read-only walker over *.header.md sparse YAML; never mutates sidecars. Sidecar shape validity is owned by header-check, not this rule.
invariants: Exit 0 unless COA_OPERATOR_PROMOTE_SIDECAR_CHECK=1 and warnings > 0. Frontmatter parsing is regex-based per ADR-0009, not a YAML library.
risks: Drift if canonical fileId derivation changes without updating deriveFileIdAlternates(); over-trigger on non-path tests entries (mitigated by command-prefix skip).
notesForLLM: Both dot-preserving and dot-stripping fileId forms are accepted (committed corpus uses both). Tests entries that look like commands (start with "node ", "pnpm ", or contain spaces) are skipped — only path-shaped entries are existence-checked.
tests:
  - tests/integration/sidecar-referents-check.test.mjs
linkedDocs:
  - docs/adr/0042-sidecar-referents-check.md
  - docs/rules-registry.md
related:
  - scripts/checks/test-deletion-guard.mjs
  - scripts/checks/header-check.mjs
---

# sidecar-referents-check.mjs
