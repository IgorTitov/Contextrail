---
name: Slice 12 - Tree-Shaking Build Optimization
description: TPL-093 epic with TPL-094-096 tasks adding import-graph analyzer, --treeshake build flag, and guide doc for zero-bundler build optimization
type: project
---

<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Agent memory recording Slice 12 tree-shaking planning decisions and task breakdown for product-planner context recall.
@sidecar project_slice12_tree_shaking.md.header.md
@layer control-plane | @hex _none_ | @ctx _none_
@public false
@edit careful -->

Slice 12 normalizes a tree-shaking build optimization as technical/architectural work (no USM).

**Why:** The zero-bundler build at `scripts/build-single.mjs` copies all 11 hex modules into dist/, but typical apps use only a few. An opt-in `--treeshake` flag reduces deployment size by analyzing the import graph and copying only referenced modules.

**How to apply:** TPL-093 is the epic. TPL-094 (import-graph analyzer at `scripts/import-graph.mjs`) is the foundation and must be implemented first. TPL-095 (--treeshake flag in build-single.mjs) depends on TPL-094. TPL-096 (guide doc at `docs/guides/tree-shaking.md`) depends on both. All items are `status: todo`. Zero external dependencies throughout -- regex-based ES module import parsing using only Node.js built-ins. Console output is developer-facing CLI, not user-facing UI. Default build path is unchanged without the flag.
