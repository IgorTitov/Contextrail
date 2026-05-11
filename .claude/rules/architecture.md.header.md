---
fileId: contextrail-template:.claude:rules:architecture
module: .claude/rules
stability: evolving
steward: shared
api: Topic rule document
dependsOn:
  - .claude/CLAUDE.md
  - .claude/skills/hex-boundary/SKILL.md
  - .claude/rules/development.md
  - scripts/checks/delivery-flow-check.mjs
summary: Capture the short repository-local architecture rules that keep bounded modules, explicit seams, and LLM-friendly structure intact.
owns: The short architecture rule set for module boundaries, explicit seams, and LLM-friendly code shape.
boundaries: This file states concise architecture rules only. It must not become a full architecture handbook or duplicate the detailed skills that implement these rules.
invariants: Rules stay short, operational, and aligned with actual repo boundary checks and delivery habits.
risks: Drift here can normalize deep imports, leaky layers, diffuse responsibilities, scattered selector strings, hardcoded user-facing copy, or code shapes that are hard for humans and LLMs to reason about.
securityPrivacy: Documentation content only; avoid embedding secrets or credentials.
notesForLLM: Read this rule file when structural constraints matter. Keep edits crisp, enforceable, and consistent with actual boundary checks.
tests:
  - node scripts/checks/delivery-flow-check.mjs
  - manual review during structural changes
  - node scripts/checks/design-docs-check.mjs
  - tests/contract/ui-selector-registry-contract.test.mjs
linkedDocs:
  - .claude/CLAUDE.md
  - .claude/skills/hex-boundary/SKILL.md
related:
  - .claude/agents/hex-architect.md
  - .claude/agents/repo-architect.md
  - .claude/skills/feature-delivery/SKILL.md
  - .claude/skills/frontend-delivery/SKILL.md
---

# architecture.md
