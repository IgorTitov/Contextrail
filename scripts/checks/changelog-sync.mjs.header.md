---
fileId: contextrail-template:scripts:checks:changelog-sync
module: scripts/checks
stability: evolving
steward: shared
api: "CLI: node scripts/checks/changelog-sync.mjs [--check] [--json]"
dependsOn:
  - node:fs
  - node:child_process
  - scripts/checks/_shared.mjs
  - git staged diff
  - CHANGELOG.md
summary: Keep CHANGELOG.md structurally ready for the current commit by ensuring an Unreleased section exists and by inserting staged work-item trace references into the Changed section when needed.
owns: The deterministic repo step that keeps CHANGELOG.md commit-ready by maintaining the Unreleased section and syncing staged work-item trace refs into it.
boundaries: This script only synchronizes the working-tree changelog for the current change set. It must not become a release finalizer, artifact generator, version bumper, commit wrapper, or general changelog reconstruction engine.
invariants: Must remain deterministic; must be safe to run repeatedly; must not require network access; must preserve an existing valid changelog structure; must not invent IDs that are not present in staged diff; must not silently rewrite unrelated changelog sections.
risks: Overwriting human-written Unreleased content too aggressively; assuming a single exact markdown shape; missing IDs because of regex drift; coupling too tightly to current commit-msg and backlog ID conventions.
securityPrivacy: Reads local staged diff and writes local repo files only; do not expand it to read secrets or external services.
notesForLLM: Before editing, confirm whether the intended responsibility is still “lightweight commit-time sync” rather than “full changelog generation.” Preserve idempotence, preserve --check semantics, and keep staged-diff parsing and file mutation easy to test in isolation.
tests:
  - .githooks/pre-commit
  - .claude/agents/changelog-curator.md Stop hook
linkedDocs:
  - .claude/agents/changelog-curator.md
  - .claude/skills/changelog-release/SKILL.md
  - .claude/skills/header-sidecar/SKILL.md
  - scripts/checks/README.md
related:
  - scripts/mergezip.mjs
  - scripts/testall-mergezip.mjs
  - .githooks/pre-commit
  - CHANGELOG.md
---

# changelog-sync.mjs
