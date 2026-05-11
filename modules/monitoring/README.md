<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Overview and navigation guide for the monitoring hex module.
@sidecar README.md.header.md
@layer module | @hex _none_ | @ctx monitoring
@public false
@edit careful -->

# monitoring

Hexagonal monitoring module — pure event/metric/span domain plus three zero-dependency adapters (memory, console, no-op) behind a single `MonitoringPort`. Follows the same hexagonal architecture as every other module in this template. Lets any host app emit exceptions, structured messages, counters/gauges/histograms, and spans without coupling to a specific SaaS SDK.

## Why

Every production server needs some way to send exceptions and metrics to a backend (Sentry, OpenTelemetry, Datadog, CloudWatch). Most starter templates either skip it entirely or hardwire one specific SDK, which then leaks through the whole codebase. This module keeps the shape of "capture an exception", "record a metric", "trace a span" as a pure domain, wraps it in a single port, and ships three in-process adapters for the default case. Swapping in a real backend later means writing one new adapter behind the same seam — no caller has to change.

## Structure

```text
modules/monitoring/
├── domain/
│   └── monitoring.mjs           # Pure: buildExceptionEvent, buildMetric, finalizeSpan, redact, shouldSample
├── ports/
│   └── monitoring-port.mjs      # MonitoringPort + assertMonitoringPort
├── adapters/
│   ├── memory-adapter.mjs       # createMemoryMonitoringAdapter (buffered, test-friendly)
│   ├── console-adapter.mjs      # createConsoleMonitoringAdapter (JSON lines for local dev)
│   └── no-op-adapter.mjs        # createNoOpMonitoringAdapter (disables monitoring)
├── public-api.mjs               # Cross-module entry point
├── messages.mjs                 # i18n keys
├── manifest.json                # Module metadata + capability surface
└── README.md
```

## Hexagonal layers

| Layer        | Folder           | Rule                                         |
| ------------ | ---------------- | -------------------------------------------- |
| **Domain**   | `domain/`        | Pure functions, no I/O, no framework deps    |
| **Ports**    | `ports/`         | MonitoringPort contract                      |
| **Adapters** | `adapters/`      | Memory, console, and no-op implementations   |
| **Public**   | `public-api.mjs` | The only file other modules may import       |

## Usage

### In a server

```javascript
import { createConsoleMonitoringAdapter, assertMonitoringPort } from './modules/monitoring/public-api.mjs';

const monitoring = createConsoleMonitoringAdapter({
  redactKeys: ['password', 'authorization', 'cookie'],
});
assertMonitoringPort(monitoring);

try {
  monitoring.increment('http.request', 1, { route: '/api/greet' });
  const span = monitoring.startSpan('db.query', { table: 'users' });
  // ... do work ...
  span.end('ok');
} catch (err) {
  monitoring.captureException(err, { tags: { route: '/api/greet' } });
  throw err;
}
```

### Deterministic tests

```javascript
import { createMemoryMonitoringAdapter } from './modules/monitoring/public-api.mjs';

let now = 1000;
const monitoring = createMemoryMonitoringAdapter({ now: () => now });

monitoring.captureMessage('user signed up', 'info', { tags: { source: 'web' } });
monitoring.increment('signups.total');
const span = monitoring.startSpan('auth.verify');
now += 42;
span.end('ok');

monitoring.events();   // [{ kind: 'message', severity: 'info', ... }]
monitoring.metrics();  // [{ kind: 'counter', name: 'signups.total', value: 1, ... }]
monitoring.spans();    // [{ name: 'auth.verify', durationMs: 42, status: 'ok', ... }]
```

### Swapping in a real backend

The module intentionally ships zero network adapters. To plug in Sentry or OpenTelemetry, write a new adapter file (for example `adapters/sentry-adapter.mjs`) that implements `MonitoringPort` by calling the corresponding SDK, export it from `public-api.mjs`, and point your app shell at it. No caller code has to change.

## Rules

- The module is framework-free. Choosing which backend to wire is the host app's responsibility.
- The domain does not know about Sentry, OTel, HTTP, or any specific SaaS.
- Cross-module consumers import from `public-api.mjs` only. Deep imports are forbidden.
- All user-facing copy uses i18n keys via `messages.mjs`.
- Redact sensitive fields at the adapter boundary — never pass raw secrets to a remote backend.

## Tests

- `tests/unit/monitoring.test.mjs` — proves event/metric/span building, redaction, sampling, and adapter behavior.
- `tests/contract/monitoring-hex-contract.test.mjs` — proves the hex folder structure and public-api surface.
