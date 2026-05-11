---
fileId: contextrail-template:tests:contract:example-greeter-hex-contract
module: tests/contract
stability: evolving
steward: shared
api: node:test spec
dependsOn:
  - node:test
  - node:assert/strict
  - node:fs
  - modules/example-greeter/public-api.mjs
summary: "Prove that the example-greeter bounded module follows the hexagonal architecture contract: public-api, domain, ports, adapters, and README."
owns: Contract proof that the example-greeter module follows the hexagonal architecture pattern.
boundaries: This file is a deterministic contract spec only.
invariants: Must fail if the hex structure is broken, the public API loses expected exports, or deep imports leak.
risks: Without this contract, the example module could silently lose its teaching value.
securityPrivacy: Local test code only; avoid secrets and network access.
notesForLLM: This proves structure and import surface, not domain behavior. Domain logic is covered in unit tests.
tests: pnpm test:contract
linkedDocs: modules/example-greeter/README.md
related:
  - modules/example-greeter/public-api.mjs
  - tests/unit/example-greeter.test.mjs
---

# example-greeter-hex-contract.test.mjs
