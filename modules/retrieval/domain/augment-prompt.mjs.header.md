---
fileId: contextrail-template:modules:retrieval:domain:augment-prompt
module: modules/retrieval
stability: evolving
steward: shared
api: file-local
hexLayer: domain
boundedContext: retrieval
owns: createAugmentPrompt factory; context budget enforcement using maxContextLength; score-descending result sorting; template substitution for {{context}} and {{query}} placeholders.
boundaries: Must remain a pure function with no imports from adapters, ports, or browser APIs. Must not perform retrieval or scoring. Must not hold mutable state.
invariants: augment() must always return a string; empty results must still produce a valid template output with an empty context slot; results must be sorted by score descending before context truncation; the first result is always included even if it exceeds maxContextLength.
risks: A maxContextLength too small to fit any result causes only the first result to appear silently; template placeholders that differ from {{context}} and {{query}} produce no substitution and no error.
notesForLLM: "Pure domain function with no dependencies. Default template wraps context in --- delimiters and appends the query. includeMetadata prepends a [key: value] annotation line to each result part. The budget check uses character count, not token count."
tests: tests/unit/retrieval.test.mjs
linkedDocs: docs/prd/retrieval.md
specRefs: TPL-091
related:
  - modules/retrieval/domain/chunker.mjs
  - modules/retrieval/adapters/bm25-adapter.mjs
  - modules/retrieval/adapters/vector-local-adapter.mjs
summary: Factory that formats retrieved results into a context-augmented prompt string for LLM consumption, respecting a configurable maxContextLength budget.
allowedDependencies:
  - ./
  - "../ports/*"
  - "../types.*"
forbiddenDependencies:
  - "../adapters/**"
  - "../di/**"
  - react
  - next
  - electron
  - express
  - fastify
  - vite
  - "node:*"
  - fs
  - path
  - "modules/<other>/**"
---

# augment-prompt.mjs
