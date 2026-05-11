---
name: Slice 18 - Module Detachment + TS vs JS ADR
description: TPL-129 epic (TPL-130-133 tasks) for module detachment tooling plus standalone TPL-134 for JS+JSDoc language strategy ADR
type: project
---

<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Agent working memory for Slice 18, recording the task decomposition, dependency order, and last assigned ID for the module detachment epic and JS+JSDoc language-strategy ADR.
@sidecar project_slice18_detachment_adr.md.header.md
@layer control-plane | @hex _none_ | @ctx _none_
@public false
@edit careful -->

Slice 18 delivers module detachment tooling and a language-strategy ADR.

**Why:** With 12+ hex modules, template consumers need a safe way to remove unneeded modules. The JS+JSDoc decision also needs formal documentation for contributor clarity and migration guidance.

**How to apply:** TPL-129 is the detachment epic. TPL-130 (manifest.json for each hex module) is the foundation. TPL-131 (scripts/detach-module.mjs CLI) depends on TPL-130 -- reads manifests, warns about dependents, removes module/tests/backlog refs, supports --dry-run/--force/--list. TPL-132 (docs/guides/module-detachment.md guide) depends on TPL-131. TPL-133 (tests using temp dirs) depends on TPL-131. TPL-134 (docs/adr/0005-js-jsdoc-over-typescript.md) is independent documentation -- arguments for/against, current rationale, migration path. All technical/architectural -- no USM. PRD at docs/prd/module-detachment.md, backlog at docs/backlog/module-detachment.md. Last ID: TPL-134. Created 2026-03-29.
