---
name: Slices 19-27 - Infrastructure Modules
description: TPL-136 epic, TPL-137-171 tasks, 9 new hex modules (log, cache, form-validation, realtime, task, permission, file, analytics, scheduler)
type: project
---

<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Describe the role of project-slices19-27-infrastructure-modules in this repository.
@sidecar project_slices19_27_infrastructure_modules.md.header.md
@layer control-plane | @hex _none_ | @ctx _none_
@public false
@edit careful -->

Epic TPL-136 covers 9 new hexagonal infrastructure modules decomposed into Slices 19 through 27.

**Why:** The template needs reusable building blocks for logging, caching, validation, realtime, background tasks, permissions, file handling, analytics, and scheduling. All are technical/architectural -- no USM required.

**How to apply:** When implementing any of these slices, the PRD is at `docs/prd/infrastructure-modules.md` and the backlog is at `docs/backlog/infrastructure-modules.md`. Each slice fits within a 16K token context window. Permission module (Slice 24) depends on auth; all others are leaf modules.

Slice breakdown:
- Slice 19: LogPort (TPL-137 to TPL-141) -- 5 tasks
- Slice 20: CachePort (TPL-142 to TPL-145) -- 4 tasks
- Slice 21: FormValidation (TPL-146 to TPL-147) -- 2 tasks
- Slice 22: RealtimePort (TPL-148 to TPL-153) -- 6 tasks (largest, Primus-style)
- Slice 23: TaskPort (TPL-154 to TPL-156) -- 3 tasks
- Slice 24: PermissionPort (TPL-157 to TPL-159) -- 3 tasks (depends on auth)
- Slice 25: FilePort (TPL-160 to TPL-162) -- 3 tasks
- Slice 26: AnalyticsPort (TPL-163 to TPL-167) -- 5 tasks (includes behavioral tracking)
- Slice 27: SchedulerPort (TPL-168 to TPL-171) -- 4 tasks

Key constraints: no external libraries (except jose already in auth), native browser APIs only for realtime transports, privacy-first analytics with consent gating, all error messages via i18n keys.
