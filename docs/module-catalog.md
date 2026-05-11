<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Complete API catalog for all 40 hex modules with usage examples and dependency information.
@sidecar module-catalog.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# Module Catalog

**Contextrail Template v0.6.6**

Complete catalog of all 40 hexagonal modules with APIs, usage examples, and dependency information.

---

## Module Overview

| Module | Category | Dependencies | Adapters | Tests |
|--------|----------|:------------:|:--------:|:-----:|
| [event-bus](#1-event-bus) | Infrastructure | 0 | 1 | 19+8 |
| [state](#2-state) | Infrastructure | 1 | 2 | 21+8 |
| [feature-seams](#3-feature-seams) | Infrastructure | 0 | 2 | unit+contract |
| [user-preferences](#4-user-preferences) | Infrastructure | 0 | 3 | unit+contract |
| [api-client](#5-api-client) | Infrastructure | 0 | 1 | 21+6 |
| [notifications](#6-notifications) | Infrastructure | 0 | 2 | unit+contract |
| [auth](#7-auth) | Security | 2 | 7 | 43+6+29 |
| [ai-chat](#8-ai-chat) | AI | 1 | 2 | 36+6 |
| [local-llm](#9-local-llm) | AI | 1 | 2 | 47+7 |
| [retrieval](#10-retrieval) | AI / Search | 0 | 15+ | 175 |
| [knowledge-graph](#11-knowledge-graph) | AI / Search | 0 | 3 | 33 |
| [onboarding](#12-onboarding) | UI Infrastructure | 0 | 2 | 51+9 |
| [example-greeter](#13-example-greeter) | Example | 0 | 1 | unit+bdd+contract |
| [log](#14-log) | Infrastructure | 0 | 4 | unit+contract |
| [cache](#15-cache) | Infrastructure | 0 | 3 | unit+contract |
| [form-validation](#16-form-validation) | Infrastructure | 0 | 0 (pure) | unit |
| [realtime](#17-realtime) | Infrastructure | 0 | 4 | unit+contract |
| [task](#18-task) | Infrastructure | 0 | 2 | unit+contract |
| [permission](#19-permission) | Security | 1 (auth type) | 2 | unit+contract |
| [file](#20-file) | Infrastructure | 0 | 2 | unit+contract |
| [analytics](#21-analytics) | Observability | 0 | 3 | unit+contract |
| [scheduler](#22-scheduler) | Infrastructure | 0 | 3 | unit+contract |
| [i18n](#23-i18n) | Infrastructure | 0 | 2 | unit+contract |
| [db](#24-db) | Infrastructure | 0 | 2 | unit+contract |
| [openapi](#25-openapi) | Documentation | 0 | 2 | unit+contract |
| [rate-limit](#26-rate-limit) | Infrastructure | 0 | 2 | unit+contract |
| [monitoring](#27-monitoring) | Observability | 0 | 3 | unit+contract |
| [job-queue](#28-job-queue) | Infrastructure | 0 | 1 | 29+7 |
| [email](#29-email) | Infrastructure | 0 | 2 | 34+7 |
| [search](#30-search) | Infrastructure | 0 | 1 | 36+7 |
| [payments](#31-payments) | Commerce | 0 | 1 | 50+7 |
| [tenancy](#32-tenancy) | Platform | 0 | 2 | 46+7 |
| [cqrs](#33-cqrs) | Platform | 0 | 3 | 51+7 |
| [pwa](#34-pwa) | Frontend | 0 | 1 | 44+7 |
| [seo](#35-seo) | Frontend | 0 | 1 | 33+7 |
| [theme](#36-theme) | Frontend | 0 | 1 | 40+7 |
| [graphql](#37-graphql) | API | 0 | 1 | 44+7 |
| [prerender](#38-prerender) | SSG | 0 | 2 | 45+8 |

---

## 1. event-bus

**Typed, synchronous, in-process publish/subscribe.**

### Public API

```javascript
import {
  assertEventBusPort,     // (adapter) → void | throws TypeError
  createMemoryEventBus,   // () → EventBusPort
} from '../../modules/event-bus/public-api.mjs';
```

### EventBusPort Interface

```typescript
interface EventBusPort {
  on(event: string, handler: (data: unknown) => void): () => void;  // returns unsubscribe fn
  off(event: string, handler: (data: unknown) => void): void;
  emit(event: string, data?: unknown): void;
  clear(): void;
}
```

### Usage

```javascript
const bus = createMemoryEventBus();

// Subscribe (returns unsubscribe function)
const unsubscribe = bus.on('user:login', (data) => {
  console.log('User logged in:', data.userId);
});

// Emit
bus.emit('user:login', { userId: '123' });

// Unsubscribe
unsubscribe();

// Clear all listeners
bus.clear();
```

### Dependencies: None

---

## 2. state

**Observable state store with change subscriptions.**

### Public API

```javascript
import {
  assertStatePort,              // (adapter) → void | throws TypeError
  createMemoryStateAdapter,     // () → StatePort
  createPersistentStateAdapter, // (storagePort) → StatePort
} from '../../modules/state/public-api.mjs';
```

### StatePort Interface

```typescript
interface StatePort {
  get(key: string): unknown;
  set(key: string, value: unknown): void;
  subscribe(key: string, handler: (value: unknown) => void): () => void;
  getAll(): Record<string, unknown>;
  clear(): void;
}
```

### Usage

```javascript
// In-memory state
const state = createMemoryStateAdapter();
state.set('theme', 'dark');
state.get('theme'); // → 'dark'

// Subscribe to changes
const unsubscribe = state.subscribe('theme', (value) => {
  console.log('Theme changed to:', value);
});

state.set('theme', 'light'); // triggers subscriber

// Persistent state (wraps a StoragePort)
import { createLocalStorageAdapter } from '../../modules/user-preferences/public-api.mjs';
const persistent = createPersistentStateAdapter(createLocalStorageAdapter());
```

### Dependencies: `user-preferences` (for persistent adapter)

---

## 3. feature-seams

**Branch by Abstraction — feature flags and conditional execution guards.**

### Public API

```javascript
import {
  SEAM_STATES,                  // { ENABLED: 'enabled', DISABLED: 'disabled', SHADOW: 'shadow' }
  assertSeamPort,               // (adapter) → void | throws TypeError
  createMemorySeamAdapter,      // () → SeamPort
  createConfigSeamAdapter,      // (config) → SeamPort
  whenEnabled,                  // (adapter, name, fn) → result | undefined
  ifEnabled,                    // (adapter, name) → boolean
} from '../../modules/feature-seams/public-api.mjs';
```

### SeamPort Interface

```typescript
interface SeamPort {
  register(name: string, state?: SeamState): void;
  setState(name: string, state: SeamState): void;
  getState(name: string): SeamState;
  isEnabled(name: string): boolean;
  list(): Array<{ name: string; state: SeamState }>;
}
```

### Usage

```javascript
const seams = createMemorySeamAdapter();

// Register seam (disabled by default)
seams.register('new-checkout', SEAM_STATES.DISABLED);

// Conditional execution
whenEnabled(seams, 'new-checkout', () => {
  renderNewCheckout();
});

// Boolean check
if (ifEnabled(seams, 'new-checkout')) {
  // new path
} else {
  // old path
}

// Enable after proof is green
seams.setState('new-checkout', SEAM_STATES.ENABLED);

// Config-driven (for production)
const configSeams = createConfigSeamAdapter({
  'new-checkout': SEAM_STATES.ENABLED,
  'beta-dashboard': SEAM_STATES.SHADOW,
});
```

### Dependencies: None

---

## 4. user-preferences

**User preferences with multiple storage backends.**

### Public API

```javascript
import {
  defaultPreferences,        // () → Preferences
  mergePreferences,          // (current, overrides) → Preferences
  isValidPreferences,        // (obj) → boolean
  assertStoragePort,         // (adapter) → void | throws TypeError
  createMemoryAdapter,       // () → StoragePort
  createLocalStorageAdapter, // (key?) → StoragePort
  createIndexedDBAdapter,    // (dbName?, storeName?) → Promise<StoragePort>
} from '../../modules/user-preferences/public-api.mjs';
```

### StoragePort Interface

```typescript
interface StoragePort {
  load(): Record<string, unknown> | null;
  save(data: Record<string, unknown>): void;
}
```

### Usage

```javascript
// Memory adapter (tests, browser extensions)
const memory = createMemoryAdapter();
memory.save({ theme: 'dark', locale: 'en' });
memory.load(); // → { theme: 'dark', locale: 'en' }

// localStorage adapter (hosted, PWA)
const local = createLocalStorageAdapter('my-app-prefs');
local.save({ theme: 'dark' });

// IndexedDB adapter (local, electron — async factory)
const idb = await createIndexedDBAdapter('my-app', 'preferences');
idb.save({ theme: 'dark' });
idb.load(); // sync after initial async setup

// Defaults and merging
const prefs = mergePreferences(defaultPreferences(), { theme: 'dark' });
```

### Dependencies: None

---

## 5. api-client

**HTTP client abstraction with native fetch adapter.**

### Public API

```javascript
import {
  assertApiClientPort,   // (adapter) → void | throws TypeError
  createFetchAdapter,    // (options?) → ApiClientPort
} from '../../modules/api-client/public-api.mjs';
```

### ApiClientPort Interface

```typescript
interface ApiClientPort {
  get(path: string, options?: RequestOptions): Promise<ApiResponse>;
  post(path: string, body?: unknown, options?: RequestOptions): Promise<ApiResponse>;
  put(path: string, body?: unknown, options?: RequestOptions): Promise<ApiResponse>;
  patch(path: string, body?: unknown, options?: RequestOptions): Promise<ApiResponse>;
  delete(path: string, options?: RequestOptions): Promise<ApiResponse>;
}

interface RequestOptions {
  headers?: Record<string, string>;
  params?: Record<string, string>;
}

interface ApiResponse {
  status: number;
  data: unknown;
  headers: Record<string, string>;
}
```

### Usage

```javascript
const client = createFetchAdapter({
  baseUrl: 'https://api.example.com',
  defaultHeaders: {
    'Content-Type': 'application/json',
  },
});

const response = await client.get('/users', {
  params: { page: '1', limit: '10' },
});

const created = await client.post('/users', {
  name: 'Alice',
  email: 'alice@example.com',
});
```

### Dependencies: None (uses native `fetch`)

---

## 6. notifications

**Notification display with pluggable rendering.**

### Public API

```javascript
import {
  createNotification,              // (options) → Notification
  shouldAutoDismiss,               // (notification) → boolean
  resetIdCounter,                  // () → void (testing)
  assertNotificationPort,          // (adapter) → void | throws TypeError
  createMemoryNotificationAdapter, // () → NotificationPort
  createDomNotificationAdapter,    // (container) → NotificationPort
} from '../../modules/notifications/public-api.mjs';
```

### NotificationPort Interface

```typescript
interface NotificationPort {
  show(notification: Notification): void;
  dismiss(id: string): void;
  getActive(): Notification[];
  clear(): void;
}

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  autoDismiss?: boolean;
  duration?: number;
}
```

### Usage

```javascript
// Memory adapter (testing)
const notifier = createMemoryNotificationAdapter();

const note = createNotification({
  type: 'success',
  message: 'Settings saved',
  autoDismiss: true,
  duration: 3000,
});

notifier.show(note);
notifier.getActive(); // → [note]
notifier.dismiss(note.id);

// DOM adapter (browser)
const container = document.getElementById('notifications');
const domNotifier = createDomNotificationAdapter(container);
domNotifier.show(note); // renders to DOM
```

### Dependencies: None

---

## 7. auth

**Pluggable authentication with multiple strategies.**

### Public API

```javascript
import {
  assertAuthPort,               // (adapter) → void | throws TypeError
  assertOAuthProviderPort,      // (adapter) → void | throws TypeError
  createAnonymousAdapter,       // () → AuthPort
  createLocalPasswordAdapter,   // (storagePort) → AuthPort
  createOAuthStubAdapter,       // (options?) → AuthPort
  createGoogleOAuthProvider,    // ({ clientId, clientSecret, fetchImpl? }) → OAuthProviderPort
  createGitHubOAuthProvider,    // ({ clientId, clientSecret, fetchImpl? }) → OAuthProviderPort
  createMemoryOAuthProvider,    // (config?) → OAuthProviderPort (+ test hooks)
  createNodePkcePair,           // () → { codeVerifier, codeChallenge, codeChallengeMethod: 'S256' }
  createNodeOAuthState,         // () → string
  buildAuthorizeUrl,            // ({ endpoint, clientId, redirectUri, state, codeChallenge, ... }) → string
  createRouteGuard,             // (authAdapter) → RouteGuard
  createAuthenticatedClient,    // (apiClient, authAdapter) → ApiClientPort
} from '../../modules/auth/public-api.mjs';
```

### AuthPort Interface

```typescript
interface AuthPort {
  login(credentials: Credentials): Promise<AuthResult>;
  logout(): Promise<void>;
  getUser(): User | null;
  isAuthenticated(): boolean;
  getToken(): string | null;
}
```

### OAuthProviderPort Interface (TPL-001, gap #3 Google/GitHub)

```typescript
interface OAuthProviderPort {
  providerName: string;
  buildAuthorizationUrl(params: {
    redirectUri: string;
    state: string;
    codeChallenge: string;
    scope?: string[];
  }): string;
  exchangeCode(params: {
    code: string;
    codeVerifier: string;
    redirectUri: string;
  }): Promise<{ accessToken: string; refreshToken?: string; tokenType?: string; expiresIn?: number; scope?: string }>;
  fetchUserInfo(tokens: { accessToken: string }): Promise<AuthUser>;
}
```

The pure `oauth-flow` domain provides `generatePkcePair`,
`generateOAuthState`, `buildAuthorizeUrl`, and provider-specific
`toAuthUserFromGoogle` / `toAuthUserFromGithub` mappers. All crypto
primitives (`randomBytes`, `sha256`) are injected so the domain is
framework-free and unit tests stay deterministic. The
`node-oauth-crypto` adapter bridges `node:crypto` into the domain.

```javascript
// Server-side OAuth flow (memory provider for tests, Google/GitHub in prod)
import {
  createGoogleOAuthProvider,
  createNodePkcePair,
  createNodeOAuthState,
} from '../../modules/auth/public-api.mjs';

const provider = createGoogleOAuthProvider({
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
});

// /auth/oauth/start
const pkce = createNodePkcePair();
const state = createNodeOAuthState();
store.set(state, { codeVerifier: pkce.codeVerifier, redirectUri });
const url = provider.buildAuthorizationUrl({
  redirectUri,
  state,
  codeChallenge: pkce.codeChallenge,
});

// /auth/oauth/callback?code=...&state=...
const pending = store.get(state);
const tokens = await provider.exchangeCode({
  code,
  codeVerifier: pending.codeVerifier,
  redirectUri: pending.redirectUri,
});
const user = await provider.fetchUserInfo(tokens);
```

### Usage

```javascript
// Anonymous (no auth required)
const auth = createAnonymousAdapter();
auth.isAuthenticated(); // → true (always)

// Local password (demo/dev)
import { createMemoryAdapter } from '../../modules/user-preferences/public-api.mjs';
const auth = createLocalPasswordAdapter(createMemoryAdapter());
await auth.login({ username: 'admin', password: 'password' });

// OAuth stub (simulates OAuth flow)
const auth = createOAuthStubAdapter({
  provider: 'github',
  delay: 500,
  mockToken: 'test-token-123',
});
await auth.login({ provider: 'github' });

// Route guard
const guard = createRouteGuard(auth);
guard.canAccess('/admin'); // → boolean

// Authenticated API client (injects Authorization header)
import { createFetchAdapter } from '../../modules/api-client/public-api.mjs';
const api = createFetchAdapter({ baseUrl: 'https://api.example.com' });
const authedApi = createAuthenticatedClient(api, auth);
// All requests now include Authorization: Bearer <token>
```

### Dependencies: `api-client` (for `createAuthenticatedClient`), `node:crypto` (for `node-oauth-crypto` adapter)

---

## 8. ai-chat

**Pluggable AI chat with streaming support.**

### Public API

```javascript
import {
  assertAiChatPort,        // (adapter) → void | throws TypeError
  createEchoAdapter,       // (options?) → AiChatPort
  createHttpApiAdapter,    // (options) → AiChatPort
  createMessageHistory,    // (options?) → MessageHistory
} from '../../modules/ai-chat/public-api.mjs';
```

### AiChatPort Interface

```typescript
interface AiChatPort {
  sendMessage(message: string, options?: ChatOptions): Promise<ChatResponse>;
  streamMessage?(message: string, options?: ChatOptions): AsyncIterable<string>;
}

interface ChatResponse {
  role: 'assistant';
  content: string;
}

interface MessageHistory {
  add(message: { role: string; content: string }): void;
  getMessages(): Array<{ role: string; content: string }>;
  getPromptContext(): string;
  clear(): void;
}
```

### Usage

```javascript
// Echo adapter (dev/testing — mirrors input)
const chat = createEchoAdapter({ delay: 100 });
const response = await chat.sendMessage('Hello');
// → { role: 'assistant', content: 'Echo: Hello' }

// HTTP API adapter (OpenAI-compatible endpoints)
const chat = createHttpApiAdapter({
  endpoint: 'https://api.openai.com/v1/chat/completions',
  apiKey: 'sk-...',
  model: 'gpt-4',
  formatRequest: (messages) => ({ model: 'gpt-4', messages }),
  formatResponse: (data) => data.choices[0].message,
});

// Message history (conversation context)
const history = createMessageHistory({ maxMessages: 50 });
history.add({ role: 'user', content: 'Hello' });
history.add({ role: 'assistant', content: 'Hi there!' });
history.getPromptContext(); // formatted conversation string
```

### Dependencies: `api-client` (for HTTP adapter)

---

## 9. local-llm

**In-browser LLM inference with WebGPU and WASM backends.**

### Public API

```javascript
import {
  assertLocalLlmPort,          // (adapter) → void | throws TypeError
  createWebLlmAdapter,         // (options?) → LocalLlmPort
  createTransformersAdapter,   // (options?) → LocalLlmPort
  createModelCacheManager,     // () → ModelCacheManager
} from '../../modules/local-llm/public-api.mjs';
```

### LocalLlmPort Interface (extends AiChatPort)

```typescript
interface LocalLlmPort extends AiChatPort {
  loadModel(modelId: string, onProgress?: (p: number) => void): Promise<void>;
  unloadModel(): Promise<void>;
  isModelLoaded(): boolean;
}

interface ModelCacheManager {
  getCachedModels(): Promise<string[]>;
  clearModel(modelId: string): Promise<void>;
  clearAll(): Promise<void>;
  getCacheSize(): Promise<number>;
}
```

### Usage

```javascript
// WebLLM adapter (WebGPU — fastest, requires compatible GPU)
const llm = createWebLlmAdapter();
await llm.loadModel('Llama-3-8B-Instruct-q4f16', (progress) => {
  console.log(`Loading: ${Math.round(progress * 100)}%`);
});
const response = await llm.sendMessage('Explain quantum computing');

// Transformers.js adapter (WASM — wider compatibility)
const llm = createTransformersAdapter();
await llm.loadModel('Xenova/distilgpt2');
const response = await llm.sendMessage('Hello');

// Model cache manager
const cache = createModelCacheManager();
const models = await cache.getCachedModels();
await cache.clearModel('old-model-id');
```

> **Note:** No models are bundled. They are downloaded at runtime from CDN. WebLLM requires WebGPU support (Chrome 113+, Edge 113+). Transformers.js works via WASM in all modern browsers.

### Dependencies: `ai-chat` (extends AiChatPort)

---

## 10. retrieval

**Complete RAG pipeline — chunking, indexing, searching, re-ranking, prompt assembly.**

This is the most feature-rich module. All implementations are zero-dependency and browser-compatible.

### Public API — Ports

```javascript
import {
  // Port validators
  assertRetrievalPort,          // RetrievalPort validator
  assertChunkerPort,            // ChunkerPort validator
  assertTokenizerPort,          // TokenizerPort validator
  assertEmbedderPort,           // EmbedderPort validator
  assertReRankerPort,           // ReRankerPort validator
  assertDocumentLoaderPort,     // DocumentLoaderPort validator
  assertQueryTransformerPort,   // QueryTransformerPort validator
} from '../../modules/retrieval/public-api.mjs';
```

### Public API — Chunkers

```javascript
import {
  createChunker,                     // alias for createCharacterChunker
  createCharacterChunker,            // sliding window (size + overlap)
  createRecursiveCharacterChunker,   // hierarchical separator splitting
  createSentenceChunker,             // sentence boundary detection
  createMarkdownChunker,             // heading-based section splitting
} from '../../modules/retrieval/public-api.mjs';
```

**Chunker usage:**
```javascript
// Character chunker (sliding window)
const chunker = createCharacterChunker({ chunkSize: 500, chunkOverlap: 50 });
const chunks = chunker.chunk('Very long text...');
// → [{ content, metadata: { start, end } }, ...]

// Recursive character chunker (smart splitting)
const chunker = createRecursiveCharacterChunker({
  maxSize: 500,
  overlap: 50,
  separators: ['\n\n', '\n', '. ', ' '],  // optional custom
});

// Sentence chunker (abbreviation-aware)
const chunker = createSentenceChunker({ maxSentencesPerChunk: 5 });

// Markdown chunker (heading-based)
const chunker = createMarkdownChunker();
// → [{ content, metadata: { heading, headingLevel, hierarchy } }, ...]
```

### Public API — Tokenizers

```javascript
import {
  createCharCountTokenizer,          // 1 char = 1 token
  createApproxTiktokenTokenizer,     // ~4 chars = 1 token (heuristic)
} from '../../modules/retrieval/public-api.mjs';
```

**Tokenizer usage:**
```javascript
const tokenizer = createApproxTiktokenTokenizer();
tokenizer.countTokens('Hello world'); // → ~3
tokenizer.truncateToTokens('Very long text...', 10); // truncated to ~10 tokens
```

### Public API — Embedder

```javascript
import {
  createEchoEmbedder,               // deterministic hash-based (for testing)
} from '../../modules/retrieval/public-api.mjs';
```

**Embedder usage:**
```javascript
const embedder = createEchoEmbedder({ dimensions: 384 });
const vectors = embedder.embed(['Hello', 'World']);
// → [[0.42, 0.17, ...], [0.31, 0.88, ...]]  (384-dim each)
```

### Public API — Search Adapters

```javascript
import {
  createBm25Adapter,                // keyword search (TF-IDF)
  createVectorLocalAdapter,         // cosine similarity
  createHybridSearchAdapter,        // RRF over multiple sources
  createWeightedHybridAdapter,      // weighted RRF
} from '../../modules/retrieval/public-api.mjs';
```

**Search usage:**
```javascript
// BM25 keyword search
const bm25 = createBm25Adapter({ k1: 1.5, b: 0.75 });
bm25.index(documents);  // [{ id, content, metadata }]
const results = bm25.search('machine learning', { topK: 5 });
// → [{ document, score }, ...]

// Vector search (requires pre-computed embeddings)
const vector = createVectorLocalAdapter();
vector.index(documents, embeddings);  // documents + float[][] embeddings
const results = vector.search(queryEmbedding, { topK: 5 });

// Hybrid search (RRF fusion of multiple retrievers)
const hybrid = createHybridSearchAdapter([bm25, vector]);
const results = hybrid.search('machine learning', { topK: 10 });

// Weighted hybrid (per-source weights)
const weighted = createWeightedHybridAdapter([
  { retriever: bm25, weight: 0.4 },
  { retriever: vector, weight: 0.6 },
]);
```

### Public API — Re-ranker

```javascript
import {
  createScoreThresholdReRanker,     // min-score filter + topK sort
} from '../../modules/retrieval/public-api.mjs';
```

**Re-ranker usage:**
```javascript
const reranker = createScoreThresholdReRanker({
  minScore: 0.1,
  topK: 5,
});
const reranked = reranker.rerank(searchResults);
// → top 5 results with score >= 0.1, sorted descending
```

### Public API — Document Loaders

```javascript
import {
  createPlainTextLoader,            // passthrough single document
  createMarkdownLoader,             // heading-based splitting
  createHtmlLoader,                 // HTML tag stripping + entity decoding
} from '../../modules/retrieval/public-api.mjs';
```

**Loader usage:**
```javascript
// Plain text
const loader = createPlainTextLoader();
const docs = loader.load('Raw text content');
// → [{ id, content: 'Raw text content', metadata: {} }]

// Markdown (splits by headings)
const loader = createMarkdownLoader();
const docs = loader.load('# Title\n\nIntro.\n\n## Section\n\nContent.');
// → [{ id, content: 'Intro.', metadata: { heading: '# Title', title: 'Title', headingLevel: 1 } },
//    { id, content: 'Content.', metadata: { heading: '## Section', title: 'Section', headingLevel: 2 } }]

// HTML (strips tags, decodes entities)
const loader = createHtmlLoader();
const docs = loader.load('<p>Hello <b>world</b> &amp; more</p>');
// → [{ id, content: 'Hello world & more', metadata: {} }]
```

### Public API — Query Transformers

```javascript
import {
  createPassthroughTransformer,     // identity (no change)
  createMultiQueryTransformer,      // template-based expansion
} from '../../modules/retrieval/public-api.mjs';
```

**Transformer usage:**
```javascript
// Passthrough
const t = createPassthroughTransformer();
t.transform('my query'); // → 'my query'

// Multi-query expansion
const t = createMultiQueryTransformer({
  templates: ['original: {query}', 'explain: {query}', 'summarize: {query}'],
});
t.transform('RAG pipelines');
// → ['RAG pipelines', 'original: RAG pipelines', 'explain: RAG pipelines', 'summarize: RAG pipelines']
// (always includes the original query)
```

### Public API — Prompt Assembly

```javascript
import {
  createAugmentPrompt,             // context-augmented prompt builder
} from '../../modules/retrieval/public-api.mjs';
```

**AugmentPrompt usage:**
```javascript
const augment = createAugmentPrompt(bm25, {
  template: 'Context:\n{context}\n\nQuestion: {query}',
  topK: 3,
  tokenizer: createApproxTiktokenTokenizer(),
  maxContextTokens: 2000,
});

const prompt = augment('What is machine learning?');
// → 'Context:\n[relevant chunks]\n\nQuestion: What is machine learning?'
```

### Dependencies: None

---

## 11. knowledge-graph

**GraphRAG foundation — entity extraction, relationships, graph traversal.**

### Public API

```javascript
import {
  // Port validators
  assertGraphStorePort,                // GraphStorePort validator
  assertEntityExtractorPort,           // EntityExtractorPort validator
  assertRelationshipExtractorPort,     // RelationshipExtractorPort validator

  // Adapters
  createMemoryGraphAdapter,            // in-memory graph store
  createRegexEntityExtractor,          // regex-based entity extraction
  createCooccurrenceRelationshipExtractor, // sentence-level co-occurrence

  // Domain utilities
  bfsTraverse,                         // multi-hop BFS traversal
  findConnectedComponents,             // Union-Find community detection
} from '../../modules/knowledge-graph/public-api.mjs';
```

### GraphStorePort Interface

```typescript
interface GraphStorePort {
  addEntities(entities: Entity[]): void;
  addRelationships(relationships: Relationship[]): void;
  getNeighbors(entityId: string, depth?: number): Entity[];
  traverse(startId: string, options?: TraverseOptions): TraverseResult;
  clear(): void;
}

interface Entity { id: string; label: string; type?: string; metadata?: Record<string, unknown>; }
interface Relationship { source: string; target: string; type: string; weight?: number; }
```

### Usage

```javascript
// Create graph store
const graph = createMemoryGraphAdapter();

// Extract entities from text
const extractor = createRegexEntityExtractor();
const entities = extractor.extract('Albert Einstein published his theory of relativity in Berlin.');
// → [{ id: 'albert-einstein', label: 'Albert Einstein', type: 'proper-noun' },
//    { id: 'berlin', label: 'Berlin', type: 'proper-noun' }]

// Extract relationships
const relExtractor = createCooccurrenceRelationshipExtractor();
const relationships = relExtractor.extract(entities, 'Albert Einstein published his theory in Berlin.');
// → [{ source: 'albert-einstein', target: 'berlin', type: 'co-occurrence', weight: 1 }]

// Build graph
graph.addEntities(entities);
graph.addRelationships(relationships);

// Query graph
const neighbors = graph.getNeighbors('albert-einstein', 2); // 2-hop neighbors

// BFS traversal
const traversal = bfsTraverse(graph, 'albert-einstein', { maxDepth: 3 });
// → { visited: Set, paths: Map }

// Community detection
const components = findConnectedComponents(graph);
// → [Set(['albert-einstein', 'berlin']), Set([...])]
```

### Dependencies: None

---

## Composed Use Case: GraphRAG (retrieval + knowledge-graph)

The `retrieval` and `knowledge-graph` modules are independent hex modules, but together they form a **GraphRAG pipeline** — retrieval-augmented generation enhanced with structured knowledge graph context. Here is how they compose:

```javascript
import {
  createCharacterChunker,
  createBm25Adapter,
  createAugmentPrompt,
} from '../../modules/retrieval/public-api.mjs';

import {
  createMemoryGraphAdapter,
  createRegexEntityExtractor,
  createCooccurrenceRelationshipExtractor,
  bfsTraverse,
} from '../../modules/knowledge-graph/public-api.mjs';

// 1. Classical RAG — chunk, index, search
const chunker = createCharacterChunker({ chunkSize: 500, chunkOverlap: 50 });
const chunks = chunker.chunk(document);

const bm25 = createBm25Adapter();
bm25.index(chunks);

// 2. Graph layer — extract entities/relationships, build knowledge graph
const entityExtractor = createRegexEntityExtractor();
const relExtractor = createCooccurrenceRelationshipExtractor();
const graph = createMemoryGraphAdapter();

for (const chunk of chunks) {
  const entities = entityExtractor.extract(chunk.text);
  const rels = relExtractor.extract(entities, chunk.text);
  graph.addEntities(entities);
  graph.addRelationships(rels);
}

// 3. GraphRAG query — combine text retrieval with graph traversal
function graphRagQuery(question) {
  // Text retrieval context
  const augment = createAugmentPrompt(bm25, { topK: 3 });
  const textContext = augment(question);

  // Graph traversal context — find entities mentioned in the query,
  // then expand via BFS to discover related concepts
  const queryEntities = entityExtractor.extract(question);
  const graphContext = queryEntities
    .flatMap(e => {
      const result = bfsTraverse(graph, e.id, { maxDepth: 2 });
      return [...result.visited];
    })
    .map(id => graph.getNeighbors(id, 1))
    .flat()
    .map(e => e.label);

  return `${textContext}\n\nRelated concepts: ${[...new Set(graphContext)].join(', ')}`;
}
```

This composed pattern keeps both modules independently testable and removable while enabling the full GraphRAG experience when both are present.

---

## 12. onboarding

**Guided walkthrough tours with spotlight overlay and step-by-step popovers.**

### Public API

```javascript
import {
  // Domain
  createTourStep,           // (target, title, desc, opts?) → TourStep
  isValidStep,              // (step) → boolean
  resetStepCounter,         // () → void (tests only)
  createTourState,          // (steps) → TourState
  startTour,                // (state) → TourState
  nextStep,                 // (state) → TourState
  previousStep,             // (state) → TourState
  endTour,                  // (state) → TourState
  getCurrentStep,           // (state) → TourStep | null
  canAdvance,               // (state) → boolean
  canGoBack,                // (state) → boolean
  isFirstStep,              // (state) → boolean
  isLastStep,               // (state) → boolean
  // Port
  assertOnboardingPort,     // (adapter) → void | throws TypeError
  // Adapters
  createMemoryOnboardingAdapter,  // (opts?) → OnboardingPort
  createDomOnboardingAdapter,     // (opts?) → OnboardingPort
  // Messages
  t, setLocale, getLocale, registerLocale, resetLocale,
} from '../../modules/onboarding/public-api.mjs';
```

### Usage

```javascript
import {
  createTourStep,
  createDomOnboardingAdapter,
} from '../../modules/onboarding/public-api.mjs';

const adapter = createDomOnboardingAdapter({
  onComplete: () => console.log('Tour finished'),
});

adapter.startTour([
  createTourStep('site-header', 'Navigation', 'This is the main header.', { order: 1 }),
  createTourStep('site-main', 'Content', 'Your main content area.', { order: 2 }),
  createTourStep('site-footer', 'Footer', 'Links and copyright.', { order: 3 }),
]);
```

### DOM adapter features

- Box-shadow spotlight cutout with smooth CSS transitions
- Popover with title, description, step counter, prev/next/close buttons
- Keyboard navigation (Escape, arrow keys)
- Auto-scroll target into view, viewport clamping
- Dark theme detection (`data-theme="dark"`)
- ARIA `role="dialog"` for accessibility
- Upgrade path to Driver.js (~5 KB, MIT) documented in module README

### Dependencies: None

---

## 13. example-greeter

**Minimal teaching example of a hex module.**

### Public API

```javascript
import {
  greet,                     // (name, adapter?) → string
  assertGreetingPort,        // (adapter) → void | throws TypeError
  defaultGreetingAdapter,    // built-in default adapter
} from '../../modules/example-greeter/public-api.mjs';
```

### Usage

```javascript
// Default greeting
greet('World'); // → 'Hello, World!'

// Custom adapter
const casual = { formatGreeting: (name) => `Hey ${name}!` };
greet('World', casual); // → 'Hey World!'
```

### Dependencies: None

> **Note:** This module exists purely as a teaching example. It demonstrates the minimal viable hex module structure. Remove it with `node scripts/detach-module.mjs example-greeter` when starting real development.

---

## 14. log

**Structured logging with scoped child loggers and multiple output targets.**

### Public API

```javascript
import {
  LOG_LEVEL_PRIORITY,          // { debug: 0, info: 1, warn: 2, error: 3 }
  shouldLog,                   // (level, minLevel) → boolean
  assertLogPort,               // (adapter) → void | throws TypeError
  createConsoleAdapter,        // (options?) → LogPort
  createStructuredJsonAdapter, // (options?) → LogPort
  createNoOpAdapter,           // () → LogPort
  createRemoteAdapter,         // (options) → LogPort
} from '../../modules/log/public-api.mjs';
```

### LogPort Interface

```typescript
interface LogPort {
  debug(msg: string, data?: unknown): void;
  info(msg: string, data?: unknown): void;
  warn(msg: string, data?: unknown): void;
  error(msg: string, data?: unknown): void;
  child(scope: string): LogPort;
}
```

### Usage

```javascript
const logger = createConsoleAdapter({ minLevel: 'info' });
logger.info('Server started', { port: 3000 });

// Scoped child logger
const dbLogger = logger.child('db');
dbLogger.warn('Connection pool exhausted');
// → [warn][db] Connection pool exhausted

// Structured JSON (for log aggregators)
const json = createStructuredJsonAdapter({ minLevel: 'warn' });
json.error('Payment failed', { orderId: '123' });
// → {"level":"error","message":"Payment failed","data":{"orderId":"123"},"timestamp":...}

// Remote (sends batched log entries to an HTTP endpoint)
const remote = createRemoteAdapter({ endpoint: '/api/logs', batchSize: 10 });
```

### Dependencies: None

---

## 15. cache

**TTL/LRU caching with pluggable storage backends.**

### Public API

```javascript
import {
  isExpired,                   // (entry) → boolean
  createLruTracker,            // (maxEntries) → LruTracker
  assertCachePort,             // (adapter) → void | throws TypeError
  createMemoryLruAdapter,      // (options?) → CachePort
  createLocalStorageCacheAdapter, // (options?) → CachePort
  createIndexedDBCacheAdapter, // (options?) → Promise<CachePort>
} from '../../modules/cache/public-api.mjs';
```

### CachePort Interface

```typescript
interface CachePort {
  get(key: string): unknown | undefined;
  set(key: string, value: unknown, options?: { ttl?: number; size?: number }): void;
  delete(key: string): boolean;
  has(key: string): boolean;
  clear(): void;
  size(): number;
  keys(): string[];
}
```

### Usage

```javascript
// In-memory LRU with TTL
const cache = createMemoryLruAdapter({ maxEntries: 100, defaultTtl: 60_000 });
cache.set('user:123', userData, { ttl: 30_000 });
cache.get('user:123'); // → userData (or undefined if expired)
cache.size();          // → 1

// localStorage-backed (persists across page reloads)
const persistent = createLocalStorageCacheAdapter({ prefix: 'myapp', defaultTtl: 3600_000 });

// IndexedDB-backed (async factory, sync operations after init)
const idb = await createIndexedDBCacheAdapter({ dbName: 'myapp-cache' });
```

### Dependencies: None

---

## 16. form-validation

**Composable, pure-domain validation rules with no framework dependency.**

### Public API

```javascript
import {
  required,           // () → Rule
  minLength,          // (n) → Rule
  maxLength,          // (n) → Rule
  pattern,            // (regex, msg?) → Rule
  email,              // () → Rule
  matches,            // (otherField, msg?) → Rule
  custom,             // (fn, msg?) → Rule
  combineRules,       // (...rules) → Rule
  validateField,      // (value, rules) → { valid, errors }
  validateForm,       // (formData, schema) → { valid, errors }
  isFormValid,        // (formData, schema) → boolean
} from '../../modules/form-validation/public-api.mjs';
```

### Usage

```javascript
// Field-level validation
const nameRules = combineRules(required(), minLength(2), maxLength(50));
const result = validateField('Al', nameRules);
// → { valid: true, errors: [] }

// Form-level validation
const schema = {
  email: combineRules(required(), email()),
  password: combineRules(required(), minLength(8)),
  confirm: combineRules(required(), matches('password')),
};
const form = validateForm({ email: 'a@b.c', password: '12345678', confirm: '12345678' }, schema);
// → { valid: true, errors: {} }
```

### Dependencies: None (pure domain, no adapters)

---

## 17. realtime

**Transport abstraction for real-time communication (WebSocket, SSE, long-polling, WebRTC).**

### Public API

```javascript
import {
  assertRealtimePort,           // (adapter) → void | throws TypeError
  assertTransportPort,          // (adapter) → void | throws TypeError
  ConnectionStates,             // { CONNECTING, CONNECTED, DISCONNECTING, DISCONNECTED, ERROR }
  createConnectionStateMachine, // () → StateMachine
  createReconnectionStrategy,   // (options?) → ReconnectionStrategy
  createHeartbeat,              // (options?) → Heartbeat
  createTransportManager,       // (transports, options?) → RealtimePort
  createWebSocketTransport,     // (options?) → TransportPort
  createSseTransport,           // (options?) → TransportPort
  createLongPollingTransport,   // (options?) → TransportPort
  createWebRtcTransport,        // (options?) → TransportPort
} from '../../modules/realtime/public-api.mjs';
```

### RealtimePort Interface

```typescript
interface RealtimePort {
  connect(url: string, options?: object): Promise<void>;
  disconnect(): Promise<void>;
  send(channel: string, data: unknown): void;
  subscribe(channel: string, callback: Function): void;
  unsubscribe(channel: string, callback?: Function): void;
  onConnectionChange(callback: Function): void;
  getState(): string;
}
```

### Usage

```javascript
// Transport manager with automatic failover
const rt = createTransportManager([
  createWebSocketTransport(),
  createSseTransport(),
  createLongPollingTransport(),
], {
  reconnection: createReconnectionStrategy({ maxRetries: 5, baseDelay: 1000 }),
  heartbeat: createHeartbeat({ interval: 30_000 }),
});

await rt.connect('wss://api.example.com/ws');
rt.subscribe('messages', (data) => console.log('New message:', data));
rt.send('messages', { text: 'Hello' });
rt.onConnectionChange((state) => console.log('Connection:', state));
```

### Dependencies: None

---

## 18. task

**Background task processing via Web Workers with progress tracking.**

### Public API

```javascript
import {
  assertTaskPort,        // (adapter) → void | throws TypeError
  createTaskLifecycle,   // () → TaskLifecycle
  serializeForTransfer,  // (data) → { data, transferables }
  createWebWorkerAdapter,  // (options?) → TaskPort
  createMainThreadAdapter, // (options?) → TaskPort
} from '../../modules/task/public-api.mjs';
```

### TaskPort Interface

```typescript
interface TaskPort {
  enqueue(fn: Function, options?: TaskOptions): TaskHandle;
  cancel(taskId: string): void;
  getStatus(taskId: string): TaskStatus | undefined;
  onProgress(taskId: string, callback: (p: TaskProgress) => void): void;
  onComplete(taskId: string, callback: (r: TaskResult) => void): void;
  drain(): Promise<void>;
}

interface TaskHandle { id: string; cancel(): void; result: Promise<TaskResult>; }
interface TaskProgress { taskId: string; progress: number; message?: string; }
interface TaskResult { taskId: string; status: TaskStatus; result?: unknown; error?: string; }
```

### Usage

```javascript
// Web Worker pool (offloads CPU-heavy work)
const pool = createWebWorkerAdapter({ poolSize: 4, timeout: 30_000 });

const handle = pool.enqueue((data) => {
  // Runs in a Worker thread
  return heavyComputation(data);
}, { transferables: [buffer] });

pool.onProgress(handle.id, (p) => console.log(`${p.progress * 100}%`));
const result = await handle.result;

// Main-thread fallback (for environments without Worker support)
const sync = createMainThreadAdapter();
```

### Dependencies: None

---

## 19. permission

**RBAC and granular permission checking with role hierarchy.**

### Public API

```javascript
import {
  assertPermissionPort,        // (adapter) → void | throws TypeError
  createRoleHierarchy,         // (config) → RoleHierarchy
  matchRule,                   // (rule, action, resource, conditions?) → boolean
  createStaticRulesAdapter,    // (rules, hierarchy?) → PermissionPort
  createDynamicPermissionAdapter, // (options?) → PermissionPort
} from '../../modules/permission/public-api.mjs';
```

### PermissionPort Interface

```typescript
interface PermissionPort {
  can(action: string, resource: string, conditions?: Record<string, any>): boolean;
  cannot(action: string, resource: string, conditions?: Record<string, any>): boolean;
  grant(rule: PermissionRule): void;
  revoke(action: string, resource: string, role?: string): void;
  getRulesForRole(role: string): PermissionRule[];
  setUser(user: { role: string }): void;
}
```

### Usage

```javascript
// Static rules (config-driven, immutable after creation)
const perms = createStaticRulesAdapter([
  { role: 'admin', action: '*', resource: '*', effect: 'allow' },
  { role: 'editor', action: 'read', resource: 'article', effect: 'allow' },
  { role: 'editor', action: 'write', resource: 'article', effect: 'allow' },
  { role: 'viewer', action: 'read', resource: 'article', effect: 'allow' },
], createRoleHierarchy({ admin: ['editor'], editor: ['viewer'] }));

perms.setUser({ role: 'editor' });
perms.can('write', 'article');  // → true
perms.can('delete', 'article'); // → false

// Dynamic (runtime grant/revoke)
const dynamic = createDynamicPermissionAdapter();
dynamic.setUser({ role: 'user' });
dynamic.grant({ role: 'user', action: 'read', resource: 'profile', effect: 'allow' });
```

### Dependencies: `auth` (uses user context type)

---

## 20. file

**File upload, download, and processing with progress tracking.**

### Public API

```javascript
import {
  assertFilePort,       // (adapter) → void | throws TypeError
  detectMimeType,       // (filename) → string
  getExtension,         // (filename) → string
  MIME_TYPES,           // { pdf, png, jpg, ... }
  validateFile,         // (file, options) → { valid, errors }
  formatFileSize,       // (bytes) → string
  generateFileId,       // () → string
  createBlobAdapter,    // (options?) → FilePort
  createFileSystemAdapter, // (options?) → FilePort
} from '../../modules/file/public-api.mjs';
```

### FilePort Interface

```typescript
interface FilePort {
  upload(file: any, options?: FileOptions): Promise<FileResult>;
  download(url: string, options?: FileOptions): Promise<FileResult>;
  read(file: any, format?: 'text' | 'arrayBuffer' | 'dataUrl'): Promise<any>;
  preview(file: any): string;
  getMetadata(file: any): FileMetadata;
  list(path?: string, options?: object): Promise<FileHandle[]>;
}
```

### Usage

```javascript
// Blob adapter (browser — XHR upload with progress, ReadableStream download)
const files = createBlobAdapter({ endpoint: '/api/files' });

const result = await files.upload(fileInput.files[0], {
  onProgress: (p) => console.log(`${p.percent}% uploaded`),
});

const downloaded = await files.download('/api/files/abc123', {
  onProgress: (p) => console.log(`${p.percent}% downloaded`),
});

// Validation
const check = validateFile(file, { maxSize: 5_000_000, allowedMimeTypes: ['image/png', 'image/jpeg'] });
if (!check.valid) console.error(check.errors);

// Utilities
formatFileSize(1_500_000); // → '1.43 MB'
detectMimeType('photo.jpg'); // → 'image/jpeg'
```

### Dependencies: None

---

## 21. analytics

**Privacy-first analytics with consent gating and behavioral tracking.**

### Public API

```javascript
import {
  assertAnalyticsPort,         // (adapter) → void | throws TypeError
  createSessionManager,        // () → SessionManager
  isConsentGranted,            // (consent, category) → boolean
  respectsDoNotTrack,          // () → boolean
  createDefaultConsent,        // () → ConsentState
  createMouseCollector,        // (options?) → MouseCollector
  createAnalyticsConsoleAdapter, // (options?) → AnalyticsPort
  createAnalyticsNoOpAdapter,  // () → AnalyticsPort
  createBehavioralAdapter,     // (options?) → AnalyticsPort
} from '../../modules/analytics/public-api.mjs';
```

### AnalyticsPort Interface

```typescript
interface AnalyticsPort {
  track(eventName: string, properties?: Record<string, any>): void;
  identify(userId: string, traits?: Record<string, any>): void;
  page(pageName?: string, properties?: Record<string, any>): void;
  setProperties(properties: Record<string, any>): void;
  reset(): void;
  getConsent(): ConsentState;
  setConsent(consent: Partial<ConsentState>): void;
}

interface ConsentState { analytics: boolean; behavioral: boolean; }
```

### Usage

```javascript
// Console adapter (dev — logs events to console)
const analytics = createAnalyticsConsoleAdapter();

// Respect Do Not Track and consent
if (!respectsDoNotTrack()) {
  analytics.setConsent({ analytics: true, behavioral: false });
}

analytics.identify('user-123', { plan: 'pro' });
analytics.page('Dashboard');
analytics.track('button_click', { label: 'Export', section: 'reports' });

// Behavioral tracking (mouse heatmaps, scroll depth)
const behavioral = createBehavioralAdapter({
  sampleRate: 0.1,
  flushInterval: 5000,
});

// No-op adapter (production opt-out or when consent is denied)
const noop = createAnalyticsNoOpAdapter();
```

### Dependencies: None

---

## 22. scheduler

**Periodic task scheduling with cron-like syntax, jitter, and visibility-aware execution.**

### Public API

```javascript
import {
  assertSchedulerPort,          // (adapter) → void | throws TypeError
  parseCronLike,                // (expr) → milliseconds
  addJitter,                    // (interval, jitter) → number
  createIntervalAdapter,        // (options?) → SchedulerPort
  createIdleAdapter,            // (options?) → SchedulerPort
  createVisibilityAwareAdapter, // (options?) → SchedulerPort
} from '../../modules/scheduler/public-api.mjs';
```

### SchedulerPort Interface

```typescript
interface SchedulerPort {
  schedule(taskFn: () => void | Promise<void>, config: ScheduleConfig, options?: ScheduleOptions): ScheduleHandle;
  cancel(scheduleId: string): void;
  pause(scheduleId: string): void;
  resume(scheduleId: string): void;
  getSchedule(scheduleId: string): ScheduleInfo | undefined;
  listSchedules(): ScheduleInfo[];
  destroy(): void;
}

interface ScheduleHandle { id: string; cancel(): void; pause(): void; resume(): void; }
```

### Usage

```javascript
// Interval-based scheduler
const scheduler = createIntervalAdapter();

const handle = scheduler.schedule(
  () => console.log('Heartbeat'),
  { interval: 'every 30s', maxRuns: 10, jitter: 2000 },
  { name: 'heartbeat' },
);

handle.pause();
handle.resume();
handle.cancel();

// Visibility-aware (pauses when tab is hidden, resumes when visible)
const visScheduler = createVisibilityAwareAdapter();
visScheduler.schedule(() => fetchUpdates(), { interval: 60_000 });

// Idle adapter (runs during requestIdleCallback windows)
const idleScheduler = createIdleAdapter();

// Cron-like parser
parseCronLike('every 5m');  // → 300000
parseCronLike('every 1h');  // → 3600000
```

### Dependencies: None

---

## 23. i18n

**Internationalization with interpolation, pluralization, and Intl formatting.**

### Public API

```javascript
import {
  interpolate,           // (template, params) → string
  createPluralResolver,  // (locale) → PluralResolver
  PLURAL_CATEGORIES,     // ['zero', 'one', 'two', 'few', 'many', 'other']
  createMessageRegistry, // () → MessageRegistry
  buildFallbackChain,    // (locale) → string[]
  resolveWithFallback,   // (registry, key, chain) → string | undefined
  assertI18nPort,        // (adapter) → void | throws TypeError
  createIntlAdapter,     // (options?) → I18nPort
  createMemoryI18nAdapter, // (options?) → I18nPort
} from '../../modules/i18n/public-api.mjs';
```

### I18nPort Interface

```typescript
interface I18nPort {
  t(key: string, params?: Record<string, string | number>): string;
  tp(key: string, count: number, forms: Record<string, string>, params?: Record<string, string | number>): string;
  setLocale(locale: string): void;
  getLocale(): string;
  getAvailableLocales(): string[];
  registerMessages(namespace: string, locale: string, messages: Record<string, string>): void;
  formatNumber(n: number, opts?: Intl.NumberFormatOptions): string;
  formatDate(d: Date, opts?: Intl.DateTimeFormatOptions): string;
  formatCurrency(amount: number, currency: string, opts?: Intl.NumberFormatOptions): string;
}
```

### Usage

```javascript
// Intl adapter (browser — uses native Intl APIs)
const i18n = createIntlAdapter({ defaultLocale: 'en' });
i18n.registerMessages('app', 'en', {
  'greeting': 'Hello, {name}!',
  'items': '{count} items',
});

i18n.t('app.greeting', { name: 'World' }); // → 'Hello, World!'

// Pluralization
i18n.tp('app.items', 3, { one: '1 item', other: '{count} items' }, { count: 3 });
// → '3 items'

// Intl formatting
i18n.formatNumber(1234.5);                    // → '1,234.5'
i18n.formatDate(new Date());                  // → 'Apr 3, 2026'
i18n.formatCurrency(19.99, 'USD');            // → '$19.99'

// Locale fallback chain
buildFallbackChain('pt-BR'); // → ['pt-BR', 'pt', 'en']

// Memory adapter (testing)
const test = createMemoryI18nAdapter({ defaultLocale: 'en' });
```

### Dependencies: None

---

## 24. db

**Database abstraction with query builder, transactions, and driver injection.**

### Public API

```javascript
import {
  assertDatabasePort,         // (adapter) → void | throws TypeError
  createQueryBuilder,         // (table) → QueryBuilder
  createMemoryDatabaseAdapter, // () → DatabasePort
  createSqlDriverAdapter,     // ({ driver }) → DatabasePort
} from '../../modules/db/public-api.mjs';
```

### DatabasePort Interface

```typescript
interface QueryResult {
  rows: Record<string, unknown>[];
  rowCount: number;
}

interface DatabasePort {
  query(sql: string, params?: unknown[]): QueryResult;
  execute(sql: string, params?: unknown[]): QueryResult;
  transaction(fn: (tx: { query, execute }) => void): void;
  close(): void;
}
```

### Usage

```javascript
// Memory adapter (testing / prototyping)
const db = createMemoryDatabaseAdapter();
db.execute('CREATE TABLE IF NOT EXISTS users (name TEXT, age INTEGER)');
db.execute('INSERT INTO users (name, age) VALUES (?, ?)', ['Alice', 30]);
const result = db.query('SELECT * FROM users WHERE age > ?', [25]);
// → { rows: [{ name: 'Alice', age: 30 }], rowCount: 1 }

// SQL driver adapter (production — wraps any SQL driver via injection)
const db = createSqlDriverAdapter({ driver: mySqliteDriver });
db.transaction((tx) => {
  tx.execute('INSERT INTO orders (item) VALUES (?)', ['widget']);
  tx.execute('UPDATE inventory SET count = count - 1 WHERE item = ?', ['widget']);
});

// Fluent query builder (pure, no adapter needed)
const { sql, params } = createQueryBuilder('users')
  .select('name', 'age')
  .where('age > ?', 25)
  .orderBy('name')
  .limit(10)
  .build();
// → { sql: 'SELECT name, age FROM users WHERE age > ? ORDER BY name ASC LIMIT 10', params: [25] }
```

### Dependencies: None

---

## 25. openapi

**OpenAPI 3 document builder, document-provider port, and adapters for static and route-registry-driven specs.**

### Public API

```javascript
import {
  buildOpenApiDocument,             // (input) → OpenAPI 3.0.3 document
  assertOpenApiDocumentPort,        // (adapter) → void | throws TypeError
  createStaticOpenApiAdapter,       // (document) → OpenApiDocumentPort
  createRouteRegistryOpenApiAdapter,// (input) → OpenApiDocumentPort (lazy + cached)
} from '../../modules/openapi/public-api.mjs';
```

### OpenApiDocumentPort Interface

```typescript
interface OpenApiDocumentPort {
  getDocument(): Record<string, unknown>;
}
```

### Usage

```javascript
// Build from a route registry (recommended for the api-starter pattern)
const provider = createRouteRegistryOpenApiAdapter({
  info: { title: 'My API', version: '1.0.0' },
  servers: [{ url: 'http://localhost:3000', description: 'Local' }],
  routes: [
    {
      method: 'GET',
      path: '/health',
      summary: 'Liveness probe',
      tags: ['system'],
      responses: { 200: { description: 'OK' } },
    },
  ],
});
assertOpenApiDocumentPort(provider);
const doc = provider.getDocument();
// JSON.stringify(doc) → valid OpenAPI 3.0.3, consumable by Swagger UI / Redoc
```

The api-starter app exposes this document at `/openapi.json` — see
[apps/api-starter/app.mjs](../apps/api-starter/app.mjs) and
[apps/api-starter/routes/openapi.mjs](../apps/api-starter/routes/openapi.mjs).

### Dependencies: None

---

## 26. rate-limit

**Pure token-bucket rate-limiting domain plus an in-memory adapter behind a `RateLimiterPort`.**

### Public API

```javascript
import {
  createBucketState,       // (config, now) → BucketState
  refill,                  // (state, config, now) → void (mutates state)
  consume,                 // (state, config, now, cost?) → RateLimitDecision
  validateBucketConfig,    // (config) → void | throws TypeError
  assertRateLimiterPort,   // (adapter) → void | throws TypeError
  createMemoryRateLimiter, // ({ capacity, refillPerSecond, now? }) → RateLimiterPort
} from '../../modules/rate-limit/public-api.mjs';
```

### RateLimiterPort Interface

```typescript
interface RateLimitDecision {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
  resetAt: number;
}

interface RateLimiterPort {
  check(key: string, cost?: number): RateLimitDecision;
  reset(key: string): void;
  size(): number;
}
```

### Usage

```javascript
// Classic per-ip HTTP gate
const limiter = createMemoryRateLimiter({
  capacity: 20,         // burst of 20 requests
  refillPerSecond: 10,  // sustained ~10 rps
});

function handle(req, res) {
  const decision = limiter.check(req.socket.remoteAddress);
  if (!decision.allowed) {
    res.writeHead(429, {
      'Retry-After': Math.ceil(decision.retryAfterMs / 1000),
      'X-RateLimit-Remaining': String(decision.remaining),
    });
    res.end('Too Many Requests');
    return;
  }
  // ... normal processing
}

// Deterministic test — inject a clock
let now = 0;
const testLimiter = createMemoryRateLimiter({
  capacity: 2,
  refillPerSecond: 1,
  now: () => now,
});
```

The api-starter app gates every incoming request through this limiter — see
[apps/api-starter/app.mjs](../apps/api-starter/app.mjs).

### Dependencies: None

---

## 27. monitoring

**Exception tracking, structured messages, metrics, and spans behind a single `MonitoringPort` with swappable backends (memory, console, no-op).**

### Public API

```javascript
import {
  buildExceptionEvent,            // (error, now, context?, redactConfig?) → ExceptionEvent
  buildMessageEvent,              // (message, severity, now, context?, redactConfig?) → MessageEvent
  buildMetric,                    // (kind, name, value, now, tags?) → Metric
  finalizeSpan,                   // (pending, endedAt, status?) → Span
  redact,                         // (record, keys) → record with redacted keys
  redactContext,                  // (context, keys) → redacted MonitoringContext
  shouldSample,                   // (id, sampleRate) → boolean
  assertMonitoringPort,           // (adapter) → void | throws TypeError
  createMemoryMonitoringAdapter,  // ({ now?, redactKeys?, sampleRate?, idFactory? }) → MonitoringPort + readers
  createConsoleMonitoringAdapter, // ({ writer?, now?, redactKeys? }) → MonitoringPort
  createNoOpMonitoringAdapter,    // () → MonitoringPort
} from '../../modules/monitoring/public-api.mjs';
```

### MonitoringPort Interface

```typescript
type Severity = 'debug' | 'info' | 'warning' | 'error' | 'fatal';

interface MonitoringContext {
  tags?: Record<string, unknown>;
  extra?: Record<string, unknown>;
  user?: string;
}

interface PendingSpan {
  id: string;
  name: string;
  setAttributes(attrs: Record<string, unknown>): void;
  end(status?: 'ok' | 'error'): Span;
}

interface MonitoringPort {
  captureException(error: unknown, context?: MonitoringContext): ExceptionEvent | null;
  captureMessage(message: string, severity?: Severity, context?: MonitoringContext): MessageEvent | null;
  increment(name: string, value?: number, tags?: Record<string, unknown>): Metric;
  gauge(name: string, value: number, tags?: Record<string, unknown>): Metric;
  histogram(name: string, value: number, tags?: Record<string, unknown>): Metric;
  startSpan(name: string, attributes?: Record<string, unknown>): PendingSpan;
  flush(): void;
}
```

### Usage

```javascript
// Production: console adapter emits JSON lines
const monitoring = createConsoleMonitoringAdapter({
  redactKeys: ['authorization', 'cookie', 'password'],
});
assertMonitoringPort(monitoring);

monitoring.increment('http.request', 1, { route: '/api/greet' });
const span = monitoring.startSpan('db.query', { table: 'users' });
try {
  // ... do work ...
  span.end('ok');
} catch (err) {
  monitoring.captureException(err, { tags: { route: '/api/greet' } });
  span.end('error');
  throw err;
}

// Tests: memory adapter buffers records for assertions
let now = 1000;
const m = createMemoryMonitoringAdapter({ now: () => now });
m.captureMessage('hi', 'info');
m.increment('req');
m.events();   // [{ kind: 'message', severity: 'info', ... }]
m.metrics();  // [{ kind: 'counter', name: 'req', value: 1, ... }]

// Swap in a real backend by writing one new adapter (e.g. adapters/sentry-adapter.mjs)
// that implements MonitoringPort — no caller has to change.
```

The api-starter app wraps every request with monitoring — counters per route,
spans around handler execution, exceptions on 5xx errors. See
[apps/api-starter/app.mjs](../apps/api-starter/app.mjs).

### Dependencies: None

---

## 28. job-queue

**Background job queue — pure lifecycle domain, in-memory adapter with retry/backoff, and a framework-free pull-based worker loop, all behind a single `JobQueuePort`.**

### Public API

```javascript
import {
  createJob,               // ({ id, name, payload, now, maxAttempts?, delayMs? }) → Job
  isReady,                 // (job, now) → boolean
  markRunning,             // (job, now) → void
  markCompleted,           // (job, now) → void
  markFailed,              // (job, now, errorMessage, computeBackoffMs) → 'retry' | 'dead'
  exponentialBackoff,      // (attempt, baseMs, capMs?) → number
  validateEnqueue,         // (name, options?) → void | throws
  assertJobQueuePort,      // (adapter) → void | throws TypeError
  createMemoryJobQueue,    // ({ now?, idFactory?, backoffMs? }) → JobQueuePort
  createJobWorker,         // ({ queue, handlers, onEvent? }) → { runOnce, runUntilEmpty }
} from '../../modules/job-queue/public-api.mjs';
```

### JobQueuePort Interface

```typescript
type JobStatus = 'pending' | 'running' | 'completed' | 'failed';

interface Job {
  id: string;
  name: string;
  payload: unknown;
  status: JobStatus;
  attempts: number;
  maxAttempts: number;
  runAfter: number;
  createdAt: number;
  updatedAt: number;
  lastError?: string;
}

interface EnqueueOptions {
  maxAttempts?: number;
  delayMs?: number;
}

interface JobQueuePort {
  enqueue(name: string, payload: unknown, options?: EnqueueOptions): Job;
  dequeue(): Job | null;
  complete(id: string): void;
  fail(id: string, error: string): 'retry' | 'dead';
  list(status?: JobStatus): Job[];
  size(status?: JobStatus): number;
}
```

### Lifecycle

```text
pending → running → completed
                 → failed        (attempts >= maxAttempts)
                 → pending       (retry with exponential backoff)
```

### Usage

```javascript
const queue = createMemoryJobQueue();
assertJobQueuePort(queue);

// Enqueue a job with retry policy
queue.enqueue('send-email', { to: 'alice@example.com' }, { maxAttempts: 5 });

// Build a worker with a handler map — handlers can be sync or async
const worker = createJobWorker({
  queue,
  handlers: {
    'send-email': async (payload) => mailer.send(payload),
  },
  onEvent: (e) => console.log(e.type, e.job.id, e.error),
});

// Pull-based — the host decides when to tick
setInterval(() => worker.runUntilEmpty(), 1000);
```

### Deterministic tests

```javascript
let now = 0;
const queue = createMemoryJobQueue({
  now: () => now,
  idFactory: (() => { let n = 0; return () => `j${++n}`; })(),
  backoffMs: (attempt) => attempt * 10,
});
```

The api-starter app wires `createMemoryJobQueue` + `createJobWorker` into
`createAppContext` and exposes three demo routes — `/api/jobs/enqueue`,
`/api/jobs`, `/api/jobs/run` — that drive the queue end-to-end.

### Dependencies: None

---

## 29. email

**Outbound email module — pure message domain, memory + console adapters behind a narrow `EmailPort`. Pairs naturally with `job-queue` so HTTP handlers stay non-blocking.**

### Public API

```javascript
import {
  createEmailMessage,        // (input) → EmailMessage | throws TypeError
  isValidEmailAddress,       // (address) → boolean
  assertEmailAddress,        // (address) → void | throws TypeError
  normalizeRecipients,       // (string | string[] | undefined) → string[]
  recipientCount,            // (message) → number
  assertEmailPort,           // (adapter) → void | throws TypeError
  createMemoryEmailAdapter,  // ({ now?, idFactory? }) → EmailPort
  createConsoleEmailAdapter, // ({ log?, now?, idFactory? }) → EmailPort
} from '../../modules/email/public-api.mjs';
```

### EmailPort Interface

```typescript
type EmailStatus = 'queued' | 'sent' | 'failed';

interface EmailMessageInput {
  from: string;
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
  headers?: Record<string, string>;
}

interface EmailRecord {
  id: string;
  status: EmailStatus;
  message: EmailMessage;
  error?: string;
  sentAt?: number;
}

interface EmailPort {
  send(message: EmailMessageInput): Promise<EmailRecord>;
  list(status?: EmailStatus): EmailRecord[];
  clear(): void;
}
```

### Usage

```javascript
import { createMemoryEmailAdapter } from '../../modules/email/public-api.mjs';

const mailer = createMemoryEmailAdapter();
const record = await mailer.send({
  from: 'hello@example.com',
  to: 'alice@example.com',
  subject: 'Welcome',
  text: 'Thanks for signing up!',
});
console.log(record.id, record.status); // "email-1", "sent"
```

### Behind the job queue

```javascript
import { createMemoryJobQueue, createJobWorker } from '../../modules/job-queue/public-api.mjs';
import { createMemoryEmailAdapter } from '../../modules/email/public-api.mjs';

const mailer = createMemoryEmailAdapter();
const queue = createMemoryJobQueue();
const worker = createJobWorker({
  queue,
  handlers: { 'send-email': (payload) => mailer.send(payload) },
});

queue.enqueue('send-email', {
  from: 'hello@example.com',
  to: 'alice@example.com',
  subject: 'Welcome',
  text: 'Hi',
});
await worker.runUntilEmpty();
```

The api-starter app wires `createMemoryEmailAdapter` into `createAppContext`
and exposes two demo routes — `/api/email/send` and `/api/email/list` — that
enqueue outbound mail as `send-email` jobs delivered by the worker loop.

### Dependencies: None

---

## 30. search

**Full-text search module — pure tokenizer + inverted-index domain behind a narrow `SearchPort`, with an in-memory adapter that ships TF×IDF scoring, facet filters, and `<mark>` highlights. This is the user-facing search primitive (site search, autocomplete); for RAG-style chunk retrieval use `modules/retrieval`.**

### Public API

```javascript
import {
  createSearchDocument,       // (input) → SearchDocument | throws TypeError
  documentText,               // (document) → string
  tokenize,                   // (text, options?) → string[]
  defaultStopWords,           // () → Set<string>
  highlightMatches,           // (text, queryTokens) → string
  assertSearchPort,           // (adapter) → void | throws TypeError
  createMemorySearchAdapter,  // ({ now? }) → SearchPort
} from '../../modules/search/public-api.mjs';
```

### SearchPort Interface

```typescript
interface SearchDocumentInput {
  id: string;
  fields: Record<string, string>;
  facets?: Record<string, string | string[]>;
}

interface SearchOptions {
  limit?: number;
  offset?: number;
  filters?: Record<string, string | string[]>;
  highlight?: boolean;
}

interface SearchHit {
  id: string;
  score: number;
  document: SearchDocument;
  highlights: Record<string, string>;
}

interface SearchResult {
  total: number;
  hits: SearchHit[];
  took: number;
}

interface SearchPort {
  index(document: SearchDocumentInput): Promise<SearchDocument>;
  indexBatch(documents: SearchDocumentInput[]): Promise<SearchDocument[]>;
  search(query: string, options?: SearchOptions): Promise<SearchResult>;
  remove(id: string): Promise<boolean>;
  clear(): void;
}
```

### Usage

```javascript
import { createMemorySearchAdapter } from '../../modules/search/public-api.mjs';

const index = createMemorySearchAdapter();

await index.indexBatch([
  { id: '1', fields: { title: 'Hexagonal architecture', body: 'Ports and adapters' }, facets: { tag: 'arch' } },
  { id: '2', fields: { title: 'Trunk-based delivery', body: 'Small slices, frequent commits' }, facets: { tag: 'process' } },
]);

const result = await index.search('hexagonal', { filters: { tag: 'arch' } });
console.log(result.hits[0].id);                     // "1"
console.log(result.hits[0].highlights.title);       // "<mark>Hexagonal</mark> architecture"
```

The api-starter app wires `createMemorySearchAdapter` into `createAppContext`
and exposes two demo routes — `/api/search/query` and `/api/search/index` —
with a seeded index so queries return hits out of the box.

### Dependencies: None

---

## 31. payments

**Hexagonal payments module — pure money arithmetic, payment-intent state machine, and Stripe-style webhook HMAC verification behind a narrow `PaymentsPort`.**

### Public API

```javascript
import {
  // Domain
  createMoney,
  addMoney,
  subtractMoney,
  formatMoney,
  validatePaymentIntentInput,
  nextConfirmStatus,
  nextRefundState,
  parseSignatureHeader,
  computeSignature,
  verifyWebhookSignature,
  // Port
  assertPaymentsPort,
  // Adapters
  createMemoryPaymentsAdapter,
  // Messages (i18n)
  t, setLocale, getLocale, registerLocale, resetLocale,
} from './modules/payments/public-api.mjs';
```

### TypeScript interfaces

```typescript
interface Money {
  amount: number;      // non-negative integer in minor units (cents, pennies, yen)
  currency: string;    // 3-letter ISO-4217 code (upper case)
}

type PaymentIntentStatus =
  | 'requires_payment_method'
  | 'succeeded'
  | 'failed'
  | 'canceled'
  | 'partially_refunded'
  | 'refunded';

interface PaymentIntent {
  id: string;
  amount: Money;
  amountRefunded: Money;
  status: PaymentIntentStatus;
  customerId?: string;
  description?: string;
  paymentMethod?: string;
  metadata: Record<string, string>;
  createdAt: number;
  confirmedAt?: number;
}

interface Customer {
  id: string;
  email: string;
  name?: string;
  metadata: Record<string, string>;
  createdAt: number;
}

interface PaymentsPort {
  createCustomer(input: CustomerInput): Promise<Customer>;
  createPaymentIntent(input: PaymentIntentInput): Promise<PaymentIntent>;
  confirmPaymentIntent(id: string, options: { paymentMethod: string }): Promise<PaymentIntent>;
  refund(intentId: string, options?: { amount?: Money }): Promise<Refund>;
  verifyWebhook(rawBody: string, signature: string, secret: string): true;
  listIntents(filter?: { status?: PaymentIntentStatus; customerId?: string }): PaymentIntent[];
  clear(): void;
}
```

### Usage example

```javascript
import { createMemoryPaymentsAdapter } from './modules/payments/public-api.mjs';

const payments = createMemoryPaymentsAdapter();

const customer = await payments.createCustomer({
  email: 'alice@example.com',
  name: 'Alice',
});

const intent = await payments.createPaymentIntent({
  amount: { amount: 1999, currency: 'USD' }, // $19.99
  customerId: customer.id,
  description: 'Pro plan — monthly',
});
// intent.status === 'requires_payment_method'

const confirmed = await payments.confirmPaymentIntent(intent.id, {
  paymentMethod: 'pm_card_visa',
});
// confirmed.status === 'succeeded'

// Partial refund then remainder
await payments.refund(confirmed.id, { amount: { amount: 500, currency: 'USD' } });
await payments.refund(confirmed.id); // remaining balance → 'refunded'

// Webhook verification (Stripe-style t=...,v1=...)
payments.verifyWebhook(rawBody, signatureHeader, process.env.WEBHOOK_SECRET);
```

Payment methods whose id starts with `pm_fail` deterministically simulate a
declined charge, so tests can cover the `failed` branch without real provider
integration.

The api-starter app wires `createMemoryPaymentsAdapter` into `createAppContext`
and exposes four demo routes — `/api/payments/customer`, `/api/payments/intent`,
`/api/payments/confirm`, and `/api/payments/list` — walking the full customer →
intent → confirm flow.

### Dependencies: None (`node:crypto` only)

---

## 32. tenancy

**Hexagonal tenancy module — pure `Tenant` value object, header/subdomain resolvers, `TenantStorePort` with an in-memory adapter, and an `AsyncLocalStorage`-backed tenant context helper.**

### Public API

```javascript
import {
  // Domain
  createTenant,
  createTenantContext,
  requireTenant,
  withTenant,
  resolveTenantFromHeaders,
  resolveTenantFromSubdomain,
  // Port
  assertTenantStorePort,
  // Adapters
  createMemoryTenantStore,
  createAlsTenantContext,
  // Messages (i18n)
  t, setLocale, getLocale, registerLocale, resetLocale,
} from './modules/tenancy/public-api.mjs';
```

### TypeScript interfaces

```typescript
interface Tenant {
  id: string;                          // slug-like: /^[a-z0-9][a-z0-9-]{0,63}$/
  name?: string;                       // optional display name
  metadata: Record<string, string>;    // flat string map (empty when omitted)
}

interface TenantInput {
  id: string;
  name?: string;
  metadata?: Record<string, string>;
}

interface TenantContext {
  tenant: Tenant | null;
}

interface TenantStorePort {
  createTenant(input: TenantInput): Promise<Tenant>;
  getTenant(id: string): Promise<Tenant | null>;
  listTenants(): Tenant[];
  deleteTenant(id: string): Promise<boolean>;
  clear(): void;
}

interface AlsTenantContext {
  run<T>(tenant: Tenant, fn: () => T): T;
  current(): Tenant | null;
  require(): Tenant;
}
```

### Usage example

```javascript
import {
  createTenant,
  createMemoryTenantStore,
  resolveTenantFromHeaders,
  resolveTenantFromSubdomain,
  createAlsTenantContext,
} from './modules/tenancy/public-api.mjs';

// Store + CRUD
const store = createMemoryTenantStore();
const acme = await store.createTenant({
  id: 'acme',
  name: 'Acme, Inc.',
  metadata: { plan: 'pro' },
});
const fetched = await store.getTenant('acme');
const all = store.listTenants();

// Resolve from an HTTP header (default key: x-tenant-id)
const headerId = resolveTenantFromHeaders(req.headers);

// Resolve from a subdomain (acme.example.com → 'acme', www.example.com → null)
const subdomainId = resolveTenantFromSubdomain(req.headers.host, {
  rootDomain: 'example.com',
});

// Scope a tenant across async work with AsyncLocalStorage
const scope = createAlsTenantContext();
scope.run(createTenant({ id: 'acme' }), async () => {
  // any downstream await can call scope.require() to get the active tenant
});
```

Tenant ids are slug-like by design so they stay safe for URLs, subdomains,
database keys, and filesystem paths without extra escaping. The pure
`createTenantContext` / `withTenant` / `requireTenant` helpers work in
browser or test code where `AsyncLocalStorage` is not available; the ALS
adapter is the only file in the module allowed to import `node:async_hooks`.

The api-starter app wires `createMemoryTenantStore` into `createAppContext`
and exposes three demo routes — `/api/tenancy/create`, `/api/tenancy/get`,
and `/api/tenancy/list` — walking the full create → get → list flow.

### Dependencies: None (`node:async_hooks` only, and only in the ALS adapter)

---

## 33. cqrs

**Hexagonal CQRS module — pure `Command` / `Query` / `DomainEvent` value objects, `createAggregate` + `replayAggregate` event-sourcing helpers, `CommandBusPort` + `QueryBusPort` + `EventStorePort` (with optimistic concurrency), and zero-dependency in-memory adapters.**

### Public API

```javascript
import {
  // Domain
  createCommand,
  createQuery,
  createEvent,
  createAggregate,
  replayAggregate,
  // Ports
  assertCommandBusPort,
  assertQueryBusPort,
  assertEventStorePort,
  // Adapters
  createMemoryCommandBus,
  createMemoryQueryBus,
  createMemoryEventStore,
  // Messages (i18n)
  t, setLocale, getLocale, registerLocale, resetLocale,
} from './modules/cqrs/public-api.mjs';
```

### TypeScript interfaces

```typescript
interface Command {
  type: string;                              // /^[A-Za-z][A-Za-z0-9]*\.[A-Za-z][A-Za-z0-9]*$/
  payload: Record<string, unknown>;
  metadata: Record<string, string>;          // commonly { tenantId, userId, correlationId }
}

interface Query {
  type: string;
  payload: Record<string, unknown>;
  metadata: Record<string, string>;
}

interface DomainEvent {
  type: string;                              // Aggregate.Verbed shape
  aggregateId: string;
  payload: Record<string, unknown>;
  metadata: Record<string, string>;
  id?: string;                               // stamped by event store
  sequence?: number;                         // global append sequence
  recordedAt?: number;                       // epoch ms
}

interface CommandBusPort {
  register(commandType: string, handler: (command: Command, context: object) => Promise<unknown> | unknown): void;
  dispatch(command: Command): Promise<unknown>;
  clear(): void;
}

interface QueryBusPort {
  register(queryType: string, handler: (query: Query, context: object) => Promise<unknown> | unknown): void;
  ask(query: Query): Promise<unknown>;
  clear(): void;
}

interface EventStorePort {
  append(aggregateId: string, expectedVersion: number, events: DomainEvent[]): Promise<DomainEvent[]>;
  load(aggregateId: string): Promise<DomainEvent[]>;
  loadAll(filter?: { aggregateId?: string, type?: string }): DomainEvent[];
  subscribe(listener: (event: DomainEvent) => void): () => void;
  clear(): void;
}
```

### Usage example — Counter round-trip

```javascript
import {
  createMemoryCommandBus,
  createMemoryQueryBus,
  createMemoryEventStore,
  createEvent,
  replayAggregate,
} from './modules/cqrs/public-api.mjs';

const eventStore = createMemoryEventStore();
const commandBus = createMemoryCommandBus({ eventStore });
const queryBus = createMemoryQueryBus();

const counterReducer = (state, event) => {
  if (event.type === 'Counter.Incremented') {
    return { total: state.total + event.payload.by };
  }
  return state;
};

commandBus.register('Counter.Increment', async (command, { eventStore }) => {
  const by = command.payload.by;
  const existing = await eventStore.load('counter');
  await eventStore.append('counter', existing.length, [
    createEvent({ type: 'Counter.Incremented', aggregateId: 'counter', payload: { by } }),
  ]);
  return { by };
});

queryBus.register('Counter.Get', async () => {
  const events = await eventStore.load('counter');
  const { state } = replayAggregate('counter', { total: 0 }, counterReducer, events);
  return state;
});

await commandBus.dispatch({ type: 'Counter.Increment', payload: { by: 3 } });
await commandBus.dispatch({ type: 'Counter.Increment', payload: { by: 4 } });
const state = await queryBus.ask({ type: 'Counter.Get', payload: {} });
// → { total: 7 }
```

The api-starter app wires `createMemoryCommandBus`, `createMemoryQueryBus`, and `createMemoryEventStore` into `createAppContext` with a demo `Counter.Increment` / `Counter.Get` handler pair and exposes three demo routes — `/api/cqrs/dispatch`, `/api/cqrs/ask`, and `/api/cqrs/events`.

`modules/cqrs/` is orthogonal to `modules/event-bus/`: event-bus is an in-process pub/sub primitive with no history, while cqrs provides a durable event **store** with optimistic concurrency and replay. Use both together when appropriate.

### Dependencies: None

---

## 34. pwa

**Hexagonal PWA primitives — W3C Web App Manifest descriptors, cache-strategy value objects, a pure service-worker source generator, a `PwaAssetPort`, and a zero-dependency in-memory asset store.**

### Public API

```javascript
import {
  // Domain
  createWebManifest,
  webManifestToJson,
  createCacheStrategy,
  cacheFirst,
  networkFirst,
  staleWhileRevalidate,
  networkOnly,
  cacheOnly,
  generateServiceWorkerSource,
  // Ports
  assertPwaAssetPort,
  // Adapters
  createMemoryPwaAssetStore,
  // Messages (i18n)
  t, setLocale, getLocale, registerLocale, resetLocale,
} from './modules/pwa/public-api.mjs';
```

### TypeScript interfaces

```typescript
interface WebManifest {
  name: string;
  shortName: string;
  startUrl: string;
  display: 'fullscreen' | 'standalone' | 'minimal-ui' | 'browser';
  themeColor?: string;
  backgroundColor?: string;
  icons: Array<{ src: string; sizes: string; type?: string; purpose?: string }>;
}

interface CacheStrategy {
  type: 'cacheFirst' | 'networkFirst' | 'staleWhileRevalidate' | 'networkOnly' | 'cacheOnly';
  cacheName: string;
  maxEntries?: number;
  maxAgeSeconds?: number;
}

interface PwaAssetRecord {
  kind: 'manifest' | 'service-worker';
  path: string;
  contentType: string;
  size: number;
  writtenAt: number;
}

interface PwaAssetPort {
  writeManifest(manifest: WebManifest): Promise<PwaAssetRecord>;
  writeServiceWorker(source: string): Promise<PwaAssetRecord>;
  listAssets(): PwaAssetRecord[];
  clear(): void;
}
```

### Usage example — manifest + service worker

```javascript
import {
  createWebManifest,
  webManifestToJson,
  generateServiceWorkerSource,
  cacheFirst,
  createMemoryPwaAssetStore,
} from './modules/pwa/public-api.mjs';

const store = createMemoryPwaAssetStore();

const manifest = createWebManifest({
  name: 'Contextrail',
  shortName: 'CT',
  startUrl: '/',
  display: 'standalone',
  themeColor: '#0f172a',
  backgroundColor: '#ffffff',
});
await store.writeManifest(manifest);

const swSource = generateServiceWorkerSource({
  cacheName: 'app',
  version: 'v1',
  precache: ['/', '/index.html'],
  runtime: [
    { urlPattern: '\\.(?:png|jpg|svg|css|js)$', strategy: cacheFirst('static', { maxEntries: 50 }) },
  ],
});
await store.writeServiceWorker(swSource);

console.log(store.listAssets().map((a) => a.path));
// → ['manifest.webmanifest', 'sw.js']
```

The api-starter app wires `createMemoryPwaAssetStore` into `createAppContext` and serves `/manifest.webmanifest` and `/sw.js` with the correct content types. The service-worker source is generated from pure strings using only standard `ServiceWorkerGlobalScope` APIs — no `eval`, no `new Function`.

### Dependencies: None

---

## 35. seo

**Hexagonal SEO primitives — HTML meta-tag descriptors with XSS-safe escaping, sitemaps.org urlset validator and XML emitter, robots.txt validator and text emitter, a `SeoPublisherPort`, and a zero-dependency in-memory publisher.**

### Public API

```javascript
import {
  // Domain
  createMetaTags,
  renderMetaTagsHtml,
  escapeAttribute,
  createSitemap,
  renderSitemapXml,
  escapeXml,
  createRobotsTxt,
  renderRobotsTxt,
  // Ports
  assertSeoPublisherPort,
  // Adapters
  createMemorySeoPublisher,
  // Messages (i18n)
  t, setLocale, getLocale, registerLocale, resetLocale,
} from './modules/seo/public-api.mjs';
```

### TypeScript interfaces

```typescript
interface MetaTags {
  title: string;
  description?: string;
  canonical?: string;
  robots?: string;
  openGraph?: Record<string, string>;
  twitter?: Record<string, string>;
}

interface SitemapUrl {
  loc: string;  // absolute http(s) URL
  lastmod?: string;  // ISO date or datetime
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;  // [0, 1]
}

interface RobotsRule {
  userAgent: string;
  allow?: string[];
  disallow?: string[];
}

interface SeoAssetRecord {
  kind: 'sitemap' | 'robots' | 'meta';
  path: string;
  contentType: string;
  size: number;
  publishedAt: number;
}

interface SeoPublisherPort {
  publishSitemap(xml: string): Promise<SeoAssetRecord>;
  publishRobots(text: string): Promise<SeoAssetRecord>;
  publishMeta(pageId: string, html: string): Promise<SeoAssetRecord>;
  clear(): void;
}
```

### Usage example — sitemap + robots + meta

```javascript
import {
  createMetaTags,
  renderMetaTagsHtml,
  createSitemap,
  renderSitemapXml,
  createRobotsTxt,
  renderRobotsTxt,
  createMemorySeoPublisher,
} from './modules/seo/public-api.mjs';

const publisher = createMemorySeoPublisher();

const metaHtml = renderMetaTagsHtml(
  createMetaTags({
    title: 'Contextrail',
    description: 'Agentable architecture for LLM-scale teams',
    canonical: 'https://example.com/',
    openGraph: { title: 'Contextrail', type: 'website' },
  }),
);
await publisher.publishMeta('home', metaHtml);

const sitemapXml = renderSitemapXml(
  createSitemap({
    urls: [
      { loc: 'https://example.com/', changefreq: 'daily', priority: 1 },
      { loc: 'https://example.com/about', changefreq: 'monthly' },
    ],
  }),
);
await publisher.publishSitemap(sitemapXml);

const robotsText = renderRobotsTxt(
  createRobotsTxt({
    rules: [{ userAgent: '*', disallow: ['/admin/'] }],
    sitemaps: ['https://example.com/sitemap.xml'],
  }),
);
await publisher.publishRobots(robotsText);
```

The api-starter app wires `createMemorySeoPublisher` into `createAppContext` and serves `/sitemap.xml`, `/robots.txt`, and `/api/seo/meta?page=<id>` with correct content types. User-supplied titles cannot break out of HTML attributes — `escapeAttribute` neutralizes `&`, `<`, `>`, `"`, and apostrophe.

### Dependencies: None

---

## 36. theme

**Hexagonal theme primitives — a pure color-scheme enum with `auto → system` resolver, a `ThemeTokens` value object that renders CSS custom-property declarations with defensive value escaping, an immutable `ThemePreference` record, a `ThemePreferenceStorePort`, and a zero-dependency in-memory adapter.**

### Public API

```javascript
import {
  // Domain
  LIGHT,
  DARK,
  AUTO,
  isValidColorScheme,
  isValidSystemColorScheme,
  resolveColorScheme,
  createThemeTokens,
  renderCssVariables,
  escapeCssValue,
  createThemePreference,
  // Ports
  assertThemePreferenceStorePort,
  // Adapters
  createMemoryThemePreferenceStore,
  // Messages (i18n)
  t, setLocale, getLocale, registerLocale, resetLocale,
} from './modules/theme/public-api.mjs';
```

### TypeScript interfaces

```typescript
type ColorScheme = 'light' | 'dark' | 'auto';
type SystemColorScheme = 'light' | 'dark';

interface ThemeTokens {
  light: Record<string, string>;  // kebab-case key → CSS value
  dark: Record<string, string>;   // must declare the same key set as light
}

interface ThemePreference {
  scheme: ColorScheme;
  updatedAt: number;  // epoch ms
}

interface ThemePreferenceStorePort {
  get(userId: string): Promise<ThemePreference | null>;
  set(userId: string, preference: ThemePreference): Promise<ThemePreference>;
  clear(): void;
}
```

### Usage example — resolve, render, persist

```javascript
import {
  LIGHT,
  DARK,
  AUTO,
  resolveColorScheme,
  createThemeTokens,
  renderCssVariables,
  createThemePreference,
  createMemoryThemePreferenceStore,
} from './modules/theme/public-api.mjs';

// Platform layer reads prefers-color-scheme and passes the value in.
const effective = resolveColorScheme(AUTO, DARK);
// → 'dark'

const tokens = createThemeTokens({
  light: { 'color-bg': '#ffffff', 'color-fg': '#111111' },
  dark:  { 'color-bg': '#111111', 'color-fg': '#f5f5f5' },
});

const css = renderCssVariables(tokens, effective);
// :root {
//   --color-bg: #111111;
//   --color-fg: #f5f5f5;
// }

const store = createMemoryThemePreferenceStore();
await store.set(
  'alice',
  createThemePreference({ scheme: DARK, updatedAt: Date.now() }),
);
const stored = await store.get('alice');
// → { scheme: 'dark', updatedAt: <epoch ms> }
```

The api-starter app wires `createMemoryThemePreferenceStore` into `createAppContext` and serves `/api/theme/tokens?scheme=dark`, `/api/theme/preference?user=alice`, and `/api/theme/preference/set?user=alice&scheme=dark`. CSS values are defensively escaped — `{`, `}`, `;`, `<`, `\` are stripped so a crafted palette cannot break out of the `:root` block.

### Dependencies: None

---

## 37. graphql

**A pure, zero-dependency, minimal GraphQL surface — `createSchema` value object, recursive-descent `parseQuery` for a documented subset, async `executeQuery` that aggregates `{ data, errors }`, a `GraphqlTransportPort`, and an in-memory transport adapter.**

### Public API

```javascript
import {
  // Domain
  createSchema,
  stripTypeDecoration,
  isBuiltinScalar,
  parseQuery,
  executeQuery,
  // Ports
  assertGraphqlTransportPort,
  // Adapters
  createMemoryGraphqlTransport,
  // Messages (i18n)
  t, setLocale, getLocale, registerLocale, resetLocale,
} from './modules/graphql/public-api.mjs';
```

### TypeScript interfaces

```typescript
interface FieldDefinition {
  type: string;                   // 'String', 'Int', '[User]', 'User!', ...
  resolver?: (parent: unknown, args: Record<string, unknown>, ctx?: unknown) => unknown;
}

interface Schema {
  types: Record<string, { fields: Record<string, FieldDefinition> }>;
  queries: Record<string, FieldDefinition>;
  mutations: Record<string, FieldDefinition>;
}

interface ExecutionResult {
  data: Record<string, unknown> | null;
  errors: Array<{ message: string; path: string[] }>;
}

interface GraphqlTransportPort {
  handleQuery(rawQuery: string, context?: unknown): Promise<ExecutionResult>;
}
```

### Supported subset

- Optional `query` / `mutation` keyword followed by a selection set.
- Named fields with nested selection sets.
- Scalar arguments — strings (`"..."`), numbers (`123`, `-1.5`), booleans (`true` / `false`).
- Line comments (`# ...`).

Explicitly NOT supported (each fails fast with a subset-specific error):
fragments (`...Frag` / `... on Type`), variables (`$name`), directives (`@skip` / `@include`), and field aliases.

### Usage example — schema, parse, execute

```javascript
import {
  createSchema,
  createMemoryGraphqlTransport,
} from './modules/graphql/public-api.mjs';

const schema = createSchema({
  types: {
    User: { fields: { id: { type: 'ID' }, name: { type: 'String' } } },
  },
  queries: {
    hello:    { type: 'String', resolver: () => 'Hello, world!' },
    greeting: { type: 'String', resolver: (_p, args) => `Hello, ${args.name ?? 'stranger'}!` },
    me:       { type: 'User',   resolver: () => ({ id: '42', name: 'Ada Lovelace' }) },
  },
});

const transport = createMemoryGraphqlTransport({ schema });
const result = await transport.handleQuery('{ greeting(name: "Alice") me { id name } }');
// result.data === { greeting: 'Hello, Alice!', me: { id: '42', name: 'Ada Lovelace' } }
// result.errors === []
```

The api-starter app wires `createMemoryGraphqlTransport` into `createAppContext` and serves `GET /api/graphql?query=<encoded>` against the same demo schema. Parse errors and resolver errors both surface in the `errors` array — the transport never throws for query-level failures.

### Dependencies: None

---

## 38. prerender

**A pure, zero-dependency SSG primitive — `createRouteManifest` value object, `createPrerenderPlan` that binds a manifest to an absolute base URL, a `RenderFunctionPort` typedef (any `(path, context) => { html, status?, headers? }` callable), a `StaticOutputPort` struct port for `write`/`list`/`clear`, an in-memory output adapter, and a sequential runner that walks the plan, invokes the render function per route, wraps the result in a validated `RenderResult`, and writes it to the output sink — aggregating failures without aborting the run.**

### Public API

```javascript
import {
  // Domain
  createRouteManifest,
  isRouteManifest,
  createRenderResult,
  createPrerenderPlan,
  planToTargets,
  // Ports
  assertRenderFunction,
  assertStaticOutputPort,
  // Adapters
  createMemoryStaticOutput,
  createSequentialPrerenderRunner,
  // Messages (i18n)
  t, setLocale, getLocale, registerLocale, resetLocale,
} from './modules/prerender/public-api.mjs';
```

### TypeScript interfaces

```typescript
interface RouteDescriptor {
  path: string;                         // must start with '/'
  title?: string;
  meta?: Record<string, unknown>;
}

interface RouteManifest {
  routes: ReadonlyArray<Readonly<RouteDescriptor>>;
}

interface PrerenderPlan {
  manifest: Readonly<RouteManifest>;
  baseUrl: string;                      // absolute http(s) URL, no path
}

interface RenderTarget {
  path: string;
  absoluteUrl: string;
}

interface RenderResult {
  path: string;
  html: string;
  status: number;                       // defaults to 200
  headers: Readonly<Record<string, string>>;
}

type RenderFunctionPort = (
  path: string,
  context?: unknown,
) => { html: string; status?: number; headers?: Record<string, string> }
  | Promise<{ html: string; status?: number; headers?: Record<string, string> }>;

interface StaticOutputRecord {
  path: string;
  size: number;
  publishedAt: number;
}

interface StaticOutputPort {
  write(path: string, html: string): Promise<StaticOutputRecord>;
  list(): ReadonlyArray<StaticOutputRecord>;
  clear(): void;
}

interface PrerenderSummary {
  rendered: ReadonlyArray<{ path: string; status: number; size: number }>;
  failed: ReadonlyArray<{ path: string; error: string }>;
  durationMs: number;
}
```

### Usage example — manifest, plan, runner, memory output

```javascript
import {
  createRouteManifest,
  createPrerenderPlan,
  createMemoryStaticOutput,
  createSequentialPrerenderRunner,
} from './modules/prerender/public-api.mjs';

const manifest = createRouteManifest({
  routes: [
    { path: '/', title: 'Home' },
    { path: '/about', title: 'About' },
  ],
});

const plan = createPrerenderPlan({
  manifest,
  baseUrl: 'https://example.com',
});

const output = createMemoryStaticOutput();
const runner = createSequentialPrerenderRunner({
  renderFn: async (path) => ({ html: `<title>${path}</title>` }),
  output,
});

const summary = await runner.run(plan);
// summary.rendered.length === 2
// summary.failed   === []
// summary.durationMs >= 0
// output.get('/') === '<title>/</title>'
```

Failures in one route never abort the whole run — the runner catches the throw, records `{ path, error }` in `summary.failed`, and keeps walking the plan. The api-starter app wires `createMemoryStaticOutput` + `createSequentialPrerenderRunner` into `createAppContext` and exposes `GET /api/prerender/run` (executes a demo pass over `/health`, `/api/greet?name=World`, `/openapi.json` using an inline render function that delegates back into the host router) and `GET /api/prerender/output?path=<path>` (reads one stored HTML body). Real deployments swap the output adapter for one that writes to the filesystem or CDN, and swap the render function for a template-engine- or SSR-backed one — the plan, manifest, and runner stay identical, which is the architectural proof that hex modules work in static generation.

### Dependencies: None

---

## Module Dependency Graph

```
example-greeter  ─── (standalone)
event-bus        ─── (standalone)
notifications    ─── (standalone)
onboarding       ─── (standalone)
feature-seams    ─── (standalone)
knowledge-graph  ─── (standalone)
retrieval        ─── (standalone)
log              ─── (standalone)
cache            ─── (standalone)
form-validation  ─── (standalone, pure domain)
realtime         ─── (standalone)
task             ─── (standalone)
file             ─── (standalone)
analytics        ─── (standalone)
scheduler        ─── (standalone)
i18n             ─── (standalone)
db               ─── (standalone)

api-client       ─── (standalone)
  ↑
  ├── auth         (depends on api-client)
  │     ↑
  │     └── permission (uses auth user context)
  └── ai-chat      (depends on api-client)
        ↑
        └── local-llm  (depends on ai-chat)

user-preferences ─── (standalone)
  ↑
  └── state        (depends on user-preferences)
```

### Safe Removal Order (leaf-first)

Standalone modules can be removed in any order:

1. `example-greeter` — teaching example
2. `onboarding` — walkthrough tours
3. `notifications` — toast system
4. `knowledge-graph` — GraphRAG
5. `retrieval` — RAG pipeline
6. `event-bus` — pub/sub
7. `feature-seams` — feature flags
8. `log` — structured logging
9. `cache` — TTL/LRU caching
10. `form-validation` — validation rules
11. `realtime` — transport abstraction
12. `task` — background processing
13. `file` — file operations
14. `analytics` — privacy-first analytics
15. `scheduler` — periodic tasks
16. `i18n` — internationalization
17. `db` — database abstraction
18. `search` — full-text search
19. `payments` — money, intents, webhook verify
20. `tenancy` — tenant value object, store, ALS scope
21. `cqrs` — command/query buses, event store, replay helpers
22. `pwa` — web manifest, cache strategies, service worker source
23. `seo` — meta tags, sitemap, robots.txt
24. `theme` — color scheme, CSS custom-property tokens, preference store
25. `graphql` — minimal schema/parser/executor + transport port
26. `prerender` — pure SSG primitive: manifest, plan, runner, static output port

Dependency chains (remove in order):

- `permission` → `auth` → `api-client`
- `local-llm` → `ai-chat` (shares `api-client` with auth chain)
- `state` → `user-preferences`
