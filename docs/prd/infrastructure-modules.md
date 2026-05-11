<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Define the umbrella PRD for nine new hex infrastructure modules covering logging, caching, form validation, realtime communication, background tasks, permissions, file handling, analytics, and scheduling.
@sidecar infrastructure-modules.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# Infrastructure Modules

## Requirement intent

The starter template needs nine new hexagonal infrastructure modules that provide reusable building blocks for logging, caching, form validation, realtime communication, background task processing, permissions, file handling, analytics/telemetry, and periodic scheduling. Each module follows the established hex port/adapter pattern and is independently testable, detachable, and framework-free.

All modules use vanilla JS (ESM, no build step), follow the JSDoc + `.d.ts` sidecar typing pattern, and expose their surface through `public-api.mjs` only. All error messages use i18n message keys. No external library dependencies unless explicitly stated.

## Classification

This is **technical/architectural** work. It provides reusable infrastructure modules for the starter template. It does not alter user-facing workflows directly. USM is intentionally skipped.

---

## Module 1: LogPort -- Structured Logging (`modules/log/`)

Estimated size: ~150-200 lines total. Leaf module, no dependencies.

### 1.1 LogPort Definition (TPL-137)

Hex port at `modules/log/ports/log-port.mjs`.

**LogPort interface:**

- `debug(message, data?)` -- logs at debug level with optional structured data
- `info(message, data?)` -- logs at info level with optional structured data
- `warn(message, data?)` -- logs at warn level with optional structured data
- `error(message, data?)` -- logs at error level with optional structured data
- `child(scope)` -- returns a new LogPort instance with the given scope/context prepended to all subsequent entries

**Domain types:**

- `LogLevel` -- enum: `'debug' | 'info' | 'warn' | 'error'`
- `LogEntry` -- structured log entry with `level`, `message`, `data` (optional object), `scope` (optional string array), `timestamp` (ISO string)
- `LogPortOptions` -- configuration object with optional `minLevel`, optional `scope` array

Constraints: The port must be framework-free and testable in isolation. `child()` enables scoped logging by chaining context. Error messages in the port assertion must use i18n keys.

### 1.2 ConsoleAdapter (TPL-138)

Development adapter at `modules/log/adapters/console-adapter.mjs`.

- Factory function `createConsoleAdapter(options?)` returning a fresh adapter instance
- Pretty-prints log entries using native `console.debug/info/warn/error`
- Respects `minLevel` option -- entries below the minimum level are suppressed
- Includes scope chain and structured data in the output
- `child(scope)` returns a new console adapter with the extended scope

Constraints: Must conform to LogPort interface. Must pass runtime port assertion. No external dependencies. Development-oriented formatting (readable, not machine-parseable).

### 1.3 StructuredJsonAdapter (TPL-139)

Production adapter at `modules/log/adapters/structured-json-adapter.mjs`.

- Factory function `createStructuredJsonAdapter(options?)` returning a fresh adapter instance
- Outputs each log entry as a single JSON line to a configurable `writeFn` (defaults to `console.log`)
- JSON format includes all LogEntry fields: `level`, `message`, `data`, `scope`, `timestamp`
- Respects `minLevel` option
- `child(scope)` returns a new adapter with the extended scope sharing the same `writeFn`

Constraints: Must conform to LogPort interface. Must pass runtime port assertion. Machine-parseable output (one JSON object per line). No external dependencies.

### 1.4 NoOpAdapter (TPL-140)

Silent adapter at `modules/log/adapters/no-op-adapter.mjs`.

- Factory function `createNoOpAdapter()` returning a fresh adapter instance
- All methods are no-ops that produce no output
- `child(scope)` returns another no-op adapter
- Used in tests and environments where logging should be suppressed

Constraints: Must conform to LogPort interface. Must pass runtime port assertion. Zero side effects.

### 1.5 RemoteAdapter (TPL-141)

Remote adapter at `modules/log/adapters/remote-adapter.mjs`.

- Factory function `createRemoteAdapter(options)` accepting `endpoint` (URL string), optional `batchSize` (default 10), optional `flushInterval` (ms, default 5000), optional `headers` (object)
- Buffers log entries and sends them as JSON batches via HTTP POST (using native `fetch`)
- Flushes when the buffer reaches `batchSize` or when `flushInterval` elapses
- `flush()` -- manually flushes the current buffer
- `destroy()` -- clears the flush timer and flushes remaining entries
- `child(scope)` returns a new adapter sharing the same buffer and flush timer
- Errors during send are caught and silently discarded (logging infrastructure must not crash the application)

Constraints: Must conform to LogPort interface. Must pass runtime port assertion. Uses only native `fetch`. Must degrade gracefully when the endpoint is unreachable. `destroy()` must be called for cleanup.

---

## Module 2: CachePort -- Caching with Policies (`modules/cache/`)

Estimated size: ~300-400 lines total. Leaf module, no dependencies.

### 2.1 CachePort Definition + Domain (TPL-142)

Hex port at `modules/cache/ports/cache-port.mjs`. Domain logic at `modules/cache/domain/`.

**CachePort interface:**

- `get(key)` -- returns the cached value or `undefined` if not found or expired
- `set(key, value, options?)` -- stores a value with optional TTL and size metadata
- `delete(key)` -- removes a cached entry
- `has(key)` -- returns `true` if the key exists and is not expired
- `clear()` -- removes all cached entries
- `size()` -- returns the current number of entries
- `keys()` -- returns an array of all valid (non-expired) keys

**Domain types:**

- `CacheEntry` -- internal entry with `value`, `createdAt` (ms timestamp), `ttl` (optional ms), `size` (optional number)
- `CacheSetOptions` -- per-entry options: `ttl` (ms), `size` (number for LRU accounting)
- `CachePortOptions` -- adapter-level config: `maxEntries` (number), `maxSize` (total size units), `defaultTtl` (ms)

**Domain utilities:**

- `isExpired(entry)` -- checks TTL expiry against current time
- `createLruEviction(maxEntries)` -- returns an evictor that tracks access order and identifies the LRU key

Constraints: TTL is in milliseconds. LRU eviction is a domain utility used by adapters. The port must be framework-free and testable in isolation.

### 2.2 MemoryLruAdapter (TPL-143)

In-memory adapter at `modules/cache/adapters/memory-lru-adapter.mjs`.

- Factory function `createMemoryLruAdapter(options?)` accepting `CachePortOptions`
- Stores entries in a JavaScript `Map`
- Checks TTL on every `get()` and `has()` call; removes expired entries lazily
- Enforces `maxEntries` via LRU eviction: the least-recently accessed entry is evicted when the limit is exceeded
- Enforces optional `maxSize` by summing entry sizes and evicting LRU entries until the total is under the limit
- Updates access recency on every `get()` call

Constraints: Must conform to CachePort interface. Must pass runtime port assertion. No persistence. No external dependencies.

### 2.3 LocalStorageAdapter (TPL-144)

Browser localStorage adapter at `modules/cache/adapters/local-storage-adapter.mjs`.

- Factory function `createLocalStorageCacheAdapter(options?)` accepting `CachePortOptions` plus an optional `storageKey` (namespace prefix)
- Stores entries as JSON in `localStorage` under namespaced keys
- Checks TTL on every `get()` and `has()` call
- Enforces `maxEntries` via LRU eviction (LRU order tracked in a separate localStorage key)
- Gracefully degrades when localStorage is unavailable (falls back to in-memory behavior)
- `clear()` removes only namespaced keys, not all of localStorage

Constraints: Must conform to CachePort interface. Must pass runtime port assertion. Must handle JSON serialization errors gracefully. Must not pollute global localStorage namespace.

### 2.4 IndexedDBAdapter (TPL-145)

IndexedDB adapter at `modules/cache/adapters/indexeddb-adapter.mjs`.

- Factory function `createIndexedDBCacheAdapter(options?)` returning a `Promise<CachePort>` (async factory due to DB initialization)
- Stores entries in IndexedDB with a dedicated object store
- Checks TTL on every `get()` and `has()` call
- Enforces `maxEntries` via LRU eviction (access timestamp stored per entry)
- Provides `destroy()` to close the database connection
- Gracefully degrades when IndexedDB is unavailable

Constraints: Must conform to CachePort interface. Must pass runtime port assertion. Async factory is necessary; all port methods are synchronous after initialization (pre-loads into memory with IndexedDB as persistence layer). Must not block the main thread during initialization.

---

## Module 3: FormValidation -- Composable Validation Rules (`modules/form-validation/`)

Estimated size: ~250-350 lines total. Leaf module, no dependencies. This is pure domain logic -- no port/adapter pattern needed.

### 3.1 Core Rules + Composition (TPL-146)

Validation rules at `modules/form-validation/domain/rules.mjs`. Composition at `modules/form-validation/domain/compose.mjs`.

**Built-in rules (each returns a validator function):**

- `required()` -- value must be non-null, non-undefined, non-empty-string
- `minLength(n)` -- string length must be at least `n`
- `maxLength(n)` -- string length must be at most `n`
- `pattern(regex)` -- value must match the given regular expression
- `email()` -- value must match a standard email pattern
- `matches(fieldName)` -- value must equal the value of another named field (for password confirmation)
- `custom(fn, errorKey)` -- wraps any `(value, allValues?) => boolean` function as a rule

**Validator function signature:**

Each rule factory returns `(value, allValues?) => ValidationResult` where `ValidationResult` is `{ valid: boolean, errorKey?: string, params?: Record<string, unknown> }`.

**Composition:**

- `combineRules(...rules)` -- returns a single validator that runs all rules in order and returns the first failure (short-circuit)
- `validateField(value, rules, allValues?)` -- convenience function that runs combined rules against a single value

**i18n error keys:** All built-in rules return i18n keys: `'validation.required'`, `'validation.minLength'`, `'validation.maxLength'`, `'validation.pattern'`, `'validation.email'`, `'validation.matches'`. The `params` field carries interpolation data (e.g., `{ min: 8 }` for minLength).

Constraints: Pure functions. No side effects. No framework coupling. All error keys are i18n-ready. The `matches` rule receives `allValues` to compare fields.

### 3.2 Form-Level Validation + Public API (TPL-147)

Form validation at `modules/form-validation/domain/validate-form.mjs`. Public API at `modules/form-validation/public-api.mjs`.

- `validateForm(formValues, fieldRules)` -- validates all fields in a form
  - `formValues`: `Record<string, unknown>` -- the current form field values
  - `fieldRules`: `Record<string, ValidatorFn | ValidatorFn[]>` -- rules per field name
  - Returns `FormValidationResult`: `{ valid: boolean, errors: Record<string, ValidationResult> }` -- errors only for fields that failed
- `isFormValid(result)` -- convenience predicate that checks `result.valid`

**Public API exports:**

- All rule factories: `required`, `minLength`, `maxLength`, `pattern`, `email`, `matches`, `custom`
- Composition: `combineRules`, `validateField`
- Form: `validateForm`, `isFormValid`
- No port assertion needed (pure domain module)

Constraints: Form-level validation runs all fields (does not short-circuit across fields, only within a single field's combined rules). The module has no manifest `ports` or `adapters` sections since it is pure domain.

---

## Module 4: RealtimePort -- WebSocket / SSE / Long-Polling / WebRTC (`modules/realtime/`)

Estimated size: ~400-500 lines total. Leaf module, no dependencies. Primus-style transparent transport selection using only native browser APIs.

### 4.1 RealtimePort + TransportPort + Connection State Machine (TPL-148)

Ports at `modules/realtime/ports/`. Domain at `modules/realtime/domain/`.

**RealtimePort interface (high-level, consumer-facing):**

- `connect(url, options?)` -- establishes a realtime connection using the transport manager
- `disconnect()` -- closes the connection gracefully
- `send(channel, data)` -- sends a message on the given channel
- `subscribe(channel, handler)` -- registers a handler for incoming messages on a channel; returns an unsubscribe function
- `onConnectionChange(handler)` -- registers a handler for connection state changes; returns an unsubscribe function
- `getState()` -- returns the current connection state

**TransportPort interface (low-level, transport-layer contract):**

- `open(url, options?)` -- opens the transport connection
- `close()` -- closes the transport connection
- `send(data)` -- sends raw data through the transport
- `onMessage(handler)` -- registers a handler for incoming raw messages
- `onStateChange(handler)` -- registers a handler for transport state changes
- `getState()` -- returns the current transport state
- `isSupported()` -- returns `true` if this transport is available in the current environment

**Domain types:**

- `ConnectionState` -- enum: `'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'failed'`
- `RealtimeMessage` -- `{ channel: string, data: unknown, timestamp: number }`
- `RealtimeOptions` -- config: `transports` (ordered preference array), `reconnect` (boolean), `maxRetries` (number), `heartbeatInterval` (ms)
- `TransportType` -- enum: `'websocket' | 'sse' | 'long-polling' | 'webrtc'`

**Connection state machine (domain):**

- States: `disconnected` -> `connecting` -> `connected` -> `reconnecting` -> `connected` (or `failed`)
- Transitions: `connect()`, `disconnect()`, `transportError`, `reconnectSuccess`, `maxRetriesExceeded`
- Reconnection with configurable exponential backoff and jitter
- Heartbeat detection with configurable interval

Constraints: No external libraries. All transport selection and fallback logic lives in domain. The RealtimePort delegates to the transport manager which selects and manages transports. Port assertions exist for both RealtimePort and TransportPort.

### 4.2 WebSocket Transport (TPL-149)

Transport adapter at `modules/realtime/adapters/websocket-transport.mjs`.

- Factory function `createWebSocketTransport()` returning a TransportPort-conformant adapter
- Uses native `WebSocket` API
- `isSupported()` checks for `WebSocket` in the global scope
- Maps WebSocket events (`open`, `close`, `error`, `message`) to TransportPort callbacks
- Handles binary and text messages
- Clean close with configurable close code

Constraints: Must conform to TransportPort interface. Must pass runtime port assertion. No external dependencies.

### 4.3 SSE Transport (TPL-150)

Transport adapter at `modules/realtime/adapters/sse-transport.mjs`.

- Factory function `createSseTransport()` returning a TransportPort-conformant adapter
- Uses native `EventSource` API for receiving server-sent events
- `isSupported()` checks for `EventSource` in the global scope
- `send()` uses native `fetch` POST to a configurable send endpoint (SSE is receive-only; sending requires a sidecar HTTP channel)
- Maps EventSource events (`open`, `error`, `message`) to TransportPort callbacks
- Supports named event types via `addEventListener`

Constraints: Must conform to TransportPort interface. Must pass runtime port assertion. Inherently unidirectional for receiving; send uses fetch. No external dependencies.

### 4.4 Long-Polling Transport (TPL-151)

Transport adapter at `modules/realtime/adapters/long-polling-transport.mjs`.

- Factory function `createLongPollingTransport()` returning a TransportPort-conformant adapter
- Uses native `fetch` API for both sending and receiving
- `isSupported()` always returns `true` (fetch is universally available)
- Implements long-polling loop: sends a GET request, waits for response, processes messages, immediately sends the next request
- Configurable poll timeout and retry delay
- `send()` uses POST to the server endpoint
- Clean cancellation via `AbortController`

Constraints: Must conform to TransportPort interface. Must pass runtime port assertion. Highest-latency fallback but most widely compatible. No external dependencies.

### 4.5 WebRTC Transport (TPL-152)

Transport adapter at `modules/realtime/adapters/webrtc-transport.mjs`.

- Factory function `createWebRtcTransport(signalingFn)` returning a TransportPort-conformant adapter
- `signalingFn` is an injected function for exchanging SDP offers/answers and ICE candidates (the signaling mechanism is external -- could use any other transport or HTTP endpoint)
- Uses native `RTCPeerConnection` and `RTCDataChannel` APIs
- `isSupported()` checks for `RTCPeerConnection` in the global scope
- Data channel configuration: ordered, reliable by default, with optional unreliable mode for low-latency scenarios
- Maps data channel events (`open`, `close`, `message`) to TransportPort callbacks
- ICE connection state monitoring mapped to transport state changes

Constraints: Must conform to TransportPort interface. Must pass runtime port assertion. Signaling is dependency-injected, not built-in. No STUN/TURN server configuration is bundled (the consumer provides ICE configuration). No external dependencies.

### 4.6 Transport Manager (TPL-153)

Domain utility at `modules/realtime/domain/transport-manager.mjs`. Public API at `modules/realtime/public-api.mjs`.

- `createTransportManager(transports, options?)` -- accepts an ordered array of TransportPort instances and connection options
- Implements the Primus-style behavior: tries each transport in order, selects the first that is supported and connects successfully
- On transport failure: automatically falls back to the next transport in the list
- On reconnection: first tries the currently active transport, then falls back through the list
- Exponential backoff with configurable base delay, multiplier, max delay, and jitter
- Heartbeat: sends periodic keep-alive messages; if no response within timeout, triggers reconnection
- Exposes the RealtimePort interface (the transport manager IS the RealtimePort adapter)
- Channel-based message routing: multiplexes channels over a single transport connection

**Public API exports:**

- Port assertions: `assertRealtimePort`, `assertTransportPort`
- Transport factories: `createWebSocketTransport`, `createSseTransport`, `createLongPollingTransport`, `createWebRtcTransport`
- Manager: `createTransportManager`
- Types and constants: `ConnectionState`, `TransportType`

Constraints: The transport manager is the glue between the consumer-facing RealtimePort and the low-level TransportPort adapters. It must handle all state transitions, reconnection, and fallback. No external dependencies.

---

## Module 5: TaskPort -- Background Processing (`modules/task/`)

Estimated size: ~300-400 lines total. Leaf module, no dependencies. Synergy with retrieval and local-llm for offloading heavy computation.

### 5.1 TaskPort + Types + Task Lifecycle (TPL-154)

Hex port at `modules/task/ports/task-port.mjs`. Domain at `modules/task/domain/`.

**TaskPort interface:**

- `enqueue(taskFn, options?)` -- enqueues a function for background execution; returns a `TaskHandle`
- `cancel(taskId)` -- cancels a pending or running task
- `getStatus(taskId)` -- returns the current status of a task
- `onProgress(taskId, handler)` -- registers a progress handler for a specific task; returns an unsubscribe function
- `onComplete(taskId, handler)` -- registers a completion handler for a specific task; returns an unsubscribe function
- `drain()` -- waits for all currently enqueued tasks to complete

**Domain types:**

- `TaskHandle` -- `{ id: string, cancel: () => void, result: Promise<unknown> }`
- `TaskStatus` -- enum: `'pending' | 'running' | 'completed' | 'failed' | 'cancelled'`
- `TaskProgress` -- `{ taskId: string, percent: number, message?: string }`
- `TaskResult` -- `{ taskId: string, status: TaskStatus, value?: unknown, error?: string }`
- `TaskOptions` -- `{ priority?: 'low' | 'normal' | 'high', transferables?: Transferable[], timeout?: number }`

**Domain utilities:**

- `createTaskLifecycle()` -- manages state transitions for a single task (pending -> running -> completed/failed/cancelled)
- `serializeForTransfer(data, transferables)` -- helper for preparing data for Web Worker `postMessage` with transferable objects

Constraints: The port must be framework-free and testable in isolation. Task functions must be serializable (for Web Worker adapter). Error messages use i18n keys.

### 5.2 WebWorkerAdapter (TPL-155)

Web Worker adapter at `modules/task/adapters/web-worker-adapter.mjs`.

- Factory function `createWebWorkerAdapter(options?)` returning a TaskPort-conformant adapter
- Manages a pool of Web Workers (configurable pool size, default: `navigator.hardwareConcurrency || 4`)
- Enqueued tasks are dispatched to available workers; queued if all workers are busy
- Progress reporting via `postMessage` from within the worker
- Supports transferable objects for efficient binary data handling
- Task cancellation terminates the specific worker and replaces it in the pool
- Timeout enforcement: tasks exceeding their timeout are automatically cancelled
- `destroy()` -- terminates all workers and clears the queue

Constraints: Must conform to TaskPort interface. Must pass runtime port assertion. Uses native `Worker` and `Blob` APIs to create inline workers from serialized functions. No external dependencies.

### 5.3 MainThreadAdapter (TPL-156)

Fallback adapter at `modules/task/adapters/main-thread-adapter.mjs`.

- Factory function `createMainThreadAdapter()` returning a TaskPort-conformant adapter
- Executes tasks on the main thread using `queueMicrotask` or `setTimeout` for yielding
- Provides the same TaskPort interface but without true parallelism
- Progress reporting is synchronous within the task function
- Used in environments without Web Worker support (e.g., some test runners, restricted contexts)
- Task cancellation sets a flag that the task can check via a provided `signal` (similar to AbortSignal)

Constraints: Must conform to TaskPort interface. Must pass runtime port assertion. Must not block the main thread for extended periods (cooperative yielding). No external dependencies.

---

## Module 6: PermissionPort -- RBAC and Granular Permissions (`modules/permission/`)

Estimated size: ~200-250 lines total. Depends on: auth module (for current user/roles via AuthPort).

### 6.1 PermissionPort + Types + Role Hierarchy (TPL-157)

Hex port at `modules/permission/ports/permission-port.mjs`. Domain at `modules/permission/domain/`.

**PermissionPort interface:**

- `can(action, resource)` -- returns `true` if the current context permits the action on the resource
- `cannot(action, resource)` -- inverse of `can()`
- `grant(role, action, resource, conditions?)` -- adds a permission rule
- `revoke(role, action, resource)` -- removes a permission rule
- `getRulesForRole(role)` -- returns all rules assigned to a role
- `setUser(user)` -- sets the current user context (roles and attributes)

**Domain types:**

- `PermissionRule` -- `{ role: string, action: string, resource: string, conditions?: Record<string, unknown> }`
- `RoleHierarchy` -- a map of `{ role: string, inherits: string[] }` defining which roles inherit from which
- `PermissionCheck` -- `{ allowed: boolean, matchedRule?: PermissionRule, reason?: string }`
- `ResourceAction` -- common actions: `'create' | 'read' | 'update' | 'delete' | 'manage'`; extensible with any string

**Domain utilities:**

- `createRoleHierarchy(config)` -- builds a hierarchy from a declarative config; `resolveRoles(hierarchy, role)` returns the flattened set of effective roles including inherited ones
- `matchRule(rule, action, resource, conditions?)` -- checks if a rule matches the given action/resource pair with optional condition evaluation

Constraints: The port must be framework-free and testable in isolation. Role resolution must handle circular inheritance gracefully (detect and break cycles). The module depends on the auth module only for user context -- it imports AuthUser type but does not import auth adapters. Error messages use i18n keys.

### 6.2 StaticRulesAdapter (TPL-158)

Declarative adapter at `modules/permission/adapters/static-rules-adapter.mjs`.

- Factory function `createStaticRulesAdapter(config)` accepting a declarative JSON rules object
- Config structure: `{ roles: RoleHierarchy, rules: PermissionRule[] }`
- Rules are evaluated in order; first match wins
- Supports wildcard `'*'` for action and resource (matches anything)
- `grant()` and `revoke()` modify the in-memory rule set (not the original config)
- `can()` resolves the user's effective roles (including inherited) and checks against all rules

Constraints: Must conform to PermissionPort interface. Must pass runtime port assertion. Rules are evaluated synchronously. No external dependencies.

### 6.3 DynamicAdapter (TPL-159)

API-backed adapter at `modules/permission/adapters/dynamic-adapter.mjs`.

- Factory function `createDynamicPermissionAdapter(checkFn)` accepting an async `checkFn(user, action, resource) => Promise<PermissionCheck>`
- Delegates `can()` and `cannot()` to the injected check function
- Caches permission decisions for a configurable TTL to avoid excessive API calls
- `grant()` and `revoke()` call optional injected `grantFn` / `revokeFn` or throw if not provided
- `invalidateCache()` -- clears cached decisions
- `destroy()` -- clears cache and timers

Constraints: Must conform to PermissionPort interface. Must pass runtime port assertion. The check function is dependency-injected (no direct HTTP calls in the adapter). Cache TTL defaults to 60 seconds. No external dependencies.

---

## Module 7: FilePort -- File Upload/Download/Processing (`modules/file/`)

Estimated size: ~300-400 lines total. Leaf module, no dependencies. Synergy with retrieval module for document loading.

### 7.1 FilePort + Types + File Domain (TPL-160)

Hex port at `modules/file/ports/file-port.mjs`. Domain at `modules/file/domain/`.

**FilePort interface:**

- `upload(file, options?)` -- uploads a file; returns a `FileHandle` with progress events
- `download(fileId, options?)` -- downloads a file by ID; returns a `FileHandle` with progress events
- `read(file)` -- reads file contents as text, ArrayBuffer, or DataURL (configurable)
- `preview(file)` -- returns a preview URL (object URL for images, icon placeholder for others)
- `getMetadata(file)` -- returns file metadata without reading full contents
- `list(query?)` -- lists available files matching optional query criteria

**Domain types:**

- `FileMetadata` -- `{ id: string, name: string, size: number, mimeType: string, lastModified: number, extension: string }`
- `FileHandle` -- `{ id: string, metadata: FileMetadata, progress: Observable<FileProgress>, result: Promise<FileResult> }`
- `FileProgress` -- `{ loaded: number, total: number, percent: number }`
- `FileResult` -- `{ id: string, url?: string, content?: unknown, metadata: FileMetadata }`
- `FileOptions` -- `{ chunkSize?: number, onProgress?: (progress: FileProgress) => void, readAs?: 'text' | 'arrayBuffer' | 'dataURL' }`
- `FileValidationOptions` -- `{ maxSize?: number, allowedTypes?: string[], allowedExtensions?: string[] }`

**Domain utilities:**

- `detectMimeType(file)` -- detects MIME type from file extension and magic bytes (common types: images, PDF, text, JSON, CSV)
- `validateFile(file, options)` -- validates size, MIME type, and extension against allowed lists; returns `{ valid: boolean, errorKey?: string, params?: Record<string, unknown> }`
- `formatFileSize(bytes)` -- human-readable file size string (e.g., "1.5 MB")

Constraints: MIME detection uses a built-in lookup table, not an external library. Validation error messages use i18n keys. The port must be framework-free and testable in isolation.

### 7.2 BlobAdapter (TPL-161)

Browser Blob/File API adapter at `modules/file/adapters/blob-adapter.mjs`.

- Factory function `createBlobAdapter(options?)` returning a FilePort-conformant adapter
- `upload()` sends file data via `fetch` with configurable endpoint; reports progress via `XMLHttpRequest` when `onProgress` is requested (fetch does not support upload progress natively)
- `download()` fetches a URL and constructs a Blob; reports progress via response body reader
- `read()` uses `FileReader` API for text, ArrayBuffer, and DataURL reading
- `preview()` creates object URLs via `URL.createObjectURL()`; provides `revokePreview()` for cleanup
- Chunked upload support: splits large files into chunks and uploads sequentially with resume capability
- `destroy()` revokes all created object URLs

Constraints: Must conform to FilePort interface. Must pass runtime port assertion. Uses only native browser APIs (File, Blob, FileReader, fetch, XMLHttpRequest for progress). No external dependencies.

### 7.3 FileSystemAdapter (TPL-162)

Node/Electron adapter at `modules/file/adapters/file-system-adapter.mjs`.

- Factory function `createFileSystemAdapter(options?)` accepting `basePath` (root directory for file operations)
- `upload()` writes file data to the file system at the configured base path
- `download()` reads a file from the file system and returns its contents
- `read()` reads file contents using Node `fs` APIs (text, buffer)
- `preview()` returns a `file://` URL for the file
- `getMetadata()` uses `fs.stat` for size, modification time
- `list()` reads directory contents with optional glob filtering
- Feature detection: checks for `fs` availability; throws a clear i18n error if used in a browser context

Constraints: Must conform to FilePort interface. Must pass runtime port assertion. Uses Node `fs/promises` API. Graceful degradation in environments without `fs`. No external dependencies beyond Node built-ins.

---

## Module 8: AnalyticsPort -- Analytics and Behavioral Telemetry (`modules/analytics/`)

Estimated size: ~400-500 lines total (including behavioral collectors). Leaf module, no dependencies. Privacy-first: everything off by default, consent-gated.

### 8.1 AnalyticsPort + Types + Event Domain (TPL-163)

Hex port at `modules/analytics/ports/analytics-port.mjs`. Domain at `modules/analytics/domain/`.

**AnalyticsPort interface:**

- `track(event, properties?)` -- tracks a named event with optional properties
- `identify(userId, traits?)` -- identifies the current user with optional traits
- `page(name?, properties?)` -- tracks a page view
- `setProperties(properties)` -- sets persistent properties included with all subsequent events
- `reset()` -- clears user identity and persistent properties
- `getConsent()` -- returns the current consent state
- `setConsent(consent)` -- sets the consent state; analytics are suppressed when consent is not granted

**Domain types:**

- `AnalyticsEvent` -- `{ name: string, properties?: Record<string, unknown>, timestamp: number, sessionId: string, userId?: string }`
- `ConsentState` -- `{ analytics: boolean, behavioral: boolean }` -- separate consent for standard analytics and behavioral tracking
- `SessionInfo` -- `{ id: string, startedAt: number, pageViews: number, duration: number }`
- `BehavioralEvent` -- `{ type: string, target?: string, coordinates?: { x: number, y: number }, viewport?: { width: number, height: number }, timestamp: number }`

**Domain utilities:**

- `createSessionManager()` -- generates session IDs, tracks session start time and page view count, detects session timeout (configurable, default 30 minutes)
- `isConsentGranted(consent, category)` -- checks whether the given consent state permits the given tracking category

Constraints: All tracking is suppressed when consent is not granted. The port must be framework-free and testable in isolation. Must respect `navigator.doNotTrack`. Error messages use i18n keys.

### 8.2 AnalyticsConsoleAdapter (TPL-164)

Development adapter at `modules/analytics/adapters/console-adapter.mjs`.

- Factory function `createAnalyticsConsoleAdapter(options?)` returning an AnalyticsPort-conformant adapter
- Logs all events to the browser console in a readable format
- Respects consent state (suppresses output when consent is not granted)
- Useful for development and debugging

Constraints: Must conform to AnalyticsPort interface. Must pass runtime port assertion. No side effects beyond console output.

### 8.3 AnalyticsNoOpAdapter (TPL-165)

Silent adapter at `modules/analytics/adapters/no-op-adapter.mjs`.

- Factory function `createAnalyticsNoOpAdapter()` returning an AnalyticsPort-conformant adapter
- All methods are no-ops
- Used in tests and environments where analytics should be completely suppressed

Constraints: Must conform to AnalyticsPort interface. Must pass runtime port assertion. Zero side effects.

### 8.4 BehavioralAdapter -- Click, Scroll, Visibility (TPL-166)

Behavioral tracking adapter at `modules/analytics/adapters/behavioral-adapter.mjs`.

- Factory function `createBehavioralAdapter(analyticsPort, options?)` wrapping an existing AnalyticsPort adapter to add behavioral collection
- **Click tracking:** element tag, element ID/class, click coordinates (relative to viewport), timestamp. Registered via `document.addEventListener('click', ...)` with delegation
- **Scroll depth tracking:** tracks maximum scroll depth percentage per page; debounced to avoid excessive events; reports at configurable thresholds (default: 25%, 50%, 75%, 100%)
- **Element visibility tracking:** uses `IntersectionObserver` to track when configured elements enter/exit the viewport; reports time-in-view for each tracked element
- All behavioral events are consent-gated under the `behavioral` consent category
- `startTracking()` -- activates behavioral collection
- `stopTracking()` -- deactivates and cleans up listeners/observers
- `destroy()` -- alias for stopTracking plus internal cleanup

Constraints: Must not wrap or replace the AnalyticsPort contract -- it enhances an existing adapter. Behavioral collection is **off by default**; `startTracking()` must be called explicitly. Must use passive event listeners where possible. Must debounce/throttle high-frequency events to avoid performance impact. No external dependencies.

### 8.5 Mouse Movement Collector + Session Management (TPL-167)

Mouse heatmap collector at `modules/analytics/domain/mouse-collector.mjs`. Session management at `modules/analytics/domain/session.mjs`. Public API at `modules/analytics/public-api.mjs`.

**Mouse movement collector:**

- `createMouseCollector(options?)` -- creates a collector that samples mouse position at configurable intervals (default: 100ms, not every pixel move)
- Captures: `{ x, y, viewportWidth, viewportHeight, timestamp }`
- Batches samples and reports them via a configurable `flushFn` at configurable intervals
- `start()` / `stop()` / `destroy()` lifecycle
- Consent-gated under the `behavioral` consent category
- Adaptive sampling: reduces sample rate when the page is not in focus or when there is no mouse movement

**Session management (updates to domain):**

- Session timeout detection (inactivity-based)
- Cross-page session continuity via `sessionStorage`
- Session event lifecycle: `session:start`, `session:end`, `session:timeout`

**Public API exports:**

- Port assertions: `assertAnalyticsPort`
- Adapter factories: `createAnalyticsConsoleAdapter`, `createAnalyticsNoOpAdapter`, `createBehavioralAdapter`
- Domain: `createSessionManager`, `createMouseCollector`, `isConsentGranted`
- Types and constants: `ConsentState`

Constraints: Mouse collector must not impact application performance. Sampling rate must be configurable and reasonable. All data is consent-gated. No external dependencies.

---

## Module 9: SchedulerPort -- Periodic Tasks (`modules/scheduler/`)

Estimated size: ~200-250 lines total. Leaf module, no dependencies.

### 9.1 SchedulerPort + Types + Schedule Domain (TPL-168)

Hex port at `modules/scheduler/ports/scheduler-port.mjs`. Domain at `modules/scheduler/domain/`.

**SchedulerPort interface:**

- `schedule(name, taskFn, interval, options?)` -- registers a periodic task; returns a `ScheduleHandle`
- `cancel(name)` -- cancels a scheduled task by name
- `pause(name)` -- pauses a scheduled task (retains configuration)
- `resume(name)` -- resumes a paused task
- `getSchedule(name)` -- returns the schedule configuration and status for a named task
- `listSchedules()` -- returns all registered schedules with their current status
- `destroy()` -- cancels all schedules and cleans up timers

**Domain types:**

- `ScheduleHandle` -- `{ name: string, cancel: () => void, pause: () => void, resume: () => void }`
- `ScheduleStatus` -- enum: `'active' | 'paused' | 'cancelled'`
- `ScheduleConfig` -- `{ name: string, interval: number, status: ScheduleStatus, lastRun?: number, nextRun?: number, runCount: number }`
- `ScheduleOptions` -- `{ immediate?: boolean, jitter?: number, maxRuns?: number, onError?: (error: Error) => void }`

**Domain utilities:**

- `parseCronLike(expression)` -- parses a simplified cron-like pattern (supports: `'every 5s'`, `'every 30m'`, `'every 2h'`) into millisecond intervals; not full cron -- a simple human-readable interval syntax
- `addJitter(interval, jitter)` -- adds random jitter to an interval to prevent thundering herd in distributed systems

Constraints: The port must be framework-free and testable in isolation. The cron-like parser is intentionally simple -- not a full cron implementation. Jitter is important for distributed scenarios. Error messages use i18n keys.

### 9.2 IntervalAdapter (TPL-169)

setInterval adapter at `modules/scheduler/adapters/interval-adapter.mjs`.

- Factory function `createIntervalAdapter()` returning a SchedulerPort-conformant adapter
- Uses native `setInterval` / `clearInterval` for scheduling
- Supports `immediate` option to run the task once immediately on schedule
- Applies jitter to intervals when configured
- Enforces `maxRuns` limit
- Tracks `lastRun`, `nextRun`, and `runCount` per schedule
- Error handling: catches task errors and calls `onError` handler; does not cancel the schedule on error

Constraints: Must conform to SchedulerPort interface. Must pass runtime port assertion. No external dependencies.

### 9.3 IdleAdapter (TPL-170)

requestIdleCallback adapter at `modules/scheduler/adapters/idle-adapter.mjs`.

- Factory function `createIdleAdapter()` returning a SchedulerPort-conformant adapter
- Uses `requestIdleCallback` to schedule tasks during browser idle periods
- Falls back to `setTimeout` with a delay when `requestIdleCallback` is not available
- Tasks run only when the browser is idle; they are deferred if the main thread is busy
- Configurable `timeout` option to ensure the task runs within a maximum wait time even under load
- Ideal for low-priority maintenance tasks (cache cleanup, telemetry flush)

Constraints: Must conform to SchedulerPort interface. Must pass runtime port assertion. Must gracefully fall back in environments without `requestIdleCallback`. No external dependencies.

### 9.4 VisibilityAwareAdapter (TPL-171)

Visibility-aware adapter at `modules/scheduler/adapters/visibility-aware-adapter.mjs`.

- Factory function `createVisibilityAwareAdapter(innerAdapter?)` optionally wrapping another SchedulerPort adapter (defaults to the interval adapter behavior)
- Uses `document.visibilitychange` event to pause all schedules when the tab is hidden and resume them when the tab becomes visible again
- On resume: optionally runs any tasks that were due while the tab was hidden (configurable `catchUp` option, default `false`)
- `isVisible()` -- returns the current visibility state
- Falls back to always-visible behavior when `document.visibilityState` is not available

**Public API exports:**

- Port assertions: `assertSchedulerPort`
- Adapter factories: `createIntervalAdapter`, `createIdleAdapter`, `createVisibilityAwareAdapter`
- Domain: `parseCronLike`, `addJitter`
- Types and constants: `ScheduleStatus`

Constraints: Must conform to SchedulerPort interface. Must pass runtime port assertion. Must gracefully degrade in non-browser environments. No external dependencies.

---

## Out of scope

- Server-side implementations of any port (these are browser/client-first modules)
- Real cryptographic operations (log encryption, signed analytics)
- Full cron parser (scheduler uses simplified human-readable intervals only)
- TURN/STUN server bundling for WebRTC (consumer provides ICE configuration)
- Real OAuth or SAML integration for permissions
- Database-backed permission stores (dynamic adapter uses injected functions)
- Server-side file storage (S3, GCS, Azure Blob)
- Real analytics vendor integrations (Google Analytics, Mixpanel, etc.)
- Screen recording or session replay (only primitives for mouse/click/scroll)
- Cross-tab communication for realtime (only single-tab transport management)
- Service Worker integration for background scheduling
- Network-offline handling beyond graceful degradation

## Cross-cutting constraints

- All modules use vanilla JS (ESM, no build step)
- All modules follow the hex port/adapter pattern consistent with existing modules (except form-validation which is pure domain)
- Cross-module access goes through `public-api.mjs` only
- No new framework or runtime dependencies (no external libraries)
- Existing starter features must continue to work identically
- The typing pattern (JSDoc + `.d.ts` sidecar) must follow the reference established by existing modules
- All user-facing error messages, validation messages, and status descriptions must use i18n message keys
- Each module must be independently testable and detachable via the module detachment tooling
- Each module must include a `manifest.json` following the existing pattern
- Privacy-first: analytics and behavioral tracking are off by default and consent-gated
- Permission module depends on auth for user context only (via AuthUser type)

## Module dependency summary

| Module | Dependencies | Depended-by |
|--------|-------------|-------------|
| log | none | (any module may optionally use) |
| cache | none | (standalone) |
| form-validation | none | (standalone) |
| realtime | none | (standalone, optional event-bus synergy) |
| task | none | (standalone, synergy with retrieval, local-llm) |
| permission | auth (user context) | (standalone) |
| file | none | (standalone, synergy with retrieval) |
| analytics | none | (standalone) |
| scheduler | none | (standalone) |

## Acceptance boundaries

All 9 modules:

- Each module has a `manifest.json`, `public-api.mjs`, `README.md`, type sidecars, and structured headers
- Each port has a runtime assertion function (`assertXxxPort`)
- All adapters pass their respective runtime port assertions
- All error messages use i18n message keys
- All modules are testable in isolation without framework dependencies
- No module breaks existing starter features or hex boundaries
- JSDoc typedefs are present in all source files and reference the `.d.ts` sidecars
- Public APIs expose only the documented surface
- Each module can be detached cleanly via the module detachment tooling

```trace-yaml
work_item:
  id: TPL-136
  type: meta
  title: Infrastructure Modules -- 9 new hex modules for logging, caching, validation, realtime, tasks, permissions, files, analytics, and scheduling
  parent_ref:
  status: done
  module_ref: log, cache, form-validation, realtime, task, permission, file, analytics, scheduler
  spec_refs:
    - docs/prd/infrastructure-modules.md
    - docs/prd/index.md
  test_refs:
    - tests/contract/product-docs-contract.test.mjs
  bdd_refs:
  acceptance:
    - Nine new hex modules exist under modules/ following the established architecture pattern.
    - Each module has a port (or pure domain surface for form-validation), adapters, public API, manifest, types, and README.
    - All ports have runtime assertion functions.
    - All adapters pass runtime port assertions.
    - All error messages use i18n message keys.
    - All modules are framework-free and independently testable.
    - No module breaks existing starter features or hex boundaries.
    - Privacy-first analytics with consent gating.
    - Permission module integrates with auth for user context.
```
