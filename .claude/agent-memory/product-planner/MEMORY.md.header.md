---
fileId: contextrail-template:.claude:agent-memory:product-planner:MEMORY
module: .claude/agent-memory
stability: evolving
steward: shared
api: Documentation
summary: Memory index for the product-planner agent.
owns: Index of product-planner agent memory entries for cross-conversation recall.
boundaries: Contains only memory pointers; actual memory content lives in individual files.
invariants: Must stay aligned with the actual memory files present in this folder.
risks: Stale memory pointers may lead agents to non-existent files.
notesForLLM: This is the memory index for the product-planner agent. Each entry points to a separate memory file with full context.
tests: _n/a_
---

# MEMORY.md
