---
fileId: contextrail-template:modules:example-greeter:adapters:default-adapter
module: modules/example-greeter
stability: evolving
steward: shared
api: file-local
hexLayer: adapter
boundedContext: example-greeter
owns: The default adapter implementation for the greeting port.
boundaries: Adapters implement port contracts. They may use infrastructure but must not leak it into the domain.
invariants: Must satisfy the GreetingPort contract validated by assertGreetingPort().
risks: Changing the adapter shape without matching the port contract breaks the wiring.
securityPrivacy: Pure data; no I/O.
notesForLLM: Reference implementation used as the example for the example-greeter module. Copy and rename it as the starting point for new adapters.
tests: tests/unit/example-greeter.test.mjs
linkedDocs: modules/example-greeter/README.md
related:
  - modules/example-greeter/ports/greeting-port.mjs
  - modules/example-greeter/domain/greeter.mjs
summary: Default adapter for the example-greeter module. Minimal reference implementation.
allowedDependencies:
  - "../ports/*"
  - "../types.*"
  - ./
  - "frameworks as needed (react, express, node: builtins)"
forbiddenDependencies:
  - "../domain/**"
  - "../application/**"
  - "modules/<other>/domain/**"
  - "modules/<other>/application/**"
  - "modules/<other>/adapters/**"
adapterType: infrastructure
implementsPort: greeting-port
runtimeEnvironment: universal
---

# default-adapter.mjs
