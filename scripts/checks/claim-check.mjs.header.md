---
fileId: contextrail-template:scripts:checks:claim-check
module: scripts/checks
stability: evolving
steward: shared
api: "CLI: node scripts/checks/claim-check.mjs [--targets=<file,...>] [--action=<extend|modify|replace>] [--staged] [--enforce] [--auto-expire] [--auto-complete] [--query=<path>] [--audit] [--create --agent=<n> --slice=<id>] [--acquire --frozen=<paths>] [--federated=<dir>] [--json]"
dependsOn: scripts/checks/_shared.mjs
summary: Claim-check script for inter-agent coordination with overlap detection, enforcement, negotiation protocol, dependency-aware ordering, cross-repo federation, and active-claim queries.
owns: Overlap detection, conflict enforcement, stale claim lifecycle, negotiation protocol, dependency-aware ordering, cross-repo federation, active-claim queries, and auditing for the .claims/ coordination protocol.
boundaries: --auto-expire may write status updates to claim files. --create writes a new claim file. --auto-complete writes status updates to claim files. --enforce exits non-zero on conflicts. All other modes are read-only.
invariants: parseClaim returns null for invalid data; filterActiveClaims excludes completed/abandoned/expired; detectOverlaps classifies severity as advisory/nearby/conflict; --enforce exits non-zero only on conflict severity; --auto-expire writes only to local stale claim files; resolveByPriority uses stable sort; createCounterClaim always sets strategy to negotiate; resolveDependencyOrder uses Kahn's algorithm with cycle detection; classifyClaimReadiness treats unknown/completed/abandoned/expired deps as resolved; --federated loads external claims read-only.
risks: Agents that skip this check lose coordination awareness but hex boundaries remain the backstop.
securityPrivacy: Reads .claims/ JSON files only; no network access.
notesForLLM: --auto-expire, --create, and --auto-complete write claim files (local only). --enforce exits non-zero on conflict severity only. --query shows active claims on a specific file with dependency status. --create builds and writes a new claim, reporting any overlaps. --auto-complete marks claims as completed when all targets are staged. --federated=dir loads external claims read-only. --audit reports dependency ordering, blocked claims, cycles, and federated sources. The pure functions (parseClaim, filterActiveClaims, detectOverlaps, auditStaleClaims, hasBlockingConflicts, markClaimExpired, detectNegotiations, resolveByPriority, createCounterClaim, queryActiveClaimsForPath, resolveDependencyOrder, classifyClaimReadiness, tagFederatedClaims, mergeFederatedClaims, generateClaimId, buildClaimObject, findCompletableClaims) are exported for unit testing.
tests: tests/unit/claim-check.test.mjs
linkedDocs:
  - .claims/README.md
  - docs/design/inter-agent-coordination-protocol.md
  - docs/adr/0008-inter-agent-coordination-protocol.md
specRefs:
  - TPL-173
  - TPL-174
  - TPL-175
  - TPL-176
  - TPL-317
related:
  - scripts/checks/seam-audit.mjs
  - scripts/checks/pre-impl-gate.mjs
---

# claim-check.mjs
