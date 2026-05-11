<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Contract and reference examples for integrating seam rollback with deployment pipelines.
@sidecar seam-deployment-integration.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# Seam Deployment Integration

This guide defines the contract between the template's application-level
rollback mechanisms and your deployment pipeline. The template provides
hex ports and domain logic; you provide the infrastructure adapter.

---

## What the template provides

| Component | Location | Purpose |
| --------- | -------- | ------- |
| `createHealthAdapter(seamPort)` | `modules/feature-seams/public-api.mjs` | Aggregates seam state into a structured health snapshot |
| `createDivergenceTracker()` | `modules/feature-seams/public-api.mjs` | Sliding-window counter for shadow auto-disable |
| `whenShadow()` with tracker | `modules/feature-seams/public-api.mjs` | Auto-disables seam when divergence exceeds threshold |
| `seam-rollback-check.mjs` | `scripts/checks/` | Verifies that disabling each active seam keeps tests green |
| `seam-audit.mjs --strict` | `scripts/checks/` | CI gate for orphaned/ghost/naming issues |

## What your pipeline should do

### 1. Expose a health endpoint

Wire the health adapter into your server framework:

```js
// Example: Express (your code, not template code)
import { createMemorySeamAdapter, createHealthAdapter } from './modules/feature-seams/public-api.mjs';

const seams = createMemorySeamAdapter();
const health = createHealthAdapter(seams);

app.get('/health/seams', (req, res) => {
  const result = health.check();
  res.status(result.healthy ? 200 : 503).json(result);
});
```

### 2. Run rollback check before deploy

```yaml
# GitHub Actions example
- name: Verify seam rollback safety
  run: node scripts/checks/seam-rollback-check.mjs
```

If any active seam fails the rollback check, the deploy should pause
for human review — the seam cannot be safely rolled back.

### 3. Monitor after activation

After switching a seam to active in production:

- Poll `/health/seams` at your standard health check interval
- Alert if `healthy: false` (overdue cleanup or auto-disabled seam)
- The `onTransition` callback fires on every state change — wire it
  to your logging/metrics pipeline

### 4. Keep old path available

After switching a seam to active, keep the old path code available
for at least one release cycle. Don't run the cleanup commit
(removing old path) until you're confident rollback is unnecessary.

## Docker health check example

```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD curl -sf http://localhost:3000/health/seams || exit 1
```

## Anti-patterns

| Anti-pattern | Why it's wrong | What to do instead |
| ------------ | -------------- | ------------------ |
| Container restart as rollback | Slow, loses in-flight requests, doesn't fix root cause | Flip seam to disabled (instant, stateful) |
| Deploy rollback as seam rollback | Reverts all changes, not just the seam | Use `seam.disable()` for targeted rollback |
| No health check after activation | Silent failures accumulate | Always expose and monitor `/health/seams` |
| Coupling schema migration to seam switch | Can't roll back seam without rolling back schema | Decouple — see [data migration guide](seam-data-migration.md) |

## Architecture boundary

```
┌──────────────────────────────────────────┐
│  Template (application-level)             │
│                                           │
│  whenShadow + tracker → auto-disable      │
│  healthAdapter.check() → { healthy, ... } │
│  seam-rollback-check.mjs → safe/unsafe    │
├───────────────────────────────────────────┤
│  Your code (deployment-level)             │
│                                           │
│  HTTP /health/seams endpoint              │
│  CI pre-deploy gate                       │
│  Monitoring / alerting                    │
│  Traffic routing / canary %               │
└───────────────────────────────────────────┘
```

The template provides the ports. You provide the adapters.
This is the hex approach applied to deployment safety.
