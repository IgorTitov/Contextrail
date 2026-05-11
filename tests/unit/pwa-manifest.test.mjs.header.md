---
fileId: contextrail-template:tests:unit:pwa-manifest.test
module: tests/unit
stability: evolving
steward: shared
api: file-local
dependsOn: apps/starter/manifest.json
summary: Validate the PWA manifest JSON structure, required fields, icon references, and icon file existence.
owns: The 9-test suite covering manifest structure, required fields, icons, and file existence.
boundaries: Must only validate manifest structure and icon file presence. Must not test SW behavior.
invariants: All tests must read the actual manifest file from disk.
risks: Tests silently pass if manifest.json path drifts from the expected location relative to this test file.
securityPrivacy: Test-only file.
notesForLLM: Tests read the actual manifest.json file from disk and validate structure, not mocked data.
tests: self
linkedDocs: docs/backlog/platform-seams.md
specRefs: TPL-026
related: docs/backlog/platform-seams.md
---

# pwa-manifest.test.mjs
