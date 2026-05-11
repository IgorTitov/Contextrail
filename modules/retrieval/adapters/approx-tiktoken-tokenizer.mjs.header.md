---
fileId: contextrail-template:modules:retrieval:adapters:approx-tiktoken-tokenizer
module: modules/retrieval
stability: evolving
steward: shared
api: file-local
hexLayer: adapter
boundedContext: retrieval
summary: Approximate tiktoken tokenizer adapter for the retrieval module. Character-ratio approximation of OpenAI token counts.
owns: The Approx Tiktoken Tokenizer adapter implementation for the retrieval module.
boundaries: Infrastructure-specific code. Must satisfy the module's port contract.
invariants: Must pass the port contract assertion defined in ports/.
notesForLLM: Use when you need a fast estimate without bundling the real tiktoken library. Accuracy is approximate.
allowedDependencies:
  - "../ports/*"
  - "../types.*"
  - ./
  - "frameworks as needed (react, express, node: builtins)"
forbiddenDependencies:
  - "../domain/**"
  - "../application/**"
  - "modules/<other>/domain/**"
  - "modules/<other>/application/**"
  - "modules/<other>/adapters/**"
adapterType: infrastructure
linkedDocs: modules/retrieval/adapters/README.md
---

# approx-tiktoken-tokenizer.mjs
