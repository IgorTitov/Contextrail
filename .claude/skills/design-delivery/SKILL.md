---
name: design-delivery
description: Turn normalized user-facing intent into design-system guidance, mockup prompts, reviewed outputs, and implementation-ready handoff without duplicating product or implementation authority.
---

<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Define the canonical design-lane method for brandbook, design-system, prompt-authoring, and asset-handoff work in this template.
@sidecar SKILL.md.header.md
@layer control-plane | @hex _none_ | @ctx _none_
@public false
@edit careful -->

# design-delivery

## Start from normalized intent

Work from:

- persona and workflow intent
- linked PRD requirement boundaries
- acceptance notes
- current brandbook and design-system docs

Do not invent a second product source of truth.

## Canonical design owners

- `docs/design/brandbook.md` owns visual language and identity constraints.
- `docs/design/design-system.md` owns reusable UI patterns, state rules, and implementation-facing design constraints.
- `docs/design/prompts/*.md` own tool-specific prompt templates and review guidance.
- `docs/design/assets/README.md` owns asset naming and accepted-output handling.

## Mockup prompt rule

When using external mockup or image-generation tools:

- name the target workflow, screens, and states
- state the intended style constraints
- state the implementation-relevant constraints
- record the prompt in the canonical prompt docs if it is reusable
- keep accepted outputs traceable back to the workflow and requirement

## Review rule

Review generated output against:

- brandbook
- design-system
- visible states
- accessibility-sensitive interaction expectations
- implementation feasibility

Reject or refine output that is visually attractive but not implementation-ready.

## Handoff rule

A good design handoff names:

- target workflow and states
- accepted asset references
- component or screen targets
- implementation constraints that matter
- anything the frontend lane must preserve

Do not hide this guidance inside chat-only prose.

## Selector-registry stance

Design may name visible states and semantic UI landmarks, but the bounded selector and test-id registry remains an implementation-facing code contract owned by the frontend lane.

Do not invent hardcoded selector strings inside design docs as a second truth.
