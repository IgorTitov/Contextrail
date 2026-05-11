---
fileId: contextrail-template:tests:integration:fs-helpers.test
module: tests/integration
stability: evolving
steward: shared
api: file-local
summary: "Integration tests: fs helpers."
owns: Integration proof that walk(), fileExists(), readText(), toPosix(), ROOT, and IGNORE from scripts/lib/fs-helpers.mjs behave correctly against the real filesystem.
boundaries: Must not test business logic, report generation, or trace parsing; filesystem helpers only.
invariants: All walk() results must be POSIX paths; IGNORE directories must never appear in walk() output; readText() must reject with ENOENT for missing files.
risks: Tests rely on real directory layout of this repo; renaming scripts/lib/ or removing package.json will silently break assertions.
notesForLLM: Each describe block targets one exported symbol; check scripts/lib/fs-helpers.mjs exports before adding cases here.
tests:
  - pnpm test:unit
  - node --test tests/integration/fs-helpers.test.mjs
related: scripts/lib/fs-helpers.mjs
---

# fs-helpers.test.mjs
