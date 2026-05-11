<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Record the initial architecture decision about the scope and responsibilities of the standalone Claude Code template.
@sidecar 0001-template-scope.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# ADR 0001 — standalone Claude Code template

## Status

Accepted

## Context

We want a reusable Claude Code project template with its own workflow, agents, skills, hooks, and scripts.
We may borrow patterns from prior work, but the template itself is standalone.

## Decision

Build a project-local `.claude/` stack plus deterministic repo scripts and hooks.

## Consequences

- the template is portable across future projects
- workflow logic lives in local scripts, not in a marketplace
- third-party skills may be donors, but not the source of truth
