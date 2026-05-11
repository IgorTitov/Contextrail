---
fileId: contextrail-template:tests:unit:header-check-filler
module: tests/unit
stability: evolving
steward: shared
api: "Unit test suite"
dependsOn:
  - scripts/checks/header-check.mjs
summary: Unit proof for the F2 notesForLLM filler lint exported from header-check.mjs.
owns: Positive and negative coverage for checkNotesForLLMFiller against the Mode B filler patterns ("Core X logic. Test in isolation", "X for the Y module", "Core adapter", etc.) and a specific-invariant acceptance case.
boundaries: Pure string-based unit test. No filesystem, no network, no spawned processes.
invariants: New filler patterns added to checkNotesForLLMFiller must ship with both a failing rejection case and a non-rejection case that keeps genuinely specific notesForLLM content passing.
risks: Over-aggressive regexes that catch legitimate short notes will surface here before they break header-check on real sidecars.
securityPrivacy: No secrets, no I/O.
notesForLLM: Regex changes in checkNotesForLLMFiller need a new positive test here first.
tests:
  - self
linkedDocs:
  - scripts/checks/header-check.mjs
  - docs/analysis/mode-b-review.md
specRefs:
  - TPL-001
---

# header-check-filler.test.mjs
