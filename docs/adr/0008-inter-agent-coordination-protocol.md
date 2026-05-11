<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Document 0008-inter-agent-coordination-protocol for this repository.
@sidecar 0008-inter-agent-coordination-protocol.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# ADR 0008 — Inter-agent coordination protocol

## Status

Accepted

## Context

COA enables multiple AI agent teams and humans to work on different features in parallel. Isolation is achieved through hexagonal module boundaries, trunk-based development, Branch by Abstraction, and structured headers.

The **happy path** works without additional coordination: each team touches only its own module behind its own BBA seam, commits atomically, and no conflicts arise.

The **unhappy path** occurs when Agent Team A discovers it needs to modify shared code or another module's public API where Agent Team B is simultaneously working. Without coordination, agents may edit the same file concurrently, change APIs that others depend on, or duplicate work.

## Decision

Adopt a three-layer coordination protocol:

### Layer 1: BBA-first rule (primary mechanism, ~80% of cases)

When an agent needs to change another module's public API, it **must first attempt to add a new export behind a BBA seam** rather than modify an existing one. If every cross-boundary change is framed as an addition (new export, new adapter, new seam) rather than a modification of existing code, conflicts become structurally impossible. Two agents can both add new exports to the same `public-api.mjs` — git merges additions cleanly.

This is the protocol's primary mechanism and requires zero coordination overhead.

### Layer 2: File-based claims (residual ~20%)

For cases where modification of existing shared code is unavoidable (bug fixes, renames, breaking changes), a lightweight file-based claims mechanism provides enforced coordination.

Claims live in `.claims/` at repo root as structured JSON files declaring:

- **who** intends to modify (agent team, human, session ID)
- **what** files/surfaces are targeted
- **action** type (`extend`, `modify`, `replace`)
- **strategy** (`bba-additive`, `modify-in-place`, `negotiate`)
- **TTL** (default 8 hours for agents, 24 hours for humans)

Agents check `.claims/` before starting cross-boundary work. Overlaps on `extend` targets are advisory (proceed with note). Overlaps on `modify`/`replace` targets require resolution: reframe as BBA-additive, sequence via `dependsOn`, or escalate to human.

### Layer 3: Human escalation (rare)

When two agents need to modify the same surface simultaneously and neither can wait, the claim is filed with `"strategy": "negotiate"`. If priorities differ, highest priority wins. If priorities are equal, first-filed wins (earliest `created` timestamp). Human escalation only for truly simultaneous claims.

### Conflict resolution tiers

1. **Structural avoidance** (zero cost) — convert `modify` to `extend` via BBA
2. **Sequencing** (low cost) — second agent uses `dependsOn` and waits
3. **Human escalation** (highest cost) — for irreducible simultaneous modification

### Integration

- `scripts/checks/claim-check.mjs` reads `.claims/*.json`, detects overlaps, reports warnings
- `pre-impl-gate.mjs` calls claim-check when changed files include cross-module paths
- Agent instructions in `.claude/CLAUDE.md` direct agents to check and file claims before cross-boundary work

## Consequences

### Positive

- Multiple agent teams can work safely on the same repository in parallel
- No external services, databases, or central orchestrator needed
- Degrades gracefully — ignoring the protocol doesn't break anything that hex + BBA don't already protect
- Composable with all existing COA primitives (headers, manifests, public-api, BBA seams)
- Claims are structured, compact (~15 lines JSON), readable by agents with limited context
- Works for both agent-agent and agent-human coordination

### Negative

- Adds one more thing agents must check before cross-boundary work
- Claim files add minor repo noise (mitigated by TTL cleanup)
- Protected-path enforcement is blocking; agents must file claims for shared-infra edits

### Phased rollout

| Phase | Scope | Status |
| --- | --- | --- |
| 1 (MVP) | Convention + `.claims/` directory + `claim-check.mjs` script + advisory warnings | Done |
| 2 | Pre-commit hook validates no active `modify` claims overlap with staged files. Stale claims auto-expired. | Done |
| 3 | Negotiation protocol (counter-claims, priority ordering, `--query` mode) | Done |
| 4 | Dependency-aware ordering (`dependsOn` resolution, blocked/ready classification, topological sort, cycle detection), cross-repo federation (`--federated=<dir>`, claim tagging, merged audit) | Done |
| 5 | Pessimistic locking (`--acquire` mode, shared-infra protection, filesystem lock atomicity) | Done |

### Phase 5: Pessimistic locking

Phase 5 addresses three gaps discovered through stress testing of the optimistic-only protocol:

**Problem 1 — Wasted work.** An agent could start a `modify-in-place` task, work for hours, then get blocked at commit time by `--enforce --staged`. The agent's entire work session was wasted.

**Solution: `--acquire` mode.** A new CLI mode that atomically checks for conflicts and creates the claim in a single operation. If blocking conflicts exist, the command exits with code 1 and the claim is never created. Agents should run `--acquire` before starting cross-boundary work, failing fast instead of failing late.

```bash
node scripts/checks/claim-check.mjs --acquire \
  --agent=feature-implementer --slice=TPL-123 \
  --targets=modules/auth/public-api.mjs --action=modify \
  --strategy=modify-in-place
```

`--acquire` accepts the same parameters as `--create` (agent, slice, targets, action, strategy, ttl, priority, dependsOn). The difference is behavioral: `--create` always writes the claim file and reports overlaps as warnings; `--acquire` refuses to write when blocking conflicts exist.

**Problem 2 — No shared-infra protection.** Files like `package.json`, `SYSTEM_MAP.md`, and CI configs could be modified by any agent without filing a claim. This undermined the coordination guarantees for the most contention-prone files.

**Solution: Protected paths.** A configurable list of path patterns (stored in `.claims/config.json`) identifies files that should require a `modify` claim. When `--enforce --staged` runs, if any staged file matches a protected pattern and no active claim covers it, the commit is **blocked** (`protectedPathMode: "block"`). This ensures shared-infra files (CHANGELOG.md, package.json, VERSION) cannot be modified without explicit claim coordination. Blocking mode was adopted after production experience showed that advisory-only warnings were insufficient for parallel multi-agent sessions.

**Problem 3 — Race condition on claim creation.** Two agents could run `--create` simultaneously on the same file — both succeed because neither sees the other's not-yet-written claim.

**Solution: Filesystem lock.** Both `--create` and `--acquire` now acquire a short-lived lock via `.claims/.locks/` before reading claims and writing the new claim file. The lock uses `O_EXCL` (exclusive create) for atomicity. It is held only during the create operation (milliseconds), not for the duration of the agent's work. Lock files are gitignored.

## Related

- [ADR 0002 — Trunk-based delivery](0002-trunk-based-delivery.md) — BBA rules that this protocol extends
- [ADR 0006 — Context-Optimized Architecture](0006-context-optimized-architecture.md) — the architecture this protocol protects
- [Inter-Agent Coordination Protocol](../design/inter-agent-coordination-protocol.md) — full protocol specification
