---
fileId: contextrail-template:modules:prerender:ports:static-output-port
module: modules/prerender
stability: experimental
steward: prerender-module
api: Port
boundedContext: prerender
summary: Port contract for static output adapters — write, list, and clear rendered HTML by route path.
owns: The StaticOutputPort interface (write/list/clear) and the assertStaticOutputPort helper.
boundaries: Port contract only. Adapters own filesystem, CDN, or in-memory persistence.
invariants: Adapters must implement write, list, and clear. Write accepts only paths starting with /.
specRefs:
  - TPL-001
---

# static-output-port.mjs
