---
fileId: contextrail-template:docs:adr:0014-per-file-version-semantics
module: docs/adr
stability: evolving
steward: shared
api: Documentation
dependsOn:
  - docs/adr/0009-sidecar-first-headers.md
  - docs/adr/0006-context-optimized-architecture.md
summary: "Decision record: @version in file headers shifts from last-released semantics to last-meaningfully-changed-at-VERSION semantics."
owns: The decision rationale for per-file @version semantics and its post-commit stamping seam.
boundaries: This ADR owns the semantic decision and migration policy. The implementation lives in TPL-233. The header format itself is owned by ADR-0009.
invariants: "@version reflects last-content-change of the file, not the current VERSION. Sidecar @version tracks the parent file's last-content-change. Post-commit stamping is the only path that bumps @version going forward."
notesForLLM: "Read this ADR before changing how @version is written or interpreted. If the per-file semantic claim needs revisiting, add a new ADR that supersedes this one rather than editing it."
linkedDocs:
  - docs/adr/0009-sidecar-first-headers.md
  - scripts/checks/header-fix.mjs
  - .githooks/pre-commit
  - docs/analysis/field-findings-log.md
specRefs:
  - TPL-233
  - TPL-231
related:
  - docs/backlog/parallel-session-hardening.md
---

# 0014-per-file-version-semantics.md
