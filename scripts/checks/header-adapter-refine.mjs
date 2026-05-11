/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Replace weak templated summary/notesForLLM on adapter sidecars with vendor-specific, COA-useful guidance derived from a curated vendor dictionary.
 * @sidecar header-adapter-refine.mjs.header.md
 * @layer tooling | @hex _none_ | @ctx _none_
 * @public false
 * @edit rewrite-ok
 */

/**
 * Upgrades adapter sidecars whose summary matches the templated
 * "{vendor}-adapter for the {mod} module" shape into vendor-aware text
 * that tells an agent when to pick this adapter over its siblings.
 *
 * Unknown vendors are left alone (no fabrication).
 *
 * Usage: node scripts/checks/header-adapter-refine.mjs [--dry-run]
 */

import path from 'node:path';
import { toPosix, readText, ensureWriteIfChanged } from '../lib/fs-helpers.mjs';
import { collectRepoFiles, sidecarPath } from '../lib/header.mjs';

const DRY_RUN = process.argv.includes('--dry-run');

// ---------------------------------------------------------------------------
// Vendor dictionary — keyed on leading filename segment before "-adapter"
// ---------------------------------------------------------------------------

/**
 * Each entry returns { summary, notes } given the containing module name.
 * Values should be accurate and avoid over-claiming behavior we cannot verify.
 */
const VENDORS = {
  // Storage
  redis: (mod) => ({
    summary: `Redis-backed adapter for the ${mod} module. Persists state in a shared Redis instance.`,
    notes: `Use when ${mod} state must survive process restarts and be shared across processes. Requires a running Redis server. Prefer a memory adapter for tests.`,
  }),
  indexeddb: (mod) => ({
    summary: `IndexedDB adapter for the ${mod} module. Persists state in the browser's IndexedDB store.`,
    notes: `Browser-only. Use when the ${mod} module needs persistent client-side storage larger than localStorage allows. Operations are async.`,
  }),
  'local-storage': (mod) => ({
    summary: `localStorage adapter for the ${mod} module. Persists small scalar state synchronously in the browser.`,
    notes: `Browser-only. Synchronous but capped at roughly 5 MB. Use for small preferences, not hot or large data.`,
  }),
  'memory-lru': (mod) => ({
    summary: `In-process LRU memory adapter for the ${mod} module. Bounded-size, lost on restart.`,
    notes: `Use for single-node deployments or tests where persistence is unnecessary. Evicts least-recently-used entries when full.`,
  }),
  memory: (mod) => ({
    summary: `In-process memory adapter for the ${mod} module. Ephemeral, lost on restart.`,
    notes: `Use for tests and single-node dev where durability is not required. Prefer a persistent sibling adapter in production.`,
  }),
  sqlite: (mod) => ({
    summary: `SQLite-backed adapter for the ${mod} module. File-backed durable persistence without a separate server.`,
    notes: `Use for durable single-node persistence. Not suitable for multi-process writes without extra coordination.`,
  }),
  blob: (mod) => ({
    summary: `Blob-backed adapter for the ${mod} module. Uses the browser Blob API for in-memory binary storage.`,
    notes: `Browser-only. Use when ${mod} needs to stage binary data that lives only for the current session.`,
  }),
  'file-system': (mod) => ({
    summary: `Node filesystem adapter for the ${mod} module. Stores ${mod} state on disk.`,
    notes: `Node-only. Uses fs; must not run in the browser. Verify path safety before writing.`,
  }),

  // Network / transports
  fetch: (mod) => ({
    summary: `HTTP fetch adapter for the ${mod} module. Uses the platform fetch API in browser and Node 18+.`,
    notes: `Use when the ${mod} port needs to reach an HTTP endpoint. Abort signals and timeouts must be honored through the port interface.`,
  }),
  http: (mod) => ({
    summary: `HTTP transport adapter for the ${mod} module.`,
    notes: `Use for request/response interactions with an HTTP backend. Pair with the ${mod} port contract tests.`,
  }),
  'http-api': (mod) => ({
    summary: `HTTP API adapter for the ${mod} module. Calls a remote ${mod} API over HTTP.`,
    notes: `Use when the ${mod} feature is backed by a remote service. Prefer the echo/test adapter in unit tests.`,
  }),
  websocket: (mod) => ({
    summary: `WebSocket transport adapter for the ${mod} module. Bidirectional full-duplex channel.`,
    notes: `Use when the server supports WS and both directions are needed. Falls back handled at the transport-manager level, not here.`,
  }),
  sse: (mod) => ({
    summary: `Server-Sent Events adapter for the ${mod} module. One-way server→client streaming.`,
    notes: `Use when only server→client streaming is needed. Simpler than WebSocket but cannot push client→server.`,
  }),
  'long-polling': (mod) => ({
    summary: `HTTP long-polling fallback transport for the ${mod} module.`,
    notes: `Use when WebSocket and SSE are unavailable (legacy proxies, restricted networks). Highest latency of the transports.`,
  }),
  webrtc: (mod) => ({
    summary: `WebRTC data-channel transport for the ${mod} module. Peer-to-peer low-latency channel.`,
    notes: `Use for browser-to-browser data paths or ultra-low-latency needs. Requires signaling arranged outside this adapter.`,
  }),
  'ws-server': (mod) => ({
    summary: `Server-side WebSocket adapter for the ${mod} module.`,
    notes: `Node-only. Use on the server to accept WS connections and route them through the ${mod} port.`,
  }),
  'node-eventemitter': (mod) => ({
    summary: `Node EventEmitter adapter for the ${mod} module. In-process pub/sub.`,
    notes: `Node-only. Use for single-process event bus needs; swap for a networked bus when crossing processes.`,
  }),
  'memory-event-bus': (mod) => ({
    summary: `In-memory event bus adapter for the ${mod} module. Synchronous, single-process.`,
    notes: `Use for tests and single-process deployments. Not durable; events are lost on restart.`,
  }),

  // Credentials
  jwt: (mod) => ({
    summary: `JWT bearer-token credential adapter for the ${mod} module. Stateless sessions signed as JWTs.`,
    notes: `Use when sessions should be stateless. Token signing/verification happens here; storage of the signing key is an environment concern.`,
  }),
  'oauth-stub': (mod) => ({
    summary: `OAuth 2.0 stub credential adapter for the ${mod} module. Placeholder for local dev.`,
    notes: `Stub only. Replace with a real OAuth provider integration before production use. Useful for wiring the port contract during development.`,
  }),
  anonymous: (mod) => ({
    summary: `Anonymous/guest credential adapter for the ${mod} module. No real authentication.`,
    notes: `Use for public read-only flows or initial onboarding before the user authenticates. Never gate sensitive capabilities on this adapter.`,
  }),
  'local-password': (mod) => ({
    summary: `Local password credential adapter for the ${mod} module. Validates credentials against locally stored password hashes.`,
    notes: `Use for self-contained apps without an identity provider. Hashing algorithm and salt live behind the port; verify test coverage before changes.`,
  }),
  'server-session': (mod) => ({
    summary: `Server-managed session credential adapter for the ${mod} module. Session state lives server-side.`,
    notes: `Use when you need server-side session revocation or state. Requires a cooperating server endpoint.`,
  }),

  // Logging / telemetry
  console: (mod) => ({
    summary: `Console sink adapter for the ${mod} module. Writes through console.log/warn/error.`,
    notes: `Use in development. In production prefer a structured or remote sink for parseable output.`,
  }),
  'structured-json': (mod) => ({
    summary: `Structured JSON log adapter for the ${mod} module. Emits line-delimited JSON records.`,
    notes: `Use when logs are ingested by a JSON-aware pipeline (Loki, CloudWatch, Datadog). One record per line.`,
  }),
  remote: (mod) => ({
    summary: `Remote log sink adapter for the ${mod} module. Ships records to a remote endpoint.`,
    notes: `Use for centralized logging. Must handle network failures without blocking the caller.`,
  }),
  file: (mod) => ({
    summary: `File sink adapter for the ${mod} module. Appends records to a local file.`,
    notes: `Node-only. Use for durable local logs. Rotate files externally (logrotate or similar); this adapter does not manage rotation itself.`,
  }),
  behavioral: (mod) => ({
    summary: `Behavioral analytics adapter for the ${mod} module. Collects user interaction events.`,
    notes: `Consent-gated; must not emit events until the consent manager allows it. Keep payloads PII-minimal.`,
  }),
  'no-op': (mod) => ({
    summary: `No-op adapter for the ${mod} module. Satisfies the port with empty behavior.`,
    notes: `Use when the ${mod} feature is disabled but the port contract must still be wired (e.g. analytics off, logging off).`,
  }),

  // Test / development stubs
  echo: (mod) => ({
    summary: `Echo/passthrough adapter for the ${mod} module. Returns synthetic deterministic responses.`,
    notes: `Test and development use. Exercises the port contract without calling real infrastructure.`,
  }),

  // UI / browser
  dom: (mod) => ({
    summary: `DOM adapter for the ${mod} module. Renders and reads state directly from the DOM.`,
    notes: `Browser-only. Keep DOM mutations scoped; the ${mod} port contract is the seam that separates this adapter from the rest of the app.`,
  }),

  // Local LLM runtimes
  transformers: (mod) => ({
    summary: `Transformers.js adapter for the ${mod} module. Runs models in-process via ONNX Runtime.`,
    notes: `Runs entirely in the browser or Node. Model download and warm-up can be slow; cache loaded models through the port contract.`,
  }),
  webllm: (mod) => ({
    summary: `WebLLM browser adapter for the ${mod} module. Runs LLMs locally on WebGPU.`,
    notes: `Browser-only; requires WebGPU. First-run download of weights is large — warn users or pre-fetch through the port contract.`,
  }),

  // Scheduler strategies
  idle: (mod) => ({
    summary: `Idle-callback scheduler adapter for the ${mod} module. Defers work to requestIdleCallback.`,
    notes: `Browser-preferred for non-urgent background work. Falls back to setTimeout where idle callbacks are unavailable.`,
  }),
  interval: (mod) => ({
    summary: `Interval scheduler adapter for the ${mod} module. Periodic setInterval-based execution.`,
    notes: `Use for simple periodic work. Beware drift over long runs; prefer a more precise adapter for cron-like needs.`,
  }),
  'visibility-aware': (mod) => ({
    summary: `Visibility-aware scheduler adapter for the ${mod} module. Pauses when the page is hidden.`,
    notes: `Browser-only. Use to avoid burning CPU on background tabs. Resumes work when visibility returns.`,
  }),

  // Retrieval
  bm25: (mod) => ({
    summary: `BM25 sparse retrieval adapter for the ${mod} module. Lexical scoring over an in-memory index.`,
    notes: `Pair with a vector adapter inside a hybrid retriever for best recall + precision. Pure lexical on its own misses semantic matches.`,
  }),
  'vector-local': (mod) => ({
    summary: `In-process vector index adapter for the ${mod} module. Cosine-similarity lookup over locally stored embeddings.`,
    notes: `Use when the corpus fits in memory. Swap for a remote vector DB adapter when scaling beyond single-node memory.`,
  }),
  'hybrid-search': (mod) => ({
    summary: `Hybrid search adapter for the ${mod} module. Combines sparse and dense scores.`,
    notes: `Wraps underlying sparse + dense adapters; tune fusion weights through the port contract, not inside this file.`,
  }),
  'approx-tiktoken': (mod) => ({
    summary: `Approximate tiktoken tokenizer adapter for the ${mod} module. Character-ratio approximation of OpenAI token counts.`,
    notes: `Use when you need a fast estimate without bundling the real tiktoken library. Accuracy is approximate.`,
  }),
  'char-count': (mod) => ({
    summary: `Character-count tokenizer adapter for the ${mod} module. Simple length-based token estimator.`,
    notes: `Roughest tokenizer. Use only when relative sizing suffices and bundle size must stay minimal.`,
  }),
  markdown: (mod) => ({
    summary: `Markdown document loader adapter for the ${mod} module.`,
    notes: `Parses markdown files into retrieval documents. Keep parser configuration inside this adapter; domain code should not see markdown specifics.`,
  }),
  'plain-text': (mod) => ({
    summary: `Plain-text document loader adapter for the ${mod} module.`,
    notes: `Simplest loader; use for logs or raw text corpora. No structural parsing.`,
  }),
  html: (mod) => ({
    summary: `HTML document loader adapter for the ${mod} module.`,
    notes: `Strips HTML markup before indexing. Adapter isolates HTML-parsing concerns from the retrieval port.`,
  }),
  passthrough: (mod) => ({
    summary: `Passthrough query transformer adapter for the ${mod} module. Returns the query unchanged.`,
    notes: `Default transformer. Use when no rewriting or expansion is desired.`,
  }),
  'multi-query': (mod) => ({
    summary: `Multi-query expansion transformer adapter for the ${mod} module.`,
    notes: `Expands a single query into several reformulations. Improves recall at the cost of more retrieval work.`,
  }),
  'score-threshold': (mod) => ({
    summary: `Score-threshold reranker adapter for the ${mod} module. Drops results below a configured score.`,
    notes: `Simple post-filter. Use to trim noisy tail results before presenting to the caller.`,
  }),

  // Knowledge graph
  'memory-graph': (mod) => ({
    summary: `In-memory graph adapter for the ${mod} module. Nodes and edges held in-process.`,
    notes: `Use for tests and small graphs. Not durable; swap for a real graph DB adapter at scale.`,
  }),
  'regex-entity': (mod) => ({
    summary: `Regex-based entity extractor adapter for the ${mod} module.`,
    notes: `Cheap and deterministic. Good starting baseline; swap in an NLP adapter when recall matters.`,
  }),
  'cooccurrence-relationship': (mod) => ({
    summary: `Co-occurrence relationship extractor adapter for the ${mod} module.`,
    notes: `Derives edges from entity co-occurrence within a window. Good zero-shot baseline for relationship discovery.`,
  }),

  // Task execution
  'main-thread': (mod) => ({
    summary: `Main-thread task adapter for the ${mod} module. Executes tasks synchronously on the caller's thread.`,
    notes: `Use for simple or UI-coupled work. Heavy computation will block the UI — switch to a worker adapter instead.`,
  }),
  'web-worker': (mod) => ({
    summary: `Web Worker task adapter for the ${mod} module. Runs tasks in a dedicated worker.`,
    notes: `Browser-only. Use to keep heavy computation off the main thread. Messages cross the worker boundary through the port contract.`,
  }),

  // Feature seams
  'config-seam': (mod) => ({
    summary: `Config-driven feature seam adapter for the ${mod} module. Reads flag state from an injected config source.`,
    notes: `Use when flags should reflect build-time or runtime config. Keep config shape hidden behind the port.`,
  }),
  'memory-seam': (mod) => ({
    summary: `In-memory feature seam adapter for the ${mod} module. Mutable flag state for tests.`,
    notes: `Test-only. Lets tests flip flags between scenarios without touching real config.`,
  }),

  // Permissions
  dynamic: (mod) => ({
    summary: `Dynamic permission adapter for the ${mod} module. Evaluates rules at call time.`,
    notes: `Use when permissions depend on runtime state (user roles, feature flags). Prefer static rules when conditions are fixed.`,
  }),
  'static-rules': (mod) => ({
    summary: `Static-rules permission adapter for the ${mod} module. Pre-compiled allow/deny rules.`,
    notes: `Use when the rule set is fixed at build time. Faster than a dynamic adapter but cannot react to runtime state changes.`,
  }),

  // SQL
  'sql-driver': (mod) => ({
    summary: `SQL driver adapter for the ${mod} module. Executes SQL through an injected driver.`,
    notes: `Driver-agnostic surface. The concrete driver (sqlite, postgres, mysql) is injected — keep SQL dialect concerns isolated here.`,
  }),

  // Default greeter
  default: (mod) => ({
    summary: `Default adapter for the ${mod} module. Minimal reference implementation.`,
    notes: `Reference implementation used as the example for the ${mod} module. Copy and rename it as the starting point for new adapters.`,
  }),

  // Persistent state
  'persistent-state': (mod) => ({
    summary: `Persistent state adapter for the ${mod} module. Durable state store.`,
    notes: `Use when ${mod} state must survive restarts. Pair with a memory adapter in tests for speed.`,
  }),
  'memory-state': (mod) => ({
    summary: `Memory state adapter for the ${mod} module. Ephemeral in-process store.`,
    notes: `Use for tests and short-lived processes. Not durable; state is lost on restart.`,
  }),

  // intl
  intl: (mod) => ({
    summary: `Intl-based adapter for the ${mod} module. Uses the platform Intl API for locale-aware operations.`,
    notes: `Cross-platform (browser + Node). Respects the host environment's locale data; verify behavior across runtimes when touching it.`,
  }),
};

// ---------------------------------------------------------------------------
// Vendor key detection
// ---------------------------------------------------------------------------

function vendorKey(filename) {
  // Strip .d.ts, .mjs, .cjs, .ts, .js first.
  let s = filename.toLowerCase();
  s = s.replace(/\.(d\.ts|mjs|cjs|ts|tsx|js|jsx)$/i, '');
  // Strip trailing type suffixes.
  const suffixes = [
    '-adapter',
    '-transport',
    '-tokenizer',
    '-loader',
    '-event-bus',
    '-embedder',
    '-reranker',
    '-transformer',
    '-extractor',
  ];
  for (const sfx of suffixes) {
    if (s.endsWith(sfx)) {
      s = s.slice(0, -sfx.length);
      break;
    }
  }
  return s;
}

function moduleName(file) {
  const m = toPosix(file).match(/^modules\/([^/]+)\//);
  return m ? m[1] : null;
}

// ---------------------------------------------------------------------------
// Sidecar mutation
// ---------------------------------------------------------------------------

function yamlQuote(val) {
  if (/[:#{}[\]|>&*!,?'"]/.test(val) || val.startsWith('@') || val.startsWith('`')) {
    return `"${val.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  }
  return val;
}

function replaceField(text, field, newValue) {
  const re = new RegExp(`^${field}:\\s*.*$`, 'm');
  if (!re.test(text)) return null;
  return text.replace(re, `${field}: ${yamlQuote(newValue)}`);
}

function isTemplatedSummary(text) {
  const m = text.match(/^summary:\s*(.+)$/m);
  if (!m) return false;
  return /adapter for the [\w-]+ module/i.test(m[1]);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const files = await collectRepoFiles();
let matched = 0;
let unmatched = 0;
const unmatchedList = [];

for (const file of files) {
  const posix = toPosix(file);
  if (!posix.startsWith('modules/')) continue;
  if (!posix.includes('/adapters/')) continue;
  if (!/\.(mjs|cjs|js|ts|d\.ts)$/.test(posix)) continue;

  const mod = moduleName(posix);
  if (!mod) continue;

  const sc = sidecarPath(file);
  let sidecarText;
  try {
    sidecarText = await readText(sc);
  } catch {
    continue;
  }

  if (!isTemplatedSummary(sidecarText)) continue;

  const filename = path.basename(file);
  const key = vendorKey(filename);
  const template = VENDORS[key];

  if (!template) {
    unmatched++;
    unmatchedList.push(`${sc} (vendor=${key})`);
    continue;
  }

  const { summary, notes } = template(mod);
  let next = replaceField(sidecarText, 'summary', summary);
  if (!next) continue;
  const next2 = replaceField(next, 'notesForLLM', notes);
  if (next2) next = next2;

  if (next !== sidecarText) {
    if (DRY_RUN) {
      console.log(`DRY: would refine ${sc} (vendor=${key})`);
    } else {
      await ensureWriteIfChanged(sc, next);
    }
    matched++;
  }
}

console.log(`header-adapter-refine: ${matched} refined, ${unmatched} left as-is`);
if (unmatched > 0 && DRY_RUN) {
  console.log('Unmatched vendors:');
  for (const line of unmatchedList) console.log('  ' + line);
}
