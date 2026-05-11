<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Define the umbrella PRD for the Auth and API Client hex modules that provide authentication ports with multiple adapters and a typed HTTP client abstraction.
@sidecar auth-api-client.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# Auth Port + API Client

## Requirement intent

The starter template needs two foundational hex modules that provide pluggable authentication and a typed HTTP client abstraction. These modules are reusable building blocks that future application features will depend on for identity management, route protection, and backend communication.

The **auth** module provides a port-based authentication abstraction with multiple swappable adapters. It allows any application to plug in its preferred authentication strategy -- from no-auth anonymous mode to local credentials to OAuth -- without coupling application code to a specific auth provider. A route guard utility enables navigation protection based on auth state.

The **api-client** module provides a port-based HTTP client abstraction. It normalizes request/response handling, base URL management, default headers, and error handling behind a stable interface. The default adapter uses the native `fetch()` API. An integration point with the auth module allows automatic injection of authorization headers into outbound requests.

Both modules follow the established hex architecture pattern used by feature-seams, event-bus, and state: domain logic, port contracts, adapter implementations, public API boundary, JSDoc + `.d.ts` typing, and runtime port assertions.

All user-facing copy (error messages, validation messages, status descriptions) must go through the i18n/messages layer.

## Classification

This is **technical/architectural** work. It provides reusable infrastructure modules for the starter template. It does not alter user-facing workflows directly. USM is intentionally skipped.

## Deliverables in scope (Slice 8)

### Module A: Auth (`modules/auth/`)

#### 1. AuthPort Definition (TPL-063)

Hex port at `modules/auth/ports/auth-port.mjs`.

**AuthPort interface:**

- `login(credentials)` -- authenticates with the given credentials object; returns a result indicating success or failure with the authenticated user
- `logout()` -- clears the current authentication state; notifies auth-change listeners
- `getUser()` -- returns the currently authenticated user object or null if not authenticated
- `isAuthenticated()` -- returns a boolean indicating whether a user is currently authenticated
- `onAuthChange(listener)` -- registers a listener called whenever auth state changes (login, logout); returns an unsubscribe function
- `offAuthChange(listener)` -- removes a specific auth-change listener

**Domain types:**

- `AuthUser` -- user identity object with at minimum `id`, `displayName`, and `role` fields
- `AuthCredentials` -- credentials object; shape varies by adapter (username/password for local, provider/token for OAuth)
- `AuthResult` -- result object with `success` boolean, optional `user`, and optional `error` message
- `AuthChangeEvent` -- event payload with `user` (or null) and `type` ('login' | 'logout')

Constraints: The port must be framework-free and testable in isolation. All listener management follows the same pattern as EventBusPort (registration order, unsubscribe function). Error messages must be i18n-ready string keys, not hardcoded English prose.

#### 2. AnonymousAdapter (TPL-064)

Default no-auth adapter at `modules/auth/adapters/anonymous-adapter.mjs`.

- Factory function `createAnonymousAdapter()` returning a fresh adapter instance
- Always returns an anonymous user from `getUser()` with `{ id: 'anonymous', displayName: 'Anonymous', role: 'guest' }`
- `isAuthenticated()` always returns `true` (anonymous access is treated as implicitly authenticated)
- `login()` is a no-op that returns a successful AuthResult with the anonymous user
- `logout()` is a no-op that does not change state or fire auth-change listeners
- Auth-change listeners can be registered but are never fired (state never changes)

Constraints: Must conform to the AuthPort interface. Must pass the runtime port assertion. Must be stateless across separate factory calls. This adapter is the safe default for applications that do not need authentication.

#### 3. LocalPasswordAdapter (TPL-065)

Demo credential adapter at `modules/auth/adapters/local-password-adapter.mjs`.

- Factory function `createLocalPasswordAdapter(storageAdapter)` accepting any StoragePort-conformant adapter for credential persistence
- `register(username, password)` -- stores a new user with a simple hash of the password (not cryptographically secure; demo only)
- `login({ username, password })` -- verifies credentials against stored users; on success, sets the current user and fires auth-change listeners; on failure, returns an AuthResult with `success: false` and an i18n error key
- `logout()` -- clears the current user and fires auth-change listeners
- `getUser()` and `isAuthenticated()` reflect the current session state
- Simple hash function for demo purposes (e.g., basic string transformation); a clear code comment must note this is not suitable for production use

Constraints: Must conform to the AuthPort interface. Must pass the runtime port assertion. Must not use bcrypt or any native addon. Must accept any StoragePort-conformant adapter for persistence. Must degrade gracefully when storage is unavailable. Error messages must use i18n keys.

#### 4. OAuthStubAdapter (TPL-066)

Mock OAuth adapter at `modules/auth/adapters/oauth-stub-adapter.mjs`.

- Factory function `createOAuthStubAdapter(config)` accepting a configuration object with `providerName` (string), optional `mockDelay` (ms), and optional `mockUser` (AuthUser)
- `login()` -- simulates an OAuth redirect/callback flow: returns a successful AuthResult after the configured mock delay with either the configured mock user or a generated user based on the provider name
- `logout()` -- clears the mock session and fires auth-change listeners
- `getUser()` and `isAuthenticated()` reflect the mock session state
- The adapter produces mock tokens (`accessToken`, `refreshToken`) on the user object for testing token-related downstream code
- This is a stub for integration testing; it does not perform real OAuth

Constraints: Must conform to the AuthPort interface. Must pass the runtime port assertion. Must not make real network requests. The configurable provider name allows testing different OAuth flows (Google, GitHub, etc.) without different adapter code. Must be stateless across separate factory calls.

#### 5. Auth Route Guard (TPL-067)

Navigation guard utility at `modules/auth/domain/route-guard.mjs`.

- `createRouteGuard(authAdapter, options)` -- creates a guard instance bound to a specific auth adapter
- `guard.canAccess(routeConfig)` -- checks whether the current auth state satisfies the route's access requirements
- Route configuration supports: `requiresAuth` (boolean), `requiredRoles` (array of role strings), `redirectTo` (path to redirect when access is denied)
- Returns an access decision object: `{ allowed: boolean, redirectTo?: string, reason?: string }`
- Does not perform navigation itself; it evaluates access and returns a decision that the app shell or router can act on
- Works with any AuthPort-conformant adapter

Constraints: The guard is a pure domain utility, not an adapter. It must not depend on any specific router or navigation framework. It must not import from outside the auth module boundary except through public APIs. The reason field in denied decisions must use i18n keys.

### Module B: API Client (`modules/api-client/`)

#### 6. ApiClientPort Definition (TPL-068)

Hex port at `modules/api-client/ports/api-client-port.mjs`.

**ApiClientPort interface:**

- `get(url, options)` -- performs an HTTP GET request; returns a normalized response
- `post(url, body, options)` -- performs an HTTP POST request with the given body; returns a normalized response
- `put(url, body, options)` -- performs an HTTP PUT request with the given body; returns a normalized response
- `delete(url, options)` -- performs an HTTP DELETE request; returns a normalized response
- `setBaseUrl(url)` -- sets the base URL that will be prepended to all relative request URLs
- `setHeader(name, value)` -- sets a default header that will be included in all requests
- `removeHeader(name)` -- removes a previously set default header

**Domain types:**

- `ApiResponse` -- normalized response object with `status` (number), `data` (parsed body), `headers` (object), and `ok` (boolean)
- `ApiError` -- error object extending ApiResponse with additional `message` (i18n key) for non-2xx responses
- `ApiRequestOptions` -- per-request options including `headers` (override defaults), `params` (query parameters), `timeout` (ms)

Constraints: The port must be framework-free and testable in isolation. All error messages must use i18n keys. The response normalization must handle JSON and text content types gracefully.

#### 7. FetchAdapter (TPL-069)

Native fetch adapter at `modules/api-client/adapters/fetch-adapter.mjs`.

- Factory function `createFetchAdapter(options?)` returning a fresh adapter instance
- Implements all ApiClientPort operations using the native `fetch()` API
- Base URL management: prepends the configured base URL to relative URLs; absolute URLs bypass the base
- Default headers: merges per-request headers with default headers (per-request takes precedence)
- JSON handling: automatically serializes request bodies as JSON and parses JSON response bodies when content-type indicates JSON
- Error normalization: non-2xx responses are rejected with an `ApiError` containing the status, parsed body, and an i18n error key
- Network errors (fetch failures) are caught and normalized into an `ApiError` with a descriptive i18n error key
- Query parameter serialization: `options.params` are serialized and appended to the URL

Constraints: Must conform to the ApiClientPort interface. Must pass the runtime port assertion. Must use only the native `fetch()` API (no axios, got, or other HTTP libraries). Must handle both browser and Node.js `fetch` (available in Node 18+). Must be stateless across separate factory calls except for configured base URL and headers.

#### 8. Auth-ApiClient Integration (TPL-070)

Integration utility at `modules/auth/domain/auth-api-integration.mjs`.

- `createAuthenticatedClient(authAdapter, apiClient)` -- wraps an ApiClientPort instance to automatically inject the Authorization header from the current auth state
- On each request, checks `authAdapter.getUser()` for a token; if present, sets the `Authorization` header (e.g., `Bearer <token>`)
- If the user is not authenticated or has no token, requests proceed without an Authorization header
- Listens to auth-change events to clear or update the cached authorization header when the user logs in or out
- Returns an object that conforms to ApiClientPort so it can be used as a drop-in replacement
- Cleanup function `destroy()` to unsubscribe from auth-change events

Constraints: Must not break the ApiClientPort contract. Must work with any AuthPort + ApiClientPort adapter combination. Must clean up auth-change subscriptions when destroyed. The integration lives in the auth module because it depends on auth domain knowledge.

#### 9. JWT Adapter (TPL-135)

Production-grade JWT adapter at `modules/auth/adapters/jwt-adapter.mjs`.

- Factory function `createJwtAdapter(config)` returning an adapter with `destroy()` cleanup
- Config accepts: `verifyKey` (public key or symmetric secret), `loginFn` (async credential handler returning tokens), optional `refreshFn`, optional `issuer`/`audience` for claim validation, optional `algorithms`, optional `mapClaims`
- On login: calls the injected `loginFn`, receives tokens, verifies the access token using `jose`, extracts user claims (sub, name, role), builds AuthUser with attached tokens
- Token verification: validates signature, expiry, and optionally issuer/audience claims
- Auto-refresh: schedules a timer to call `refreshFn` before the access token expires (configurable buffer, default 60s)
- On logout: clears tokens, cancels refresh timer, fires auth-change listeners
- Custom claim mapping: optional `mapClaims(claims)` function to transform JWT payload to AuthUser for non-standard claim structures
- Test helpers: `createTestKeyPair()` (ES256), `createTestSecret()` (HS256), `signTestToken()` for generating real signed tokens in test scenarios

Constraints: Must conform to the AuthPort interface. Must pass the runtime port assertion. Uses `jose` (ESM, zero-dependency, Web Crypto API) for all cryptographic operations. The adapter must not make HTTP calls directly — `loginFn` and `refreshFn` are dependency-injected. Tokens are held in memory only — the caller decides the storage strategy. `destroy()` must be called to clear refresh timers.

## Out of scope

- Real cryptographic password hashing (bcrypt, argon2, scrypt)
- Real OAuth provider integration (Google, GitHub, etc.)
- Server-side authentication middleware
- CSRF protection
- Rate limiting or request throttling
- Request caching or deduplication
- WebSocket or SSE connections
- File upload handling
- GraphQL client
- Request/response interceptor chains
- Retry logic with backoff
- Certificate pinning or mTLS

## Cross-cutting constraints

- Both modules use vanilla JS (ESM, no build step)
- Both modules follow the hex port/adapter pattern consistent with existing modules (feature-seams, event-bus, state)
- Cross-module access goes through `public-api.mjs` only
- No new framework or runtime dependency
- Existing starter features must continue to work identically
- The typing pattern (JSDoc + `.d.ts` sidecar) must follow the reference established by feature-seams
- All user-facing error messages, validation messages, and status descriptions must use i18n message keys
- Auth adapters in this slice are demo and stub implementations only; production use requires proper security review
- The auth module's integration utility depends on the api-client module but imports only through that module's `public-api.mjs`

## Acceptance boundaries

### Slice 8

- AuthPort defines login, logout, getUser, isAuthenticated, onAuthChange, and offAuthChange operations
- Domain types define AuthUser, AuthCredentials, AuthResult, and AuthChangeEvent
- AnonymousAdapter always returns an anonymous user and is implicitly authenticated
- LocalPasswordAdapter stores and verifies credentials via StoragePort with a simple demo hash
- LocalPasswordAdapter supports register, login, and logout with proper auth-change notifications
- OAuthStubAdapter simulates OAuth flow with configurable provider name and mock user/tokens
- All auth adapters pass the runtime port assertion
- Route guard evaluates access based on auth state and route configuration without performing navigation
- Route guard supports requiresAuth, requiredRoles, and redirectTo route configuration
- ApiClientPort defines get, post, put, delete, setBaseUrl, setHeader, and removeHeader operations
- Domain types define ApiResponse, ApiError, and ApiRequestOptions
- FetchAdapter implements ApiClientPort using native fetch() with JSON handling, error normalization, and query parameter serialization
- FetchAdapter supports base URL prepending and default header merging
- FetchAdapter passes the runtime port assertion
- Auth-ApiClient integration automatically injects Authorization header from auth state
- Auth-ApiClient integration subscribes to auth changes and provides a destroy cleanup function
- Auth-ApiClient integration conforms to ApiClientPort and works as a drop-in replacement
- All error messages use i18n message keys
- JSDoc typedefs are present in all source files and reference the `.d.ts` sidecars
- `.d.ts` sidecars define TypeScript-compatible interfaces without introducing build requirements
- `public-api.mjs` for each module exports only the documented surface
- Neither module breaks existing starter features or hex boundaries

```trace-yaml
work_item:
  id: TPL-062
  type: meta
  title: Auth Port + API Client
  parent_ref:
  status: done
  module_ref: auth, api-client
  spec_refs:
    - docs/prd/auth-api-client.md
    - docs/prd/index.md
  test_refs:
    - tests/contract/product-docs-contract.test.mjs
  bdd_refs:
  acceptance:
    - AuthPort provides login, logout, getUser, isAuthenticated, onAuthChange, and offAuthChange operations.
    - AnonymousAdapter provides a no-auth default that is always implicitly authenticated.
    - LocalPasswordAdapter stores and verifies demo credentials via StoragePort.
    - OAuthStubAdapter simulates OAuth flow with configurable provider and mock tokens.
    - Route guard evaluates navigation access based on auth state and route configuration.
    - ApiClientPort provides get, post, put, delete, setBaseUrl, setHeader, and removeHeader operations.
    - FetchAdapter implements ApiClientPort using native fetch with JSON handling and error normalization.
    - Auth-ApiClient integration injects Authorization header from auth state automatically.
    - All error messages use i18n message keys.
    - JSDoc typedefs and .d.ts sidecars follow the established typing pattern.
    - Public APIs expose only the documented surface.
```
