---
fileId: contextrail-template:modules:example-greeter:ports:greeting-port
module: modules/example-greeter
stability: evolving
steward: shared
api: file-local
hexLayer: port
portType: inbound
boundedContext: example-greeter
owns: The port contract for greeting adapters.
boundaries: Ports define what the domain needs, not how it is provided. No adapter or framework imports.
invariants: assertGreetingPort() must throw on non-conforming adapters.
risks: Changing the port shape without updating adapters breaks the contract.
securityPrivacy: Pure contract definitions; no I/O.
notesForLLM: This is the port layer. It defines *what* the domain needs. Adapters provide *how*.
tests: tests/unit/example-greeter.test.mjs
linkedDocs: modules/example-greeter/README.md
related:
  - modules/example-greeter/domain/greeter.mjs
  - modules/example-greeter/adapters/default-adapter.mjs
summary: Greeting port contract for the example-greeter module.
allowedDependencies:
  - ./
  - "../types.*"
forbiddenDependencies:
  - "../adapters/**"
  - "../di/**"
  - react
  - express
  - fastify
  - "node:*"
  - fs
  - path
  - "modules/<other>/**"
portCategory: example
contractTests: tests/contract/example-greeter-hex-contract.test.mjs
---

# greeting-port.mjs
