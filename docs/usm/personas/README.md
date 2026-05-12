<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Define the canonical storage location and authoring rules for persona definitions used by USM scenario maps.
@sidecar README.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit rewrite-ok -->

# personas

Canonical persona definitions live here.

Use one file per persona:

- `docs/usm/personas/<persona-key>.md`

## Core profile (required)

A persona file must capture:

- who the actor is (name, role)
- primary goals
- key frustrations (what pain points they face today)
- what the product helps them do (value proposition)
- key constraints
- product knowledge level
- success signals
- relevant workflows

## Extended context (recommended)

- tools currently used (current workarounds or competing solutions)
- jobs to be done (2-3 JTBD statements)
- estimated segment size (band + approximate count)
- economics ref (link to `docs/product-data/persona-economics/<key>.md`)
- avatar hint (visual descriptor for design work)

## Structured metadata (optional)

Personas may include a `cockpit-persona` JSON block for tool and UI consumption. See the template for the full schema.

## Templates

Start from `persona-template.md` (preferred) or keep `template.md` only as a backward-compatible alias.
