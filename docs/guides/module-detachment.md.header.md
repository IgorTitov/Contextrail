---
fileId: contextrail-template:docs:guides:module-detachment
module: docs/guides
stability: evolving
steward: shared
api: Documentation
summary: Guide operators through safely removing unused hex modules from the template using scripts/detach-module.mjs, covering prerequisite checks, CLI flags, dependency order, and manual follow-up steps.
owns: Step-by-step operator guide for safely removing unused hex modules using scripts/detach-module.mjs.
boundaries: Must not duplicate manifest.json schema details owned by individual module README files; must not automate decisions that require manual application-layer follow-up.
invariants: The dependency graph section must stay aligned with the real cross-module dependencies declared in each module's manifest.json; CLI flags documented here must match the actual script interface.
risks: If the module dependency graph changes and this guide is not updated, operators may attempt detachments in an unsafe order and break cross-module imports silently.
notesForLLM: "The guide describes a destructive but reversible operation (git checkout recovers files). The key constraint is dependency order: dependents must be removed before dependencies. The --dry-run flag is always safe."
linkedDocs:
  - scripts/detach-module.mjs
  - docs/adr/0005-js-jsdoc-over-typescript.md
specRefs: TPL-132
related:
  - scripts/detach-module.mjs
  - tests/unit/detach-module.test.mjs
---

# module-detachment.md
