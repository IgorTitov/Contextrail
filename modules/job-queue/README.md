<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Overview and navigation guide for the job-queue hex module.
@sidecar README.md.header.md
@layer module | @hex _none_ | @ctx job-queue
@public false
@edit careful -->

# job-queue

Hexagonal background job queue — pure lifecycle domain + memory adapter + framework-free worker loop, all behind a single `JobQueuePort`. Zero external dependencies.

## Why

Background jobs are one of the classic TOP-100 starter gaps: email sending, webhooks, image processing, delayed retries, scheduled fan-out. Most templates either skip this entirely or hard-wire a single broker-specific library (BullMQ + Redis, Agenda + Mongo, …) that leaks through every caller. This module keeps the job state machine, retry policy, and backoff as a pure domain, wraps it in a 6-method port, and ships a zero-dependency in-memory adapter for the default case. A sqlite, redis, or postgres adapter can plug in later behind the same seam without touching any caller.

## Structure

```text
modules/job-queue/
├── domain/
│   ├── job-lifecycle.mjs       # Pure FSM: createJob, markRunning, markCompleted, markFailed, exponentialBackoff
│   └── worker.mjs              # createJobWorker — framework-free pull-based runner
├── ports/
│   └── job-queue-port.mjs      # JobQueuePort + assertJobQueuePort
├── adapters/
│   └── memory-job-queue.mjs    # createMemoryJobQueue (in-memory, FIFO by createdAt)
├── public-api.mjs              # Cross-module entry point
├── messages.mjs                # i18n keys
├── manifest.json               # Module metadata + capability surface
└── README.md
```

## Hexagonal layers

| Layer        | Folder           | Rule                                                    |
| ------------ | ---------------- | ------------------------------------------------------- |
| **Domain**   | `domain/`        | Pure functions + pull-based worker, no I/O, no timers    |
| **Ports**    | `ports/`         | `JobQueuePort` contract (6 methods)                     |
| **Adapters** | `adapters/`      | Memory implementation with retry/backoff                |
| **Public**   | `public-api.mjs` | The only file other modules may import                  |

## Lifecycle

```text
pending → running → completed
                 → failed        (attempts >= maxAttempts)
                 → pending       (retry with exponential backoff)
```

## Usage

### Enqueue + worker loop

```javascript
import {
  createMemoryJobQueue,
  createJobWorker,
} from './modules/job-queue/public-api.mjs';

const queue = createMemoryJobQueue();

// Enqueue a job
queue.enqueue('send-email', { to: 'alice@example.com', subject: 'Hi' });

// Build a worker that knows how to process jobs by name
const worker = createJobWorker({
  queue,
  handlers: {
    'send-email': async (payload) => {
      await mailer.send(payload);
    },
  },
  onEvent: (e) => console.log(e.type, e.job.id),
});

// Tick the worker — host app chooses when (setInterval, cron, manual).
setInterval(() => worker.runUntilEmpty(), 1000);
```

### Retry with exponential backoff

```javascript
queue.enqueue('flaky-webhook', { url: '...' }, { maxAttempts: 5, delayMs: 0 });
// On failure, the adapter calls exponentialBackoff(attempt, 100) by default:
// attempt 1 → 100 ms, attempt 2 → 200 ms, attempt 3 → 400 ms, … capped at 60 s.
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

## Rules

- Domain is pure. Clocks, id generation, and backoff are injected.
- The worker is pull-based. The host app owns the tick (no timers inside the domain).
- Cross-module consumers import from `public-api.mjs` only. Deep imports are forbidden.
- All user-facing copy uses i18n keys via `messages.mjs`.

## Tests

- `tests/unit/job-queue.test.mjs` — proves job lifecycle, retry/backoff, worker loop behavior.
- `tests/contract/job-queue-hex-contract.test.mjs` — proves the hex folder structure and public-api surface.
