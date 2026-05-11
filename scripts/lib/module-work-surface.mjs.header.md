---
fileId: contextrail-template:scripts:lib:module-work-surface
module: scripts/lib
stability: evolving
steward: shared
api: Shared module work-surface computation for scripts
dependsOn:
  - node:fs
  - node:path
  - node:url
summary: Single source of truth for computing a COA module's work-surface token cost (manifest + public API + sidecars + representative impl + representative test).
owns: File discovery rules and token-counting logic for the module work surface; consumed by module-fit-check.mjs (enforcement) and agent-context.mjs (briefer, TPL-292).
boundaries: Computation only — no CLI arg parsing, no threshold comparisons, no report writing.
invariants: Token count uses ceil(bytes/4) convention matching SYSTEM_MAP.md. ROOT resolves two levels above this file (scripts/lib -> scripts -> repo root).
risks: Changes here affect both the enforcement gate (module-fit-check) and the briefer context budget. Run pnpm modules:fit-report before and after to verify byte-identical output.
securityPrivacy: Local filesystem only; no network access.
notesForLLM: This library is the extraction target of TPL-291. TPL-292 adds consumption from agent-context.mjs. Do not add CLI or threshold logic here.
tests: tests/unit/module-fit-check.test.mjs (exercises via re-exports from module-fit-check.mjs)
linkedDocs: scripts/lib/README.md
related:
  - scripts/checks/module-fit-check.mjs
  - scripts/agent-context.mjs
  - docs/adr/0013-module-work-surface-budget.md
  - docs/adr/0028-slice-aware-context-briefing.md
---

# module-work-surface.mjs
