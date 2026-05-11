<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Requirement intent for the inter-agent coordination protocol enabling parallel agent delivery.
@sidecar inter-agent-coordination.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# Inter-Agent Coordination Protocol — PRD

## Intent

Enable multiple AI agent teams and humans to work on different features in the same repository in parallel, without merge conflicts or coordination overhead, using only file-based mechanisms (no external services).

## Outcome

A three-layer coordination protocol:

1. **BBA-first rule** — frame cross-boundary changes as additions behind BBA seams (structural avoidance, ~80% of cases)
2. **File-based claims** — `.claims/*.json` for advisory/enforced coordination on the remaining ~20%
3. **Human escalation** — for irreducible simultaneous modification

## Constraints

- File-based and repo-local only (git is the bus)
- Must degrade gracefully (ignoring the protocol doesn't break hex + BBA protections)
- Readable by agents with limited context windows (structured, compact)
- No central orchestrator or real-time communication
- Composable with all existing COA primitives

## Scope

- In scope: claims lifecycle, overlap detection, enforcement, auto-expiration, negotiation, federation
- Out of scope: external service integration, real-time agent communication

## Phases

| Phase | Scope | Status |
| --- | --- | --- |
| 1 (MVP) | Convention + `.claims/` + `claim-check.mjs` + advisory warnings | Done |
| 2 (Enforcement) | Pre-commit hook enforcement + stale claim auto-expiration | Done |
| 3 (Negotiation) | Counter-claims, priority ordering, `--query` active-claim discovery | Done |
| 4 (Federation) | Dependency-aware ordering, cross-repo claim federation | Done |

## Decision reference

See [ADR 0008](../adr/0008-inter-agent-coordination-protocol.md) for the decision rationale and [design doc](../design/inter-agent-coordination-protocol.md) for the full specification.

Backlog: `docs/backlog/inter-agent-coordination.md` (TPL-172 through TPL-176).
