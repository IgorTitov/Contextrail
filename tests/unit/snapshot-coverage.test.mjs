/* @HEADER
 * @version 0.7.53 | 2026-05-03
 * @purpose Unit tests for scripts/checks/snapshot-coverage-check.mjs pure helpers (CHANGELOG parsing, version comparison, gap detection, name normalization, --since diffing).
 * @sidecar snapshot-coverage.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseChangelogVersions,
  compareVersions,
  findSnapshotGaps,
  safeTxtName,
  safeZipName,
  gitVersionsAdded,
  DEFAULT_MIN_ZIP_VERSION,
} from '../../scripts/checks/snapshot-coverage-check.mjs';

describe('parseChangelogVersions', () => {
  test('returns empty array for empty input', () => {
    assert.deepEqual(parseChangelogVersions(''), []);
  });

  test('skips [Unreleased] heading', () => {
    const text = '# CHANGELOG\n\n## [Unreleased]\n\n_nothing yet_\n';
    assert.deepEqual(parseChangelogVersions(text), []);
  });

  test('extracts a single versioned heading', () => {
    const text = '## [Unreleased]\n\n## [0.1.0] - 2026-01-01\n';
    assert.deepEqual(parseChangelogVersions(text), ['0.1.0']);
  });

  test('extracts multiple versioned headings in document order', () => {
    const text = [
      '## [Unreleased]',
      '## [0.7.53] - 2026-05-03',
      '## [0.7.52] - 2026-05-03',
      '## [0.7.51] - 2026-05-03',
      '## [0.7.50] - 2026-05-03',
    ].join('\n');
    assert.deepEqual(parseChangelogVersions(text), ['0.7.53', '0.7.52', '0.7.51', '0.7.50']);
  });

  test('ignores headings that do not match strict X.Y.Z form', () => {
    const text = [
      '## [Unreleased]',
      '## [0.1] - 2026-01-01', // missing patch
      '## [v1.0.0] - 2026-01-02', // leading v
      '## [1.0.0-rc] - 2026-01-03', // pre-release suffix
      '## [1.0.0] - 2026-01-04', // valid
    ].join('\n');
    assert.deepEqual(parseChangelogVersions(text), ['1.0.0']);
  });

  test('handles non-string input defensively', () => {
    assert.deepEqual(parseChangelogVersions(undefined), []);
    assert.deepEqual(parseChangelogVersions(null), []);
  });
});

describe('compareVersions', () => {
  test('treats equal versions as 0', () => {
    assert.equal(compareVersions('0.7.50', '0.7.50'), 0);
  });

  test('orders by patch when major and minor are equal', () => {
    assert.equal(compareVersions('0.7.49', '0.7.50'), -1);
    assert.equal(compareVersions('0.7.51', '0.7.50'), 1);
  });

  test('orders by minor when major is equal', () => {
    assert.equal(compareVersions('0.6.99', '0.7.0'), -1);
  });

  test('orders by major', () => {
    assert.equal(compareVersions('0.99.99', '1.0.0'), -1);
  });

  test('treats missing components as zero', () => {
    assert.equal(compareVersions('1', '1.0.0'), 0);
  });
});

describe('findSnapshotGaps', () => {
  const txtName = 'contextrail-template';
  const zipName = 'contextrail-template';

  test('returns empty array when every version is fully covered', () => {
    const versions = ['0.7.50', '0.7.49'];
    const presentFiles = [
      'merge-contextrail-template(0.7.50).txt',
      'merge-contextrail-template(0.7.50).zip',
      'merge-contextrail-template(0.7.49).txt',
      'merge-contextrail-template(0.7.49).zip',
    ];
    assert.deepEqual(findSnapshotGaps({ versions, presentFiles, txtName, zipName }), []);
  });

  test('flags missing snapshot on a single version (the bypass incident shape)', () => {
    const versions = ['0.7.51'];
    const presentFiles = []; // nothing for 0.7.51
    const gaps = findSnapshotGaps({ versions, presentFiles, txtName, zipName });
    assert.equal(gaps.length, 1);
    assert.deepEqual(gaps[0], { version: '0.7.51', missingTxt: true, missingZip: true });
  });

  test('flags missing zip even when txt is present (half-baked snapshot)', () => {
    const versions = ['0.7.52'];
    const presentFiles = ['merge-contextrail-template(0.7.52).txt']; // txt only
    const gaps = findSnapshotGaps({ versions, presentFiles, txtName, zipName });
    assert.equal(gaps.length, 1);
    assert.equal(gaps[0].missingTxt, false);
    assert.equal(gaps[0].missingZip, true);
  });

  test('exempts versions older than minZipVersion from .zip requirement', () => {
    // Use a custom cutover that excludes our test version
    const versions = ['0.0.5'];
    const presentFiles = ['merge-contextrail-template(0.0.5).txt']; // no zip
    const gaps = findSnapshotGaps({
      versions,
      presentFiles,
      txtName,
      zipName,
      minZipVersion: '0.1.0',
    });
    assert.deepEqual(gaps, []);
  });

  test('still flags missing .txt for pre-cutover versions', () => {
    const versions = ['0.0.5'];
    const presentFiles = []; // not even txt
    const gaps = findSnapshotGaps({
      versions,
      presentFiles,
      txtName,
      zipName,
      minZipVersion: '0.1.0',
    });
    assert.equal(gaps.length, 1);
    assert.equal(gaps[0].missingTxt, true);
    assert.equal(gaps[0].missingZip, false); // exempt
  });

  test('uses configurable minZipVersion override', () => {
    const versions = ['0.5.0'];
    const presentFiles = ['merge-contextrail-template(0.5.0).txt']; // no zip
    // Default cutover is 0.1.0: 0.5.0 >= 0.1.0 is true, so zip required.
    const gaps = findSnapshotGaps({ versions, presentFiles, txtName, zipName });
    assert.equal(gaps.length, 1);
    assert.equal(gaps[0].missingZip, true);
    // Operator-overridden cutover to 0.6.0: now 0.5.0 < 0.6.0, so zip exempt.
    const gaps2 = findSnapshotGaps({
      versions,
      presentFiles,
      txtName,
      zipName,
      minZipVersion: '0.6.0',
    });
    assert.deepEqual(gaps2, []);
  });

  test('aggregates multiple gaps in a single call', () => {
    const versions = ['0.7.52', '0.7.51', '0.7.50'];
    const presentFiles = [
      // 0.7.52 — txt present, zip missing
      'merge-contextrail-template(0.7.52).txt',
      // 0.7.51 — both missing
      // 0.7.50 — both present
      'merge-contextrail-template(0.7.50).txt',
      'merge-contextrail-template(0.7.50).zip',
    ];
    const gaps = findSnapshotGaps({ versions, presentFiles, txtName, zipName });
    assert.equal(gaps.length, 2);
    assert.equal(gaps[0].version, '0.7.52');
    assert.equal(gaps[0].missingZip, true);
    assert.equal(gaps[0].missingTxt, false);
    assert.equal(gaps[1].version, '0.7.51');
    assert.equal(gaps[1].missingTxt, true);
    assert.equal(gaps[1].missingZip, true);
  });
});

describe('safeTxtName', () => {
  test('matches merge-snapshot.mjs#safeName behavior', () => {
    assert.equal(safeTxtName('contextrail-template'), 'contextrail-template');
    assert.equal(safeTxtName('@scope/repo'), 'scope/repo'.replace(/[^\w.-]+/g, '-'));
    assert.equal(safeTxtName(''), 'repo');
    assert.equal(safeTxtName(null), 'repo');
  });

  test('does NOT lowercase (matches merge-snapshot.mjs)', () => {
    assert.equal(safeTxtName('Foo-Bar'), 'Foo-Bar');
  });
});

describe('safeZipName', () => {
  test('matches scripts/mergezip.mjs#safeName behavior', () => {
    assert.equal(safeZipName('contextrail-template'), 'contextrail-template');
    assert.equal(safeZipName('@scope/repo'), 'scope-repo');
    assert.equal(safeZipName(''), 'repo');
  });

  test('lowercases and collapses dashes', () => {
    assert.equal(safeZipName('Foo--Bar'), 'foo-bar');
  });
});

describe('DEFAULT_MIN_ZIP_VERSION', () => {
  test('is the template cutover version (0.1.0 — all backups include .zip)', () => {
    assert.equal(DEFAULT_MIN_ZIP_VERSION, '0.1.0');
  });
});

describe('gitVersionsAdded', () => {
  test('returns empty array when both refs share the same versions', () => {
    const head = '## [Unreleased]\n\n## [0.7.50] - x\n';
    const refStub = () => ({
      ok: true,
      stdout: '## [Unreleased]\n\n## [0.7.50] - x\n',
      stderr: '',
    });
    assert.deepEqual(gitVersionsAdded('main', { gitCmd: refStub, headChangelog: head }), []);
  });

  test('returns versions added in HEAD that were not in <ref>', () => {
    const head = [
      '## [Unreleased]',
      '## [0.7.53] - x',
      '## [0.7.52] - x',
      '## [0.7.51] - x',
      '## [0.7.50] - x',
    ].join('\n');
    const refStub = () => ({
      ok: true,
      stdout: '## [Unreleased]\n## [0.7.50] - x\n',
      stderr: '',
    });
    const added = gitVersionsAdded('main', { gitCmd: refStub, headChangelog: head });
    assert.deepEqual(added.sort(), ['0.7.51', '0.7.52', '0.7.53']);
  });

  test('treats failed git lookup as empty ref CHANGELOG (all HEAD versions are new)', () => {
    const head = '## [Unreleased]\n## [0.0.1] - x\n';
    const failingStub = () => ({ ok: false, stdout: '', stderr: 'no such ref' });
    assert.deepEqual(
      gitVersionsAdded('nonexistent', { gitCmd: failingStub, headChangelog: head }),
      ['0.0.1'],
    );
  });
});
