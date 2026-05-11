/* @HEADER
 * @version 0.7.62 | 2026-05-03
 * @purpose Unit tests for the snapshotWarnCheck pure helper — verifies warn/no-warn decisions for all combinations of VERSION bump vs snapshot presence.
 * @sidecar post-commit-snapshot-warn.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Unit tests for snapshotWarnCheck (TPL-260).
 *
 * Tests the pure decision function that the post-commit hook delegates to.
 * No git, no filesystem — only in-memory inputs.
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { snapshotWarnCheck } from '../../scripts/checks/snapshot-coverage-check.mjs';

describe('snapshotWarnCheck — no-warn cases', () => {
  test('returns no-warn when versions are equal (no bump)', () => {
    const r = snapshotWarnCheck({
      newVersion: '0.7.50',
      prevVersion: '0.7.50',
      backupFiles: [],
      pkgName: 'my-repo',
    });
    assert.equal(r.shouldWarn, false);
  });

  test('returns no-warn when newVersion is absent', () => {
    const r = snapshotWarnCheck({
      newVersion: null,
      prevVersion: '0.7.50',
      backupFiles: [],
      pkgName: 'my-repo',
    });
    assert.equal(r.shouldWarn, false);
  });

  test('returns no-warn when prevVersion is absent (first commit)', () => {
    const r = snapshotWarnCheck({
      newVersion: '0.1.0',
      prevVersion: null,
      backupFiles: [],
      pkgName: 'my-repo',
    });
    assert.equal(r.shouldWarn, false);
  });

  test('returns no-warn when both .txt and .zip are present', () => {
    const files = ['merge-my-repo(0.7.62).txt', 'merge-my-repo(0.7.62).zip'];
    const r = snapshotWarnCheck({
      newVersion: '0.7.62',
      prevVersion: '0.7.61',
      backupFiles: files,
      pkgName: 'my-repo',
    });
    assert.equal(r.shouldWarn, false);
  });

  test('returns no-warn when VERSION unchanged across commits', () => {
    const r = snapshotWarnCheck({
      newVersion: '0.7.61',
      prevVersion: '0.7.61',
      backupFiles: [],
      pkgName: 'contextrail-template',
    });
    assert.equal(r.shouldWarn, false);
  });

  test('returns no-warn with empty object (defensive)', () => {
    const r = snapshotWarnCheck({});
    assert.equal(r.shouldWarn, false);
  });

  test('returns no-warn with no args (defensive)', () => {
    const r = snapshotWarnCheck();
    assert.equal(r.shouldWarn, false);
  });
});

describe('snapshotWarnCheck — warn cases', () => {
  test('warns when both .txt and .zip are missing after bump', () => {
    const r = snapshotWarnCheck({
      newVersion: '0.7.62',
      prevVersion: '0.7.61',
      backupFiles: [],
      pkgName: 'my-repo',
    });
    assert.equal(r.shouldWarn, true);
    assert.equal(r.missingTxt, true);
    assert.equal(r.missingZip, true);
  });

  test('warns when .zip is missing but .txt is present', () => {
    const r = snapshotWarnCheck({
      newVersion: '0.7.62',
      prevVersion: '0.7.61',
      backupFiles: ['merge-my-repo(0.7.62).txt'],
      pkgName: 'my-repo',
    });
    assert.equal(r.shouldWarn, true);
    assert.equal(r.missingTxt, false);
    assert.equal(r.missingZip, true);
  });

  test('warns when .txt is missing but .zip is present', () => {
    const r = snapshotWarnCheck({
      newVersion: '0.7.62',
      prevVersion: '0.7.61',
      backupFiles: ['merge-my-repo(0.7.62).zip'],
      pkgName: 'my-repo',
    });
    assert.equal(r.shouldWarn, true);
    assert.equal(r.missingTxt, true);
    assert.equal(r.missingZip, false);
  });

  test('warns for contextrail-template package name', () => {
    const r = snapshotWarnCheck({
      newVersion: '0.7.62',
      prevVersion: '0.7.61',
      backupFiles: [],
      pkgName: 'contextrail-template',
    });
    assert.equal(r.shouldWarn, true);
    // safeTxtName('contextrail-template') = 'contextrail-template'
    // safeZipName('contextrail-template') = 'contextrail-template'
    assert.equal(r.missingTxt, true);
    assert.equal(r.missingZip, true);
  });

  test('warns when unrelated snapshot files present but not for this version', () => {
    const r = snapshotWarnCheck({
      newVersion: '0.7.62',
      prevVersion: '0.7.61',
      backupFiles: ['merge-my-repo(0.7.61).txt', 'merge-my-repo(0.7.61).zip'],
      pkgName: 'my-repo',
    });
    assert.equal(r.shouldWarn, true);
  });

  test('accepts Set as backupFiles', () => {
    const r = snapshotWarnCheck({
      newVersion: '0.7.62',
      prevVersion: '0.7.61',
      backupFiles: new Set(['merge-my-repo(0.7.62).txt', 'merge-my-repo(0.7.62).zip']),
      pkgName: 'my-repo',
    });
    assert.equal(r.shouldWarn, false);
  });

  test('falls back to "repo" pkg name when pkgName is falsy', () => {
    const r = snapshotWarnCheck({
      newVersion: '0.7.62',
      prevVersion: '0.7.61',
      backupFiles: ['merge-repo(0.7.62).txt', 'merge-repo(0.7.62).zip'],
      pkgName: '',
    });
    assert.equal(r.shouldWarn, false);
  });
});
