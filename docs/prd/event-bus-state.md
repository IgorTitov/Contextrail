<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Define the umbrella PRD for the Event Bus and State Management hex modules that provide typed in-process eventing and observable state stores.
@sidecar event-bus-state.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# Event Bus + State Management

## Requirement intent

The starter template needs two foundational hex modules that provide typed in-process eventing and observable state management. These modules are reusable building blocks that future application features will depend on for decoupled communication and reactive state flow.

The **event-bus** module provides a synchronous, typed, in-process publish/subscribe system. It allows any module to emit named events with typed payloads and any other module to subscribe to those events without creating direct import dependencies between producer and consumer.

The **state** module provides a simple observable state store. It allows modules to read, update, and subscribe to state changes. The default adapter keeps state in memory, while a persistent adapter wraps the existing StoragePort from the user-preferences module to survive page reloads.

Both modules follow the established hex architecture pattern used by feature-seams and user-preferences: domain logic, port contracts, adapter implementations, public API boundary, JSDoc + .d.ts typing, and runtime port assertions.

## Classification

This is **technical/architectural** work. It provides reusable infrastructure modules for the starter template. It does not alter user-facing workflows directly. USM is intentionally skipped.

## Deliverables in scope (Slice 6)

### Module A: Event Bus (`modules/event-bus/`)

#### 1. EventBusPort Interface and Domain Model (TPL-044)

Hex port and domain at `modules/event-bus/`.

**EventBusPort interface:**

- `on(eventName, handler)` -- registers a handler for the named event; returns an unsubscribe function
- `off(eventName, handler)` -- removes a specific handler for the named event
- `emit(eventName, payload)` -- synchronously invokes all handlers registered for the named event with the given payload
- `listenerCount(eventName)` -- returns the number of handlers currently registered for the named event

**Domain model:**

- Event types registry at `modules/event-bus/domain/event-types.mjs` defining well-known event names and their payload shapes as JSDoc typedefs
- Typed event creation helper that validates event name and payload against the registry
- Event dispatch logic that invokes handlers in registration order, catches handler errors without stopping dispatch to remaining handlers

Constraints: The port must be framework-free and testable in isolation. Handler errors must not prevent other handlers from being called. The dispatch model is synchronous only (no async event handling in this slice).

#### 2. Memory Event Bus Adapter (TPL-045)

Default adapter at `modules/event-bus/adapters/memory-event-bus.mjs`.

- In-memory subscriber registry implementing the EventBusPort interface
- Factory function `createMemoryEventBus()` returning a fresh adapter instance
- Handlers stored per event name in registration order
- Supports multiple handlers per event and the same handler registered multiple times
- Removal via `off` removes only the first matching reference (consistent with standard EventEmitter behavior)

Constraints: Must conform to the EventBusPort interface. Must pass the runtime port assertion. Must be stateless across separate factory calls (no shared global state).

#### 3. EventBus Port Assertion, Types, and Public API (TPL-046)

Port assertion at `modules/event-bus/ports/assert-event-bus-port.mjs`, type sidecar at `modules/event-bus/types.d.ts`, and public API at `modules/event-bus/public-api.mjs`.

**Runtime port assertion:**

- `assertEventBusPort(adapter)` -- verifies at runtime that an adapter implements all required EventBusPort methods (on, off, emit, listenerCount)
- Throws a clear error naming the missing method when the assertion fails

**Type sidecar:**

- `.d.ts` sidecar defines TypeScript-compatible interfaces for EventBusPort, EventHandler, and event payload types
- JSDoc `@typedef` and `@param` annotations in all source `.mjs` files reference the sidecar types

**Public API:**

- Exports only the port assertion, factory function, event types registry, and typed event creation helper
- Does not expose adapter internals or domain dispatch implementation
- Follows the cross-module boundary convention used by other hex modules

Constraints: Types must be accurate reflections of the runtime API. The `.d.ts` file must not introduce TypeScript build requirements. Public API must not leak internal implementation.

#### 4. Event Bus Unit and Contract Tests (TPL-047)

Tests at `tests/unit/event-bus-*.test.mjs` and `tests/contract/event-bus-hex.test.mjs`.

**Unit tests:**

- Handler registration and invocation in correct order
- Multiple handlers per event
- Handler removal via `off` and via the unsubscribe function returned by `on`
- `listenerCount` accuracy before and after add/remove
- Handler error isolation (one failing handler does not prevent others)
- Emit with no registered handlers (no-op, no error)
- Event types registry validation
- Port assertion passes for conformant adapters and fails with clear errors for non-conformant objects

**Contract tests:**

- Hex folder structure verification (domain/, ports/, adapters/, public-api.mjs)
- Public API exports only the documented surface
- No deep imports from outside the module
- README.md exists in each subfolder

Constraints: All tests use `node:test`. All imports go through `public-api.mjs` only.

### Module B: State (`modules/state/`)

#### 5. StatePort Interface and Domain Model (TPL-048)

Hex port and domain at `modules/state/`.

**StatePort interface:**

- `getState()` -- returns a deep copy of the current state
- `setState(updater)` -- accepts either a replacement state object or an updater function `(currentState) => newState`; notifies all subscribers after the state changes
- `subscribe(handler)` -- registers a handler called with `(newState, oldState)` after every state change; returns an unsubscribe function
- `unsubscribe(handler)` -- removes a specific subscription handler

**Domain model:**

- Store creation function `createStore(initialState)` that produces a store instance conforming to StatePort
- State transitions must be synchronous
- Subscribers are notified in registration order after state changes
- `getState` must return a deep copy to prevent external mutation of internal state
- `setState` with an updater function receives the current state and must use the returned value as the new state

Constraints: The port must be framework-free and testable in isolation. State must be immutable from the consumer perspective (deep copy on read). Subscriber notification is synchronous.

#### 6. Memory State Adapter (TPL-049)

Default adapter at `modules/state/adapters/memory-state-adapter.mjs`.

- In-memory state store implementing the StatePort interface
- Factory function `createMemoryStateAdapter(initialState)` returning a fresh adapter instance
- State is stored internally and deep-copied on `getState` calls
- Subscriber list maintained in registration order

Constraints: Must conform to the StatePort interface. Must pass the runtime port assertion. Must not share state between separate factory calls.

#### 7. Persistent State Adapter (TPL-050)

Persistent adapter at `modules/state/adapters/persistent-state-adapter.mjs`.

- Wraps a `StoragePort` instance from the user-preferences module (`load`/`save` contract) to provide state persistence
- Factory function `createPersistentStateAdapter(storageAdapter, initialState)` accepting any StoragePort-conformant adapter
- On creation, attempts to load persisted state via `storageAdapter.load()`; falls back to `initialState` when nothing is persisted or load fails
- On every `setState` call, saves the new state via `storageAdapter.save(newState)` after notifying subscribers
- All other behavior (getState deep copy, subscribe/unsubscribe, notification order) matches the memory adapter

Constraints: Must conform to the StatePort interface. Must pass the runtime port assertion. Must accept any adapter that satisfies StoragePort (not hardcoded to localStorage or any specific storage). Must degrade gracefully when the storage adapter's `load` returns null or throws.

#### 8. State Port Assertion, Types, and Public API (TPL-051)

Port assertion at `modules/state/ports/assert-state-port.mjs`, type sidecar at `modules/state/types.d.ts`, and public API at `modules/state/public-api.mjs`.

**Runtime port assertion:**

- `assertStatePort(adapter)` -- verifies at runtime that an adapter implements all required StatePort methods (getState, setState, subscribe, unsubscribe)
- Throws a clear error naming the missing method when the assertion fails

**Type sidecar:**

- `.d.ts` sidecar defines TypeScript-compatible interfaces for StatePort, StateHandler, and StateUpdater
- JSDoc `@typedef` and `@param` annotations in all source `.mjs` files reference the sidecar types

**Public API:**

- Exports the port assertion, memory adapter factory, persistent adapter factory, and createStore domain function
- Does not expose adapter internals or domain implementation details
- Follows the cross-module boundary convention used by other hex modules

Constraints: Types must be accurate reflections of the runtime API. The `.d.ts` file must not introduce TypeScript build requirements. Public API must not leak internal implementation.

#### 9. State Unit and Contract Tests (TPL-052)

Tests at `tests/unit/state-*.test.mjs` and `tests/contract/state-hex.test.mjs`.

**Unit tests:**

- Store creation with initial state
- `getState` returns a deep copy (mutation of returned value does not affect store)
- `setState` with a replacement object
- `setState` with an updater function
- Subscriber notification with `(newState, oldState)`
- Multiple subscribers notified in registration order
- Unsubscribe via returned function and via `unsubscribe` method
- Persistent adapter loads from storage on creation
- Persistent adapter falls back to initial state when storage returns null
- Persistent adapter saves on every setState
- Persistent adapter degrades gracefully when storage load throws
- Port assertion passes for conformant adapters and fails with clear errors for non-conformant objects

**Contract tests:**

- Hex folder structure verification (domain/, ports/, adapters/, public-api.mjs)
- Public API exports only the documented surface
- No deep imports from outside the module
- README.md exists in each subfolder

Constraints: All tests use `node:test`. All imports go through `public-api.mjs` only. Persistent adapter tests use a mock StoragePort, not a real localStorage or IndexedDB.

### Cross-module: README files (TPL-053)

README.md files for every new folder created by this slice:

- `modules/event-bus/README.md`
- `modules/event-bus/domain/README.md`
- `modules/event-bus/ports/README.md`
- `modules/event-bus/adapters/README.md`
- `modules/state/README.md`
- `modules/state/domain/README.md`
- `modules/state/ports/README.md`
- `modules/state/adapters/README.md`

Each README follows the existing pattern: module purpose, public API surface, dependency notes, and usage examples.

Constraints: READMEs must be accurate and not duplicate PRD or backlog content. They describe the module for developers, not for planning.

## Out of scope

- Asynchronous event handling or event queuing
- Event replay, event sourcing, or event persistence
- Remote or cross-process event bus
- State middleware, reducers, or action dispatch patterns
- DevTools integration or state time-travel debugging
- State selectors or computed/derived state
- Integration with any UI framework

## Cross-cutting constraints

- Both modules use vanilla JS (ESM, no build step)
- Both modules follow the hex port/adapter pattern consistent with existing modules (feature-seams, user-preferences)
- Cross-module access goes through `public-api.mjs` only
- No new framework or runtime dependency
- Existing starter features must continue to work identically
- The typing pattern (JSDoc + `.d.ts` sidecar) must follow the reference established by feature-seams
- The state module's persistent adapter depends on the StoragePort from user-preferences but imports only through that module's `public-api.mjs`

## Acceptance boundaries

### Slice 6

- EventBusPort defines on, off, emit, and listenerCount operations
- Event types registry provides well-known event names with typed payload shapes
- Memory event bus adapter passes the runtime port assertion and all unit tests
- Handler errors do not prevent other handlers from being called
- Emit with no handlers is a no-op
- `on` returns an unsubscribe function; `off` removes a specific handler
- StatePort defines getState, setState, subscribe, and unsubscribe operations
- `getState` returns a deep copy of state
- `setState` accepts both replacement objects and updater functions
- Subscribers receive `(newState, oldState)` in registration order
- Memory state adapter passes the runtime port assertion and all unit tests
- Persistent state adapter wraps any StoragePort-conformant adapter for persistence
- Persistent state adapter loads from storage on creation and saves on every setState
- Persistent state adapter degrades gracefully when storage is unavailable or returns null
- Runtime port assertions (`assertEventBusPort`, `assertStatePort`) throw clear errors for non-conformant adapters
- JSDoc typedefs are present in all source files and reference the `.d.ts` sidecars
- `.d.ts` sidecars define TypeScript-compatible interfaces without introducing build requirements
- `public-api.mjs` for each module exports only the documented surface
- Unit tests cover all domain logic, adapters, port assertions, and edge cases
- Contract tests verify hex folder structure, public API surface, and import boundaries
- README.md exists in every new folder
- Neither module breaks existing starter features or hex boundaries

```trace-yaml
work_item:
  id: TPL-043
  type: meta
  title: Event Bus + State Management
  parent_ref:
  status: done
  module_ref: event-bus, state
  spec_refs:
    - docs/prd/event-bus-state.md
    - docs/prd/index.md
  test_refs:
    - tests/contract/product-docs-contract.test.mjs
  bdd_refs:
  acceptance:
    - EventBusPort provides on, off, emit, and listenerCount operations.
    - Memory event bus adapter passes the runtime port assertion.
    - Handler errors do not prevent other handlers from being called.
    - StatePort provides getState, setState, subscribe, and unsubscribe operations.
    - Memory and persistent state adapters both pass the runtime port assertion.
    - Persistent state adapter wraps StoragePort for persistence and degrades gracefully.
    - JSDoc typedefs and .d.ts sidecars follow the established typing pattern.
    - Public APIs expose only the documented surface.
    - Unit and contract tests prove all adapters, port assertions, and edge cases.
    - README.md exists in every new folder.
```
