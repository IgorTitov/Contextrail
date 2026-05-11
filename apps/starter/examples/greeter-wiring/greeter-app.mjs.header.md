---
fileId: contextrail-template:apps:starter:examples:greeter-wiring:greeter-app
module: apps/starter
stability: evolving
steward: shared
api: file-local
dependsOn: modules/example-greeter/public-api.mjs
owns: Application-layer wiring example for the example-greeter bounded module.
boundaries: Application layer only. Must import from public-api.mjs, never from domain/ports/adapters directly.
invariants: All module access goes through public-api.mjs. Adapter validation happens at startup.
risks: Deep imports here would break the hexagonal boundary teaching value.
securityPrivacy: Pure example code; no I/O.
notesForLLM: This is the application layer. It wires modules together. Never bypass public-api.mjs.
tests: tests/unit/greeter-wiring.test.mjs
linkedDocs:
  - apps/starter/examples/greeter-wiring/README.md
  - modules/example-greeter/README.md
related: modules/example-greeter/public-api.mjs
summary: Greeter App for the starter app.
---

# greeter-app.mjs
