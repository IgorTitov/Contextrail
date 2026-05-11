---
fileId: contextrail-template:apps:api-starter:routes:cqrs
module: apps/api-starter/routes
stability: experimental
steward: cqrs-module
api: Route
boundedContext: cqrs
summary: HTTP route handlers that wire the cqrs public API into the api-starter server.
owns: dispatchCommandHandler, askQueryHandler, listEventsHandler.
boundaries: Uses only ctx.commandBus, ctx.queryBus, ctx.eventStore. No deep imports into modules/cqrs/.
invariants: Every handler signature matches the (req, ctx) shape used by the rest of the router.
notesForLLM: The Counter.Increment / Counter.Get demo handlers are registered in app.mjs, not here.
specRefs:
  - TPL-001
---

# cqrs.mjs
