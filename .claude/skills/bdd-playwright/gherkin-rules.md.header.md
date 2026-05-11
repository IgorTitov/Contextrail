---
fileId: contextrail-template:.claude:skills:bdd-playwright:gherkin-rules
module: .claude/skills/bdd-playwright
stability: evolving
steward: shared
api: Reference doc
dependsOn:
  - .claude/skills/bdd-playwright/SKILL.md
  - tests/bdd/features/template.feature
summary: Capture the local Gherkin-writing rules that keep user-facing scenarios stable, reusable, and business-oriented.
owns: The local rule reference for writing stable and business-readable Gherkin scenarios.
boundaries: This file captures concise scenario-writing rules only. It must not turn into a full BDD handbook or duplicate the skill workflow.
invariants: Rules stay short, scenario-focused, and aligned with the repository’s current feature-file expectations.
risks: Drift here can normalize brittle steps, implementation-heavy scenarios, or weak behavior framing.
securityPrivacy: Documentation content only; avoid embedding secrets or private credentials.
notesForLLM: Use this file when writing or revising scenarios. Keep the rules concise and behavior-oriented.
tests: Manual review against current feature files and skill usage
linkedDocs: .claude/CLAUDE.md
related:
  - .claude/skills/bdd-playwright/SKILL.md
  - tests/bdd/features/template.feature
---

# gherkin-rules.md
