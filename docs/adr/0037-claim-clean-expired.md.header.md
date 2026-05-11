---
name: 0037-claim-clean-expired.md
description: ADR for claim-check --clean-expired operator-gated cleanup mode (TPL-309).
type: docs
layer: docs
public: true
edit: careful
---

# 0037-claim-clean-expired.md

Adds operator-gated `--clean-expired` mode that physically deletes stale
claim files: status=expired immediately, status=completed older than
--keep-completed-days (default 30). Audit log entry per deletion, --dry-run
mode, COA_OPERATOR=1 gate. Sits between --auto-expire (status flip only)
and --prune (unconditional bulk delete) in the cleanup lifecycle.
