---
fileId: contextrail-template:scripts:lib:worktree-audit
module: scripts/lib
stability: stable
steward: shared
api: Worktree audit verdict classifier
summary: Pure mapping of worktree state inputs to one of eight R4 lifecycle verdicts plus operator recommendation; no git, no filesystem, no time.
owns: Verdict taxonomy + classifyVerdict + recommendation table for ADR-0016.
boundaries: Pure logic only. The script (scripts/coa-worktree.mjs) collects inputs from real git output and feeds them in. No I/O here.
invariants: VERDICTS table is frozen; eight tags exactly; classifier is total (always returns a tag).
risks: Weakening the classifier could mis-label a stamp-residue worktree as clean and license unsafe teardown. Unit suite pins every verdict path.
securityPrivacy: No external access.
notesForLLM: Keep the function pure. Do not introduce timing or env reads. Order of branches is the priority order documented in ADR-0016.
tests: tests/unit/worktree-audit.test.mjs
linkedDocs:
  - docs/adr/0016-worktree-lifecycle.md
  - scripts/coa-worktree.mjs
  - scripts/lib/worktree-refresh.mjs
related:
  - .claims/config.json
---

# worktree-audit.mjs
