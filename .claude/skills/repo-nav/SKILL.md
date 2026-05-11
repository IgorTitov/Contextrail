---
name: repo-nav
description: Navigate monorepos and bounded modules quickly while respecting public APIs and folder purpose.
---

<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Navigate the repository quickly by reading the right files in the right order and avoiding unnecessary deep dives into internal implementation detail.
@sidecar SKILL.md.header.md
@layer control-plane | @hex _none_ | @ctx _none_
@public false
@edit careful -->

# repo-nav

## Preferred navigation order

1. README in the folder
2. public API
3. tests
4. implementation internals

## Prefer commands like

- `rg`
- `git grep`
- `find`
- `pnpm nx show project`
- `pnpm nx graph` when relevant
