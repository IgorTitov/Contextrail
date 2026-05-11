<!-- @HEADER
@version 0.8.8 | 2026-05-11
@purpose Documentation for the .claims/ inter-agent coordination directory — claim format, lifecycle, --force-expire authorization model (TPL-221), and when-required table.
@sidecar README.md.header.md
@layer root | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# .claims/ — Inter-Agent Coordination Claims

This directory holds lightweight JSON claim files that coordinate cross-boundary changes between parallel agents.

Claims are **enforced** (Phase 2). The pre-commit hook blocks commits when staged files conflict with active `modify`/`replace` claims. Stale claims are auto-expired before enforcement runs.

## When to file a claim

| Situation | Claim needed? |
| --- | --- |
| Working entirely within your own module | No |
| Adding a new file to your own module | No |
| Adding a new export to another module's `public-api.mjs` behind a BBA seam | Advisory — file a claim but proceed |
| Modifying an existing export in another module's `public-api.mjs` | **Required** |
| Modifying a shared port contract | **Required** |
| Modifying shared infrastructure (`scripts/`, `docs/agent-contract/`, etc.) | **Required** |
| Modifying `package.json`, root configs | **Required** |
| Adding a new module | Advisory — claim the module name |

## BBA-first rule

Before filing a claim to **modify** shared code, first check: can this change be framed as an **addition** instead?

- Add a new export behind a BBA seam rather than changing an existing one.
- Two agents adding new exports to the same file merges cleanly in git.
- Two agents modifying the same function does not.

Use `strategy: "bba-additive"` when possible. Use `strategy: "modify-in-place"` only when modification is unavoidable.

## Claim file schema

Each claim is a JSON file named `clm-<6-hex-chars>.json`:

```json
{
  "id": "clm-a1b2c3",
  "agent": "team-alpha / alice / claude-session-xyz",
  "slice": "TPL-123",
  "created": "2026-04-03T10:00:00Z",
  "expires": "2026-04-03T18:00:00Z",
  "status": "active",
  "targets": [
    {
      "path": "modules/auth/public-api.mjs",
      "module": "auth",
      "surface": "public-api",
      "action": "extend",
      "description": "Add OAuth2 PKCE token refresh export"
    }
  ],
  "strategy": "bba-additive",
  "dependsOn": [],
  "notes": ""
}
```

### Field reference

| Field | Required | Values |
| --- | --- | --- |
| `id` | yes | `clm-<6-hex-chars>` |
| `agent` | yes | Who filed — agent team ID, human name, or session ID |
| `slice` | yes | Backlog slice ID (links to `docs/backlog/`) |
| `created` | yes | ISO-8601 timestamp |
| `expires` | yes | ISO-8601. Default: +8h (agents), +24h (humans) |
| `status` | yes | `active` / `completed` / `abandoned` |
| `targets[].path` | yes | Relative file path |
| `targets[].module` | no | Module name (derived from path if absent) |
| `targets[].surface` | yes | `public-api` / `port` / `adapter` / `domain` / `shared-infra` / `config` |
| `targets[].action` | yes | `extend` (additive) / `modify` (change existing) / `replace` (rewrite) |
| `targets[].description` | yes | Why this file needs to change |
| `strategy` | yes | `bba-additive` / `modify-in-place` / `negotiate` |
| `priority` | no | `high` / `medium` / `low` (default: `medium`; used for negotiation ordering) |
| `counterTo` | no | ID of the claim being countered (used in counter-claims) |
| `dependsOn` | no | Array of other claim IDs that must complete first |
| `notes` | no | Free-text for coordination |

## Lifecycle

```text
Filed ──> Active ──> Completed ──> delete after merge
               |
               +──> Expired (auto-expire writes status: "expired")
               |     -> pre-commit runs --auto-expire before --enforce
               |     -> expired claims no longer block enforcement
               |     -> any agent may delete after 48 hours
               |
               +──> Abandoned (agent sets status explicitly)
                     -> same as expired
```

- Default TTL: 8 hours (agents), 24 hours (humans).
- Pre-commit hook auto-expires stale claims and blocks on active `modify`/`replace` conflicts.
- Completed/expired claims older than 48 hours may be deleted.
- Claim files use unique names — additive by design, minimal merge conflict surface.

## Negotiation (Phase 3)

When two agents need the same file and neither can use BBA-additive:

1. Agent B files a **counter-claim** with `counterTo` referencing the original claim ID and `strategy: "negotiate"`.
2. `claim-check` reports negotiate claims prominently and orders them by `priority` (high > medium > low).
3. If priorities differ, the higher-priority claim proceeds first; the other waits.
4. If priorities are equal, first-filed wins (earliest `created` timestamp). Human escalation only for truly simultaneous claims.

Counter-claim ID convention: `<original-id>-counter-<6-hex>`.

## Acquiring claims (pessimistic locking — Phase 5)

The recommended way to start cross-boundary work is `--acquire`, which atomically checks for conflicts and creates the claim in one step. If blocking conflicts exist, the command exits with code 1 and the claim is **not** created — fail fast instead of fail late.

```bash
node scripts/checks/claim-check.mjs --acquire \
  --agent=feature-implementer --slice=TPL-123 \
  --targets=modules/auth/public-api.mjs --action=modify \
  --strategy=modify-in-place
```

`--acquire` accepts the same parameters as `--create` (agent, slice, targets, action, strategy, ttl, priority, dependsOn). Exit codes:

| Exit code | Meaning |
| --- | --- |
| 0 | Claim acquired successfully |
| 1 | Blocking conflict — claim not created |

The lifecycle with `--acquire`:

```text
--acquire ──> Active ──> Completed ──> delete after merge
  (fail fast     |
   on conflict)  +──> Expired / Abandoned
```

### Atomicity

Both `--create` and `--acquire` use a short-lived filesystem lock (`.claims/.locks/`) to prevent race conditions where two agents create conflicting claims simultaneously. The lock is held only during the create operation (milliseconds), not for the duration of the work.

## Protected paths (Phase 5)

Certain shared-infra files should always have a `modify` claim before changes. When `--enforce --staged` runs, staged files matching protected patterns without an active claim are **blocked** (`protectedPathMode: "block"` in `config.json`). The commit will not proceed until a claim is filed.

Protected paths are configured in `.claims/config.json`. The default list (used when no config is present) covers three groups of merge-hostile shared state:

```json
{
  "protectedPaths": [
    "CHANGELOG.md",
    "VERSION",
    "package.json",
    "pnpm-lock.yaml",
    "docs/SYSTEM_MAP.md",
    ".github/workflows/*",
    ".githooks/*",
    "scripts/checks/_shared.mjs",
    "docs/agent-contract/compatibility-contract.json",
    "docs/agent-contract/dangerous-commands.json",
    ".claims/config.json",
    ".claude/CLAUDE.md",
    ".claude/rules/*",
    ".claude/settings.json",
    ".claude/hooks/*",
    "AGENTS.md",
    ".cursorrules"
  ]
}
```

The three groups: **release discipline** (VERSION, CHANGELOG.md, package.json — bumped on every commit), **build/CI infrastructure** (lockfile, workflows, githooks, shared script helpers), and **control-plane / agent contract** (the configuration that tells every agent how to coordinate — silent edits here change the rules of the game for the whole repo). `AGENTS.md` and `.cursorrules` are protected even though they regenerate from the canonical contract; manual edits to either are an anti-pattern that the advisory correctly flags.

`DEFAULT_PROTECTED_PATHS` in `scripts/checks/claim-check.mjs` mirrors this list so a fresh-cloned template with no `.claims/config.json` still gets protection.

## Querying active claims

Check which claims are active on a specific file before modifying it:

```bash
node scripts/checks/claim-check.mjs --query=modules/auth/public-api.mjs
```

## Extending an existing claim (TPL-222)

`--extend` appends new targets to a claim that is already active. coa-merge uses this internally to cover the ceremony files (VERSION, package.json, CHANGELOG.md) and Phase-5 regen artifacts (AGENTS.md, .cursorrules, LOCAL.md, MICRO.md, docs/_generated/*) before pre-commit Phase 3 enforces — agents rarely need to call it by hand.

```bash
node scripts/checks/claim-check.mjs --extend \
  --id=<claim-id> \
  --agent=<your-agent> \
  --add-targets=<comma-list> \
  [--action=<modify|extend|replace>]
```

Authorization model:

| Layer | Rule | When triggered |
| --- | --- | --- |
| Self-identify | `--agent=<X>` is **required** | Always |
| Same-agent only | `--agent` must match `claim.agent` | No `--really` escape — cross-agent extend is rejected outright |
| Active-only | `claim.status` must be `active` | Cannot extend completed/expired/abandoned claims |

Why same-agent only (no cross-agent escape): the use case is "this agent's ceremony stages files my own claim does not yet cover". Cross-agent extend would silently change another agent's claim scope, which is exactly the trust boundary `--force-expire` was built to defend. If you genuinely need to take over another agent's work, use `--force-expire` (auditable cross-agent override) and then `--acquire` your own claim.

Validation:

- Each new target path is checked via `isValidTargetPath()` (no traversal, no absolute).
- Total target count after extension is capped at `MAX_TARGETS` (100; unified across Template/Cockpit/Zvenix per TPL-330 — see TPL-227 in backlog for native glob matching).
- Existing targets are preserved; duplicate paths are skipped (idempotent).
- New targets default to `surface: "shared-infra"` and `description: "auto-extended by coa-merge"`.

Audit-log entry (in `.claims/audit.log`):

```json
{
  "ts": "2026-04-27T19:34:50.123Z",
  "event": "extend",
  "claimId": "clm-a1b2c3",
  "claimAgent": "tpl-222-claude",
  "callerAgent": "tpl-222-claude",
  "addedTargets": ["VERSION", "package.json", "CHANGELOG.md"],
  "crossAgent": false,
  "youngClaimOverride": false
}
```

## Auto-completing claims (TPL-223 verification model)

`--auto-complete --staged` flips a claim's status to `completed` after the
slice's work has been committed. Pre-TPL-223 it relied only on the staged-set
intersection, which left two trust gaps:

- **J3** — a session that ran auto-complete and then closed without
  committing left the working tree with VERSION/CHANGELOG bumped, an active
  staging set, HEAD unmoved, and a claim file lying that the work was done.
- **J3.5** — when session B's commit happened to cover session A's claim's
  targets (subset), B's auto-complete falsely marked A's claim completed
  while A was still mid-work.

Three gates now apply, in order:

| Gate | Rule | What it closes |
| --- | --- | --- |
| A (J3.5) Self-identify | `--agent=<X>` is **required** (or auto-derived in pre-commit hook context from `$COA_AGENT` or active-claim match) | Operator/automation error, missing identity |
| B (J3.5) Same-agent | By default, only claims with `claim.agent === --agent` are completed; foreign claims are silently skipped and audit-logged | B's auto-complete cannot wipe A's claim |
| C (J3) Commit verified | One of: `--commit-hash=<H>` valid AND its commit covers the claim's user targets; `--from-pre-commit-hook` (privileged short-circuit for the pre-commit hook); or HEAD's most recent commit covers the claim's user targets | Auto-complete cannot fire without a real commit |

Cross-agent escape: pass `--really --reason="<text>"` to complete another
agent's claim (operator-confirmed handoff). The escape is audited with
`crossAgent: true` and the supplied reason.

```bash
node scripts/checks/claim-check.mjs --auto-complete --staged \
  --agent=<your-agent> \
  [--commit-hash=<hash>] \
  [--from-pre-commit-hook] \
  [--really --reason="<text>"]
```

**TPL-223/J3.6 — extended targets are aspirational.** When `coa-merge` calls
`tryExtendClaim` to add ceremony paths (VERSION, CHANGELOG.md, AGENTS.md,
.cursorrules, LOCAL.md, MICRO.md, etc.), those paths are stored on the claim
with `extended: true`. Completion only requires the **user-acquired**
(non-extended) targets to be in the proof set. This is what lets a slice
auto-complete even when LOCAL.md regen produces no diff and therefore isn't
in the commit's tree.

Audit-event schema for auto-complete (success and rejection share the same
shape; rejections add a `rejectionReason`):

```json
{
  "ts": "2026-04-28T12:34:56.789Z",
  "event": "auto-complete",
  "claimId": "clm-a1b2c3",
  "claimAgent": "session-A",
  "claimSlice": "TPL-J36",
  "callerAgent": "session-A",
  "agentSource": "cli-flag",
  "verifiedBy": "commit-hash",
  "commitHash": "deadbee...",
  "agentMatch": true,
  "crossAgent": false,
  "reason": null
}
```

Rejection-reason vocabulary on `event: "auto-complete-rejected"`:

| `rejectionReason` | Meaning |
| --- | --- |
| `agent-mismatch` | Foreign claim, no escalation requested — silent skip |
| `cross-agent-no-reason` | `--really` set but `--reason` missing/empty — hard reject |
| `head-did-not-move` | HEAD verification failed (no `--commit-hash`, no `--from-pre-commit-hook`, HEAD doesn't cover targets) |
| `target-mismatch` | `--commit-hash` provided but its tree doesn't include all user targets |

### Migration note (TPL-223)

Pre-TPL-223, bare `--auto-complete --staged` (no `--agent`) was accepted
silently. Post-TPL-223 this is rejected with exit 1. Update any automation
that calls `--auto-complete` to pass `--agent=<your-agent>`, set the
`COA_AGENT` env var, or run from inside the pre-commit hook with
`--from-pre-commit-hook` against an active claim. The silence pre-fix was
the bug; the new rejection is intentional.

## Force-expiring claims (TPL-221 + TPL-225 authorization model)

`--force-expire` is the manual override for stuck claims. It is **gated** —
the trust model of this protocol requires that no parallel session can
unilaterally wipe a sibling's live claim without leaving a trace. Four layers
of authorization apply, in order of strictness:

```bash
node scripts/checks/claim-check.mjs --force-expire \
  --id=<claim-id> \
  --agent=<your-agent> \
  [--really] \
  [--reason="<short text>"] \
  [--operator-confirmed]      # required for cross-agent overrides on
                              # MEDIUM/LOW abandoned-check tiers — the
                              # COA_OPERATOR=1 env var must also be set
```

| Layer | Rule | When triggered |
| --- | --- | --- |
| A. Self-identify | `--agent=<X>` is **required** | Always — every caller must name themselves |
| B. Cross-agent escape | `--agent` differs from `claim.agent` → require `--really` AND non-empty `--reason` | Cleaning truly orphaned claims from a crashed sibling |
| C. Young-claim guard | `claim` younger than `MIN_FORCE_EXPIRE_AGE_MINUTES` (5) → require `--really` even from same agent | Prevents fat-fingered self-override of an in-flight claim |
| D. Abandoned-check (TPL-225) | Cross-agent only: every override runs `checkClaimAbandoned` (age + git activity + git stash signals) and gates the result on its confidence tier | Prevents Field-finding-012 — the override that wipes a 2-min-old claim with active WIP because the *form* of `--really --reason` was right but the *facts* on the ground said the claim was alive |

### Layer D — three confidence tiers

The cross-agent abandoned-check evaluates three independent signals and
classifies the claim into one of three tiers:

| Tier | Triggered when | Override behavior |
| --- | --- | --- |
| `high` | All three signals positively say "abandoned" (claim is past the young-claim guard, no recent commits by `claim.agent`, no stash entry mentions the claim ID/agent), OR the claim's TTL has expired | Override succeeds with `--really --reason` alone — preserves the canonical TPL-221 "old claim, no signs of life" path |
| `medium` | No signal says "alive", but at least one signal could not be evaluated (e.g. running outside a git repo, git failed) | Override **rejected** unless `--operator-confirmed` is passed AND `COA_OPERATOR=1` is set in the calling shell |
| `low` | At least one signal positively says "alive": claim is younger than the guard, `git log --author=<claim.agent>` has commits since `claim.created`, or `git stash list` mentions the claim ID/agent | Override **rejected** unless `--operator-confirmed` is passed AND `COA_OPERATOR=1` is set — the script believes the claim is alive and will not let an automated agent argue otherwise |

The operator-confirmation gate is two-part on purpose:

- `--operator-confirmed` is the explicit "I have looked at this" flag passed on the command line.
- `COA_OPERATOR=1` is an environment variable that **only a human operator can set in their shell**. An automated agent cannot self-set it for its own subprocesses without operator approval, because the COA harness does not propagate this env to agent runs by default.

If the flag is set but the env is missing, the override is rejected with an
explicit "agents cannot fake this" message.

### Verifying a claim is abandoned by hand

Before reaching for `--operator-confirmed`, run the same checks the script
would run, by hand, in your operator shell. They are intentionally simple
git commands so you can audit them:

```bash
# Age signal — how old is the claim?
node scripts/checks/claim-check.mjs --query=<file-the-claim-targets>

# Git-activity signal — has this agent committed since the claim was filed?
git log --author="<claim.agent>" --since="<claim.created>" --oneline

# Stash signal — does the agent have parked WIP referencing the claim?
git stash list | grep -E "<claim.id>|<claim.agent>"

# If all three are empty AND the claim is older than 5 minutes, the script
# will return confidence=high and the override needs only --really --reason.
# If any one returns rows, treat the claim as alive and coordinate with the
# owning session BEFORE overriding.
```

### Operator override (MEDIUM or LOW tier)

After verifying by hand that the claim is genuinely abandoned (or that
overriding it is the right operational call):

```bash
export COA_OPERATOR=1
node scripts/checks/claim-check.mjs --force-expire \
  --id=<claim-id> \
  --agent=<your-agent> \
  --really \
  --reason="<short text — what you verified, why you're overriding>" \
  --operator-confirmed
```

The audit log records the tier the script saw, the signals it evaluated, and
that the operator cleared the action.

### Audit-event schema

Every successful `--force-expire` writes a structured event to
`.claims/audit.log` (JSON Lines, append-only, gitignored). Every successful
`--acquire` / `--create` writes a symmetric `event: "create"` entry so the log
is a full coordination trace, not just a defect tracker. Cross-agent overrides
also write `event: "force-expire-rejected"` events when the abandoned-check
blocks the action — a record of the attempt, the signals seen, and the
rejection reason.

```json
{
  "ts": "2026-04-27T12:34:56.789Z",
  "event": "force-expire",
  "claimId": "clm-377792",
  "claimAgent": "claude-zvx039",
  "claimSlice": "ZVX-039",
  "claimAge_seconds": 87,
  "callerAgent": "claude-zvx-cleanup",
  "reason": "orphaned cleanup",
  "crossAgent": true,
  "youngClaimOverride": false,
  "abandonedCheck": {
    "abandoned": false,
    "confidence": "low",
    "signals": [
      "claim is 87s old (younger than the 5-min young-claim guard)",
      "git log shows 2 commit(s) by claude-zvx039 since claim.created",
      "git stash list is empty"
    ],
    "operatorConfirmed": true
  }
}
```

The `abandonedCheck` field is present on every cross-agent event (success or
rejection) and absent on same-agent events. `claim-check --audit` surfaces the
last 50 audit-log entries alongside its existing stale/blocked output.

### Migration note

Before TPL-221, `--force-expire --id=<X>` accepted the request silently from
any caller with no agent identity, no audit trail, and no age guard. If you
have automation that calls `--force-expire`, update it to pass
`--agent=<your-agent>` (and `--really --reason="..."` when overriding another
agent's claim or a young same-agent claim). The silence was the bug; the new
rejection is intentional.

Before TPL-225, the cross-agent path accepted `--really --reason="<any
text>"` regardless of whether the claim was actually abandoned. After TPL-225,
cross-agent overrides on young/active claims are rejected unless an operator
explicitly clears them at the keyboard via `--operator-confirmed` +
`COA_OPERATOR=1`. The "factually wrong reason text was accepted" gap was the
bug; the new rejection is intentional. Any automation that previously called
cross-agent `--force-expire` on potentially-live claims needs an operator path
or must wait for the claim's TTL to expire naturally.

## Dependency-aware ordering (Phase 4)

Claims with `dependsOn` are automatically ordered:

- **Ready**: claims whose dependencies are all completed, abandoned, expired, or unknown (can proceed).
- **Blocked**: claims with active dependencies that haven't completed yet (must wait).
- **Cycles**: circular `dependsOn` references are detected and reported.

`--audit` and default mode show dependency status. Overlap output includes blocked/ready classification.

## Cross-repo federation (Phase 4)

Load claims from an external shared directory:

```bash
node scripts/checks/claim-check.mjs --federated=../other-repo/.claims --audit
```

Federated claims are tagged with their repo origin and included in overlap detection, queries, and audit reports. Auto-expire only writes to local claims.

## Example claims (documentation)

Files named `clm-ex0001.json`, `clm-ex0002.json`, `clm-ex0003.json` (and any future `clm-ex*`) are **tracked example claims** — they live permanently as documentation of the claim format and lifecycle. They are intentionally not pruned by `claim-check --prune` even though their `status` is `completed`/`expired`/`abandoned`.

The `clm-ex` ID prefix is the canonical signal. Operational claim IDs are random hex (e.g. `clm-a85b4e`) and are pruned normally once their status leaves `active`. See `isExampleClaim()` and `EXAMPLE_CLAIM_ID_PREFIX` in `scripts/checks/claim-check.mjs`.

If you add a new example claim, name its ID with the `clm-ex` prefix and include a short narrative comment in `notes` so readers see why each example exists.

## CLI reference

```bash
node scripts/checks/claim-check.mjs --targets modules/auth/public-api.mjs --action modify
node scripts/checks/claim-check.mjs --enforce --staged
node scripts/checks/claim-check.mjs --auto-expire
node scripts/checks/claim-check.mjs --query=<path>
node scripts/checks/claim-check.mjs --audit
node scripts/checks/claim-check.mjs --create --agent=<name> --slice=<id> --targets=<paths> --action=<action>
node scripts/checks/claim-check.mjs --acquire --agent=<name> --slice=<id> --targets=<paths> --action=<action>
node scripts/checks/claim-check.mjs --extend --id=<id> --agent=<your-agent> --add-targets=<paths> [--action=<a>]
node scripts/checks/claim-check.mjs --auto-complete --staged
node scripts/checks/claim-check.mjs --force-expire --id=<id> --agent=<your-agent> [--really] [--reason="<text>"]
node scripts/checks/claim-check.mjs --prune
node scripts/checks/claim-check.mjs --federated=<dir> --audit
```

## Validation rules

Claims are validated at parse time and at build time. Invalid claims are rejected.

| Rule | Limit | Behavior |
| --- | --- | --- |
| Max TTL | 168 hours (7 days) | Capped at parse time; `buildClaimObject` enforces cap |
| Max targets per claim | 20 | Rejected at parse time; `buildClaimObject` throws |
| Allowed `strategy` values | `bba-additive`, `modify-in-place`, `negotiate` | Rejected if unknown |
| Allowed `action` values | `extend`, `modify`, `replace` | Rejected if unknown |
| Target path: no traversal | Must not contain `..` | Rejected |
| Target path: no absolute | Must not start with `/` | Rejected |
| Prototype pollution guard | `__proto__` keys stripped | Silently removed during JSON parse |

These rules apply to:

- `parseClaim()` — loading claim files from disk
- `buildClaimObject()` — creating new claims via `--create` or `--acquire`
- CLI `--targets` parsing — paths validated before claim creation

## Related

- [Inter-Agent Coordination Protocol](../docs/design/inter-agent-coordination-protocol.md) — full specification
- [ADR 0008](../docs/adr/0008-inter-agent-coordination-protocol.md) — architectural decision record
- [ADR 0002](../docs/adr/0002-trunk-based-delivery.md) — trunk-based delivery and BBA rules
