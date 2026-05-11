---
fileId: contextrail-template:tests:unit:environment-detect.test
module: tests/unit
stability: evolving
steward: shared
api: file-local
dependsOn: apps/starter/platform/environment-detect.mjs
summary: Verify environment detection returns correct capabilities for explicit hints, Node.js auto-detection, and simulated platform scenarios.
owns: The 12-test suite covering explicit hints, auto-detection in Node.js, and simulated platform scenarios for environment capability detection.
boundaries: Must not test adapter selection or storage behavior; those belong to adapter-factory tests. Must stay limited to verifying the detect function's return shape and values.
invariants: Platform simulation must not depend on actual browser globals. Tests for explicit hints must cover every supported hint value.
risks: If simulated platform globals bleed between test cases, scenario isolation breaks and false-positive results can mask real capability misdetection.
notesForLLM: Platform globals are injected and cleaned up per test; never rely on global state leaking between cases. The detect function under test is a pure capability-inspection function — do not introduce async test patterns unless the function signature changes.
tests: self
specRefs: TPL-030
related: docs/backlog/platform-seams.md
---

# environment-detect.test.mjs
