---
name: claim-check-clean-expired.test.mjs
description: Unit tests for claim-check --clean-expired (TPL-309 / ADR-0037).
type: tests
layer: tests
public: false
edit: careful
---

# claim-check-clean-expired.test.mjs

Six cases covering operator gate, status-based deletion (expired vs completed
age window), --dry-run preservation, --keep-completed-days override, example-
claim sparing, and empty-directory no-op. Audit log atomicity verified by
checking entry count after deletion.
