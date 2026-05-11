<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Provide the canonical template for per-persona economics files so new personas get structured commercial data from day one.
@sidecar economics-template.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# Persona Economics: {{PERSONA_NAME}}

This file stores the current product-data assumptions for the {{PERSONA_NAME}} persona.

```persona-economics
{
  "id": "persona-economics-{{PERSONA_KEY}}",
  "personaRef": "persona-{{PERSONA_KEY}}",
  "estimatedSegmentSize": 0,
  "currentCustomers": 0,
  "avgCheck": 0,
  "ltv": 0,
  "cac": 0,
  "subscriptionMix": [
    { "planId": "free", "label": "Free", "share": 0.7, "colorHint": "gray" },
    { "planId": "pro", "label": "Pro", "share": 0.2, "colorHint": "blue" },
    { "planId": "enterprise", "label": "Enterprise", "share": 0.1, "colorHint": "gold" }
  ],
  "status": "provisional",
  "notes": [
    "Replace placeholder values with real product assumptions.",
    "Mark status as validated once externally confirmed."
  ]
}
```
