---
fileId: contextrail-template:scripts:coa-merge
module: scripts
stability: evolving
steward: shared
api: cli
dependsOn: scripts/checks/claim-check.mjs, scripts/checks/changelog-release.mjs
summary: Merge wrapper that enforces the full commit ceremony in one command (pull, claims, version bump, changelog release, tests, commit) so agents cannot skip a step.
owns: Atomic ten-step commit ceremony for trunk-based delivery.
boundaries: Must not run when staging is empty; must not bypass pre-commit; must keep VERSION/CHANGELOG/package.json bump-and-stage operations atomic with the user files.
invariants: Step 5 fails closed when [Unreleased] has no real content; step 4 rejects any new VERSION that is not exactly +1 patch/minor/major over HEAD.
notesForLLM: Local-only repos with no remote skip step 2 (pull). When a remote exists, --autostash protects the staged-files-before-pull pattern. git rebase --autostash restores the WD but NOT the index; restageAfterAutostash() (exported, TPL-250) re-stages the pre-captured stagedFiles list after each autostash step. Telemetry markers under .cockpit/markers/ are emitted on any failed step for cockpit dashboard aggregation.
tests: node --test tests/unit/coa-merge.test.mjs, node --test tests/integration/coa-merge-autostash-preservation.test.mjs
linkedDocs:
  - docs/guides/parallel-sessions.md
  - .claude/rules/development.md
specRefs:
  - TPL-191
  - TPL-196
  - TPL-202
  - TPL-250
related: scripts/coa-worktree.mjs, scripts/coa-recover.mjs
---

# coa-merge.mjs
