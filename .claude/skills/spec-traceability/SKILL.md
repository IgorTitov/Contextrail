---
name: spec-traceability
description: Maintain unified traceability across PRD, USM, backlog, BDD, tests, headers, changelog, and commit-ready work items.
---

<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Maintain one coherent traceability surface across PRD, USM, backlog, BDD, tests, headers, changelog, and commit-ready work items.
@sidecar SKILL.md.header.md
@layer control-plane | @hex _none_ | @ctx _none_
@public false
@edit careful -->

# spec-traceability

Use this skill proactively whenever behavior changes.

## Goals

- one project-wide ID namespace
- structured work items in `trace-yaml`
- no drift across PRD, USM, backlog, BDD, tests, code, headers, changelog

## Required workflow

1. create or update the work item in docs
2. ensure required fields are present
3. resolve `bdd_refs` and `test_refs`
4. run:
   - `node scripts/checks/spec-check.mjs`
   - `node scripts/checks/spec-sync.mjs`
   - `node scripts/checks/backlog-sync.mjs`

## Never do

- invent a second ID namespace
- leave orphan refs
- hide required trace data only in prose
