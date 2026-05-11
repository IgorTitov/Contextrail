<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Overview and navigation guide for the search hex module.
@sidecar README.md.header.md
@layer module | @hex _none_ | @ctx search
@public false
@edit careful -->

# search

Hexagonal full-text search module — pure tokenizer + inverted-index domain behind a narrow `SearchPort`, with an in-memory adapter for tests and dev. Zero external dependencies.

## Why

User-facing keyword search (site search, autocomplete, filtering, highlighting) is a TOP-100 starter staple that templates usually solve by bolting on Meilisearch, Elasticsearch, or Algolia — and then coupling every caller to that SDK. This module is the *user-facing* search primitive: callers build documents with titled fields and optional facets, run short keyword queries, and get back ranked hits with `<mark>`-wrapped highlights and facet filters. Swap `createMemorySearchAdapter` for a Meilisearch / FTS5 / Elasticsearch adapter later without touching any caller.

For RAG-style chunk retrieval (long documents, embeddings, re-ranking), use `modules/retrieval`. Two ports, two jobs.

## Structure

```text
modules/search/
├── domain/
│   ├── search-document.mjs      # Pure: createSearchDocument, documentText
│   ├── tokenize.mjs             # Pure: Unicode-safe tokenizer with stop words
│   └── highlight.mjs            # Pure: wraps query tokens in <mark>
├── ports/
│   └── search-port.mjs          # SearchPort + assertSearchPort
├── adapters/
│   └── memory-search-adapter.mjs # In-memory inverted index (tests + dev default)
├── public-api.mjs               # Cross-module entry point
├── messages.mjs                 # i18n keys
├── manifest.json                # Module metadata + capability surface
└── README.md
```

## Hexagonal layers

| Layer        | Folder           | Rule                                                             |
| ------------ | ---------------- | ---------------------------------------------------------------- |
| **Domain**   | `domain/`        | Pure functions — tokenize, build documents, highlight matches    |
| **Ports**    | `ports/`         | `SearchPort` contract (5 methods: index, indexBatch, search, remove, clear) |
| **Adapters** | `adapters/`      | In-memory inverted index with TF×IDF scoring                     |
| **Public**   | `public-api.mjs` | The only file other modules may import                           |

## Usage

### Index and search

```javascript
import { createMemorySearchAdapter } from './modules/search/public-api.mjs';

const index = createMemorySearchAdapter();

await index.indexBatch([
  { id: '1', fields: { title: 'Hexagonal architecture', body: 'Ports and adapters keep domain pure.' }, facets: { tag: ['arch'] } },
  { id: '2', fields: { title: 'Trunk based delivery',   body: 'Small slices, frequent commits.' },      facets: { tag: ['process'] } },
  { id: '3', fields: { title: 'Hexagonal modules',      body: 'Modular monolith with bounded contexts.' }, facets: { tag: ['arch', 'modules'] } },
]);

const result = await index.search('hexagonal modules', { limit: 5 });
console.log(result.total);          // 2
console.log(result.hits[0].id);     // "3" (highest score)
console.log(result.hits[0].highlights.title); // "<mark>Hexagonal</mark> <mark>modules</mark>"
```

### Filter by facets

```javascript
const archOnly = await index.search('hexagonal', { filters: { tag: 'arch' } });
// Only documents whose `tag` facet contains "arch".
```

### Remove a document

```javascript
await index.remove('2');
// Returns true if the document was present.
```

## Rules

- Domain is pure. Clocks are injected where timing matters (`took`).
- The adapter owns the inverted index; callers never see it.
- Cross-module consumers import from `public-api.mjs` only. Deep imports are forbidden.
- All user-facing copy uses i18n keys via `messages.mjs`.
- For long-document / embedding search use `modules/retrieval`, not this module.

## Tests

- `tests/unit/search.test.mjs` — proves tokenization, document validation, scoring, filters, highlights.
- `tests/contract/search-hex-contract.test.mjs` — proves the hex folder structure and public-api surface.
