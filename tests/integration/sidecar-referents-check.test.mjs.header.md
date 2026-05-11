---
fileId: contextrail-template:tests:integration:sidecar-referents-check.test
stability: evolving
steward: shared
summary: Integration coverage for sidecar-referents-check (TPL-316) — 10 scenarios covering pass, warn, hard-fail, malformed-skip, audit and pre-commit modes.
owns: TDD proof for the F9 metadata-hallucination defense.
boundaries: Uses tmpdir fixtures; never touches the live repo. Spawns the check script as a subprocess via process.execPath.
notesForLLM: Each scenario builds a self-contained tmpdir with synthetic sidecars then invokes scripts/checks/sidecar-referents-check.mjs --root=<tmpdir>. No git operations — safeGit/safeGitSpawn unused because no scenario exercises the staged-discovery path through git itself.
linkedDocs:
  - docs/adr/0042-sidecar-referents-check.md
related:
  - scripts/checks/sidecar-referents-check.mjs
---

# sidecar-referents-check.test.mjs
