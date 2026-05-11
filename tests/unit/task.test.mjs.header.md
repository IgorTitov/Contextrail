---
fileId: contextrail-template:tests:unit:task.test
module: tests/unit
stability: evolving
steward: shared
api: file-local
summary: Unit tests for the task module.
owns: Unit proof of task module domain logic (createTaskLifecycle, serializeForTransfer), port contract validation (assertTaskPort), and adapter correctness (main-thread and web-worker adapters).
boundaries: Must import only through modules/task/public-api.mjs; must not spawn real Worker threads in unit tests; WebWorker adapter must be tested with mocks; cross-module task orchestration belongs in integration tests.
invariants: All imports must go through public-api.mjs; assertTaskPort must throw on any adapter missing required methods (enqueue, cancel, getStatus, onProgress, onComplete, drain); task lifecycle state transitions must be deterministic and fully covered.
notesForLLM: Import exclusively via public-api.mjs. WebWorker adapter tests must mock Worker construction — do not spawn real worker threads. Use beforeEach and afterEach to reset task lifecycle state and drain adapters between test cases.
tests: node:test runner via pnpm test:unit
related: tests/contract/task-hex-contract.test.mjs
specRefs:
  - TPL-154
  - TPL-155
  - TPL-156
---

# task.test.mjs
