<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Overview and navigation guide for the scheduler hex module.
@sidecar README.md.header.md
@layer module | @hex _none_ | @ctx scheduler
@public false
@edit careful -->

# scheduler

Hexagonal bounded module for task scheduling with interval, idle-callback, and visibility-aware adapters.

## Architecture

| Layer | File | Responsibility |
|-------|------|---------------|
| Domain | `domain/cron-parser.mjs` | Parse cron-like expressions (`'every 5s'`) to milliseconds |
| Domain | `domain/jitter.mjs` | Add random jitter to intervals |
| Ports | `ports/scheduler-port.mjs` | `SchedulerPort` contract + `assertSchedulerPort()` validator |
| Adapters | `adapters/interval-adapter.mjs` | setInterval-based scheduler for general use |
| Adapters | `adapters/idle-adapter.mjs` | requestIdleCallback-based scheduler for low-priority tasks |
| Adapters | `adapters/visibility-aware-adapter.mjs` | Decorator that pauses/resumes on tab visibility changes |
| Messages | `messages.mjs` | i18n message layer for scheduler errors |
| Public API | `public-api.mjs` | Single cross-module entry point |

## Usage

```js
import {
  createIntervalAdapter,
  assertSchedulerPort,
  parseCronLike,
} from '../../modules/scheduler/public-api.mjs';

const scheduler = createIntervalAdapter();
assertSchedulerPort(scheduler);

const handle = scheduler.schedule(
  () => console.log('tick'),
  { interval: 'every 5s', maxRuns: 10 },
);

// Later
handle.pause();
handle.resume();
handle.cancel();
scheduler.destroy();
```

## Rules

- Cross-module consumers import from `public-api.mjs` only.
- Deep imports into `domain/`, `ports/`, or `adapters/` are forbidden.
- Domain must stay framework-free.
