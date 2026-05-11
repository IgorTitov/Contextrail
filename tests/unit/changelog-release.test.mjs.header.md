---
fileId: contextrail-template:tests:unit:changelog-release
module: tests/unit
stability: evolving
steward: shared
api: "Node test runner suite — node --test tests/unit/changelog-release.test.mjs"
dependsOn:
  - scripts/checks/changelog-release.mjs
summary: Verify changelog-release blank-line invariant, [Unreleased] extraction, and content detection.
owns: Regression coverage for the Keep-a-Changelog blank-line invariant between sections (TPL-207), plus the [Unreleased] split contract that composeReleasedChangelog relies on.
boundaries: Does not exercise the CLI surface, version bump, or VERSION file — those belong to coa-merge integration tests. Does not write to disk.
invariants: Must contain at least one regression assertion that fails when the trailing "\n" is removed from composeReleasedChangelog's newSection (the original TPL-207 reproduction). Must use synthetic in-memory fixtures only — never read the live CHANGELOG.md.
risks: A drift between this suite and the composer's internal whitespace contract would hide a regression that ships glued sections back to downstream consumers.
notesForLLM: The CHANGELOG_WITH_PRIOR fixture is the canonical shape — keep its `[Unreleased]` block ending with a blank line so extractUnreleased() returns a `.trim()`-ed string with no trailing newline, matching the real CHANGELOG.md shape.
tests: []
specRefs:
  - TPL-207
related:
  - scripts/checks/changelog-release.mjs
---

# changelog-release.test.mjs
