---
fileId: contextrail-template:modules:retrieval:adapters:markdown-loader
module: modules/retrieval
stability: evolving
steward: shared
api: file-local
hexLayer: adapter
boundedContext: retrieval
summary: Markdown document loader adapter for the retrieval module.
owns: The Markdown Loader adapter implementation for the retrieval module.
boundaries: Infrastructure-specific code. Must satisfy the module's port contract.
invariants: Must pass the port contract assertion defined in ports/.
notesForLLM: Parses markdown files into retrieval documents. Keep parser configuration inside this adapter; domain code should not see markdown specifics.
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

# markdown-loader.mjs
