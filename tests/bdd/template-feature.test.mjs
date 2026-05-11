/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Validate that the starter Gherkin scenario stays aligned with the PRD, USM, and backlog references shipped in the template.
 * @sidecar template-feature.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const scenario = 'Scenario: Bootstrap the project template';
const feature = readFileSync(new URL('./features/template.feature', import.meta.url), 'utf8');
const prd = readFileSync(new URL('../../docs/prd/index.md', import.meta.url), 'utf8');
const usm = readFileSync(new URL('../../docs/usm/index.md', import.meta.url), 'utf8');
const backlog = readFileSync(new URL('../../docs/backlog/index.md', import.meta.url), 'utf8');

test('starter feature keeps the canonical bootstrap scenario', () => {
  assert.match(feature, /Feature: Claude Code template bootstrap/);
  assert.ok(feature.includes(scenario));
  assert.match(feature, /@TPL-001 @TPL-002 @TPL-003/);
});

test('traceability docs keep pointing at the canonical bootstrap scenario', () => {
  for (const text of [prd, usm, backlog]) {
    assert.match(
      text,
      /tests\/bdd\/features\/template\.feature#Scenario: Bootstrap the project template/,
    );
  }
});
