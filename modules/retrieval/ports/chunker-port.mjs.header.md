---
fileId: contextrail-template:modules:retrieval:ports:chunker-port
module: modules/retrieval
stability: evolving
steward: shared
api: file-local
hexLayer: port
portType: outbound
boundedContext: retrieval
dependsOn:
  - modules/retrieval/messages.mjs
  - modules/retrieval/types.d.ts
owns: assertChunkerPort runtime validator; the port-level enforcement that all chunker adapters expose a chunk() method before being passed to domain or application code.
boundaries: Must not contain chunking logic, domain rules, or adapter implementations. Must not import from adapter or domain layers. Must only use messages.mjs for error strings.
invariants: assertChunkerPort must throw TypeError (never a plain Error) on non-conforming adapters; error messages must go through t() from messages.mjs; a valid adapter is any non-null object with chunk as a function.
risks: Weakening the type guard (e.g., accepting objects without chunk) silently allows non-conforming adapters to reach domain code and fail at call time instead of port validation time.
notesForLLM: The port owns only the structural check — chunk must exist and be a function. The types for ChunkerPort are in types.d.ts. The error message keys are chunker_port_not_object and chunker_port_missing_chunk in messages.mjs. Do not add domain logic here.
tests: tests/unit/retrieval-chunker-port.test.mjs
linkedDocs: docs/prd/retrieval.md
specRefs: TPL-098
related:
  - modules/retrieval/ports/retrieval-port.mjs
  - modules/retrieval/domain/chunker.mjs
  - modules/retrieval/public-api.mjs
  - modules/retrieval/messages.mjs
allowedDependencies: modules/retrieval/messages.mjs
forbiddenDependencies:
  - modules/retrieval/adapters
  - modules/retrieval/domain
summary: Chunker port contract for the retrieval module.
portCategory: ai-pipeline
contractTests: tests/contract/retrieval-hex-contract.test.mjs
---

# chunker-port.mjs
