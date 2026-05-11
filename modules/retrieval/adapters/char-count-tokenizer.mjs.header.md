---
fileId: contextrail-template:modules:retrieval:adapters:char-count-tokenizer
module: modules/retrieval
stability: evolving
steward: shared
api: file-local
hexLayer: adapter
boundedContext: retrieval
summary: Character-count tokenizer adapter for the retrieval module. Simple length-based token estimator.
owns: The Char Count Tokenizer adapter implementation for the retrieval module.
boundaries: Infrastructure-specific code. Must satisfy the module's port contract.
invariants: Must pass the port contract assertion defined in ports/.
notesForLLM: Roughest tokenizer. Use only when relative sizing suffices and bundle size must stay minimal.
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

# char-count-tokenizer.mjs
