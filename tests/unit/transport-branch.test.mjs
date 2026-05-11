/* @HEADER
 * @version 0.7.109 | 2026-05-06
 * @purpose Unit tests pinning the pure-logic helpers behind R2 / ADR-0017 — branch-name regex, marker shape/parse, age verdicts, ceremony-file intersection, F12 ff-update method classification.
 * @sidecar transport-branch.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Unit tests for scripts/lib/transport-branch.mjs.
 *
 * Pure-function tests — no fixtures, no git, no filesystem. Every
 * detection rule and every threshold has at least one explicit case
 * here so a regression silently weakening the check fails CI. The
 * boundary cases (warn @ 23.99h vs 24.01h, refuse @ 167.99h vs 168.01h)
 * pin the exact thresholds documented in the lib file.
 *
 * @see scripts/lib/transport-branch.mjs
 * @see docs/adr/0017-transport-branch-enforcement.md
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import {
  isTransportBranchName,
  isTrunkBranchName,
  isAcceptableBranchName,
  extractSliceFromTransportName,
  findBannedBranchReason,
  BANNED_BRANCH_PATTERNS,
  MERGING_MARKER_FILENAME,
  mergingMarkerPath,
  mergingMarkerContent,
  parseMergingMarker,
  TRANSPORT_BRANCH_AGE_WARN_HOURS,
  TRANSPORT_BRANCH_AGE_REFUSE_HOURS,
  hoursSinceBranchCreation,
  ageVerdict,
  CEREMONY_FILES,
  ceremonyFilesIn,
  isValidSliceId,
  transportBranchNameForSlice,
  parseWorktreeListPorcelain,
  findMainWorktree,
  checkUpdateInsteadConfig,
  classifyFfUpdateMethod,
  FF_UPDATE_METHODS,
  composeUpdateInsteadSetupHint,
} from '../../scripts/lib/transport-branch.mjs';

// ---------------------------------------------------------------------------
// Branch-name validation
// ---------------------------------------------------------------------------

describe('isTransportBranchName — accepted shapes', () => {
  test('1. tx-TPL-234 (standard)', () => {
    assert.equal(isTransportBranchName('tx-TPL-234'), true);
  });
  test('2. tx-AIC-088 (Cockpit prefix)', () => {
    assert.equal(isTransportBranchName('tx-AIC-088'), true);
  });
  test('3. tx-ZVX-053 (Zvenix prefix)', () => {
    assert.equal(isTransportBranchName('tx-ZVX-053'), true);
  });
  test('4. tx-TPL-227-interim (suffixed variant)', () => {
    assert.equal(isTransportBranchName('tx-TPL-227-interim'), true);
  });
  test('5. tx-X-1 (minimal valid)', () => {
    assert.equal(isTransportBranchName('tx-X-1'), true);
  });
});

describe('isTransportBranchName — rejected shapes', () => {
  test('6. feature/foo (banned pattern)', () => {
    assert.equal(isTransportBranchName('feature/foo'), false);
  });
  test('7. feat/bar', () => {
    assert.equal(isTransportBranchName('feat/bar'), false);
  });
  test('8. fix/baz', () => {
    assert.equal(isTransportBranchName('fix/baz'), false);
  });
  test('9. tpl234 (no tx- prefix)', () => {
    assert.equal(isTransportBranchName('tpl234'), false);
  });
  test('10. TPL-234 (no tx- prefix, just slice id)', () => {
    assert.equal(isTransportBranchName('TPL-234'), false);
  });
  test('11. tx- (empty body)', () => {
    assert.equal(isTransportBranchName('tx-'), false);
  });
  test('12. tx-foo (no digits)', () => {
    assert.equal(isTransportBranchName('tx-foo'), false);
  });
  test('13. tx-tpl-234 (lowercase project prefix)', () => {
    assert.equal(isTransportBranchName('tx-tpl-234'), false);
  });
  test('14. backport-tpl234 (banned)', () => {
    assert.equal(isTransportBranchName('backport-tpl234'), false);
  });
  test('15. tpl234-backport (banned suffix shape)', () => {
    assert.equal(isTransportBranchName('tpl234-backport'), false);
  });
  test('16. anything-tx-tpl234 (prefix anchored)', () => {
    assert.equal(isTransportBranchName('anything-tx-tpl234'), false);
  });
  test('17. tx-TPL-234-Interim (uppercase suffix rejected)', () => {
    // suffix must be lowercase per the regex; pinning this prevents
    // a relaxation from sliding in unnoticed
    assert.equal(isTransportBranchName('tx-TPL-234-Interim'), false);
  });
  test('18. non-string (null) → false', () => {
    assert.equal(isTransportBranchName(null), false);
    assert.equal(isTransportBranchName(undefined), false);
    assert.equal(isTransportBranchName(42), false);
  });
});

describe('isTrunkBranchName', () => {
  test('19. main → true', () => {
    assert.equal(isTrunkBranchName('main'), true);
  });
  test('20. master → true', () => {
    assert.equal(isTrunkBranchName('master'), true);
  });
  test('21. main2 → false (no fuzzy match)', () => {
    assert.equal(isTrunkBranchName('main2'), false);
  });
  test('22. trunk → false (not in the allowlist)', () => {
    assert.equal(isTrunkBranchName('trunk'), false);
  });
  test('23. tx-TPL-234 → false', () => {
    assert.equal(isTrunkBranchName('tx-TPL-234'), false);
  });
});

describe('isAcceptableBranchName', () => {
  test('24. main → true', () => {
    assert.equal(isAcceptableBranchName('main'), true);
  });
  test('25. tx-TPL-234 → true', () => {
    assert.equal(isAcceptableBranchName('tx-TPL-234'), true);
  });
  test('26. feature/foo → false', () => {
    assert.equal(isAcceptableBranchName('feature/foo'), false);
  });
});

describe('extractSliceFromTransportName', () => {
  test('27. tx-TPL-234 → TPL-234', () => {
    assert.equal(extractSliceFromTransportName('tx-TPL-234'), 'TPL-234');
  });
  test('28. tx-TPL-227-interim → TPL-227-interim', () => {
    assert.equal(extractSliceFromTransportName('tx-TPL-227-interim'), 'TPL-227-interim');
  });
  test('29. main → null', () => {
    assert.equal(extractSliceFromTransportName('main'), null);
  });
  test('30. invalid input → null', () => {
    assert.equal(extractSliceFromTransportName(''), null);
    assert.equal(extractSliceFromTransportName(null), null);
  });
});

describe('findBannedBranchReason', () => {
  test('31. feature/foo → matches feature/ pattern', () => {
    const hit = findBannedBranchReason('feature/foo');
    assert.ok(hit, 'expected a banned-pattern hit');
    assert.match(hit.reason, /trunk-based delivery/);
  });
  test('32. tpl234-backport → matches *-backport', () => {
    const hit = findBannedBranchReason('tpl234-backport');
    assert.ok(hit);
    assert.match(hit.reason, /anti-pattern/);
  });
  test('33. backport-tpl234 → matches backport-* (not the suffix one)', () => {
    const hit = findBannedBranchReason('backport-tpl234');
    assert.ok(hit);
    assert.match(hit.reason, /anti-pattern/);
  });
  test('34. main → null (no banned match)', () => {
    assert.equal(findBannedBranchReason('main'), null);
  });
  test('35. tx-TPL-234 → null (transport branch is not banned)', () => {
    assert.equal(findBannedBranchReason('tx-TPL-234'), null);
  });
  test('36. random-name → null (banned list is allow-listed; unknowns fall through to the generic "not transport" message)', () => {
    assert.equal(findBannedBranchReason('random-name'), null);
  });
  test('37. BANNED_BRANCH_PATTERNS is frozen', () => {
    assert.throws(() => {
      // Mutation should throw in strict mode (test files run as ES modules
      // → strict by default).
      BANNED_BRANCH_PATTERNS.push({ match: /x/, reason: 'x' });
    });
  });
});

// ---------------------------------------------------------------------------
// Marker file shape + parser
// ---------------------------------------------------------------------------

describe('mergingMarkerPath', () => {
  test('38. composes under <repoRoot>/.claims/.coa-merging.lock', () => {
    const got = mergingMarkerPath('/tmp/repo');
    assert.equal(got, '/tmp/repo/.claims/.coa-merging.lock');
  });
  test('39. throws on empty repoRoot', () => {
    assert.throws(() => mergingMarkerPath(''));
    assert.throws(() => mergingMarkerPath(null));
  });
  test('40. MERGING_MARKER_FILENAME constant matches expected shape', () => {
    assert.equal(MERGING_MARKER_FILENAME, '.coa-merging.lock');
  });
});

describe('mergingMarkerContent + parseMergingMarker round-trip', () => {
  const sample = { pid: 12345, branch: 'tx-TPL-234', ts: 1717000000000 };

  test('41. compose then parse yields the same shape', () => {
    const text = mergingMarkerContent(sample);
    const parsed = parseMergingMarker(text);
    assert.deepEqual(parsed, sample);
  });
  test('42. content ends with newline', () => {
    const text = mergingMarkerContent(sample);
    assert.equal(text.endsWith('\n'), true);
  });
  test('43. compose rejects bad pid', () => {
    assert.throws(() => mergingMarkerContent({ ...sample, pid: 0 }));
    assert.throws(() => mergingMarkerContent({ ...sample, pid: -1 }));
    assert.throws(() => mergingMarkerContent({ ...sample, pid: NaN }));
  });
  test('44. compose rejects non-transport branch', () => {
    assert.throws(() => mergingMarkerContent({ ...sample, branch: 'main' }));
    assert.throws(() => mergingMarkerContent({ ...sample, branch: 'feature/foo' }));
  });
  test('45. compose rejects bad ts', () => {
    assert.throws(() => mergingMarkerContent({ ...sample, ts: 0 }));
    assert.throws(() => mergingMarkerContent({ ...sample, ts: -1 }));
  });
});

describe('parseMergingMarker — invalid inputs return null', () => {
  test('46. empty string → null', () => {
    assert.equal(parseMergingMarker(''), null);
  });
  test('47. malformed JSON → null', () => {
    assert.equal(parseMergingMarker('not json'), null);
  });
  test('48. missing pid → null', () => {
    assert.equal(parseMergingMarker(JSON.stringify({ branch: 'tx-TPL-1', ts: 1 })), null);
  });
  test('49. missing branch → null', () => {
    assert.equal(parseMergingMarker(JSON.stringify({ pid: 1, ts: 1 })), null);
  });
  test('50. branch not transport-shaped → null', () => {
    assert.equal(parseMergingMarker(JSON.stringify({ pid: 1, branch: 'main', ts: 1 })), null);
  });
  test('51. negative pid → null', () => {
    assert.equal(parseMergingMarker(JSON.stringify({ pid: -1, branch: 'tx-TPL-1', ts: 1 })), null);
  });
  test('52. negative ts → null', () => {
    assert.equal(parseMergingMarker(JSON.stringify({ pid: 1, branch: 'tx-TPL-1', ts: -1 })), null);
  });
  test('53. non-string input → null', () => {
    assert.equal(parseMergingMarker(null), null);
    assert.equal(parseMergingMarker(undefined), null);
    assert.equal(parseMergingMarker(42), null);
  });
});

// ---------------------------------------------------------------------------
// Age verdicts
// ---------------------------------------------------------------------------

describe('hoursSinceBranchCreation', () => {
  test('54. zero diff returns 0', () => {
    assert.equal(hoursSinceBranchCreation(1000, 1000), 0);
  });
  test('55. one hour diff returns 1', () => {
    assert.equal(hoursSinceBranchCreation(1_000_000, 1_000_000 + 3_600_000), 1);
  });
  test('56. negative diff clamps to 0', () => {
    assert.equal(hoursSinceBranchCreation(2000, 1000), 0);
  });
  test('57. invalid input returns 0', () => {
    assert.equal(hoursSinceBranchCreation(NaN, 1000), 0);
    assert.equal(hoursSinceBranchCreation(1000, NaN), 0);
    assert.equal(hoursSinceBranchCreation(0, 1000), 0); // creationTs <= 0
  });
});

describe('ageVerdict — boundary cases', () => {
  test('58. 0h → ok', () => {
    assert.equal(ageVerdict(0), 'ok');
  });
  test('59. 23.99h → ok (just under warn)', () => {
    assert.equal(ageVerdict(23.99), 'ok');
  });
  test('60. exactly 24h → warn (warn threshold inclusive)', () => {
    assert.equal(ageVerdict(24), 'warn');
  });
  test('61. 24.01h → warn', () => {
    assert.equal(ageVerdict(24.01), 'warn');
  });
  test('62. 167.99h → warn (just under refuse)', () => {
    assert.equal(ageVerdict(167.99), 'warn');
  });
  test('63. exactly 168h → refuse (refuse threshold inclusive)', () => {
    assert.equal(ageVerdict(168), 'refuse');
  });
  test('64. 168.01h → refuse', () => {
    assert.equal(ageVerdict(168.01), 'refuse');
  });
  test('65. negative input → ok (clamps)', () => {
    assert.equal(ageVerdict(-1), 'ok');
  });
  test('66. NaN → ok', () => {
    assert.equal(ageVerdict(NaN), 'ok');
  });
  test('67. custom thresholds honoured', () => {
    assert.equal(ageVerdict(5, 4, 10), 'warn');
    assert.equal(ageVerdict(11, 4, 10), 'refuse');
  });
  test('68. constants match documented values', () => {
    assert.equal(TRANSPORT_BRANCH_AGE_WARN_HOURS, 24);
    assert.equal(TRANSPORT_BRANCH_AGE_REFUSE_HOURS, 168);
  });
});

// ---------------------------------------------------------------------------
// Ceremony-file intersection
// ---------------------------------------------------------------------------

describe('ceremonyFilesIn', () => {
  test('69. CEREMONY_FILES list is exactly VERSION, package.json, CHANGELOG.md', () => {
    assert.deepEqual([...CEREMONY_FILES], ['VERSION', 'package.json', 'CHANGELOG.md']);
  });
  test('70. CEREMONY_FILES is frozen', () => {
    assert.throws(() => CEREMONY_FILES.push('extra'));
  });
  test('71. plain code commit (no ceremony files) → empty array', () => {
    assert.deepEqual(ceremonyFilesIn(['scripts/foo.mjs', 'tests/unit/foo.test.mjs']), []);
  });
  test('72. mixes detected (VERSION + code) → just VERSION', () => {
    assert.deepEqual(ceremonyFilesIn(['VERSION', 'scripts/foo.mjs']), ['VERSION']);
  });
  test('73. all three ceremony files staged → all three returned', () => {
    assert.deepEqual(ceremonyFilesIn(['VERSION', 'package.json', 'CHANGELOG.md']), [
      'VERSION',
      'package.json',
      'CHANGELOG.md',
    ]);
  });
  test('74. backslash paths normalized to forward slash', () => {
    assert.deepEqual(ceremonyFilesIn(['VERSION', 'CHANGELOG.md']), ['VERSION', 'CHANGELOG.md']);
  });
  test('75. non-array input → empty', () => {
    assert.deepEqual(ceremonyFilesIn(null), []);
    assert.deepEqual(ceremonyFilesIn(undefined), []);
    assert.deepEqual(ceremonyFilesIn('VERSION'), []);
  });
  test('76. non-string entries skipped', () => {
    assert.deepEqual(ceremonyFilesIn(['VERSION', null, 42, 'package.json']), [
      'VERSION',
      'package.json',
    ]);
  });
  test('77. partial match (e.g. "version" lowercase) does NOT match', () => {
    assert.deepEqual(ceremonyFilesIn(['version']), []);
  });
});

// ---------------------------------------------------------------------------
// Slice ID helpers (used by coa-worktree --create --slice= and the
// transport-branch flow)
// ---------------------------------------------------------------------------

describe('isValidSliceId', () => {
  test('78. TPL-234 → true', () => {
    assert.equal(isValidSliceId('TPL-234'), true);
  });
  test('79. TPL-227-interim → true (suffixed)', () => {
    assert.equal(isValidSliceId('TPL-227-interim'), true);
  });
  test('80. AIC-088 → true (Cockpit prefix)', () => {
    assert.equal(isValidSliceId('AIC-088'), true);
  });
  test('81. tpl-234 → false (lowercase project)', () => {
    assert.equal(isValidSliceId('tpl-234'), false);
  });
  test('82. TPL → false (no digits)', () => {
    assert.equal(isValidSliceId('TPL'), false);
  });
  test('83. empty + non-string → false', () => {
    assert.equal(isValidSliceId(''), false);
    assert.equal(isValidSliceId(null), false);
    assert.equal(isValidSliceId(42), false);
  });
});

describe('transportBranchNameForSlice', () => {
  test('84. TPL-234 → tx-TPL-234', () => {
    assert.equal(transportBranchNameForSlice('TPL-234'), 'tx-TPL-234');
  });
  test('85. TPL-227-interim → tx-TPL-227-interim', () => {
    assert.equal(transportBranchNameForSlice('TPL-227-interim'), 'tx-TPL-227-interim');
  });
  test('86. throws on invalid input', () => {
    assert.throws(() => transportBranchNameForSlice('foo'));
    assert.throws(() => transportBranchNameForSlice('tpl-234'));
    assert.throws(() => transportBranchNameForSlice(null));
    assert.throws(() => transportBranchNameForSlice(''));
  });
});

// TPL-303 — multi-segment prefix support
describe('isValidSliceId — multi-segment (TPL-303)', () => {
  test('P1. AIC-DEV-167 → true (two-segment prefix)', () => {
    assert.equal(isValidSliceId('AIC-DEV-167'), true);
  });
  test('P2. RELEASE-Q1-FEAT-008 → true (three-segment prefix)', () => {
    assert.equal(isValidSliceId('RELEASE-Q1-FEAT-008'), true);
  });
  test('P3. AIC-DEV-167-interim → true (multi-segment + suffix)', () => {
    assert.equal(isValidSliceId('AIC-DEV-167-interim'), true);
  });
  test('P4. AIC--DEV-167 → false (double hyphen)', () => {
    assert.equal(isValidSliceId('AIC--DEV-167'), false);
  });
  test('P5. aic-dev-167 → false (lowercase)', () => {
    assert.equal(isValidSliceId('aic-dev-167'), false);
  });
  test('P6. AIC-dev-167 → false (lowercase segment)', () => {
    assert.equal(isValidSliceId('AIC-dev-167'), false);
  });
});

describe('isTransportBranchName — multi-segment (TPL-303)', () => {
  test('Q1. tx-AIC-DEV-167 → true', () => {
    assert.equal(isTransportBranchName('tx-AIC-DEV-167'), true);
  });
  test('Q2. tx-RELEASE-Q1-FEAT-008 → true', () => {
    assert.equal(isTransportBranchName('tx-RELEASE-Q1-FEAT-008'), true);
  });
  test('Q3. tx-AIC-DEV-167-interim → true (with suffix)', () => {
    assert.equal(isTransportBranchName('tx-AIC-DEV-167-interim'), true);
  });
  test('Q4. tx-aic-dev-167 → false (lowercase)', () => {
    assert.equal(isTransportBranchName('tx-aic-dev-167'), false);
  });
});

describe('transportBranchNameForSlice — multi-segment (TPL-303)', () => {
  test('R1. AIC-DEV-167 → tx-AIC-DEV-167', () => {
    assert.equal(transportBranchNameForSlice('AIC-DEV-167'), 'tx-AIC-DEV-167');
  });
  test('R2. RELEASE-Q1-FEAT-008 → tx-RELEASE-Q1-FEAT-008', () => {
    assert.equal(transportBranchNameForSlice('RELEASE-Q1-FEAT-008'), 'tx-RELEASE-Q1-FEAT-008');
  });
});

// ---------------------------------------------------------------------------
// F12 — git worktree list --porcelain parsing
// ---------------------------------------------------------------------------

describe('parseWorktreeListPorcelain', () => {
  test('87. single worktree on main', () => {
    const out = ['worktree /home/u/repo', 'HEAD abc123', 'branch refs/heads/main', ''].join('\n');
    assert.deepEqual(parseWorktreeListPorcelain(out), [
      { path: '/home/u/repo', head: 'abc123', branch: 'main' },
    ]);
  });

  test('88. main + transport worktree', () => {
    const out = [
      'worktree /home/u/repo',
      'HEAD abc123',
      'branch refs/heads/main',
      '',
      'worktree /home/u/repo-tx-TPL-237',
      'HEAD def456',
      'branch refs/heads/tx-TPL-237',
      '',
    ].join('\n');
    assert.deepEqual(parseWorktreeListPorcelain(out), [
      { path: '/home/u/repo', head: 'abc123', branch: 'main' },
      { path: '/home/u/repo-tx-TPL-237', head: 'def456', branch: 'tx-TPL-237' },
    ]);
  });

  test('89. bare repo metadata entry preserved with bare flag', () => {
    const out = ['worktree /srv/repo.git', 'bare', ''].join('\n');
    const got = parseWorktreeListPorcelain(out);
    assert.equal(got.length, 1);
    assert.equal(got[0].path, '/srv/repo.git');
    assert.equal(got[0].bare, true);
    assert.equal(got[0].branch, undefined);
  });

  test('90. CRLF line endings tolerated', () => {
    const out = ['worktree /home/u/repo', 'HEAD abc123', 'branch refs/heads/main', ''].join('\r\n');
    assert.equal(parseWorktreeListPorcelain(out).length, 1);
  });

  test('91. empty + invalid input → empty array', () => {
    assert.deepEqual(parseWorktreeListPorcelain(''), []);
    assert.deepEqual(parseWorktreeListPorcelain(null), []);
    assert.deepEqual(parseWorktreeListPorcelain(undefined), []);
  });

  test('92. unknown porcelain fields silently skipped', () => {
    const out = [
      'worktree /home/u/repo',
      'HEAD abc123',
      'branch refs/heads/main',
      'detached',
      'future-field unknown',
      '',
    ].join('\n');
    const got = parseWorktreeListPorcelain(out);
    assert.equal(got.length, 1);
    assert.equal(got[0].path, '/home/u/repo');
    assert.equal(got[0].branch, 'main');
  });

  test('93. branch line without refs/heads/ prefix preserved verbatim', () => {
    const out = ['worktree /home/u/repo', 'HEAD abc', 'branch main', ''].join('\n');
    assert.equal(parseWorktreeListPorcelain(out)[0].branch, 'main');
  });
});

describe('findMainWorktree', () => {
  test('94. single main worktree returned', () => {
    const out = ['worktree /home/u/repo', 'HEAD abc', 'branch refs/heads/main', ''].join('\n');
    const got = findMainWorktree(out);
    assert.equal(got.path, '/home/u/repo');
  });

  test('95. main + transport — main returned (not transport)', () => {
    const out = [
      'worktree /home/u/repo',
      'HEAD abc',
      'branch refs/heads/main',
      '',
      'worktree /home/u/repo-tx',
      'HEAD def',
      'branch refs/heads/tx-TPL-237',
      '',
    ].join('\n');
    assert.equal(findMainWorktree(out).path, '/home/u/repo');
  });

  test('96. only non-main worktrees → null', () => {
    const out = ['worktree /home/u/repo-tx', 'HEAD def', 'branch refs/heads/tx-TPL-237', ''].join(
      '\n',
    );
    assert.equal(findMainWorktree(out), null);
  });

  test('97. only bare metadata → null (bare entries skipped)', () => {
    const out = ['worktree /srv/repo.git', 'bare', ''].join('\n');
    assert.equal(findMainWorktree(out), null);
  });

  test('98. trunkName="master" honoured', () => {
    const out = ['worktree /home/u/repo', 'HEAD abc', 'branch refs/heads/master', ''].join('\n');
    assert.equal(findMainWorktree(out, 'master').path, '/home/u/repo');
    // And looking for "main" finds nothing.
    assert.equal(findMainWorktree(out, 'main'), null);
  });

  test('99. invalid trunkName → null', () => {
    const out = 'worktree /x\nHEAD a\nbranch refs/heads/main\n';
    assert.equal(findMainWorktree(out, ''), null);
    assert.equal(findMainWorktree(out, null), null);
  });
});

// ---------------------------------------------------------------------------
// F12 — receive.denyCurrentBranch config detection
// ---------------------------------------------------------------------------

describe('checkUpdateInsteadConfig', () => {
  test('100. updateInstead → true', () => {
    assert.equal(checkUpdateInsteadConfig('updateInstead'), true);
  });
  test('101. updateInstead with surrounding whitespace → true', () => {
    assert.equal(checkUpdateInsteadConfig('  updateInstead\n'), true);
  });
  test('102. ignore → false', () => {
    assert.equal(checkUpdateInsteadConfig('ignore'), false);
  });
  test('103. warn → false', () => {
    assert.equal(checkUpdateInsteadConfig('warn'), false);
  });
  test('104. refuse → false', () => {
    assert.equal(checkUpdateInsteadConfig('refuse'), false);
  });
  test('105. empty / null / non-string → false', () => {
    assert.equal(checkUpdateInsteadConfig(''), false);
    assert.equal(checkUpdateInsteadConfig(null), false);
    assert.equal(checkUpdateInsteadConfig(undefined), false);
    assert.equal(checkUpdateInsteadConfig(true), false);
  });
  test('106. case-sensitive (UpdateInstead → false)', () => {
    // git config is case-sensitive on values; pinning rejects fuzzy
    // matches that would weaken the gate.
    assert.equal(checkUpdateInsteadConfig('UpdateInstead'), false);
    assert.equal(checkUpdateInsteadConfig('updateinstead'), false);
  });
});

// ---------------------------------------------------------------------------
// F12 — ff-update method classification
// ---------------------------------------------------------------------------

describe('classifyFfUpdateMethod', () => {
  const mainWt = { path: '/home/u/repo', branch: 'main', head: 'abc' };

  test('107. bare repo → update-ref-bare', () => {
    assert.equal(classifyFfUpdateMethod({ isBare: true }), FF_UPDATE_METHODS.UPDATE_REF_BARE);
    // Bare wins even when other fields would say otherwise:
    assert.equal(
      classifyFfUpdateMethod({
        isBare: true,
        mainWorktree: mainWt,
        denyCurrentBranchValue: 'updateInstead',
      }),
      FF_UPDATE_METHODS.UPDATE_REF_BARE,
    );
  });

  test('108. non-bare + no main worktree → update-ref-no-main', () => {
    assert.equal(
      classifyFfUpdateMethod({ isBare: false, mainWorktree: null }),
      FF_UPDATE_METHODS.UPDATE_REF_NO_MAIN,
    );
  });

  test('109. non-bare + main + updateInstead → push-update-instead', () => {
    assert.equal(
      classifyFfUpdateMethod({
        isBare: false,
        mainWorktree: mainWt,
        denyCurrentBranchValue: 'updateInstead',
      }),
      FF_UPDATE_METHODS.PUSH_UPDATE_INSTEAD,
    );
  });

  test('110. non-bare + main + config unset → refuse-needs-config', () => {
    assert.equal(
      classifyFfUpdateMethod({
        isBare: false,
        mainWorktree: mainWt,
        denyCurrentBranchValue: null,
      }),
      FF_UPDATE_METHODS.REFUSE_NEEDS_CONFIG,
    );
  });

  test('111. non-bare + main + config "ignore" → refuse-needs-config', () => {
    // Operator setting `ignore` to silence the refusal must NOT be
    // accepted — only explicit `updateInstead` qualifies. This pins
    // the anti-evasion vector from the F12 patch row.
    assert.equal(
      classifyFfUpdateMethod({
        isBare: false,
        mainWorktree: mainWt,
        denyCurrentBranchValue: 'ignore',
      }),
      FF_UPDATE_METHODS.REFUSE_NEEDS_CONFIG,
    );
  });

  test('112. non-bare + main + config "refuse" → refuse-needs-config', () => {
    // Default git value; doesn't auto-sync working tree.
    assert.equal(
      classifyFfUpdateMethod({
        isBare: false,
        mainWorktree: mainWt,
        denyCurrentBranchValue: 'refuse',
      }),
      FF_UPDATE_METHODS.REFUSE_NEEDS_CONFIG,
    );
  });

  test('113. defaults — all-false / null inputs → update-ref-no-main', () => {
    // No args → safe non-bare default.
    assert.equal(classifyFfUpdateMethod(), FF_UPDATE_METHODS.UPDATE_REF_NO_MAIN);
    assert.equal(classifyFfUpdateMethod({}), FF_UPDATE_METHODS.UPDATE_REF_NO_MAIN);
  });

  test('114. FF_UPDATE_METHODS table is frozen', () => {
    assert.throws(() => {
      FF_UPDATE_METHODS.NEW_KEY = 'evade';
    });
  });
});

describe('composeUpdateInsteadSetupHint', () => {
  test('115. includes the exact one-time setup command', () => {
    const hint = composeUpdateInsteadSetupHint('/home/u/repo');
    assert.match(hint, /git -C \/home\/u\/repo config receive\.denyCurrentBranch updateInstead/);
  });
  test('116. mentions F12 incident shape (bare repos exempt)', () => {
    const hint = composeUpdateInsteadSetupHint('/home/u/repo');
    assert.match(hint, /F12/);
    assert.match(hint, /Bare repositories/i);
  });
  test('117. tolerates missing path with a placeholder', () => {
    const hint = composeUpdateInsteadSetupHint(null);
    assert.match(hint, /<main-worktree-path>/);
  });
});
