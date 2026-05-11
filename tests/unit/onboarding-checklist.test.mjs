/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Unit tests for onboarding checklist — progress tracking, prerequisites, grouping, serialization.
 * @sidecar onboarding-checklist.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx onboarding
 * @public false
 * @edit careful
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createChecklistState,
  completeItem,
  uncompleteItem,
  dismissChecklist,
  isItemAvailable,
  getCompletionPercent,
  getGroupedItems,
  getNextItem,
  isAllComplete,
  serializeProgress,
  deserializeProgress,
} from '../../modules/onboarding/public-api.mjs';

const ITEMS = [
  { id: 'create-project', title: 'Create your first project', order: 1, group: 'Getting started' },
  { id: 'add-member', title: 'Invite a team member', order: 2, group: 'Getting started' },
  { id: 'create-board', title: 'Create a board', order: 3, group: 'Getting started', requiredBefore: 'create-project' },
  { id: 'enable-api', title: 'Enable API access', order: 4, group: 'Advanced' },
];

describe('onboarding checklist — createChecklistState()', () => {
  test('creates empty progress by default', () => {
    const state = createChecklistState(ITEMS);
    assert.equal(state.items.length, 4);
    assert.equal(state.progress.completed.size, 0);
  });

  test('accepts pre-completed items', () => {
    const state = createChecklistState(ITEMS, ['create-project']);
    assert.ok(state.progress.completed.has('create-project'));
  });

  test('sorts items by order', () => {
    const reversed = [...ITEMS].reverse();
    const state = createChecklistState(reversed);
    assert.equal(state.items[0].id, 'create-project');
  });
});

describe('onboarding checklist — completeItem / uncompleteItem', () => {
  test('marks item completed', () => {
    let state = createChecklistState(ITEMS);
    state = completeItem(state, 'create-project');
    assert.ok(state.progress.completed.has('create-project'));
  });

  test('uncomplete removes item', () => {
    let state = createChecklistState(ITEMS, ['create-project']);
    state = uncompleteItem(state, 'create-project');
    assert.equal(state.progress.completed.has('create-project'), false);
  });

  test('complete unknown item is no-op', () => {
    const state = createChecklistState(ITEMS);
    const next = completeItem(state, 'nonexistent');
    assert.equal(next.progress.completed.size, 0);
  });
});

describe('onboarding checklist — prerequisites', () => {
  test('item without prerequisite is always available', () => {
    const state = createChecklistState(ITEMS);
    assert.ok(isItemAvailable(state, 'create-project'));
    assert.ok(isItemAvailable(state, 'add-member'));
  });

  test('item with prerequisite is blocked until done', () => {
    let state = createChecklistState(ITEMS);
    assert.equal(isItemAvailable(state, 'create-board'), false);
    state = completeItem(state, 'create-project');
    assert.ok(isItemAvailable(state, 'create-board'));
  });
});

describe('onboarding checklist — progress', () => {
  test('completion percentage', () => {
    let state = createChecklistState(ITEMS);
    assert.equal(getCompletionPercent(state), 0);
    state = completeItem(state, 'create-project');
    assert.equal(getCompletionPercent(state), 25);
    state = completeItem(state, 'add-member');
    assert.equal(getCompletionPercent(state), 50);
  });

  test('isAllComplete', () => {
    let state = createChecklistState(ITEMS);
    assert.equal(isAllComplete(state), false);
    for (const item of ITEMS) state = completeItem(state, item.id);
    assert.ok(isAllComplete(state));
  });

  test('getNextItem skips completed and blocked items', () => {
    let state = createChecklistState(ITEMS);
    assert.equal(getNextItem(state).id, 'create-project');
    state = completeItem(state, 'create-project');
    assert.equal(getNextItem(state).id, 'add-member');
  });
});

describe('onboarding checklist — grouping', () => {
  test('groups items by group label', () => {
    const state = createChecklistState(ITEMS);
    const groups = getGroupedItems(state);
    assert.equal(groups.get('Getting started').length, 3);
    assert.equal(groups.get('Advanced').length, 1);
  });
});

describe('onboarding checklist — dismiss', () => {
  test('sets dismissedAt timestamp', () => {
    let state = createChecklistState(ITEMS);
    assert.equal(state.progress.dismissedAt, undefined);
    state = dismissChecklist(state);
    assert.ok(state.progress.dismissedAt);
  });
});

describe('onboarding checklist — serialization', () => {
  test('roundtrips through serialize/deserialize', () => {
    let state = createChecklistState(ITEMS);
    state = completeItem(state, 'create-project');
    state = completeItem(state, 'add-member');

    const serialized = serializeProgress(state.progress);
    assert.ok(Array.isArray(serialized.completed));
    assert.equal(serialized.completed.length, 2);

    const deserialized = deserializeProgress(serialized);
    assert.ok(deserialized.completed instanceof Set);
    assert.ok(deserialized.completed.has('create-project'));
    assert.ok(deserialized.completed.has('add-member'));
  });
});
