---
fileId: contextrail-template:modules:retrieval:domain:chunker
module: modules/retrieval
stability: evolving
steward: shared
api: file-local
hexLayer: domain
boundedContext: retrieval
dependsOn:
  - modules/retrieval/domain/character-chunker.mjs
  - modules/retrieval/domain/recursive-character-chunker.mjs
  - modules/retrieval/domain/sentence-chunker.mjs
  - modules/retrieval/domain/markdown-chunker.mjs
owns: The unified re-export surface for all chunker strategy factories.
boundaries: Must remain a pure re-export barrel with no implementation logic. Individual strategies live in their own files.
invariants: Every symbol previously exported from this file must still be importable; no consumer-visible change.
risks: Adding logic here instead of in strategy files defeats the purpose of the split.
notesForLLM: This is a re-export barrel. All chunker implementations live in their dedicated files. Import individual strategies directly if you only need one.
tests:
  - tests/unit/retrieval.test.mjs
  - tests/unit/retrieval-chunker-port.test.mjs
linkedDocs: docs/prd/retrieval.md
specRefs:
  - TPL-088
  - TPL-099
  - TPL-100
  - TPL-101
  - TPL-102
related:
  - modules/retrieval/domain/character-chunker.mjs
  - modules/retrieval/domain/recursive-character-chunker.mjs
  - modules/retrieval/domain/sentence-chunker.mjs
  - modules/retrieval/domain/markdown-chunker.mjs
  - modules/retrieval/public-api.mjs
allowedDependencies:
  - modules/retrieval/domain/character-chunker.mjs
  - modules/retrieval/domain/recursive-character-chunker.mjs
  - modules/retrieval/domain/sentence-chunker.mjs
  - modules/retrieval/domain/markdown-chunker.mjs
forbiddenDependencies:
  - modules/retrieval/adapters
  - modules/retrieval/ports
summary: Re-export barrel that unifies all four chunker strategy factories (character, recursive, sentence, markdown) under a single import surface.
---

# chunker.mjs
