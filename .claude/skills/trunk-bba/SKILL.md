---
name: trunk-bba
description: Deliver changes on trunk through safe abstraction seams, disabled-by-default new paths, and atomic user-meaningful slices.
---

<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Define the repository-local delivery method for Trunk-Based Development with Branch by Abstraction, including atomic slice definition, safe seams, and parallel-actor coordination.
@sidecar SKILL.md.header.md
@layer control-plane | @hex _none_ | @ctx _none_
@public false
@edit careful -->

# trunk-bba

## Core rule

Behavior changes land on trunk through a safe seam.

If a safe seam does not already exist, create one first.

The new path stays **disabled by default** until the relevant proof is green.

## What counts as atomic here

An **atomic commit** in this repository is the smallest independently reviewable product or repository slice that leaves trunk coherent.

That slice may include, in one commit:

- the seam
- the tests
- the implementation
- the docs
- the header or README updates

Do **not** reinterpret atomic to mean that seam creation, tests, code, and docs must always be split into separate commits.

Split into multiple commits only when one safe slice cannot land at once without leaving trunk unclear or unsafe.

## Default implementation flow

1. Identify the behavior seam.
2. Reuse it if it already exists; create it if it does not.
3. Keep the current implementation active.
4. Add the new path behind the seam in inactive form.
5. Write or extend the proving tests.
6. Switch the default only when the relevant checks are green.
7. Remove the old path in a later atomic commit when that keeps the history clearer.

## Start rule for behavior changes

Any behavior change should begin by finding or creating a safe abstraction seam.
For trivial one-line fixes where old and new behavior cannot coexist, a direct commit
is acceptable — but always file a claim first to prevent parallel conflicts.

Follow the [Seam Creation Checklist](../../../docs/guides/seam-creation-checklist.md) for the
step-by-step template including naming convention, pattern routing, and cross-module rules.

**Naming convention:** `<module>.<behavior>` in kebab-case (e.g., `auth.argon2-migration`).

**Cross-module seams:** when a seam affects multiple modules, file claims on all affected
`public-api.mjs` files via `claim-check.mjs --acquire` before starting work.

That seam can be:

- a dispatch function
- an interface or port
- an adapter switch
- a config or flag gate
- another narrow, stable decision point

Do not wire new behavior directly into the active path when a seam is needed for safe delivery.

## Flag and seam discipline

When the new path is not ready to become default:

- keep it disabled by default
- keep the old path active
- make the switch obvious and local
- avoid hidden flip points scattered across the codebase

## Parallel-actor rule

When you create a temporary seam or BBA wrapper, document all of these in the nearest canonical place:

- **scope** — what functionality is being isolated
- **owner** — who currently owns the change or cleanup
- **active path** — which implementation is still default
- **cleanup trigger** — what proof or milestone allows removal

Use the nearest suitable location:

- the file header or `<file>.header.md` sidecar
- the nearest folder README
- an ADR only if the decision is repository-wide

## How other actors should behave

If you encounter a temporary seam owned by someone else:

- avoid changing the same seam or both implementations unless necessary
- avoid broad edits in the isolated area while the abstraction is still live
- if you must touch it, update the scope note first and keep the cleanup path understandable

This is good discipline for parallel TBD work because it reduces merge churn and avoids accidental cross-talk between the active and inactive paths.

## Proof expectation

TDD is still the default.

BDD is still required for user-visible flow changes.

Do not switch the default path until the relevant proof is green and the docs still describe the active state truthfully.

