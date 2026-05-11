<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Provide a starter real PRD example so the template demonstrates requirement intent linked to backlog and USM.
@sidecar bootstrap-template.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# Bootstrap the template

## Requirement intent

A new project bootstrapped from this repository should immediately expose deterministic hooks, planning artifacts, and shared Claude↔Codex process adapters.

## In scope

- repo-local instructions for Claude and Codex
- deterministic scripts and git hooks
- starter planning artifacts that demonstrate intake → USM/PRD → backlog → implementation flow

## Out of scope

- application-specific runtime architecture
- project-specific personas beyond the starter example
- release automation beyond local artifact generation

## Acceptance boundaries

- New work can be linked to a real backlog item before implementation starts.
- User-facing workflow work has a real persona and workflow map before slicing into backlog.
- A maintainer can run the deterministic gates locally.
