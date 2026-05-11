---
fileId: contextrail-template:scripts:checks:changelog-release
module: scripts/checks
stability: evolving
steward: shared
api: "CLI: node scripts/checks/changelog-release.mjs --version=X.Y.Z [--check] [--json]; named exports extractUnreleased(text) and composeReleasedChangelog({before, unreleased, after, version, timestamp})"
dependsOn:
  - CHANGELOG.md
summary: Move [Unreleased] content into a versioned CHANGELOG section with full timestamp. Skips if no real content to release.
owns: Parsing CHANGELOG.md to find [Unreleased], detecting placeholder vs real content, composing the post-release text with one blank line between every section heading, and writing the result back. Exposes pure helpers (extractUnreleased, composeReleasedChangelog) so unit tests do not need a temp file.
boundaries: Does not bump VERSION or package.json — that is coa-merge.mjs's job. Does not push, tag, or build artifacts. Does not parse semver beyond exact-string equality for "section already exists" detection.
invariants: Must skip when [Unreleased] has only placeholder content. Must refuse to overwrite an existing versioned section. Must place exactly one blank line between the new section's last paragraph and the next "## [..." heading (Keep-a-Changelog separator). Must remain idempotent — re-running with no new content is a no-op. CLI main() must be guarded behind an import.meta.url direct-run check so importers do not trigger argv parsing or process.exit.
risks: Silent string concatenation bugs can corrupt CHANGELOG layout (TPL-207). The composer is the canonical place to assert blank-line invariants; keep regression tests in tests/unit/changelog-release.test.mjs in sync with any whitespace shape change.
notesForLLM: Read extractUnreleased before composeReleasedChangelog — they share an unwritten contract that `unreleased` is .trim()'d (no trailing newline) and `after` starts with a single "\n## [<prev>]". Any change to either invariant must update both functions and the regression tests at the same time. Prefer extending composeReleasedChangelog over inlining string templates back into main().
tests:
  - tests/unit/changelog-release.test.mjs
specRefs:
  - TPL-207
related:
  - scripts/coa-merge.mjs
  - scripts/checks/changelog-sync.mjs
  - .claude/skills/changelog-release/SKILL.md
---

# changelog-release.mjs
