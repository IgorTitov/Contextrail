<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Explain the persona-economics subfolder and the structured data contract for per-persona economics files.
@sidecar README.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit rewrite-ok -->

# Persona Economics

One file per active persona, named `<persona-key>.md`.

## Naming convention

- File name matches the persona key from `docs/usm/personas/<persona-key>.md`
- Example: persona `template-user` → economics file `template-user.md`

## Required fields in the `persona-economics` JSON block

| Field | Type | Description |
|---|---|---|
| `id` | string | `persona-economics-<key>` |
| `personaRef` | string | `persona-<key>` matching the cockpit-persona id |
| `estimatedSegmentSize` | number | Total addressable audience for this persona |
| `currentCustomers` | number | Current users in this segment (start at 0) |
| `avgCheck` | number | Average subscription value per period |
| `ltv` | number | Estimated lifetime value |
| `cac` | number | Customer acquisition cost |
| `subscriptionMix` | array | Plan breakdown with `planId`, `label`, `share`, optional `colorHint` |
| `status` | string | `provisional` or `validated` |
| `notes` | array | Free-text notes about assumptions |

## Template

Start new economics files from `economics-template.md`.
