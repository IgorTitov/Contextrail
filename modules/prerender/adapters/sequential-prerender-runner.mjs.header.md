---
fileId: contextrail-template:modules:prerender:adapters:sequential-prerender-runner
module: modules/prerender
stability: experimental
steward: prerender-module
api: Adapter
boundedContext: prerender
summary: Sequential prerender runner — walks a plan, invokes the render function per route, writes results through the output port.
owns: createSequentialPrerenderRunner.
boundaries: Adapter only. Depends on the pure domain and the two prerender ports, not on any transport framework.
invariants: Sequential iteration in plan order. Failures in one route never abort the whole run — they land in summary.failed.
specRefs:
  - TPL-001
---

# sequential-prerender-runner.mjs
