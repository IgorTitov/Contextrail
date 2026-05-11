---
name: acceptance-validation
description: Close an implemented slice against acceptance by adding the smallest missing proofs and deciding whether the slice is truly ready for finalization.
---

<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Define the canonical acceptance-closure method for implemented backlog slices in this template.
@sidecar SKILL.md.header.md
@layer control-plane | @hex _none_ | @ctx _none_
@public false
@edit careful -->

# acceptance-validation

## Start from acceptance

Work from:

- backlog acceptance
- linked PRD and USM refs
- linked tests and BDD refs
- the implemented slice
- the deterministic test gate

## Closure rules

- add the smallest missing proof
- prefer stable acceptance coverage over test volume
- visible behavior changes need visible proof
- keep traceability links aligned
- issue a ready-for-finalization verdict only when acceptance is actually covered

## Do not overreach

Do not redesign the slice, re-plan the feature, or broaden the implementation unless acceptance truly cannot be satisfied without it.
