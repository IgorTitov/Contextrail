---
fileId: contextrail-template:modules:prerender:ports:render-function-port
module: modules/prerender
stability: experimental
steward: prerender-module
api: Port
boundedContext: prerender
summary: Typedef port for prerender render functions — (path, context) => Promise<{ html, status?, headers? }>.
owns: The RenderFunctionPort typedef and the assertRenderFunction helper.
boundaries: Typedef-only port. Carries no domain logic.
invariants: A render function must be a plain callable; shape-of-result validation happens in createRenderResult.
specRefs:
  - TPL-001
---

# render-function-port.mjs
