---
fileId: contextrail-template:tests:unit:retrieval-loaders-query.test
module: tests/unit
stability: evolving
steward: shared
api: file-local
dependsOn:
  - modules/retrieval/public-api.mjs
  - node:test
  - node:assert
summary: Unit-test the document loader adapters (plain text, Markdown, HTML) and query transformer adapters (passthrough, multi-query) in the retrieval hex module using inline string fixtures.
owns: Unit-test coverage for DocumentLoaderPort assertion, PlainTextLoader, MarkdownLoader, HtmlLoader, QueryTransformerPort assertion, PassthroughTransformer, and MultiQueryTransformer in the retrieval hex module.
boundaries: Must test only the public-api.mjs surface; must not perform actual file I/O or network requests; must not import internal adapter files directly.
invariants: Loaders return arrays of document objects with at least content and metadata fields; port assertion tests confirm TypeError is thrown for invalid adapters; MultiQueryTransformer expands a single query into multiple variants.
risks: If the Document shape returned by loaders changes (e.g., field rename), test assertions silently pass on wrong structure if only the field count is checked.
securityPrivacy: In-memory only; no network or file I/O.
notesForLLM: Covers assertDocumentLoaderPort, assertQueryTransformerPort, createPlainTextLoader, createMarkdownLoader, createHtmlLoader, createPassthroughTransformer, createMultiQueryTransformer. All loader inputs are inline string literals, not real files.
tests: node --test tests/unit/retrieval-loaders-query.test.mjs
linkedDocs:
  - modules/retrieval/
  - docs/backlog/rag-extensions.md
specRefs:
  - TPL-122
  - TPL-123
  - TPL-124
  - TPL-125
  - TPL-126
  - TPL-127
related: modules/retrieval/public-api.mjs
---

# retrieval-loaders-query.test.mjs
