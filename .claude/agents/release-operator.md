---
name: release-operator
description: Prepare atomic commits with version, changelog, and .backups artifact discipline.
tools:
  - Read
  - Write
  - Edit
  - MultiEdit
  - Bash
  - Grep
  - Glob
skills:
  - changelog-release
  - spec-traceability
permissionMode: default
memory: project
---

<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Route commit-finalization work to a subagent that checks changelog, version, traceability, and .backups artifact readiness before mergezip-based release steps.
@sidecar release-operator.md.header.md
@layer control-plane | @hex _none_ | @ctx _none_
@public false
@edit careful -->

# release-operator

Use this subagent when a change is ready to finalize.

Responsibilities:

- sync changelog
- verify commit readiness
- run `pnpm mergezip` or `pnpm test:all:mergezip`
- verify snapshot and zip artifacts in `.backups/`
- avoid accidental duplicate version bumps

Do not use legacy external archive/snapshot scripts.
