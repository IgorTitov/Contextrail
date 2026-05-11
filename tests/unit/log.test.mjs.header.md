---
fileId: contextrail-template:tests:unit:log.test
module: tests/unit
stability: evolving
steward: shared
api: file-local
summary: Unit tests for the log module.
owns: Unit proof of log module port contract validation (assertLogPort) and adapter correctness (console, structured-JSON, no-op, and remote adapters).
boundaries: Must import only through modules/log/public-api.mjs; must not touch real network endpoints or file system sinks; remote adapter tests must mock the transport layer; integration-level log aggregation belongs in separate tests.
invariants: All imports must go through public-api.mjs; assertLogPort must throw on any adapter missing required methods (debug, info, warn, error, child); child logger must return an object satisfying the same port contract.
notesForLLM: Import exclusively via public-api.mjs. Use node:test mock utilities to capture console output or intercept remote adapter calls rather than inspecting real sinks. Child logger tests must verify the returned object also satisfies assertLogPort.
tests: node:test runner via pnpm test:unit
related: tests/contract/log-hex-contract.test.mjs
specRefs:
  - TPL-137
  - TPL-138
  - TPL-139
  - TPL-140
  - TPL-141
---

# log.test.mjs
