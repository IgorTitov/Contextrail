/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Unit-test the knowledge-graph hex module's port assertions, memory adapter, entity and relationship extractors, BFS traversal, and connected-component detection via its public-api.mjs surface.
 * @sidecar knowledge-graph.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Unit tests for the knowledge-graph hex module.
 *
 * SpecRefs: TPL-114; TPL-115; TPL-116; TPL-117; TPL-118; TPL-119; TPL-120
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  assertGraphStorePort,
  assertEntityExtractorPort,
  assertRelationshipExtractorPort,
  createMemoryGraphAdapter,
  createRegexEntityExtractor,
  createCooccurrenceRelationshipExtractor,
  bfsTraverse,
  findConnectedComponents,
} from '../../modules/knowledge-graph/public-api.mjs';

// ---------------------------------------------------------------------------
// Port assertions
// ---------------------------------------------------------------------------

describe('assertGraphStorePort()', () => {
  it('accepts a valid adapter', () => {
    const a = {
      addEntities: () => {},
      addRelationships: () => {},
      getNeighbors: () => [],
      traverse: () => [],
      clear: () => {},
      getEntities: () => [],
      getRelationships: () => [],
    };
    assert.doesNotThrow(() => assertGraphStorePort(a));
  });
  it('rejects null', () => {
    assert.throws(() => assertGraphStorePort(null), TypeError);
  });
  it('rejects missing method', () => {
    assert.throws(() => assertGraphStorePort({}), TypeError);
  });
});

describe('assertEntityExtractorPort()', () => {
  it('accepts valid extractor', () => {
    assert.doesNotThrow(() => assertEntityExtractorPort({ extractEntities: () => [] }));
  });
  it('rejects null', () => {
    assert.throws(() => assertEntityExtractorPort(null), TypeError);
  });
  it('rejects missing method', () => {
    assert.throws(() => assertEntityExtractorPort({}), TypeError);
  });
});

describe('assertRelationshipExtractorPort()', () => {
  it('accepts valid extractor', () => {
    assert.doesNotThrow(() => assertRelationshipExtractorPort({ extractRelationships: () => [] }));
  });
  it('rejects null', () => {
    assert.throws(() => assertRelationshipExtractorPort(null), TypeError);
  });
});

// ---------------------------------------------------------------------------
// createMemoryGraphAdapter()
// ---------------------------------------------------------------------------

describe('createMemoryGraphAdapter()', () => {
  it('conforms to GraphStorePort', () => {
    const store = createMemoryGraphAdapter();
    assert.doesNotThrow(() => assertGraphStorePort(store));
  });

  it('adds and retrieves entities', () => {
    const store = createMemoryGraphAdapter();
    store.addEntities([
      { id: 'e1', name: 'Alice', type: 'person' },
      { id: 'e2', name: 'Bob', type: 'person' },
    ]);
    const entities = store.getEntities();
    assert.equal(entities.length, 2);
  });

  it('adds and retrieves relationships', () => {
    const store = createMemoryGraphAdapter();
    store.addEntities([
      { id: 'e1', name: 'Alice', type: 'person' },
      { id: 'e2', name: 'Bob', type: 'person' },
    ]);
    store.addRelationships([{ source: 'e1', target: 'e2', type: 'knows' }]);
    const rels = store.getRelationships();
    assert.equal(rels.length, 1);
    assert.equal(rels[0].source, 'e1');
  });

  it('getNeighbors returns connected entities', () => {
    const store = createMemoryGraphAdapter();
    store.addEntities([
      { id: 'a', name: 'A', type: 't' },
      { id: 'b', name: 'B', type: 't' },
      { id: 'c', name: 'C', type: 't' },
    ]);
    store.addRelationships([
      { source: 'a', target: 'b', type: 'r' },
      { source: 'a', target: 'c', type: 'r' },
    ]);
    const neighbors = store.getNeighbors('a');
    assert.equal(neighbors.length, 2);
    assert.ok(neighbors.some((n) => n.id === 'b'));
    assert.ok(neighbors.some((n) => n.id === 'c'));
  });

  it('getNeighbors includes reverse relationships', () => {
    const store = createMemoryGraphAdapter();
    store.addEntities([
      { id: 'a', name: 'A', type: 't' },
      { id: 'b', name: 'B', type: 't' },
    ]);
    store.addRelationships([{ source: 'a', target: 'b', type: 'r' }]);
    const neighbors = store.getNeighbors('b');
    assert.equal(neighbors.length, 1);
    assert.equal(neighbors[0].id, 'a');
  });

  it('traverse returns entities within depth', () => {
    const store = createMemoryGraphAdapter();
    store.addEntities([
      { id: 'a', name: 'A', type: 't' },
      { id: 'b', name: 'B', type: 't' },
      { id: 'c', name: 'C', type: 't' },
    ]);
    store.addRelationships([
      { source: 'a', target: 'b', type: 'r' },
      { source: 'b', target: 'c', type: 'r' },
    ]);
    const reached = store.traverse('a', 2);
    assert.equal(reached.length, 3); // a, b, c
  });

  it('traverse respects depth limit', () => {
    const store = createMemoryGraphAdapter();
    store.addEntities([
      { id: 'a', name: 'A', type: 't' },
      { id: 'b', name: 'B', type: 't' },
      { id: 'c', name: 'C', type: 't' },
    ]);
    store.addRelationships([
      { source: 'a', target: 'b', type: 'r' },
      { source: 'b', target: 'c', type: 'r' },
    ]);
    const reached = store.traverse('a', 1);
    assert.equal(reached.length, 2); // a, b only
  });

  it('clear removes all data', () => {
    const store = createMemoryGraphAdapter();
    store.addEntities([{ id: 'a', name: 'A', type: 't' }]);
    store.clear();
    assert.equal(store.getEntities().length, 0);
    assert.equal(store.getRelationships().length, 0);
  });

  it('handles circular relationships', () => {
    const store = createMemoryGraphAdapter();
    store.addEntities([
      { id: 'a', name: 'A', type: 't' },
      { id: 'b', name: 'B', type: 't' },
    ]);
    store.addRelationships([
      { source: 'a', target: 'b', type: 'r' },
      { source: 'b', target: 'a', type: 'r' },
    ]);
    const reached = store.traverse('a', 5);
    assert.equal(reached.length, 2); // no infinite loop
  });
});

// ---------------------------------------------------------------------------
// createRegexEntityExtractor()
// ---------------------------------------------------------------------------

describe('createRegexEntityExtractor()', () => {
  it('conforms to EntityExtractorPort', () => {
    const ext = createRegexEntityExtractor();
    assert.doesNotThrow(() => assertEntityExtractorPort(ext));
  });

  it('extracts capitalized proper nouns', () => {
    const ext = createRegexEntityExtractor();
    const entities = ext.extractEntities('Alice met Bob in New York.');
    const names = entities.map((e) => e.name);
    assert.ok(names.includes('Alice'));
    assert.ok(names.includes('Bob'));
  });

  it('extracts quoted terms', () => {
    const ext = createRegexEntityExtractor();
    const entities = ext.extractEntities('The "Project Alpha" was launched.');
    const names = entities.map((e) => e.name);
    assert.ok(names.some((n) => n.includes('Project Alpha')));
  });

  it('returns empty array for empty text', () => {
    const ext = createRegexEntityExtractor();
    assert.deepEqual(ext.extractEntities(''), []);
  });

  it('deduplicates entities by name', () => {
    const ext = createRegexEntityExtractor();
    const entities = ext.extractEntities('Alice said hello. Alice said goodbye.');
    const aliceCount = entities.filter((e) => e.name === 'Alice').length;
    assert.equal(aliceCount, 1);
  });

  it('entities have id, name, and type fields', () => {
    const ext = createRegexEntityExtractor();
    const entities = ext.extractEntities('I met Robert at the conference.');
    assert.ok(entities.length >= 1, `expected >=1 entities, got ${entities.length}`);
    const e = entities[0];
    assert.ok(e.id);
    assert.ok(e.name);
    assert.ok(e.type);
  });
});

// ---------------------------------------------------------------------------
// createCooccurrenceRelationshipExtractor()
// ---------------------------------------------------------------------------

describe('createCooccurrenceRelationshipExtractor()', () => {
  it('conforms to RelationshipExtractorPort', () => {
    const ext = createCooccurrenceRelationshipExtractor();
    assert.doesNotThrow(() => assertRelationshipExtractorPort(ext));
  });

  it('extracts co-occurrence relationships', () => {
    const ext = createCooccurrenceRelationshipExtractor();
    const entities = [
      { id: 'e1', name: 'Alice', type: 'person' },
      { id: 'e2', name: 'Bob', type: 'person' },
    ];
    const text = 'Alice and Bob went to the park.';
    const rels = ext.extractRelationships(text, entities);
    assert.ok(rels.length >= 1);
    assert.ok(rels[0].source && rels[0].target && rels[0].type);
  });

  it('returns empty for single entity', () => {
    const ext = createCooccurrenceRelationshipExtractor();
    const rels = ext.extractRelationships('Alice alone.', [
      { id: 'e1', name: 'Alice', type: 'person' },
    ]);
    assert.equal(rels.length, 0);
  });

  it('returns empty for no entities', () => {
    const ext = createCooccurrenceRelationshipExtractor();
    assert.deepEqual(ext.extractRelationships('Some text.', []), []);
  });
});

// ---------------------------------------------------------------------------
// bfsTraverse() — standalone BFS
// ---------------------------------------------------------------------------

describe('bfsTraverse()', () => {
  it('traverses graph from start node', () => {
    const store = createMemoryGraphAdapter();
    store.addEntities([
      { id: 'a', name: 'A', type: 't' },
      { id: 'b', name: 'B', type: 't' },
      { id: 'c', name: 'C', type: 't' },
    ]);
    store.addRelationships([
      { source: 'a', target: 'b', type: 'r' },
      { source: 'b', target: 'c', type: 'r' },
    ]);
    const result = bfsTraverse(store, 'a', 3);
    assert.equal(result.length, 3);
  });

  it('returns only start node at depth 0', () => {
    const store = createMemoryGraphAdapter();
    store.addEntities([{ id: 'a', name: 'A', type: 't' }]);
    const result = bfsTraverse(store, 'a', 0);
    assert.equal(result.length, 1);
    assert.equal(result[0].id, 'a');
  });
});

// ---------------------------------------------------------------------------
// findConnectedComponents()
// ---------------------------------------------------------------------------

describe('findConnectedComponents()', () => {
  it('finds single component for connected graph', () => {
    const store = createMemoryGraphAdapter();
    store.addEntities([
      { id: 'a', name: 'A', type: 't' },
      { id: 'b', name: 'B', type: 't' },
    ]);
    store.addRelationships([{ source: 'a', target: 'b', type: 'r' }]);
    const components = findConnectedComponents(store);
    assert.equal(components.length, 1);
    assert.equal(components[0].length, 2);
  });

  it('finds multiple components for disconnected graph', () => {
    const store = createMemoryGraphAdapter();
    store.addEntities([
      { id: 'a', name: 'A', type: 't' },
      { id: 'b', name: 'B', type: 't' },
      { id: 'c', name: 'C', type: 't' },
    ]);
    store.addRelationships([{ source: 'a', target: 'b', type: 'r' }]);
    // c is disconnected
    const components = findConnectedComponents(store);
    assert.equal(components.length, 2);
  });

  it('returns empty for empty graph', () => {
    const store = createMemoryGraphAdapter();
    const components = findConnectedComponents(store);
    assert.equal(components.length, 0);
  });

  it('each isolated node is its own component', () => {
    const store = createMemoryGraphAdapter();
    store.addEntities([
      { id: 'a', name: 'A', type: 't' },
      { id: 'b', name: 'B', type: 't' },
      { id: 'c', name: 'C', type: 't' },
    ]);
    const components = findConnectedComponents(store);
    assert.equal(components.length, 3);
  });
});
