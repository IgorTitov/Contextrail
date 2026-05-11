<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Define the local trace-yaml schema so work-item metadata stays structurally consistent across specification artifacts.
@sidecar schema.md.header.md
@layer control-plane | @hex _none_ | @ctx _none_
@public false
@edit careful -->

# trace-yaml schema

Use fenced blocks like this:

```trace-yaml
work_item:
  id: {{PROJECT_KEY}}-001
  type: epic
  title: Example title
  parent_ref:
  status: draft
  module_ref: {{DEFAULT_MODULE}}
  spec_refs:
    - docs/prd/index.md
  test_refs:
    - modules/{{DEFAULT_MODULE}}/tests/unit/example.spec.ts
  bdd_refs:
    - tests/bdd/features/template.feature#Scenario: Example happy path
  acceptance:
    - Example acceptance criterion
  depends_on:
    - {{PROJECT_KEY}}-000
```

## Notes

- `type` is stored separately from the ID.
- `parent_ref` may be empty.
- `bdd_refs` should point to a concrete feature file and scenario name.
