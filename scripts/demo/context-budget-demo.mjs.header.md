---
fileId: contextrail-template:scripts:demo:context-budget-demo
module: scripts/demo
stability: evolving
steward: shared
api: "CLI: node scripts/demo/context-budget-demo.mjs [--context|--parallel|--independence|--json|--markdown]"
summary: COA architecture demo measuring context efficiency, parallel capacity, and module independence across all hex modules.
owns: Token budget comparison, parallel-safe pair analysis, dependency graph independence metrics, scenario builder.
boundaries: Read-only measurement tool. Does not modify any files. Reads dependency-graph.json for sections 2 and 3.
invariants: Token estimate uses bytes / 4. Tier 2 = manifest.json + public-api.mjs + README.md. Parallel analysis uses dependency-graph.json.
related:
  - docs/SYSTEM_MAP.md
  - docs/_generated/dependency-graph.json
  - docs/whitepaper.md
  - docs/adr/0006-context-optimized-architecture.md
  - docs/adr/0008-inter-agent-coordination-protocol.md
---

# context-budget-demo.mjs
