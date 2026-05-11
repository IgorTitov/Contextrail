---
fileId: contextrail-template:docs:guides:prompt-injection-defense
module: docs/guides
stability: evolving
steward: shared
api: Documentation
summary: Threat model and defense guide for indirect prompt injection in AI-assisted repositories
owns: Prompt injection threat model, instruction surface map, built-in protection catalog, and extension guidance for downstream users
boundaries: Documents existing protections and guidance only; does not implement new security mechanisms
invariants: Must stay aligned with the security audit §8 findings and the actual protection scripts referenced
notesForLLM: This guide is for downstream template users, not template maintainers. Keep the tone practical and reference files by path so readers can find them.
linkedDocs:
  - docs/analysis/security-audit-v0.5.2.md
  - scripts/checks/instruction-integrity-check.mjs
  - scripts/agent-contract/check.mjs
  - .github/CODEOWNERS
related:
  - .claude/hooks/run-dangerous-command-blocker.mjs
  - .claude/settings.json
  - docs/agent-contract/compatibility-contract.json
---

# prompt-injection-defense.md
