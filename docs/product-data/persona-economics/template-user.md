<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Store the current product-data assumptions for the Template User persona.
@sidecar template-user.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# Persona Economics: Template User

> **STARTER EXAMPLE** — This file demonstrates the persona-economics format with
> provisional values. Replace it with your own product data after bootstrap.
> See `economics-template.md` for the blank template.

This file stores the current product-data assumptions for the Template User persona.

```persona-economics
{
  "id": "persona-economics-template-user",
  "personaRef": "persona-template-user",
  "estimatedSegmentSize": 5000,
  "currentCustomers": 0,
  "avgCheck": 29,
  "ltv": 290,
  "cac": 15,
  "subscriptionMix": [
    { "planId": "free", "label": "Free", "share": 0.65, "colorHint": "gray" },
    { "planId": "pro", "label": "Pro", "share": 0.25, "colorHint": "blue" },
    { "planId": "enterprise", "label": "Enterprise", "share": 0.1, "colorHint": "gold" }
  ],
  "status": "provisional",
  "notes": [
    "Current customers start at zero for planning visualization.",
    "Segment size represents developers and end users adopting apps built from this template.",
    "Use this file for adoption meter, compact unit economics, and persona dossier deep-dive."
  ]
}
```
