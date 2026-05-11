<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Show the canonical module folder shape that the hex-boundary skill expects when reasoning about modular-monolith structure.
@sidecar module-template.md.header.md
@layer control-plane | @hex _none_ | @ctx _none_
@public false
@edit rewrite-ok -->

# Module template

```text
modules/<module-name>/
  README.md
  src/
    domain/
    application/
    ports/
      inbound/
      outbound/
    adapters/
      primary/
      secondary/
    di/
    public-api.ts
  tests/
    unit/
    integration/
    contract/
    bdd/
```
