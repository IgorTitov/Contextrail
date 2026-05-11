---
fileId: contextrail-template:tests:unit:retrieval-tokenizer-embedder.test
module: tests/unit
stability: evolving
steward: shared
api: file-local
dependsOn:
  - modules/retrieval/public-api.mjs
  - node:test
  - node:assert
summary: Unit-test the tokenizer ports (char-count and approx-tiktoken), echo embedder, and token-aware augmentPrompt function in the retrieval hex module without external API calls.
owns: Unit-test coverage for TokenizerPort assertion, CharCountTokenizer, ApproxTiktokenTokenizer, EmbedderPort assertion, EchoEmbedder, and token-aware createAugmentPrompt in the retrieval hex module.
boundaries: Must test only the public-api.mjs surface; must not call an actual LLM or embedding API; must not import internal module files directly.
invariants: CharCountTokenizer.countTokens returns a count proportional to character length; ApproxTiktokenTokenizer produces a non-zero token estimate; EchoEmbedder returns a vector of expected dimensionality; augmentPrompt output must not exceed the declared token budget.
risks: ApproxTiktokenTokenizer uses a heuristic ratio; tests that rely on exact token counts will break if the ratio constant changes.
securityPrivacy: In-memory only; no network or API calls.
notesForLLM: Covers assertTokenizerPort, createCharCountTokenizer, createApproxTiktokenTokenizer, assertEmbedderPort, createEchoEmbedder, and createAugmentPrompt. The augmentPrompt function enforces a token budget ceiling — tests must supply a tokenizer instance to verify truncation behavior.
tests: node --test tests/unit/retrieval-tokenizer-embedder.test.mjs
linkedDocs:
  - modules/retrieval/
  - docs/backlog/rag-extensions.md
specRefs:
  - TPL-104
  - TPL-105
  - TPL-106
  - TPL-107
  - TPL-108
  - TPL-109
related: modules/retrieval/public-api.mjs
---

# retrieval-tokenizer-embedder.test.mjs
