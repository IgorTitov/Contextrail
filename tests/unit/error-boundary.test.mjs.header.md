---
fileId: contextrail-template:tests:unit:error-boundary.test
module: tests/unit
stability: evolving
steward: shared
api: file-local
summary: Unit tests for the error-boundary module.
owns: "Unit-level proof of the wrapAsync helper contract: success passthrough, error capture, and onError callback invocation."
boundaries: Must only test the wrapAsync pure function from apps/starter/error-boundary/error-boundary.mjs; must not test DOM rendering, UI state, or integration paths.
invariants: Success path must never call the onError callback; error path must always invoke onError with the thrown value; wrapped function must be callable multiple times independently.
notesForLLM: Keep tests focused on wrapAsync contract behaviour only. If new helper functions are added to error-boundary.mjs, add separate describe blocks here rather than expanding existing test cases.
tests: node:test runner via pnpm test:unit
specRefs: TPL-021
---

# error-boundary.test.mjs
