<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Overview and navigation guide for the task hex module.
@sidecar README.md.header.md
@layer module | @hex _none_ | @ctx task
@public false
@edit careful -->

# task

Hexagonal bounded module for offloading work to Web Workers or executing on the main thread.

## Architecture

| Layer | File | Responsibility |
|-------|------|---------------|
| Domain | `domain/task-lifecycle.mjs` | Pure state machine: pending, running, completed, failed, cancelled |
| Domain | `domain/serialize.mjs` | `serializeForTransfer()` prepares data and validates transferables |
| Ports | `ports/task-port.mjs` | `TaskPort` contract + `assertTaskPort()` validator |
| Adapters | `adapters/main-thread-adapter.mjs` | Main-thread adapter using setTimeout for yielding |
| Adapters | `adapters/web-worker-adapter.mjs` | Web Worker pool adapter with inline Blob workers |
| Messages | `messages.mjs` | i18n message keys for errors and status |
| Public API | `public-api.mjs` | Single cross-module entry point |

## Usage

```js
import {
  createMainThreadAdapter,
  assertTaskPort,
} from '../../modules/task/public-api.mjs';

const adapter = createMainThreadAdapter();
assertTaskPort(adapter);

const handle = adapter.enqueue(({ reportProgress }) => {
  reportProgress(0.5, 'Halfway');
  return 42;
});

const result = await handle.result;
// { taskId: 'task-1', status: 'completed', result: 42 }
```

## Failure surface

Worker isolation introduces failure modes that the synchronous-looking `enqueue()` API hides — read these before relying on workers in production:

- **`structured-clone` rejects functions, DOM nodes, and class instances with methods** — `postMessage` throws `DataCloneError` synchronously. Pass plain data; reconstruct any objects-with-behavior on the worker side.
- **No force-kill** — `cancel()` only sets the lifecycle state. An in-flight task continues to consume CPU until it returns or yields. The Web Worker pool will not reuse a slot until the worker actually completes.
- **Worker pool exhaustion** — when all workers are busy, new tasks queue indefinitely. There is no built-in rejection threshold; cap caller-side or measure backlog if your task arrival rate can spike.
- **Uncaught worker exception** — rejects `handle.result` with the original error message but loses the stack trace across the worker boundary. Add explicit try/catch inside the worker function if you need full debugging context.
- **Inline Blob worker eval** — the Web Worker adapter materializes worker code via `new Function()` inside a Blob URL. This will fail under a strict CSP that forbids `worker-src blob:` or `script-src 'unsafe-eval'`. See the [security note in the adapter source](adapters/web-worker-adapter.mjs).
- **Main-thread adapter blocks the event loop** — the fallback adapter uses `setTimeout` for yielding only between explicit `reportProgress` calls. A sync-heavy task with no progress reports will freeze the UI just as if you had called the function directly.

## Rules

- Cross-module consumers import from `public-api.mjs` only.
- Deep imports into `domain/`, `ports/`, or `adapters/` are forbidden.
- Domain must stay framework-free.
