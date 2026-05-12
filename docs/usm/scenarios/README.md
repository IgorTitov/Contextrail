<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Define the canonical storage layout and authoring rules for persona-centered workflow scenario maps used by the USM layer.
@sidecar README.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit rewrite-ok -->

# scenarios

Workflow maps live here.

Use one scenario map per significant workflow:

- `docs/usm/scenarios/<persona-key>/<workflow-key>.md`

Each workflow map should point back to a persona in `docs/usm/personas/` and should usually start from `docs/usm/templates/workflow-template.md` (with `story-map.md` kept as a legacy-compatible alias).

