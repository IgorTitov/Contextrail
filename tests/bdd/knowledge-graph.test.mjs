/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Describe the role of knowledge-graph-test in this repository.
 * @sidecar knowledge-graph.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * BDD step runner for knowledge-graph.feature.
 * Proves user-visible behavior through the knowledge-graph module public API.
 */

import { describe, test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  assertGraphStorePort,
  createMemoryGraphAdapter,
  createRegexEntityExtractor,
  createCooccurrenceRelationshipExtractor,
  bfsTraverse,
  findConnectedComponents,
} from '../../modules/knowledge-graph/public-api.mjs';

const feature = readFileSync(
  new URL('./features/knowledge-graph.feature', import.meta.url),
  'utf8',
);

describe('Feature: Knowledge graph operations', () => {
  let graph;

  beforeEach(() => {
    graph = createMemoryGraphAdapter();
    assertGraphStorePort(graph);
  });

  test('feature file contains expected scenarios', () => {
    assert.ok(feature.includes('Feature: Knowledge graph operations'));
    assert.ok(feature.includes('Scenario: Extract entities from text'));
    assert.ok(feature.includes('Scenario: Detect co-occurrence relationships'));
    assert.ok(feature.includes('Scenario: Store and retrieve graph nodes'));
    assert.ok(feature.includes('Scenario: BFS traversal visits connected nodes'));
    assert.ok(feature.includes('Scenario: Find connected components'));
  });

  test('Scenario: Extract entities from text', () => {
    const extractor = createRegexEntityExtractor();
    const entities = extractor.extractEntities('Alice met Bob in Paris');
    assert.ok(Array.isArray(entities));
    assert.ok(entities.length >= 1);
  });

  test('Scenario: Detect co-occurrence relationships', () => {
    const extractor = createCooccurrenceRelationshipExtractor();
    const entities = [
      { id: 'e1', name: 'Alice', type: 'proper_noun', metadata: {} },
      { id: 'e2', name: 'Bob', type: 'proper_noun', metadata: {} },
    ];
    const rels = extractor.extractRelationships('Alice met Bob in the park', entities);
    assert.ok(Array.isArray(rels));
    assert.ok(rels.length >= 1);
  });

  test('Scenario: Store and retrieve graph nodes', () => {
    graph.addEntities([
      { id: 'alice', name: 'Alice', type: 'PERSON', metadata: {} },
      { id: 'bob', name: 'Bob', type: 'PERSON', metadata: {} },
    ]);
    const all = graph.getEntities();
    assert.equal(all.length, 2);
  });

  test('Scenario: BFS traversal visits connected nodes', () => {
    graph.addEntities([
      { id: 'alice', name: 'Alice', type: 'PERSON', metadata: {} },
      { id: 'bob', name: 'Bob', type: 'PERSON', metadata: {} },
      { id: 'carol', name: 'Carol', type: 'PERSON', metadata: {} },
    ]);
    graph.addRelationships([
      { source: 'alice', target: 'bob', type: 'KNOWS', weight: 1, metadata: {} },
      { source: 'bob', target: 'carol', type: 'KNOWS', weight: 1, metadata: {} },
    ]);
    const visited = bfsTraverse(graph, 'alice', 10);
    assert.equal(visited.length, 3);
  });

  test('Scenario: Find connected components', () => {
    graph.addEntities([
      { id: 'a', name: 'A', type: 'X', metadata: {} },
      { id: 'b', name: 'B', type: 'X', metadata: {} },
      { id: 'c', name: 'C', type: 'X', metadata: {} },
      { id: 'd', name: 'D', type: 'X', metadata: {} },
    ]);
    graph.addRelationships([
      { source: 'a', target: 'b', type: 'LINK', weight: 1, metadata: {} },
      { source: 'c', target: 'd', type: 'LINK', weight: 1, metadata: {} },
    ]);
    const components = findConnectedComponents(graph);
    assert.equal(components.length, 2);
  });
});
