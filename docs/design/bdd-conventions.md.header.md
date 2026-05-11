---
fileId: contextrail-template:docs:design:bdd-conventions
module: docs/design
stability: evolving
steward: shared
api: Documentation
dependsOn:
  - .claude/rules/testing.md
  - docs/design/design-system.md
  - docs/context-loading-protocol.md
summary: Modular BDD conventions aligned with COA — file layout, scenario isolation, selector registry, test data builders, and anti-patterns.
owns: The full rationale and patterns for modular, non-brittle BDD tests in this template.
boundaries: This file is a design guide only. Concise enforceable rules live in .claude/rules/testing.md.
invariants: Conventions must stay aligned with the COA token budget, hex module boundaries, and the ui-selectors registry pattern.
risks: Drift between this guide and the actual test structure can normalize brittle BDD tests.
securityPrivacy: Documentation content only; avoid embedding secrets or credentials.
notesForLLM: Read this before writing or reviewing BDD tests. It explains the structural conventions that keep tests modular, COA-compatible, and non-brittle.
tests:
  - pnpm test:bdd
  - pnpm test:e2e:smoke
linkedDocs:
  - .claude/rules/testing.md
  - .claude/skills/bdd-playwright/SKILL.md
  - docs/design/design-system.md
  - docs/context-loading-protocol.md
related:
  - tests/bdd/features/example-greeter.feature
  - tests/bdd/example-greeter.test.mjs
  - apps/starter/ui-selectors.mjs
---

# bdd-conventions.md
