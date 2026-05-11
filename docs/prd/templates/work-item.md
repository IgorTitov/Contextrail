<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Provide the canonical PRD work-item template used when creating new requirement documents in this template.
@sidecar work-item.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# PRD work item template

Use this template after intake has been classified.

- Technical and non-functional requests may use it directly.
- User-facing workflow changes should usually reference an existing USM scenario first.

```trace-yaml
work_item:
  id: {{PROJECT_KEY}}-00X
  type: technical_story
  title: Describe the requirement intent
  parent_ref: {{PROJECT_KEY}}-00Y
  status: clarified
  module_ref: {{DEFAULT_MODULE}}
  depends_on:
    - {{PROJECT_KEY}}-00Z
  spec_refs:
    - docs/prd/index.md
  test_refs:
    - tests/contract/product-docs-contract.test.mjs
  bdd_refs:
    - tests/bdd/features/template.feature#Scenario: Example scenario
  acceptance:
    - Describe one testable requirement boundary.
```
