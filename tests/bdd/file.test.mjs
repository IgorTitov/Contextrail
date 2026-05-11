/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Describe the role of file-test in this repository.
 * @sidecar file.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * BDD step runner for file.feature.
 * Proves user-visible behavior through the file module public API.
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  detectMimeType,
  formatFileSize,
  generateFileId,
  validateFile,
} from '../../modules/file/public-api.mjs';

const feature = readFileSync(new URL('./features/file.feature', import.meta.url), 'utf8');

describe('Feature: File management', () => {
  test('feature file contains expected scenarios', () => {
    assert.ok(feature.includes('Feature: File management'));
    assert.ok(feature.includes('Scenario: Detect MIME type from extension'));
    assert.ok(feature.includes('Scenario: Format file size in human-readable form'));
    assert.ok(feature.includes('Scenario: Generate unique file IDs'));
    assert.ok(feature.includes('Scenario: Validate file against constraints'));
    assert.ok(feature.includes('Scenario: Reject file exceeding size limit'));
  });

  test('Scenario: Detect MIME type from extension', () => {
    assert.equal(detectMimeType('photo.png'), 'image/png');
  });

  test('Scenario: Format file size in human-readable form', () => {
    assert.equal(formatFileSize(1024), '1 KB');
  });

  test('Scenario: Generate unique file IDs', () => {
    const id1 = generateFileId();
    const id2 = generateFileId();
    assert.notEqual(id1, id2);
  });

  test('Scenario: Validate file against constraints', () => {
    const result = validateFile(
      { name: 'doc.pdf', size: 500_000, type: 'application/pdf' },
      { maxSize: 1_000_000 },
    );
    assert.equal(result.valid, true);
  });

  test('Scenario: Reject file exceeding size limit', () => {
    const result = validateFile(
      { name: 'big.zip', size: 2_000_000, type: 'application/zip' },
      { maxSize: 1_000_000 },
    );
    assert.equal(result.valid, false);
  });
});
