---
name: changelog-release
description: Keep changelog, version, and artifact discipline deterministic around every atomic commit.
---

<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Keep changelog, version, and artifact preparation deterministic around commit-ready changes using the repository’s current mergezip-centered release flow.
@sidecar SKILL.md.header.md
@layer control-plane | @hex _none_ | @ctx _none_
@public false
@edit careful -->

# changelog-release

## Use when

- a change is ready for final review
- a commit is about to be prepared
- a merged snapshot or zip artifact is needed
- version and changelog must be aligned

## Current workflow

1. sync changelog
2. run tests and checks
3. run `pnpm mergezip`
4. review the generated artifacts in `.backups/`
5. commit atomically

## Commands

```bash
node scripts/checks/changelog-sync.mjs
pnpm mergezip
pnpm test:all:mergezip
```

## Notes

- `pnpm mergezip` is the current artifact command
- it bumps the patch version
- it writes the merged snapshot and zip archive into `.backups/`
- legacy external ops-folder scripts are not part of the current flow
