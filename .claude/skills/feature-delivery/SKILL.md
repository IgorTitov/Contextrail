---
name: feature-delivery
description: Implement one bounded backlog slice by reading touched files deeply and navigating the rest of the repo through headers, public APIs, tests, and nearby docs.
---

<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Define the canonical bounded-implementation method for backlog slices in this template.
@sidecar SKILL.md.header.md
@layer control-plane | @hex _none_ | @ctx _none_
@public false
@edit careful -->

# feature-delivery

## Start from the slice, not the whole repo

Before implementation, confirm the slice passes `node scripts/checks/pre-impl-gate.mjs`.

Work from:

- one implementation-ready backlog item
- linked PRD or USM intent
- linked tests and acceptance
- owning module and public API
- nearby headers and READMEs

## Reading discipline

Deep-read only:

- files you will change
- their direct collaborators
- the tests you will change or add

For untouched areas, prefer:

- structured headers
- public APIs
- existing tests
- folder READMEs
- linked docs

Do not spend context reconstructing remote internals unless the slice truly depends on them.

## Slice-size rule

Prefer a bounded slice inside one module or one tight seam.

If a request requires chasing many files across many modules just to understand it:

- shrink the slice
- introduce or clarify a seam
- or escalate to `repo-architect`

The ideal slice is small enough that a weaker local model could still hold the touched module and its direct collaborators in working memory.

## Delivery rules

- write or update the smallest proving test first
- keep new behavior behind a safe seam when needed
- respect public APIs and avoid deep imports
- prefer explicit, low-magic code
- keep file responsibility narrow
- leave headers and nearby docs aligned with the real change



## Commit boundary

One bounded slice should become one commit before the next slice begins. If the changeset starts to batch multiple finished slices, reslice or commit the current slice first.
