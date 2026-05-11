---
fileId: contextrail-template:modules:example-greeter:domain:greeter
module: modules/example-greeter
stability: evolving
steward: shared
api: file-local
hexLayer: domain
boundedContext: example-greeter
owns: greet() pure function that substitutes a name into a template string.
boundaries: Domain must stay framework-free. No imports from adapters, ports, or infrastructure.
invariants: greet() is a pure function — same inputs always produce the same output.
risks: Adding framework or infrastructure deps here breaks the hexagonal boundary.
securityPrivacy: Pure computation only; no I/O.
notesForLLM: This is the innermost hex layer. Never import from adapters or infrastructure here.
tests: tests/unit/example-greeter.test.mjs
linkedDocs: modules/example-greeter/README.md
related:
  - modules/example-greeter/public-api.mjs
  - modules/example-greeter/ports/greeting-port.mjs
summary: Formats a greeting string by replacing a {name} placeholder in a template.
allowedDependencies:
  - ./
  - "../ports/*"
  - "../types.*"
forbiddenDependencies:
  - "../adapters/**"
  - "../di/**"
  - react
  - next
  - electron
  - express
  - fastify
  - vite
  - "node:*"
  - fs
  - path
  - "modules/<other>/**"
---

# greeter.mjs
