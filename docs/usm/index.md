<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Index the user-story-map documents tracked in this template and explain how persona-centered workflow work is normalized from intake.
@sidecar index.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# USM index

USM is the source of truth for persona-centered workflows, scenario decomposition, and story granularity.

Canonical layout:

- persona definitions live under `docs/usm/personas/`
- start new personas from `docs/usm/personas/persona-template.md`
- personas include core profile (goals, frustrations, value props, JTBD) plus optional structured metadata (`cockpit-persona` JSON)
- persona economics live under `docs/product-data/persona-economics/`
- workflow maps live under `docs/usm/scenarios/`
- start new workflow maps from `docs/usm/templates/workflow-template.md`
- workflows use the granularity ladder: Activity → Step → Story (via `cockpit-usm` JSON block)
- Each significant workflow gets its own USM scenario map

UX, UI, and behavior changes must pass through USM before PRD slicing and implementation backlog creation.

Recommended USM statuses:

- `draft`
- `mapped`
- `sliced`

## Scenario: bootstrap

```trace-yaml
work_item:
  id: TPL-002
  type: story
  title: As a maintainer, I can bootstrap the repo with deterministic Claude Code workflow files
  parent_ref: TPL-001
  status: mapped
  module_ref: core
  spec_refs:
    - docs/usm/index.md
  test_refs:
    - tests/bdd/features/template.feature
  bdd_refs:
    - tests/bdd/features/template.feature#Scenario: Bootstrap the project template
  acceptance:
    - Bootstrap docs exist.
    - Hooks can be installed locally.
```

## Scenario: starter common features — preferences

Stories TPL-006, TPL-007, TPL-008 — canonical trace blocks in `docs/usm/scenarios/template-user/preferences-workflow.md`.

## Scenario: starter common features — navigation

Stories TPL-009, TPL-010 — canonical trace blocks in `docs/usm/scenarios/template-user/navigation-workflow.md`.

## Scenario: starter common features — feedback

Stories TPL-011, TPL-012, TPL-013 — canonical trace blocks in `docs/usm/scenarios/template-user/feedback-workflow.md`.

## Starter real artifacts

- Persona example: `docs/usm/personas/maintainer.md`
- Workflow example: `docs/usm/scenarios/maintainer/bootstrap-workflow.md`
- Template User persona: `docs/usm/personas/template-user.md`
- Preferences workflow: `docs/usm/scenarios/template-user/preferences-workflow.md`
- Navigation workflow: `docs/usm/scenarios/template-user/navigation-workflow.md`
- Feedback workflow: `docs/usm/scenarios/template-user/feedback-workflow.md`
