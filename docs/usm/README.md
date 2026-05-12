<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Explain the user-story-map documentation area and how persona-centered workflow and scenario artifacts are organized in this template.
@sidecar README.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit rewrite-ok -->

# USM

USM is the source of truth for persona-centered workflows and story granularity.

Keep these concerns here:

- persona definitions (core profile, frustrations, JTBD, value props, optional economics ref)
- significant user workflows
- scenario decomposition with the granularity ladder (Activity → Step → Story)
- story vs epic slicing decisions
- step-level workflow understanding before implementation backlog slicing

Canonical personas live under `docs/usm/personas/`.
Significant workflows live under `docs/usm/scenarios/`.
Persona economics live under `docs/product-data/persona-economics/`.
