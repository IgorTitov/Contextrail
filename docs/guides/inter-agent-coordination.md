<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Guide operators and agent teams through the inter-agent coordination protocol for safe parallel work in the same repository.
@sidecar inter-agent-coordination.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# Inter-Agent Coordination Guide

This guide explains how multiple AI agents (or agent-human teams) work safely in parallel on the same repository without merge conflicts or coordination overhead.

**Decision rationale:** [ADR 0008](../adr/0008-inter-agent-coordination-protocol.md)
**Full specification:** [Design doc](../design/inter-agent-coordination-protocol.md)
**Claim schema:** [.claims/README.md](../../.claims/README.md)

## The three-layer model

| Layer | When | Cost | Coverage |
|-------|------|------|----------|
| 1. BBA-first rule | Always | Zero | ~80% of cases |
| 2. File-based claims | Cross-boundary modifications | Low | ~20% of cases |
| 3. Human escalation | Irreducible simultaneous edits | Highest | Rare |

## Layer 1: BBA-first rule

When you need to change another module's public API, **add a new export behind a BBA seam** instead of modifying an existing one.

Two agents can both add new exports to the same `public-api.mjs` — git merges additions cleanly. This eliminates most conflicts structurally.

```
# Instead of modifying an existing function:
# export function authenticate(token) { /* changed */ }

# Add a new export:
export function authenticateWithPKCE(token, verifier) { /* new */ }
```

## Layer 2: File-based claims

When modification of existing shared code is unavoidable (bug fixes, renames, breaking changes), file a claim.

### Filing a claim

Create a JSON file in `.claims/`:

```json
{
  "id": "clm-a1b2c3",
  "agent": "feature-implementer-auth",
  "targets": ["modules/auth/public-api.mjs"],
  "action": "modify",
  "strategy": "modify-in-place",
  "reason": "Fix token validation edge case",
  "createdAt": "2026-04-05T10:00:00Z",
  "ttlHours": 8,
  "status": "active"
}
```

### Checking for conflicts

Before starting cross-boundary work:

```bash
# Check if any active claims overlap with your intended targets
node scripts/checks/claim-check.mjs --targets=modules/auth/public-api.mjs --action=modify

# Query all active claims on a specific file
node scripts/checks/claim-check.mjs --query=modules/auth/public-api.mjs
```

### Strategy values

| Strategy | When to use |
|----------|------------|
| `bba-additive` | Adding new exports behind a BBA seam (preferred) |
| `modify-in-place` | Modifying existing code (bug fix, rename) |
| `negotiate` | Requesting human resolution for conflicts |

### Claim lifecycle

1. **File** the claim before starting work
2. **Work** on the change
3. **Complete** — set `status: "completed"` or delete the file
4. **Auto-expire** — stale claims (past TTL) are expired by the pre-commit hook

### Pre-commit enforcement

The pre-commit hook automatically:

1. Runs `claim-check --auto-expire` to clean up stale claims
2. Runs `claim-check --enforce --staged` to block commits that conflict with active `modify`/`replace` claims

## Layer 3: Negotiation

When two agents need to modify the same surface simultaneously:

1. The second agent files a counter-claim with `strategy: "negotiate"` and a `counterTo` field referencing the original claim
2. Priority ordering resolves when priorities differ
3. If priorities are equal, first-filed wins (earliest `created` timestamp). Human escalation only for truly simultaneous claims

```bash
# View negotiate claims and their resolution order
node scripts/checks/claim-check.mjs --audit
```

## Cross-repo federation

For monorepo or multi-repo setups, include claims from other repositories:

```bash
node scripts/checks/claim-check.mjs --federated=../other-repo/.claims --audit
```

## Common workflows

### Single agent, single module

No claims needed. Work within the module boundary and commit.

### Two agents, separate modules

No claims needed. Each agent works within its own module. BBA-first rule handles any cross-module API additions.

### Two agents, shared file

1. First agent files a claim
2. Second agent checks claims, sees the overlap
3. Second agent either waits (using `dependsOn`) or files a counter-claim for negotiation

### Bug fix in shared code

1. File a claim with `strategy: "modify-in-place"`
2. Make the fix
3. Complete or delete the claim

## CLI reference

```bash
# Check targets for conflicts
node scripts/checks/claim-check.mjs --targets=<paths> --action=<extend|modify|replace>

# Query active claims on a file
node scripts/checks/claim-check.mjs --query=<path>

# Audit all claims (stale, active, negotiations, dependency order)
node scripts/checks/claim-check.mjs --audit

# Auto-expire stale claims
node scripts/checks/claim-check.mjs --auto-expire

# Enforce (exit non-zero on blocking conflicts)
node scripts/checks/claim-check.mjs --enforce --staged

# Create a new claim
node scripts/checks/claim-check.mjs --create --agent=<name> --slice=<id> --targets=<paths> --action=<action>

# Auto-complete claims whose targets are all staged
node scripts/checks/claim-check.mjs --auto-complete --staged

# Cross-repo federation
node scripts/checks/claim-check.mjs --federated=<dir> --audit
```

## Troubleshooting

**Pre-commit hook blocks my commit with a claim conflict:**
Check `.claims/` for the conflicting claim. If the claim is stale, run `--auto-expire`. If it's active, coordinate with the claim owner or reframe your change as BBA-additive.

**I accidentally deleted someone else's claim:**
Claims are tracked in git. Use `git checkout -- .claims/<file>` to restore it.

**Too many stale claims accumulating:**
The pre-commit hook runs auto-expire on every commit. You can also run it manually: `node scripts/checks/claim-check.mjs --auto-expire`.
