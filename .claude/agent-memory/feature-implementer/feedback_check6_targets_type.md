---
name: Check 6 claim targets type guard
description: Claim JSON targets arrays may contain non-string values; always filter to typeof string before calling string methods
type: feedback
---

<!-- @HEADER
@version 0.7.52 | 2026-05-03
@purpose Describe the role of feedback-check6-targets-type in this repository.
@sidecar feedback_check6_targets_type.md.header.md
@layer control-plane | @hex _none_ | @ctx _none_
@public false
@edit careful -->

When reading claim files from `.claims/*.json`, the `targets` array may contain
non-string values (objects or nulls). Calling `.endsWith()` on a non-string throws
`TypeError: t.endsWith is not a function`.

**Why:** Real `.claims/*.json` files in this repo have varied shapes. The JSON schema
allows extensibility and not all claim files have purely string targets.

**How to apply:** Always filter claim targets before comparison:
```js
const targets = rawTargets.filter((t) => typeof t === 'string');
```
This pattern applies in `merge-ceremony-drift-check.mjs` Check 6 and any future
check that reads claim targets from disk.
