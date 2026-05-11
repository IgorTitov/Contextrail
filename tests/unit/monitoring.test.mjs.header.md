---
fileId: contextrail-template:tests:unit:monitoring
module: tests/unit
stability: evolving
steward: shared
api: "Test"
summary: Unit tests proving the monitoring module's event/metric/span domain, redaction, sampling, and all adapters (memory, console, no-op).
owns: Unit-level proof surface for modules/monitoring.
boundaries: Imports only from modules/monitoring/public-api.mjs — no deep imports.
invariants: Must pass before commit; failures block the slice.
specRefs:
  - TPL-001
---

# monitoring.test.mjs
