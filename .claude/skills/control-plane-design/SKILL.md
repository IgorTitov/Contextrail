---
name: control-plane-design
description: Shape repository control-plane changes through the smallest canonical owner, with one proof surface and no duplicate authority.
---

<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Define a reusable method for shaping control-plane changes through canonical owners, smallest change sets, and explicit proof surfaces.
@sidecar SKILL.md.header.md
@layer control-plane | @hex _none_ | @ctx _none_
@public false
@edit careful -->

# control-plane-design

## Rule

Change the smallest canonical owner that can truthfully absorb the request.

Do not spread one rule across many files.

## Canonical owner order

Check these in order before adding anything new:

1. `.claude/CLAUDE.md` for short repo-wide policy
2. `docs/adr/*.md` for durable design decisions
3. `.claude/rules/*.md` for concise enforceable topic rules
4. `scripts/checks/*.mjs` for deterministic checks and sync steps
5. `package.json` for invocable commands
6. `.githooks/pre-commit` for deterministic pre-commit orchestration
7. `.claude/agents/README.md` and `.claude/skills/README.md` for discovery only
8. focused specialist agents and skills for narrow domains

## One-new-surface discipline

When a new control-plane surface is genuinely required, add all of these together:

- one owner
- one invocation path
- one proof surface
- one discovery update

That means a new agent, skill, or script should not appear alone.

## Red flags

Treat these as warnings:

- “just add another agent”
- “put the same policy in the README too”
- “add a second workflow doc so it is easier to find”
- “explain the script mismatch in docs instead of fixing the script name”
- “leave the proof for later”

## Delivery-seam rule

If the request changes delivery mechanics, flags, or abstraction seams, use `trunk-bba` and keep the operational rule in one durable place instead of scattering it.

## Deliverable standard

A good control-plane design change names:

- exact files
- exact commands
- exact tests or checks
- exact authority boundaries

Do not stop at conceptual guidance.

