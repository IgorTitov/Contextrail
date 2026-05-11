<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Explain the product-data area and the UI consumption contract for persona economics and other commercial metadata.
@sidecar README.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit rewrite-ok -->

# Product Data

This folder stores product and business data that sits next to persona and workflow artifacts but is not itself USM structure.

The main purpose of this area is to provide canonical, repository-local inputs for product surfaces that need commercial or adoption context without forcing UI layers to hardcode that information.

## Current scope

The first canonical product-data slice is persona economics.

Location:

- `docs/product-data/persona-economics/`

Each active persona may have one economics document that describes:

- estimated total segment size
- current customers in the product
- compact unit economics (avg check, LTV, CAC)
- subscription plan mix

## Why this exists

Product surfaces and dashboards need structured data for:

- an adoption meter or equivalent progress visualization
- compact unit-economics display
- deeper economics drill-down in expanded persona views
- a semantic subscription-mix edge strip on cards

Without a canonical source, those surfaces drift into frontend hardcode.

## UI consumption contract

Consumers should treat these files as the source of truth for persona economics.

Expected UI behavior:

- `estimatedSegmentSize` is the max audience for the persona tile adoption meter
- `currentCustomers` is the current filled amount for that meter
- `avgCheck`, `ltv`, and `cac` are the compact unit-economics values
- `subscriptionMix` is an arbitrary-length array and must support more than two plan types
- if a persona has no economics file, economics-specific widgets should not render for that persona

## Data status

Values in this folder are currently provisional product assumptions intended to support planning and UI prototyping.

They are:

- concrete enough for product surfaces
- repository-local
- editable without API or database work

They are not yet claimed as externally validated market research.
