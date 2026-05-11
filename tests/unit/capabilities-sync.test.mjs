/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Unit tests for the capabilities-sync generator shape + --check drift detection.
 * @sidecar capabilities-sync.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Unit tests for scripts/checks/capabilities-sync.mjs.
 *
 * These tests call the script's pure helpers directly (no process.exit,
 * no stdout scraping). The end-to-end check that the committed cache
 * manifest stays in sync is covered by running the CLI in --check mode
 * as part of the gate chain.
 *
 * SpecRefs: TPL-179; TPL-180
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildCacheCapabilities,
  buildRetrievalCapabilities,
  buildKnowledgeGraphEntityExtractorCapabilities,
  buildKnowledgeGraphGraphStoreCapabilities,
  buildJsdocWithImportsCapabilities,
  mergeCapabilities,
  serializeCapabilities,
  diffCapabilities,
  CACHE_PORT_FILE,
  CACHE_MANIFEST_FILE,
  RETRIEVAL_TYPES_FILE,
  RETRIEVAL_MANIFEST_FILE,
  KG_ENTITY_EXTRACTOR_PORT_FILE,
  KG_GRAPH_STORE_PORT_FILE,
  KG_MANIFEST_FILE,
  NOTIFICATIONS_PORT_FILE,
  NOTIFICATIONS_MANIFEST_FILE,
  USER_PREFERENCES_PORT_FILE,
  USER_PREFERENCES_MANIFEST_FILE,
  // TPL-184 module constants.
  AI_CHAT_PORT_FILE,
  AI_CHAT_MANIFEST_FILE,
  ANALYTICS_PORT_FILE,
  ANALYTICS_MANIFEST_FILE,
  API_CLIENT_PORT_FILE,
  API_CLIENT_MANIFEST_FILE,
  AUTH_PORT_FILE,
  AUTH_MANIFEST_FILE,
  DB_PORT_FILE,
  DB_MANIFEST_FILE,
  EVENT_BUS_PORT_FILE,
  EVENT_BUS_MANIFEST_FILE,
  EXAMPLE_GREETER_PORT_FILE,
  EXAMPLE_GREETER_MANIFEST_FILE,
  FEATURE_SEAMS_PORT_FILE,
  FEATURE_SEAMS_MANIFEST_FILE,
  FILE_PORT_FILE,
  FILE_MANIFEST_FILE,
  I18N_PORT_FILE,
  I18N_MANIFEST_FILE,
  LOCAL_LLM_PORT_FILE,
  LOCAL_LLM_MANIFEST_FILE,
  LOG_PORT_FILE,
  LOG_MANIFEST_FILE,
  ONBOARDING_PORT_FILE,
  ONBOARDING_MANIFEST_FILE,
  PERMISSION_PORT_FILE,
  PERMISSION_MANIFEST_FILE,
  REALTIME_PORT_FILE,
  REALTIME_TRANSPORT_PORT_FILE,
  REALTIME_MANIFEST_FILE,
  SCHEDULER_PORT_FILE,
  SCHEDULER_MANIFEST_FILE,
  STATE_PORT_FILE,
  STATE_MANIFEST_FILE,
  TASK_PORT_FILE,
  TASK_MANIFEST_FILE,
  buildCapabilitiesFromTypedefs,
} from '../../scripts/checks/capabilities-sync.mjs';
import { parseJsdocTypedefs } from '../../scripts/checks/lib/jsdoc-typedef-parser.mjs';

const ROOT = process.cwd();

describe('capabilities-sync: buildCacheCapabilities', () => {
  it('produces an interface entry for CachePort with method signatures', () => {
    const portSrc = readFileSync(path.join(ROOT, CACHE_PORT_FILE), 'utf8');
    const caps = buildCacheCapabilities(portSrc, [
      'memory-lru-adapter.mjs',
      'local-storage-adapter.mjs',
    ]);

    assert.ok(caps.ports, 'has ports map');
    assert.ok(caps.ports.CachePort, 'has CachePort');
    assert.equal(caps.ports.CachePort.kind, 'interface');
    assert.ok(caps.ports.CachePort.methods.get, 'get method present');
    assert.ok(caps.ports.CachePort.methods.set, 'set method present');
    assert.equal(caps.ports.CachePort.methods.get.returns, '*|undefined');

    // Supporting typedefs must also be surfaced.
    assert.ok(caps.typedefs, 'has typedefs map');
    assert.ok(caps.typedefs.CacheSetOptions, 'CacheSetOptions present');
    assert.equal(caps.typedefs.CacheSetOptions.fields.ttl.optional, true);

    // Adapters list is passed through, sorted.
    assert.deepEqual(caps.adapters, ['local-storage-adapter.mjs', 'memory-lru-adapter.mjs']);
  });

  it('serializes deterministically — sorted keys, idempotent', () => {
    const portSrc = readFileSync(path.join(ROOT, CACHE_PORT_FILE), 'utf8');
    const a = buildCacheCapabilities(portSrc, ['b.mjs', 'a.mjs']);
    const b = buildCacheCapabilities(portSrc, ['a.mjs', 'b.mjs']);
    assert.equal(serializeCapabilities(a), serializeCapabilities(b));
  });
});

describe('capabilities-sync: diffCapabilities', () => {
  it('returns null when committed manifest matches generated shape', () => {
    const manifestRaw = readFileSync(path.join(ROOT, CACHE_MANIFEST_FILE), 'utf8');
    const manifest = JSON.parse(manifestRaw);

    // Build caps from the real port file, using the adapters list already
    // declared in the manifest structure block (mirrors what the CLI does).
    const portSrc = readFileSync(path.join(ROOT, CACHE_PORT_FILE), 'utf8');
    const adapters = (manifest.structure && manifest.structure.adapters) || [];
    const generated = buildCacheCapabilities(portSrc, adapters);

    // If the CLI has already written the capabilities block, drift must be null.
    if (manifest.capabilities) {
      assert.equal(diffCapabilities(manifest.capabilities, generated), null);
    } else {
      // Before the first run, drift must be detected.
      assert.notEqual(diffCapabilities(manifest.capabilities, generated), null);
    }
  });

  it('detects drift when the manifest lacks the capabilities block entirely', () => {
    const portSrc = readFileSync(path.join(ROOT, CACHE_PORT_FILE), 'utf8');
    const generated = buildCacheCapabilities(portSrc, ['memory-lru-adapter.mjs']);
    const drift = diffCapabilities(undefined, generated);
    assert.ok(drift, 'drift should be reported');
    assert.match(drift, /missing/i);
  });

  it('detects drift when the committed block has a stale method return type', () => {
    const portSrc = readFileSync(path.join(ROOT, CACHE_PORT_FILE), 'utf8');
    const generated = buildCacheCapabilities(portSrc, ['memory-lru-adapter.mjs']);

    // Mutate a clone to simulate stale data.
    const stale = JSON.parse(JSON.stringify(generated));
    stale.ports.CachePort.methods.get.returns = 'string';

    const drift = diffCapabilities(stale, generated);
    assert.ok(drift, 'drift should be reported on method mismatch');
  });
});

describe('capabilities-sync: buildRetrievalCapabilities (TPL-180)', () => {
  it('surfaces all 7 retrieval ports from types.d.ts with method signatures', () => {
    const typesSrc = readFileSync(path.join(ROOT, RETRIEVAL_TYPES_FILE), 'utf8');
    const caps = buildRetrievalCapabilities(typesSrc, [
      'bm25-adapter.mjs',
      'vector-local-adapter.mjs',
    ]);

    const expectedPorts = [
      'RetrievalPort',
      'ChunkerPort',
      'TokenizerPort',
      'EmbedderPort',
      'ReRankerPort',
      'DocumentLoaderPort',
      'QueryTransformerPort',
    ];
    for (const name of expectedPorts) {
      assert.ok(caps.ports[name], `${name} present in caps.ports`);
      assert.equal(caps.ports[name].kind, 'interface');
      assert.ok(
        Object.keys(caps.ports[name].methods).length > 0,
        `${name} has at least one method`,
      );
    }

    // RetrievalPort method shapes — spot-check a few.
    const rp = caps.ports.RetrievalPort.methods;
    assert.equal(rp.addDocuments.returns, 'Promise<string[]>');
    assert.equal(rp.addDocuments.params[0].type, 'RetrievalDocument[]');
    assert.equal(rp.search.params[1].optional, true);
    assert.equal(rp.search.params[1].type, 'RetrievalSearchOptions');
    assert.equal(rp.clear.returns, 'Promise<void>');

    // Supporting option typedef (record) is surfaced via fields, with
    // optional flag carried through.
    assert.ok(caps.typedefs.RetrievalSearchOptions);
    assert.equal(caps.typedefs.RetrievalSearchOptions.fields.topK.optional, true);

    // Adapters list is passed through, sorted.
    assert.deepEqual(caps.adapters, ['bm25-adapter.mjs', 'vector-local-adapter.mjs']);
  });

  it('--check passes for the freshly written retrieval manifest', () => {
    const typesSrc = readFileSync(path.join(ROOT, RETRIEVAL_TYPES_FILE), 'utf8');
    const manifest = JSON.parse(readFileSync(path.join(ROOT, RETRIEVAL_MANIFEST_FILE), 'utf8'));
    const adapters = (manifest.structure && manifest.structure.adapters) || [];
    const generated = buildRetrievalCapabilities(typesSrc, adapters);

    if (manifest.capabilities) {
      assert.equal(diffCapabilities(manifest.capabilities, generated), null);
    } else {
      assert.notEqual(diffCapabilities(manifest.capabilities, generated), null);
    }
  });

  it('--check detects drift when the retrieval manifest is mutated', () => {
    const typesSrc = readFileSync(path.join(ROOT, RETRIEVAL_TYPES_FILE), 'utf8');
    const generated = buildRetrievalCapabilities(typesSrc, ['bm25-adapter.mjs']);

    // Clone and mutate a method return type to simulate drift.
    const stale = JSON.parse(JSON.stringify(generated));
    stale.ports.RetrievalPort.methods.clear.returns = 'void';

    const drift = diffCapabilities(stale, generated);
    assert.ok(drift, 'drift should be reported on retrieval manifest mutation');
  });

  it('is deterministic — same inputs produce byte-identical serialization', () => {
    const typesSrc = readFileSync(path.join(ROOT, RETRIEVAL_TYPES_FILE), 'utf8');
    const a = buildRetrievalCapabilities(typesSrc, ['b.mjs', 'a.mjs']);
    const b = buildRetrievalCapabilities(typesSrc, ['a.mjs', 'b.mjs']);
    assert.equal(serializeCapabilities(a), serializeCapabilities(b));
  });
});

describe('capabilities-sync: buildKnowledgeGraphEntityExtractorCapabilities (TPL-181)', () => {
  it('surfaces EntityExtractorPort and RelationshipExtractorPort from JSDoc with method signatures', () => {
    const portSrc = readFileSync(path.join(ROOT, KG_ENTITY_EXTRACTOR_PORT_FILE), 'utf8');
    const caps = buildKnowledgeGraphEntityExtractorCapabilities(portSrc, [
      'cooccurrence-relationship-extractor.mjs',
      'regex-entity-extractor.mjs',
    ]);

    assert.ok(caps.ports, 'has ports map');
    assert.ok(caps.ports.EntityExtractorPort, 'has EntityExtractorPort');
    assert.equal(caps.ports.EntityExtractorPort.kind, 'interface');
    assert.ok(
      caps.ports.EntityExtractorPort.methods.extractEntities,
      'extractEntities method present',
    );
    assert.equal(caps.ports.EntityExtractorPort.methods.extractEntities.params[0].name, 'text');
    assert.equal(caps.ports.EntityExtractorPort.methods.extractEntities.params[0].type, 'string');
    assert.equal(caps.ports.EntityExtractorPort.methods.extractEntities.returns, 'Entity[]');

    assert.ok(caps.ports.RelationshipExtractorPort, 'has RelationshipExtractorPort');
    assert.equal(caps.ports.RelationshipExtractorPort.kind, 'interface');
    const er = caps.ports.RelationshipExtractorPort.methods.extractRelationships;
    assert.ok(er, 'extractRelationships method present');
    assert.equal(er.params[0].type, 'string');
    assert.equal(er.params[1].type, 'Entity[]');
    assert.equal(er.returns, 'Relationship[]');

    // Supporting Entity / Relationship typedefs surfaced as records.
    assert.ok(caps.typedefs.Entity, 'Entity supporting typedef present');
    assert.ok(caps.typedefs.Entity.fields.id, 'Entity has id field');
    assert.ok(caps.typedefs.Relationship, 'Relationship supporting typedef present');
    assert.ok(caps.typedefs.Relationship.fields.source, 'Relationship has source field');

    // Adapters list passed through, sorted.
    assert.deepEqual(caps.adapters, [
      'cooccurrence-relationship-extractor.mjs',
      'regex-entity-extractor.mjs',
    ]);
  });

  it('--check passes for the freshly written knowledge-graph manifest (entity-extractor + graph-store merged)', () => {
    const eePortSrc = readFileSync(path.join(ROOT, KG_ENTITY_EXTRACTOR_PORT_FILE), 'utf8');
    const gsPortSrc = readFileSync(path.join(ROOT, KG_GRAPH_STORE_PORT_FILE), 'utf8');
    const manifest = JSON.parse(readFileSync(path.join(ROOT, KG_MANIFEST_FILE), 'utf8'));
    const adapters = (manifest.structure && manifest.structure.adapters) || [];
    const generated = mergeCapabilities([
      buildKnowledgeGraphEntityExtractorCapabilities(eePortSrc, adapters),
      buildKnowledgeGraphGraphStoreCapabilities(gsPortSrc, adapters),
    ]);

    if (manifest.capabilities) {
      assert.equal(diffCapabilities(manifest.capabilities, generated), null);
    } else {
      assert.notEqual(diffCapabilities(manifest.capabilities, generated), null);
    }
  });
});

describe('capabilities-sync: buildKnowledgeGraphGraphStoreCapabilities (TPL-182)', () => {
  it('surfaces GraphStorePort from JSDoc with all 7 method signatures', () => {
    const portSrc = readFileSync(path.join(ROOT, KG_GRAPH_STORE_PORT_FILE), 'utf8');
    const caps = buildKnowledgeGraphGraphStoreCapabilities(portSrc, ['memory-graph-adapter.mjs']);

    assert.ok(caps.ports, 'has ports map');
    assert.ok(caps.ports.GraphStorePort, 'has GraphStorePort');
    assert.equal(caps.ports.GraphStorePort.kind, 'interface');

    const m = caps.ports.GraphStorePort.methods;
    const expected = [
      'addEntities',
      'addRelationships',
      'getEntities',
      'getRelationships',
      'getNeighbors',
      'traverse',
      'clear',
    ];
    for (const name of expected) {
      assert.ok(m[name], `${name} method present`);
    }

    // Spot-check parameter / return shapes recovered from adapter reality.
    assert.equal(m.addEntities.params[0].type, 'Entity[]');
    assert.equal(m.addEntities.returns, 'void');
    assert.equal(m.addRelationships.params[0].type, 'Relationship[]');
    assert.equal(m.getEntities.returns, 'Entity[]');
    assert.equal(m.getRelationships.returns, 'Relationship[]');
    assert.equal(m.getNeighbors.params[0].name, 'entityId');
    assert.equal(m.getNeighbors.params[0].type, 'string');
    assert.equal(m.getNeighbors.returns, 'Entity[]');
    assert.equal(m.traverse.params[0].name, 'startId');
    assert.equal(m.traverse.params[0].type, 'string');
    assert.equal(m.traverse.params[1].name, 'maxDepth');
    assert.equal(m.traverse.params[1].type, 'number');
    assert.equal(m.traverse.returns, 'Entity[]');
    assert.equal(m.clear.returns, 'void');
  });

  it('mergeCapabilities combines entity-extractor + graph-store ports into one block', () => {
    const eePortSrc = readFileSync(path.join(ROOT, KG_ENTITY_EXTRACTOR_PORT_FILE), 'utf8');
    const gsPortSrc = readFileSync(path.join(ROOT, KG_GRAPH_STORE_PORT_FILE), 'utf8');
    const adapters = [
      'cooccurrence-relationship-extractor.mjs',
      'memory-graph-adapter.mjs',
      'regex-entity-extractor.mjs',
    ];
    const merged = mergeCapabilities([
      buildKnowledgeGraphEntityExtractorCapabilities(eePortSrc, adapters),
      buildKnowledgeGraphGraphStoreCapabilities(gsPortSrc, adapters),
    ]);

    assert.ok(merged.ports.EntityExtractorPort, 'EntityExtractorPort survives merge');
    assert.ok(merged.ports.RelationshipExtractorPort, 'RelationshipExtractorPort survives merge');
    assert.ok(merged.ports.GraphStorePort, 'GraphStorePort survives merge');
    assert.deepEqual(merged.adapters, adapters);
  });

  it('mergeCapabilities errors out on duplicate port name across sources', () => {
    const a = { ports: { Foo: { kind: 'interface', methods: {} } }, typedefs: {}, adapters: [] };
    const b = { ports: { Foo: { kind: 'interface', methods: {} } }, typedefs: {}, adapters: [] };
    assert.throws(() => mergeCapabilities([a, b]), /duplicate port 'Foo'/);
  });
});

describe('capabilities-sync: buildJsdocWithImportsCapabilities (TPL-183)', () => {
  it('produces a complete NotificationPort capability block with the Notification shape inlined via import-following', () => {
    const portSrc = readFileSync(path.join(ROOT, NOTIFICATIONS_PORT_FILE), 'utf8');
    const caps = buildJsdocWithImportsCapabilities(
      portSrc,
      NOTIFICATIONS_PORT_FILE,
      'modules/notifications',
      new Set(['NotificationPort']),
      ['dom-adapter.mjs', 'memory-adapter.mjs'],
    );

    assert.ok(caps.ports, 'has ports map');
    assert.ok(caps.ports.NotificationPort, 'has NotificationPort');
    assert.equal(caps.ports.NotificationPort.kind, 'interface');

    const m = caps.ports.NotificationPort.methods;
    assert.ok(m.show, 'show method present');
    assert.ok(m.dismiss, 'dismiss method present');
    assert.ok(m.getActive, 'getActive method present');

    // The verbose import-type form should be rewritten to the bare name.
    assert.equal(m.show.params[0].type, 'Notification');
    assert.equal(m.show.params[0].name, 'notification');
    assert.equal(m.show.returns, 'void');
    assert.equal(m.dismiss.params[0].type, 'string');
    assert.equal(m.getActive.returns, 'Notification[]');

    // The Notification typedef must have been pulled in from
    // modules/notifications/domain/notification.mjs as a supporting record.
    assert.ok(caps.typedefs.Notification, 'Notification supporting typedef');
    assert.ok(caps.typedefs.Notification.fields, 'Notification has fields');
    assert.ok(caps.typedefs.Notification.fields.id, 'Notification.id');
    assert.ok(caps.typedefs.Notification.fields.message, 'Notification.message');
    assert.ok(caps.typedefs.Notification.fields.level, 'Notification.level');

    // The transitive NotificationLevel alias must also be present.
    assert.ok(caps.typedefs.NotificationLevel, 'NotificationLevel pulled in');

    assert.deepEqual(caps.adapters, ['dom-adapter.mjs', 'memory-adapter.mjs']);
  });

  it('produces a complete StoragePort capability block with PreferencesState resolved from the same module', () => {
    const portSrc = readFileSync(path.join(ROOT, USER_PREFERENCES_PORT_FILE), 'utf8');
    const caps = buildJsdocWithImportsCapabilities(
      portSrc,
      USER_PREFERENCES_PORT_FILE,
      'modules/user-preferences',
      new Set(['StoragePort']),
      ['indexeddb-adapter.mjs', 'local-storage-adapter.mjs', 'memory-adapter.mjs'],
    );

    assert.ok(caps.ports.StoragePort, 'has StoragePort');
    assert.equal(caps.ports.StoragePort.kind, 'interface');

    const m = caps.ports.StoragePort.methods;
    assert.ok(m.load, 'load method present');
    assert.ok(m.save, 'save method present');
    // Return type was rewritten from `import('../domain/preferences.mjs').PreferencesState | null`.
    assert.match(m.load.returns, /PreferencesState/);
    assert.equal(m.save.params[0].type, 'PreferencesState');
    assert.equal(m.save.returns, 'void');

    // PreferencesState typedef must be pulled in.
    assert.ok(caps.typedefs.PreferencesState, 'PreferencesState supporting typedef');
    assert.ok(caps.typedefs.PreferencesState.fields.locale);
    assert.ok(caps.typedefs.PreferencesState.fields.theme);
  });

  it('--check passes for the freshly written notifications and user-preferences manifests', () => {
    for (const [portFile, manifestFile, moduleRoot, portTypedefs] of [
      [
        NOTIFICATIONS_PORT_FILE,
        NOTIFICATIONS_MANIFEST_FILE,
        'modules/notifications',
        new Set(['NotificationPort']),
      ],
      [
        USER_PREFERENCES_PORT_FILE,
        USER_PREFERENCES_MANIFEST_FILE,
        'modules/user-preferences',
        new Set(['StoragePort']),
      ],
    ]) {
      const portSrc = readFileSync(path.join(ROOT, portFile), 'utf8');
      const manifest = JSON.parse(readFileSync(path.join(ROOT, manifestFile), 'utf8'));
      const adapters = (manifest.structure && manifest.structure.adapters) || [];
      const generated = buildJsdocWithImportsCapabilities(
        portSrc,
        portFile,
        moduleRoot,
        portTypedefs,
        adapters,
      );
      if (manifest.capabilities) {
        assert.equal(
          diffCapabilities(manifest.capabilities, generated),
          null,
          `${manifestFile} drift`,
        );
      } else {
        assert.notEqual(diffCapabilities(manifest.capabilities, generated), null);
      }
    }
  });
});

/**
 * TPL-184 round-trip tests. One assertion per newly wired module: the
 * primary port typedef surfaces in the generated capabilities block with at
 * least the expected method count. Exhaustive per-method shape checking is
 * the parser's job — these tests only guard against wiring regressions.
 */
describe('capabilities-sync: TPL-184 full-repo wiring round-trip', () => {
  /**
   * @param {string} portFile
   * @param {string} manifestFile
   * @param {string} portName
   * @param {number} minMethodCount
   */
  function assertPortInManifest(portFile, manifestFile, portName, minMethodCount) {
    const manifest = JSON.parse(readFileSync(path.join(ROOT, manifestFile), 'utf8'));
    assert.ok(manifest.capabilities, `${manifestFile}: capabilities block present`);
    const port = manifest.capabilities.ports[portName];
    assert.ok(port, `${manifestFile}: ${portName} present in capabilities.ports`);
    assert.equal(port.kind, 'interface');
    const methodCount = Object.keys(port.methods).length;
    assert.ok(
      methodCount >= minMethodCount,
      `${portName}: expected >= ${minMethodCount} methods, got ${methodCount}`,
    );
  }

  it('example-greeter / GreetingPort', () => {
    assertPortInManifest(
      EXAMPLE_GREETER_PORT_FILE,
      EXAMPLE_GREETER_MANIFEST_FILE,
      'GreetingPort',
      1,
    );
  });
  it('log / LogPort', () => {
    assertPortInManifest(LOG_PORT_FILE, LOG_MANIFEST_FILE, 'LogPort', 5);
  });
  it('state / StatePort', () => {
    assertPortInManifest(STATE_PORT_FILE, STATE_MANIFEST_FILE, 'StatePort', 4);
  });
  it('db / DatabasePort', () => {
    assertPortInManifest(DB_PORT_FILE, DB_MANIFEST_FILE, 'DatabasePort', 4);
  });
  it('event-bus / EventBusPort (rest-params form)', () => {
    assertPortInManifest(EVENT_BUS_PORT_FILE, EVENT_BUS_MANIFEST_FILE, 'EventBusPort', 5);
    // The generated emit signature must carry the `rest: true` flag.
    const m = JSON.parse(readFileSync(path.join(ROOT, EVENT_BUS_MANIFEST_FILE), 'utf8'));
    const emit = m.capabilities.ports.EventBusPort.methods.emit;
    const restParam = emit.params.find((p) => p.name === 'args');
    assert.ok(restParam, 'emit has args param');
    assert.equal(restParam.rest, true);
  });
  it('i18n / I18nPort', () => {
    assertPortInManifest(I18N_PORT_FILE, I18N_MANIFEST_FILE, 'I18nPort', 9);
  });
  it('file / FilePort', () => {
    assertPortInManifest(FILE_PORT_FILE, FILE_MANIFEST_FILE, 'FilePort', 6);
  });
  it('analytics / AnalyticsPort', () => {
    assertPortInManifest(ANALYTICS_PORT_FILE, ANALYTICS_MANIFEST_FILE, 'AnalyticsPort', 7);
  });
  it('task / TaskPort', () => {
    assertPortInManifest(TASK_PORT_FILE, TASK_MANIFEST_FILE, 'TaskPort', 6);
  });
  it('api-client / ApiClientPort', () => {
    assertPortInManifest(API_CLIENT_PORT_FILE, API_CLIENT_MANIFEST_FILE, 'ApiClientPort', 7);
  });
  it('auth / AuthPort', () => {
    assertPortInManifest(AUTH_PORT_FILE, AUTH_MANIFEST_FILE, 'AuthPort', 6);
  });
  it('ai-chat / AiChatPort', () => {
    assertPortInManifest(AI_CHAT_PORT_FILE, AI_CHAT_MANIFEST_FILE, 'AiChatPort', 6);
  });
  it('local-llm / LocalLlmPort (cross-module import-alias skipped)', () => {
    assertPortInManifest(LOCAL_LLM_PORT_FILE, LOCAL_LLM_MANIFEST_FILE, 'LocalLlmPort', 9);
    // Cross-module import-alias typedefs must not leak into the manifest.
    const m = JSON.parse(readFileSync(path.join(ROOT, LOCAL_LLM_MANIFEST_FILE), 'utf8'));
    assert.equal(m.capabilities.typedefs.AiChatMessage, undefined);
    // The method type string carries the bare name, not the verbose import form.
    const returns = m.capabilities.ports.LocalLlmPort.methods.getHistory.returns;
    assert.equal(returns, 'AiChatMessage[]');
  });
  it('permission / PermissionPort', () => {
    assertPortInManifest(PERMISSION_PORT_FILE, PERMISSION_MANIFEST_FILE, 'PermissionPort', 6);
  });
  it('scheduler / SchedulerPort', () => {
    assertPortInManifest(SCHEDULER_PORT_FILE, SCHEDULER_MANIFEST_FILE, 'SchedulerPort', 7);
  });
  it('onboarding / OnboardingPort (same-module import-following)', () => {
    assertPortInManifest(ONBOARDING_PORT_FILE, ONBOARDING_MANIFEST_FILE, 'OnboardingPort', 7);
    // TourStep should be pulled in as a supporting typedef.
    const m = JSON.parse(readFileSync(path.join(ROOT, ONBOARDING_MANIFEST_FILE), 'utf8'));
    assert.ok(m.capabilities.typedefs.TourStep, 'TourStep pulled in via import-following');
    assert.equal(
      m.capabilities.ports.OnboardingPort.methods.startTour.params[0].type,
      'TourStep[]',
    );
  });
  it('feature-seams / SeamPort (same-module import-following)', () => {
    assertPortInManifest(FEATURE_SEAMS_PORT_FILE, FEATURE_SEAMS_MANIFEST_FILE, 'SeamPort', 6);
    const m = JSON.parse(readFileSync(path.join(ROOT, FEATURE_SEAMS_MANIFEST_FILE), 'utf8'));
    assert.ok(m.capabilities.typedefs.SeamConfig, 'SeamConfig pulled in');
    assert.ok(m.capabilities.typedefs.SeamEntry, 'SeamEntry pulled in');
  });
  it('realtime / RealtimePort + TransportPort (multi-source merge)', () => {
    assertPortInManifest(REALTIME_PORT_FILE, REALTIME_MANIFEST_FILE, 'RealtimePort', 7);
    assertPortInManifest(REALTIME_TRANSPORT_PORT_FILE, REALTIME_MANIFEST_FILE, 'TransportPort', 7);
  });

  it('buildCapabilitiesFromTypedefs is re-export-safe — helper still callable', () => {
    const src = `
      /**
       * @typedef {object} Foo
       * @property {() => void} bar
       */
    `;
    const { typedefs } = parseJsdocTypedefs(src);
    const caps = buildCapabilitiesFromTypedefs(typedefs, new Set(['Foo']), []);
    assert.ok(caps.ports.Foo);
    assert.equal(caps.ports.Foo.methods.bar.returns, 'void');
  });
});

describe('capabilities gate wiring (TPL-185)', () => {
  const __dir = import.meta.dirname ?? path.dirname(fileURLToPath(import.meta.url));
  const repoRoot = path.resolve(__dir, '..', '..');

  it('package.json exposes the capabilities-check script alias', () => {
    const pkg = JSON.parse(readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
    assert.equal(
      pkg.scripts['capabilities-check'],
      'node scripts/checks/capabilities-sync.mjs --check',
      'package.json must expose capabilities-check pointing at capabilities-sync.mjs --check',
    );
  });

  it('.githooks/pre-commit references capabilities-sync.mjs', () => {
    const preCommit = readFileSync(path.join(repoRoot, '.githooks', 'pre-commit'), 'utf8');
    assert.ok(
      preCommit.includes('capabilities-sync.mjs --check'),
      'pre-commit hook must invoke capabilities-sync.mjs --check as a hard fail gate',
    );
  });
});
