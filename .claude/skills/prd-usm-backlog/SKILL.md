---
name: prd-usm-backlog
description: Normalize raw feature intake into backlog, PRD, USM, and design handoff triggers without blurring source-of-truth boundaries.
---

<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Define the canonical intake, classification, persona/workflow, PRD, design-handoff, and backlog method for this template.
@sidecar SKILL.md.header.md
@layer control-plane | @hex _none_ | @ctx _none_
@public false
@edit careful -->

# prd-usm-backlog

## Source-of-truth split

Use exactly one canonical owner for each concern.

- **Backlog** owns intake, priority, ordering, dependency, and execution status.
- **PRD** owns requirement intent, business rules, constraints, scope, non-functional requirements, and acceptance boundaries.
- **USM** owns persona-centered workflows, scenario decomposition, and story granularity.
- **Design docs** own brandbook, design-system, reusable prompt templates, and accepted asset handoff for user-facing work.

Do not duplicate all layers in the same file.

## Intake-first rule

Every new request starts as a **raw intake item** appended to the bottom of the backlog.

`product-planner` is the mandatory stop before user-facing implementation begins.

That intake item is not yet implementation-ready.

Its purpose is to:

- preserve the request
- make prioritization explicit
- force classification before execution

## Classification rule

### Path A — technical or non-functional work

Use this path for technical stories and non-functional requirements such as:

- security
- performance
- observability
- reliability
- accessibility policy
- architecture
- infrastructure
- developer workflow

Flow:

1. create raw backlog intake
2. ask only blocking clarification questions
3. formalize PRD requirement intent
4. slice actionable backlog work
5. route to implementation and proving

USM is optional here and should be skipped unless the change genuinely alters a user workflow.

### Path B — UX, UI, or behavior work

Use this path for user stories or job stories.

Flow:

1. create raw backlog intake
2. identify or create the persona
3. identify or create the workflow scenario
4. test whether the request is story-sized or epic-sized
5. update USM first
6. formalize PRD requirements from that workflow
7. route through design docs when visual language, screen-state framing, prompt work, or asset handoff are needed
8. slice actionable backlog work

## Persona storage

Canonical persona definitions live in:

- `docs/usm/personas/<persona-key>.md`

## Workflow storage

Each significant workflow gets its own USM scenario map under:

- `docs/usm/scenarios/<persona-key>/<workflow-key>.md`

Multiple USMs are expected.

Do not force all workflows into one giant story map.

## Granularity rule

Before slicing backlog items, decide whether the request is:

- **story-sized** — can become one or a few independently implementable backlog items
- **epic-sized** — must first be split into smaller workflow stories

Do not push epic-sized requests directly into implementation backlog.

## Recommended status flow

These are recommended operational states, not a second schema.

### Intake

- `proposed`
- `needs-clarification`
- `classified`
- `normalized`

### PRD

- `draft`
- `clarified`
- `approved`

### USM

- `draft`
- `mapped`
- `sliced`

### Backlog

- `todo`
- `in-progress`
- `blocked`
- `validating`
- `done`

## Ready-for-implementation gate

A backlog slice is ready only when:

- the request is classified
- the correct canonical documents exist
- acceptance is testable
- dependencies are named
- priority is set
- persona and workflow are named for user-facing work
- PRD requirement intent exists

## BPMN stance

BPMN is **optional**, not canonical.

Do not require it for normal product work.

Use it only when a workflow is unusually approval-heavy, cross-team, or cross-system and USM plus PRD prose are not enough.

Even then, BPMN supplements PRD and USM. It never replaces them.



## Deterministic stop-gates

Run these before or alongside the first implementation slice:

```bash
node scripts/checks/usm-check.mjs
node scripts/checks/pre-impl-gate.mjs
```
