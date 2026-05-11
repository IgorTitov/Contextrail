<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Record the canonical trunk-based delivery model for this template, including atomic slice definition, Branch by Abstraction, temporary-seam coordination, and interaction with checks, hooks, and artifacts.
@sidecar 0002-trunk-based-delivery.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# ADR 0002 — trunk-based delivery with Branch by Abstraction

## Status

Accepted

## Context

This template already uses deterministic repo scripts, a mutating `pre-commit` hook, fast-path proof layers, and `.backups/` artifact generation through `pnpm mergezip`.

We want one canonical delivery model that keeps changes small, keeps trunk coherent, and allows unfinished implementation work to enter the repository only behind a safe seam.

## Decision

This template uses:

- **Trunk-Based Development** as the default integration model
- **atomic commits** as the default delivery unit
- **Branch by Abstraction** instead of long-lived feature branches for unfinished implementation work

## What “atomic” means here

An atomic commit in this template is the smallest independently reviewable product or repository slice that leaves trunk coherent.

That slice may include, in one commit:

- the seam
- the tests
- the implementation
- the docs
- the header or README updates

Atomic does **not** mean that seam creation, tests, implementation, and docs must always be split into separate commits.

A separate seam-first commit is valid only when the whole safe slice cannot land in one commit without leaving trunk unclear or unsafe.

## Operational workflow

### 1. Begin with a safe seam

For behavior changes, begin by identifying or creating a safe seam. For trivial one-line fixes where old and new behavior cannot coexist, a direct commit is acceptable — but always file a claim first to prevent parallel conflicts.

The seam may be:

- a small dispatch function
- a stable exported interface
- a config or flag-controlled branch
- a route or adapter switch
- another narrow abstraction boundary that allows old and new implementations to coexist

### 2. Keep the new path disabled by default

The new implementation may reach trunk only when it is disabled by default behind the seam.

The current implementation remains the active one.

### 3. Prove the new path

Develop the new path with TDD first.

Use the smallest proving layers that match the change:

- unit
- integration
- contract
- BDD
- optional browser smoke only when needed

### 4. Switch over only under green proof

The default path may switch only when the relevant checks are green.

That includes the deterministic repo checks and the relevant proof layers for the changed behavior.

### 5. Remove the old path later

Do not combine every cleanup step into the same change if that would reduce clarity or atomicity.

Once the new path is proven and active, remove the old path in a later atomic commit.

## Parallel-actor rule

When someone creates a temporary seam or BBA wrapper, they must document all of these in the nearest canonical place:

- **scope** — what functionality is being isolated
- **owner** — who currently owns the change or cleanup
- **active path** — which implementation is still default
- **cleanup trigger** — what proof or milestone allows removal

Use the nearest suitable location:

- the file header or `<file>.header.md` sidecar
- the nearest folder README
- an ADR only if the decision is repository-wide

If another actor finds a temporary seam owned by someone else, they should avoid changing the same seam or both implementations unless necessary. If they must touch it, they should update the note first and keep the cleanup path understandable.

## Branching stance

Short-lived branches are acceptable as transport.

Long-lived feature branches are not the default delivery model for this template.

The expected model is to integrate small, coherent changes into trunk directly, with Branch by Abstraction when behavior cannot switch immediately.

## Interaction with this repository

### Pre-commit

`pre-commit` is mutating by design and stages deterministic repo updates.

That means a commit can include synchronized spec, backlog, header, README, architecture, control-plane, test-gate, and changelog outputs beyond the files a human edited directly.

### Post-commit

`post-commit` remains intentionally disabled.

Delivery discipline belongs before or at commit creation, not in hidden follow-up automation.

### Artifacts

`.backups/` plus `pnpm mergezip` and `pnpm test:all:mergezip` are artifact and finalization flows.

They are not a substitute for branching strategy.

They do not justify merging unfinished active behavior into trunk.

## Related decisions

- [ADR 0008 — Inter-agent coordination protocol](0008-inter-agent-coordination-protocol.md) extends the parallel-actor rule defined here with file-based claims for multi-agent coordination.

## Consequences

- trunk stays coherent
- unfinished implementation can still move forward safely
- old behavior remains active until proof is real
- cleanup is allowed to happen in later atomic commits
- the delivery model is tied to actual hooks, scripts, and proof surfaces in the repo

