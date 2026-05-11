<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Overview and navigation guide for the api-client hex module.
@sidecar README.md.header.md
@layer module | @hex _none_ | @ctx api-client
@public false
@edit careful -->

# API Client module

Hex module providing a port-based HTTP client abstraction with native fetch adapter.

## Port

- `ApiClientPort` — get, post, put, delete, setBaseUrl, setHeader, removeHeader

## Adapters

| Adapter | File | Purpose |
|---|---|---|
| Fetch | `adapters/fetch-adapter.mjs` | Native fetch() with JSON handling and error normalization |

## Usage

```js
import { createFetchAdapter } from './modules/api-client/public-api.mjs';

const api = createFetchAdapter({ baseUrl: 'https://api.example.com' });
const response = await api.get('/users');
```

<!-- SpecRefs:
TPL-062
-->
