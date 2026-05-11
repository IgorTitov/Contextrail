<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Overview and navigation guide for the email hex module.
@sidecar README.md.header.md
@layer module | @hex _none_ | @ctx email
@public false
@edit careful -->

# email

Hexagonal outbound email module — pure message domain + memory / console adapters behind a narrow `EmailPort`. Zero external dependencies.

## Why

Email is a TOP-100 starter staple (verification, password reset, notifications, receipts) that most templates implement by hard-wiring nodemailer or a vendor SDK across every caller. When the vendor changes, every caller changes with it. This module keeps address validation and message construction as a pure domain, wraps delivery in a 3-method port, and ships two zero-dependency adapters (memory for tests, console for dev). SMTP and HTTP-API adapters (Resend, SendGrid, Postmark, SES) can plug in later behind the same seam without touching any caller.

The email module is also the first real consumer of the `job-queue` port: outbound mail is queued as a background job and delivered by the worker loop, so the HTTP path stays non-blocking even with a synchronous transport.

## Structure

```text
modules/email/
├── domain/
│   └── email-message.mjs         # Pure: createEmailMessage, address validation, recipient normalization
├── ports/
│   └── email-port.mjs            # EmailPort + assertEmailPort
├── adapters/
│   ├── memory-email-adapter.mjs  # In-memory capture (tests + dev default)
│   └── console-email-adapter.mjs # Validates + logs to stdout without sending
├── public-api.mjs                # Cross-module entry point
├── messages.mjs                  # i18n keys
├── manifest.json                 # Module metadata + capability surface
└── README.md
```

## Hexagonal layers

| Layer        | Folder           | Rule                                                  |
| ------------ | ---------------- | ----------------------------------------------------- |
| **Domain**   | `domain/`        | Pure functions, no I/O, no timers, no network         |
| **Ports**    | `ports/`         | `EmailPort` contract (3 methods: send, list, clear)   |
| **Adapters** | `adapters/`      | Memory and console implementations                    |
| **Public**   | `public-api.mjs` | The only file other modules may import                |

## Usage

### Send via the memory adapter

```javascript
import { createMemoryEmailAdapter } from './modules/email/public-api.mjs';

const mailer = createMemoryEmailAdapter();

const record = await mailer.send({
  from: 'hello@example.com',
  to: 'alice@example.com',
  subject: 'Welcome',
  text: 'Thanks for signing up!',
});

console.log(record.id, record.status); // "email-1", "sent"
console.log(mailer.list('sent').length); // 1
```

### Validate before sending

```javascript
import {
  isValidEmailAddress,
  createEmailMessage,
} from './modules/email/public-api.mjs';

isValidEmailAddress('alice@example.com'); // true
isValidEmailAddress('not an email');      // false

// Throws TypeError with i18n key "email.message.missing_body"
createEmailMessage({ from: 'a@b.co', to: 'c@d.co', subject: 'hi' });
```

### Wire behind the job queue

```javascript
import { createMemoryJobQueue, createJobWorker } from './modules/job-queue/public-api.mjs';
import { createMemoryEmailAdapter } from './modules/email/public-api.mjs';

const mailer = createMemoryEmailAdapter();
const queue = createMemoryJobQueue();

const worker = createJobWorker({
  queue,
  handlers: {
    'send-email': (payload) => mailer.send(payload),
  },
});

queue.enqueue('send-email', {
  from: 'hello@example.com',
  to: 'alice@example.com',
  subject: 'Welcome',
  text: 'Thanks for signing up!',
});

await worker.runUntilEmpty();
// mailer.list('sent').length === 1
```

## Rules

- Domain is pure. Clocks, id generation, and the log sink are injected.
- Adapters validate through `createEmailMessage` — no ad-hoc validation in transport code.
- Cross-module consumers import from `public-api.mjs` only. Deep imports are forbidden.
- All user-facing copy uses i18n keys via `messages.mjs`.

## Tests

- `tests/unit/email.test.mjs` — proves address validation, message construction, adapter behavior.
- `tests/contract/email-hex-contract.test.mjs` — proves the hex folder structure and public-api surface.
