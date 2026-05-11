/* @HEADER
 * @version 0.7.87 | 2026-05-05
 * @purpose Unit proof for the pure functions in scripts/lib/header.mjs — the header v2 engine.
 * @sidecar header-engine.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  stripCommentSyntax,
  wrapHeader,
  markdownFrontmatterPrefix,
  splitCanonicalPreamble,
  shebangPrefix,
  parseStructuredHeaderText,
  renderHeaderCore,
  validateHeader,
  removeHeaderBlocks,
  structuredHeaderCountForStyle,
  legacyHeaderCountForStyle,
  inferLayer,
  inferPublic,
  inferApi,
  defaultPurpose,
  defaultHeaderData,
  injectInlineHeader,
  mergeExistingSemanticData,
  isMeaningfulFile,
  commentStyle,
  extractInlineHeader,
  hasStructuredInlineHeader,
  renderInlineHeader,
  HEADER_START,
  HEADER_END,
  CHANGELOG_SECTIONS,
  FILEINFO_FIELDS,
  EDIT_POLICY_VALUES,
  STEWARD_VALUES,
  HEX_LAYER_VALUES,
  PORT_TYPE_VALUES,
  ADAPTER_TYPE_VALUES,
  inferHexLayer,
  inferBoundedContext,
  // Slim header (ADR-0009)
  SLIM_HEADER_MARKER,
  hasSlimHeader,
  removeSlimHeaderBlocks,
  parseSlimHeader,
  renderSlimHeaderCore,
  wrapSlimHeader,
  renderSlimInlineHeader,
  injectSlimHeader,
  renderSparseSidecar,
  isHeaderExempt,
} from '../../scripts/lib/header.mjs';

// ---------------------------------------------------------------------------
// stripCommentSyntax
// ---------------------------------------------------------------------------

describe('stripCommentSyntax()', () => {
  test('strips block comment markers (/* */)', () => {
    const input = `/* ${HEADER_START}\n* version 1.0\n* Purpose: test\n${HEADER_END} */`;
    const result = stripCommentSyntax('block', input);
    assert.ok(result.startsWith(HEADER_START));
    assert.ok(result.includes('version 1.0'));
    assert.ok(!result.includes('/*'));
    assert.ok(!result.includes('*/'));
  });

  test('strips hash comment markers (#)', () => {
    const input = `# ${HEADER_START}\n# version 1.0\n# ${HEADER_END}`;
    const result = stripCommentSyntax('hash', input);
    assert.ok(result.startsWith(HEADER_START));
    assert.ok(!result.includes('#'));
  });

  test('strips HTML comment markers (<!-- -->)', () => {
    const input = `<!-- ${HEADER_START}\nversion 1.0\n${HEADER_END} -->`;
    const result = stripCommentSyntax('html', input);
    assert.ok(result.startsWith(HEADER_START));
    assert.ok(!result.includes('<!--'));
    assert.ok(!result.includes('-->'));
  });

  test('returns trimmed text for unknown style', () => {
    const input = `${HEADER_START}\nversion 1.0`;
    assert.equal(stripCommentSyntax('other', input), input);
  });
});

// ---------------------------------------------------------------------------
// wrapHeader
// ---------------------------------------------------------------------------

describe('wrapHeader()', () => {
  const core = `${HEADER_START}\nversion 1.0\n${HEADER_END}`;

  test('wraps in block comment for JS/TS', () => {
    const result = wrapHeader(core, 'block');
    assert.ok(result.startsWith(`/* ${HEADER_START}`));
    assert.ok(result.includes(`${HEADER_END} */`));
  });

  test('wraps in HTML comment for markdown', () => {
    const result = wrapHeader(core, 'html');
    assert.ok(result.startsWith(`<!-- ${HEADER_START}`));
    assert.ok(result.includes(`${HEADER_END} -->`));
  });

  test('prefixes each line with # for shell/yaml', () => {
    const result = wrapHeader(core, 'hash');
    const lines = result.trimEnd().split('\n');
    for (const line of lines) {
      assert.ok(line.startsWith('# '), `Line must start with "# ": ${line}`);
    }
  });

  test('returns empty string for unknown style', () => {
    assert.equal(wrapHeader(core, 'sidecar'), '');
  });
});

// ---------------------------------------------------------------------------
// markdownFrontmatterPrefix
// ---------------------------------------------------------------------------

describe('markdownFrontmatterPrefix()', () => {
  test('extracts YAML frontmatter from markdown', () => {
    const text = '---\ntitle: Test\n---\n# Heading\n';
    const { frontmatter, rest } = markdownFrontmatterPrefix(text);
    assert.ok(frontmatter.includes('title: Test'));
    assert.ok(rest.includes('# Heading'));
  });

  test('returns empty frontmatter for non-frontmatter text', () => {
    const text = '# Just a heading\nSome text';
    const { frontmatter, rest } = markdownFrontmatterPrefix(text);
    assert.equal(frontmatter, '');
    assert.equal(rest, text);
  });

  test('returns empty frontmatter for unclosed frontmatter', () => {
    const text = '---\ntitle: Test\nno closing delimiter';
    const { frontmatter, rest } = markdownFrontmatterPrefix(text);
    assert.equal(frontmatter, '');
    assert.equal(rest, text);
  });
});

// ---------------------------------------------------------------------------
// splitCanonicalPreamble
// ---------------------------------------------------------------------------

describe('splitCanonicalPreamble()', () => {
  test('extracts shebang from shell files', () => {
    const text = '#!/usr/bin/env bash\nset -euo pipefail';
    const { shebang, rest } = splitCanonicalPreamble('script.sh', text);
    assert.equal(shebang, '#!/usr/bin/env bash\n');
    assert.ok(rest.includes('set -euo pipefail'));
  });

  test('extracts frontmatter from markdown files', () => {
    const text = '---\ntitle: Test\n---\n# Heading';
    const { shebang, frontmatter, rest } = splitCanonicalPreamble('doc.md', text);
    assert.equal(shebang, '');
    assert.ok(frontmatter.includes('title: Test'));
    assert.ok(rest.includes('# Heading'));
  });

  test('returns empty preamble for JS files', () => {
    const text = 'const x = 1;';
    const { shebang, frontmatter, rest } = splitCanonicalPreamble('file.mjs', text);
    assert.equal(shebang, '');
    assert.equal(frontmatter, '');
    assert.equal(rest, text);
  });
});

// ---------------------------------------------------------------------------
// structuredHeaderCountForStyle / legacyHeaderCountForStyle
// ---------------------------------------------------------------------------

describe('header counting', () => {
  test('structuredHeaderCountForStyle counts block headers', () => {
    const text = `/* ${HEADER_START}\nversion 1.0\n${HEADER_END} */\ncode\n/* ${HEADER_START}\nversion 2.0\n${HEADER_END} */`;
    assert.equal(structuredHeaderCountForStyle('block', text), 2);
  });

  test('structuredHeaderCountForStyle returns 0 for no headers', () => {
    assert.equal(structuredHeaderCountForStyle('block', 'just code'), 0);
  });

  test('legacyHeaderCountForStyle counts legacy markers', () => {
    const LEGACY_START = '@PROJECT-TEMPLATE-HEADER-START';
    const LEGACY_END = '@PROJECT-TEMPLATE-HEADER-END';
    const text = `/* ${LEGACY_START}\nstuff\n${LEGACY_END} */`;
    assert.equal(legacyHeaderCountForStyle('block', text), 1);
  });
});

// ---------------------------------------------------------------------------
// removeHeaderBlocks
// ---------------------------------------------------------------------------

describe('removeHeaderBlocks()', () => {
  test('removes a block-style structured header', () => {
    const text = `/* ${HEADER_START}\nversion 1.0\n${HEADER_END} */\n\nconst x = 1;`;
    const result = removeHeaderBlocks('file.mjs', text);
    assert.ok(!result.includes(HEADER_START));
    assert.ok(result.includes('const x = 1'));
  });

  test('preserves code when removing HTML header from markdown', () => {
    const text = `<!-- ${HEADER_START}\nversion 1.0\n${HEADER_END} -->\n\n# Title`;
    const result = removeHeaderBlocks('file.md', text);
    assert.ok(!result.includes(HEADER_START));
    assert.ok(result.includes('# Title'));
  });
});

// ---------------------------------------------------------------------------
// parseStructuredHeaderText
// ---------------------------------------------------------------------------

describe('parseStructuredHeaderText()', () => {
  const validHeader = [
    `/* ${HEADER_START}`,
    'version 0.1.0 | 2026-01-01',
    'path: test/file.mjs',
    'Purpose: Test file',
    'CHANGELOG-BEGIN',
    'Summary:',
    '- Initial',
    'Added:',
    '- Something',
    'Changed:',
    '- _none_',
    'Fixed:',
    '- _none_',
    'Removed:',
    '- _none_',
    'Notes:',
    '- _none_',
    'CHANGELOG-END',
    'FILEINFO-BEGIN',
    'FileId: contextrail-template:test:file',
    'Path: test/file.mjs',
    'Layer: tests',
    'Module/Package: test',
    'Public: false',
    'API: file-local',
    'Stability: evolving',
    'EditPolicy: careful',
    'Steward: shared',
    'DependsOn: _none_',
    'Owns: Test',
    'Boundaries: Test',
    'Invariants: Test',
    'Tests: self',
    'Risks: _none_',
    'LinkedDocs: _none_',
    'SpecRefs: _none_',
    'UsmRefs: _none_',
    'Related: _none_',
    'Generated: false',
    'Security/Privacy: none',
    'NotesForLLM: Test',
    'FILEINFO-END',
    `${HEADER_END} */`,
    '',
    'const x = 1;',
  ].join('\n');

  test('parses version, path, and purpose lines', () => {
    const parsed = parseStructuredHeaderText('test/file.mjs', validHeader);
    assert.ok(parsed);
    assert.equal(parsed.versionLine, 'version 0.1.0 | 2026-01-01');
    assert.equal(parsed.pathLine, 'path: test/file.mjs');
    assert.equal(parsed.purposeLine, 'Purpose: Test file');
  });

  test('parses changelog sections', () => {
    const parsed = parseStructuredHeaderText('test/file.mjs', validHeader);
    assert.ok(parsed.changelog.Summary);
    assert.ok(parsed.changelog.Added);
    assert.deepEqual(parsed.changelog.Summary, ['- Initial']);
  });

  test('parses fileinfo fields', () => {
    const parsed = parseStructuredHeaderText('test/file.mjs', validHeader);
    assert.equal(parsed.fileinfo.FileId, 'contextrail-template:test:file');
    assert.equal(parsed.fileinfo.Layer, 'tests');
    assert.equal(parsed.fileinfo.EditPolicy, 'careful');
  });

  test('returns null for text without a header', () => {
    const result = parseStructuredHeaderText('file.mjs', 'const x = 1;');
    assert.equal(result, null);
  });
});

// ---------------------------------------------------------------------------
// renderHeaderCore
// ---------------------------------------------------------------------------

describe('renderHeaderCore()', () => {
  test('produces text with all required markers', () => {
    const core = renderHeaderCore('scripts/checks/example.mjs');
    assert.ok(core.includes(HEADER_START));
    assert.ok(core.includes(HEADER_END));
    assert.ok(core.includes('CHANGELOG-BEGIN'));
    assert.ok(core.includes('CHANGELOG-END'));
    assert.ok(core.includes('FILEINFO-BEGIN'));
    assert.ok(core.includes('FILEINFO-END'));
  });

  test('includes all CHANGELOG_SECTIONS', () => {
    const core = renderHeaderCore('scripts/checks/example.mjs');
    for (const section of CHANGELOG_SECTIONS) {
      assert.ok(core.includes(`${section}:`), `Missing changelog section: ${section}`);
    }
  });

  test('includes all FILEINFO_FIELDS', () => {
    const core = renderHeaderCore('scripts/checks/example.mjs');
    for (const field of FILEINFO_FIELDS) {
      assert.ok(core.includes(`${field}:`), `Missing fileinfo field: ${field}`);
    }
  });

  test('uses the file path in the path line', () => {
    const core = renderHeaderCore('modules/foo/bar.mjs');
    assert.ok(core.includes('path: modules/foo/bar.mjs'));
  });

  test('overrides with provided data', () => {
    const core = renderHeaderCore('file.mjs', { purpose: 'Custom purpose' });
    assert.ok(core.includes('Purpose: Custom purpose'));
  });
});

// ---------------------------------------------------------------------------
// validateHeader
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// inferPublic
// ---------------------------------------------------------------------------

describe('inferPublic()', () => {
  test('returns "true" for docs/ paths', () => {
    assert.equal(inferPublic('docs/prd/index.md'), 'true');
  });

  test('returns "false" for non-docs paths', () => {
    assert.equal(inferPublic('scripts/checks/check.mjs'), 'false');
    assert.equal(inferPublic('modules/auth/domain.mjs'), 'false');
  });
});

// ---------------------------------------------------------------------------
// inferApi
// ---------------------------------------------------------------------------

describe('inferApi()', () => {
  test('returns Claude subagent prompt for .claude/agents/', () => {
    assert.equal(inferApi('.claude/agents/test-guardian.md'), 'Claude subagent prompt');
  });

  test('returns Claude skill for .claude/skills/ SKILL.md', () => {
    assert.equal(inferApi('.claude/skills/commit/SKILL.md'), 'Claude skill');
  });

  test('returns CLI prefix for scripts/', () => {
    const api = inferApi('scripts/checks/check.mjs');
    assert.ok(api.startsWith('CLI: node '));
  });

  test('returns Git hook for .githooks/', () => {
    assert.equal(inferApi('.githooks/pre-commit'), 'Git hook');
  });

  test('returns Documentation for .md files', () => {
    assert.equal(inferApi('docs/prd/index.md'), 'Documentation');
  });

  test('returns file-local for unknown extensions', () => {
    assert.equal(inferApi('modules/auth/domain.mjs'), 'file-local');
  });
});

// ---------------------------------------------------------------------------
// defaultPurpose
// ---------------------------------------------------------------------------

describe('defaultPurpose()', () => {
  test('generates purpose for scripts/ files', () => {
    const p = defaultPurpose('scripts/checks/check.mjs');
    assert.ok(p.includes('check'), `Expected "check" in: ${p}`);
  });

  test('generates sidecar purpose when asSidecar is true', () => {
    const p = defaultPurpose('package.json', true);
    assert.ok(p.includes('Document'), `Expected "Document" in: ${p}`);
    assert.ok(p.includes('package.json'));
  });

  test('generates purpose for docs/ files', () => {
    const p = defaultPurpose('docs/prd/index.md');
    assert.ok(p.includes('Document'));
  });

  test('generates purpose for .gitignore', () => {
    const p = defaultPurpose('.gitignore');
    assert.ok(p.includes('Git ignore'));
  });
});

// ---------------------------------------------------------------------------
// defaultHeaderData
// ---------------------------------------------------------------------------

describe('defaultHeaderData()', () => {
  test('returns an object with version, date, path, purpose, changelog, fileinfo', () => {
    const data = defaultHeaderData('scripts/checks/example.mjs');
    assert.equal(typeof data.version, 'string');
    assert.equal(typeof data.date, 'string');
    assert.equal(data.path, 'scripts/checks/example.mjs');
    assert.equal(typeof data.purpose, 'string');
    assert.ok(data.changelog);
    assert.ok(data.fileinfo);
  });

  test('populates all FILEINFO_FIELDS', () => {
    const data = defaultHeaderData('modules/foo/bar.mjs');
    for (const field of FILEINFO_FIELDS) {
      assert.ok(field in data.fileinfo, `Missing field: ${field}`);
    }
  });

  test('populates all CHANGELOG_SECTIONS', () => {
    const data = defaultHeaderData('test.mjs');
    for (const section of CHANGELOG_SECTIONS) {
      assert.ok(section in data.changelog, `Missing section: ${section}`);
    }
  });

  test('sets DependsOn to the file when asSidecar is true', () => {
    const data = defaultHeaderData('package.json', { asSidecar: true });
    assert.equal(data.fileinfo.DependsOn, 'package.json');
  });

  test('includes architecture fields with correct inferred defaults', () => {
    const data = defaultHeaderData('modules/auth/domain/user.mjs');
    assert.equal(data.fileinfo.HexLayer, 'domain');
    assert.equal(data.fileinfo.BoundedContext, 'auth');
    assert.equal(data.fileinfo.PortType, '_none_');
    assert.equal(data.fileinfo.AdapterType, '_none_');
    assert.equal(data.fileinfo.AllowedDependencies, '_none_');
    assert.equal(data.fileinfo.ForbiddenDependencies, '_none_');
    assert.equal(data.fileinfo.ExternalSystems, '_none_');
  });

  test('infers _none_ for architecture fields on non-module files', () => {
    const data = defaultHeaderData('scripts/checks/check.mjs');
    assert.equal(data.fileinfo.HexLayer, '_none_');
    assert.equal(data.fileinfo.BoundedContext, '_none_');
  });
});

// ---------------------------------------------------------------------------
// isMeaningfulFile
// ---------------------------------------------------------------------------

describe('isMeaningfulFile()', () => {
  test('returns true for supported extensions', () => {
    assert.equal(isMeaningfulFile('app.mjs'), true);
    assert.equal(isMeaningfulFile('docs/readme.md'), true);
    assert.equal(isMeaningfulFile('style.css'), true);
  });

  test('returns false for sidecar headers', () => {
    assert.equal(isMeaningfulFile('package.json.header.md'), false);
  });

  test('returns false for non-meaningful basenames', () => {
    assert.equal(isMeaningfulFile('pnpm-lock.yaml'), false);
  });

  test('returns false for files in _generated/, dist/, coverage/ (nested paths)', () => {
    assert.equal(isMeaningfulFile('docs/_generated/index.md'), false);
    assert.equal(isMeaningfulFile('modules/foo/dist/bundle.js'), false);
    assert.equal(isMeaningfulFile('modules/foo/coverage/report.html'), false);
  });

  test('returns true for .githooks/ files', () => {
    assert.equal(isMeaningfulFile('.githooks/pre-commit'), true);
  });

  test('returns true for VERSION', () => {
    assert.equal(isMeaningfulFile('VERSION'), true);
  });
});

// ---------------------------------------------------------------------------
// extractInlineHeader / hasStructuredInlineHeader
// ---------------------------------------------------------------------------

describe('extractInlineHeader()', () => {
  test('extracts a block-style header from JS', () => {
    const text = `/* ${HEADER_START}\nversion 1.0\n${HEADER_END} */\ncode`;
    const header = extractInlineHeader('file.mjs', text);
    assert.ok(header);
    assert.ok(header.includes(HEADER_START));
  });

  test('returns null for sidecar-style files', () => {
    assert.equal(extractInlineHeader('data.json', '{"key": "value"}'), null);
  });
});

describe('hasStructuredInlineHeader()', () => {
  test('returns true for file with a valid header', () => {
    const text = `/* ${HEADER_START}\nversion 1.0\n${HEADER_END} */\ncode`;
    assert.equal(hasStructuredInlineHeader('file.mjs', text), true);
  });

  test('returns false for file without a header', () => {
    assert.equal(hasStructuredInlineHeader('file.mjs', 'const x = 1;'), false);
  });
});

// ---------------------------------------------------------------------------
// renderInlineHeader
// ---------------------------------------------------------------------------

describe('renderInlineHeader()', () => {
  test('renders a block-style header for .mjs files', () => {
    const header = renderInlineHeader('test.mjs');
    assert.ok(header.startsWith(`/* ${HEADER_START}`));
    assert.ok(header.includes(`${HEADER_END} */`));
  });

  test('renders an HTML-style header for .md files', () => {
    const header = renderInlineHeader('doc.md');
    assert.ok(header.startsWith(`<!-- ${HEADER_START}`));
    assert.ok(header.includes(`${HEADER_END} -->`));
  });

  test('renders a hash-style header for .sh files', () => {
    const header = renderInlineHeader('script.sh');
    assert.ok(header.includes(`# ${HEADER_START}`));
    assert.ok(header.includes(`# ${HEADER_END}`));
  });
});

// ---------------------------------------------------------------------------
// injectInlineHeader
// ---------------------------------------------------------------------------

describe('injectInlineHeader()', () => {
  test('injects a header into headerless JS code', () => {
    const result = injectInlineHeader('file.mjs', 'const x = 1;');
    assert.ok(result.includes(HEADER_START));
    assert.ok(result.includes('const x = 1;'));
  });

  test('replaces an existing header', () => {
    const existing = `/* ${HEADER_START}\nold\n${HEADER_END} */\n\nconst x = 1;`;
    const result = injectInlineHeader('file.mjs', existing, { purpose: 'New purpose' });
    assert.ok(result.includes('New purpose'));
    assert.ok(!result.includes('\nold\n'));
    assert.ok(result.includes('const x = 1;'));
  });

  test('preserves shebang lines', () => {
    const text = '#!/usr/bin/env node\nconsole.log("hi");';
    const result = injectInlineHeader('file.mjs', text);
    assert.ok(result.startsWith('#!/usr/bin/env node\n'));
    assert.ok(result.includes(HEADER_START));
  });

  test('returns unchanged text for sidecar-style files', () => {
    const text = '{"key": "value"}';
    assert.equal(injectInlineHeader('data.json', text), text);
  });
});

// ---------------------------------------------------------------------------
// mergeExistingSemanticData
// ---------------------------------------------------------------------------

describe('mergeExistingSemanticData()', () => {
  test('returns fallback when parsed is null', () => {
    const fallback = { purpose: 'default', changelog: {}, fileinfo: {} };
    assert.deepEqual(mergeExistingSemanticData(null, fallback), fallback);
  });

  test('merges purpose from parsed into fallback', () => {
    const parsed = {
      purposeLine: 'Purpose: Custom purpose',
      changelog: {},
      fileinfo: {},
    };
    const fallback = {
      purpose: 'default',
      changelog: { Summary: ['- init'] },
      fileinfo: { Layer: 'root' },
    };
    const result = mergeExistingSemanticData(parsed, fallback);
    assert.equal(result.purpose, 'Custom purpose');
  });

  test('merges changelog sections from parsed', () => {
    const parsed = {
      purposeLine: 'Purpose: test',
      changelog: { Summary: ['- Merged summary'] },
      fileinfo: {},
    };
    const fallback = { purpose: 'default', changelog: { Summary: ['- old'] }, fileinfo: {} };
    const result = mergeExistingSemanticData(parsed, fallback);
    assert.deepEqual(result.changelog.Summary, ['- Merged summary']);
  });

  test('merges fileinfo fields from parsed', () => {
    const parsed = {
      purposeLine: 'Purpose: test',
      changelog: {},
      fileinfo: { Layer: 'tooling', Steward: 'agent' },
    };
    const fallback = {
      purpose: 'default',
      changelog: {},
      fileinfo: { Layer: 'root', Steward: 'shared' },
    };
    const result = mergeExistingSemanticData(parsed, fallback);
    assert.equal(result.fileinfo.Layer, 'tooling');
    assert.equal(result.fileinfo.Steward, 'agent');
  });
});

// ---------------------------------------------------------------------------
// Enum constants
// ---------------------------------------------------------------------------

describe('enum constants', () => {
  test('EDIT_POLICY_VALUES contains expected values', () => {
    assert.ok(EDIT_POLICY_VALUES.has('rewrite-ok'));
    assert.ok(EDIT_POLICY_VALUES.has('careful'));
    assert.ok(EDIT_POLICY_VALUES.has('generated'));
    assert.ok(!EDIT_POLICY_VALUES.has('unknown'));
  });

  test('STEWARD_VALUES contains expected values', () => {
    assert.ok(STEWARD_VALUES.has('agent'));
    assert.ok(STEWARD_VALUES.has('shared'));
    assert.ok(STEWARD_VALUES.has('human'));
    assert.ok(!STEWARD_VALUES.has('unknown'));
  });

  test('HEX_LAYER_VALUES contains expected values', () => {
    assert.ok(HEX_LAYER_VALUES.has('domain'));
    assert.ok(HEX_LAYER_VALUES.has('port'));
    assert.ok(HEX_LAYER_VALUES.has('adapter'));
    assert.ok(HEX_LAYER_VALUES.has('application'));
    assert.ok(HEX_LAYER_VALUES.has('infrastructure'));
    assert.ok(HEX_LAYER_VALUES.has('_none_'));
    assert.ok(!HEX_LAYER_VALUES.has('unknown'));
  });

  test('PORT_TYPE_VALUES contains expected values', () => {
    assert.ok(PORT_TYPE_VALUES.has('inbound'));
    assert.ok(PORT_TYPE_VALUES.has('outbound'));
    assert.ok(PORT_TYPE_VALUES.has('_none_'));
    assert.ok(!PORT_TYPE_VALUES.has('unknown'));
  });

  test('ADAPTER_TYPE_VALUES contains expected values', () => {
    assert.ok(ADAPTER_TYPE_VALUES.has('primary'));
    assert.ok(ADAPTER_TYPE_VALUES.has('secondary'));
    assert.ok(ADAPTER_TYPE_VALUES.has('_none_'));
    assert.ok(!ADAPTER_TYPE_VALUES.has('unknown'));
  });
});

// ---------------------------------------------------------------------------
// inferHexLayer
// ---------------------------------------------------------------------------

describe('inferHexLayer()', () => {
  test('detects domain layer', () => {
    assert.equal(inferHexLayer('modules/auth/domain/user.mjs'), 'domain');
  });

  test('detects port layer', () => {
    assert.equal(inferHexLayer('modules/auth/ports/user-repo.mjs'), 'port');
  });

  test('detects adapter layer', () => {
    assert.equal(inferHexLayer('modules/auth/adapters/pg-user-repo.mjs'), 'adapter');
  });

  test('detects application layer', () => {
    assert.equal(inferHexLayer('modules/auth/application/login.mjs'), 'application');
  });

  test('detects infrastructure layer from /infrastructure/', () => {
    assert.equal(inferHexLayer('modules/auth/infrastructure/config.mjs'), 'infrastructure');
  });

  test('detects infrastructure layer from /di/', () => {
    assert.equal(inferHexLayer('modules/auth/di/container.mjs'), 'infrastructure');
  });

  test('detects application for public-api at module root', () => {
    assert.equal(inferHexLayer('modules/auth/public-api.mjs'), 'application');
  });

  test('returns _none_ for files outside hex conventions', () => {
    assert.equal(inferHexLayer('scripts/checks/header-check.mjs'), '_none_');
    assert.equal(inferHexLayer('tests/unit/foo.test.mjs'), '_none_');
    assert.equal(inferHexLayer('README.md'), '_none_');
  });
});

// ---------------------------------------------------------------------------
// inferBoundedContext
// ---------------------------------------------------------------------------

describe('inferBoundedContext()', () => {
  test('extracts module name from modules/<name>/ path', () => {
    assert.equal(inferBoundedContext('modules/auth/domain/user.mjs'), 'auth');
    assert.equal(inferBoundedContext('modules/billing/ports/invoice.mjs'), 'billing');
  });

  test('returns _none_ for non-module paths', () => {
    assert.equal(inferBoundedContext('scripts/checks/header-check.mjs'), '_none_');
    assert.equal(inferBoundedContext('tests/unit/foo.test.mjs'), '_none_');
    assert.equal(inferBoundedContext('README.md'), '_none_');
  });
});

// ---------------------------------------------------------------------------
// validateHeader (original tests continue below)
// ---------------------------------------------------------------------------

describe('validateHeader()', () => {
  test('returns errors for missing header', () => {
    const { errors } = validateHeader('file.mjs', 'const x = 1;');
    assert.ok(errors.length > 0);
    assert.ok(errors[0].includes('missing structured header'));
  });

  test('returns errors for invalid version line', () => {
    // Build a minimal header with a bad version line
    const core = renderHeaderCore('test.mjs').replace(
      /version \S+ \| \d{4}-\d{2}-\d{2}/,
      'version BAD',
    );
    const text = `/* ${core} */\n`;
    const { errors } = validateHeader('test.mjs', text);
    assert.ok(errors.some((e) => e.includes('invalid version line')));
  });

  test('reports no errors for a well-formed header', () => {
    const core = renderHeaderCore('scripts/checks/test-example.mjs', {
      purpose: 'Prove something meaningful',
      fileinfo: {
        Owns: 'Meaningful ownership',
        Boundaries: 'Meaningful boundaries',
        Invariants: 'Meaningful invariants',
        NotesForLLM: 'Meaningful notes',
      },
    });
    const text = `/* ${core} */\n`;
    const { errors } = validateHeader('scripts/checks/test-example.mjs', text);
    assert.deepEqual(errors, [], `Unexpected errors: ${errors.join('; ')}`);
  });

  test('reports error for invalid HexLayer value', () => {
    const core = renderHeaderCore('test.mjs', {
      fileinfo: { HexLayer: 'bogus' },
    });
    const text = `/* ${core} */\n`;
    const { errors } = validateHeader('test.mjs', text);
    assert.ok(errors.some((e) => e.includes('invalid HexLayer')));
  });

  test('reports error for invalid PortType value', () => {
    const core = renderHeaderCore('test.mjs', {
      fileinfo: { PortType: 'bogus' },
    });
    const text = `/* ${core} */\n`;
    const { errors } = validateHeader('test.mjs', text);
    assert.ok(errors.some((e) => e.includes('invalid PortType')));
  });

  test('reports error for invalid AdapterType value', () => {
    const core = renderHeaderCore('test.mjs', {
      fileinfo: { AdapterType: 'bogus' },
    });
    const text = `/* ${core} */\n`;
    const { errors } = validateHeader('test.mjs', text);
    assert.ok(errors.some((e) => e.includes('invalid AdapterType')));
  });
});

// ---------------------------------------------------------------------------
// Slim header — renderSlimHeaderCore
// ---------------------------------------------------------------------------

describe('renderSlimHeaderCore()', () => {
  test('produces text with @HEADER marker', () => {
    const core = renderSlimHeaderCore('modules/task/domain/task-lifecycle.mjs');
    assert.ok(core.startsWith(SLIM_HEADER_MARKER));
  });

  test('includes all 7 fields', () => {
    const core = renderSlimHeaderCore('modules/task/domain/task-lifecycle.mjs');
    assert.ok(core.includes('@version'));
    assert.ok(core.includes('@purpose'));
    assert.ok(core.includes('@sidecar'));
    assert.ok(core.includes('@layer'));
    assert.ok(core.includes('@public'));
    assert.ok(core.includes('@edit'));
  });

  test('infers hex and bounded context for module files', () => {
    const core = renderSlimHeaderCore('modules/auth/domain/user.mjs');
    assert.ok(core.includes('@hex domain'));
    assert.ok(core.includes('@ctx auth'));
  });

  test('uses provided overrides', () => {
    const core = renderSlimHeaderCore('file.mjs', {
      purpose: 'Custom purpose',
      edit: 'rewrite-ok',
    });
    assert.ok(core.includes('@purpose Custom purpose'));
    assert.ok(core.includes('@edit rewrite-ok'));
  });

  test('sidecar field is basename only', () => {
    const core = renderSlimHeaderCore('modules/auth/domain/user.mjs');
    assert.ok(core.includes('@sidecar user.mjs.header.md'));
    assert.ok(!core.includes('modules/auth/domain/user.mjs.header.md'));
  });
});

// ---------------------------------------------------------------------------
// Slim header — wrapSlimHeader
// ---------------------------------------------------------------------------

describe('wrapSlimHeader()', () => {
  const core = `${SLIM_HEADER_MARKER}\n@version 0.4.0 | 2026-04-06\n@purpose Test\n@sidecar test.mjs.header.md\n@layer root | @hex _none_ | @ctx _none_\n@public false\n@edit careful`;

  test('wraps in block comment for JS', () => {
    const result = wrapSlimHeader(core, 'block');
    assert.ok(result.startsWith(`/* ${SLIM_HEADER_MARKER}`));
    assert.ok(result.includes(' */'));
  });

  test('wraps in HTML comment for markdown', () => {
    const result = wrapSlimHeader(core, 'html');
    assert.ok(result.startsWith(`<!-- ${SLIM_HEADER_MARKER}`));
    assert.ok(result.includes('-->'));
  });

  test('prefixes each line with # for shell', () => {
    const result = wrapSlimHeader(core, 'hash');
    const lines = result.trimEnd().split('\n');
    for (const line of lines) {
      assert.ok(line.startsWith('# '), `Line must start with "# ": ${line}`);
    }
  });

  test('returns empty string for sidecar style', () => {
    assert.equal(wrapSlimHeader(core, 'sidecar'), '');
  });
});

// ---------------------------------------------------------------------------
// Slim header — renderSlimInlineHeader
// ---------------------------------------------------------------------------

describe('renderSlimInlineHeader()', () => {
  test('renders block-style for .mjs files', () => {
    const header = renderSlimInlineHeader('test.mjs');
    assert.ok(header.startsWith(`/* ${SLIM_HEADER_MARKER}`));
  });

  test('renders HTML-style for .md files', () => {
    const header = renderSlimInlineHeader('doc.md');
    assert.ok(header.startsWith(`<!-- ${SLIM_HEADER_MARKER}`));
  });

  test('renders hash-style for .sh files', () => {
    const header = renderSlimInlineHeader('script.sh');
    assert.ok(header.includes(`# ${SLIM_HEADER_MARKER}`));
  });

  test('returns empty for sidecar-style files', () => {
    assert.equal(renderSlimInlineHeader('data.json'), '');
  });
});

// ---------------------------------------------------------------------------
// Slim header — parseSlimHeader
// ---------------------------------------------------------------------------

describe('parseSlimHeader()', () => {
  test('parses a block-style slim header', () => {
    const text = [
      `/* ${SLIM_HEADER_MARKER}`,
      ' * @version 0.4.0 | 2026-04-06',
      ' * @purpose Task lifecycle logic.',
      ' * @sidecar task-lifecycle.mjs.header.md',
      ' * @layer module | @hex domain | @ctx task',
      ' * @public false',
      ' * @edit careful',
      ' */',
      '',
      'const x = 1;',
    ].join('\n');

    const parsed = parseSlimHeader('file.mjs', text);
    assert.ok(parsed);
    assert.equal(parsed.version, '0.4.0 | 2026-04-06');
    assert.equal(parsed.purpose, 'Task lifecycle logic.');
    assert.equal(parsed.sidecar, 'task-lifecycle.mjs.header.md');
    assert.equal(parsed.layer, 'module');
    assert.equal(parsed.hex, 'domain');
    assert.equal(parsed.ctx, 'task');
    assert.equal(parsed.public, 'false');
    assert.equal(parsed.edit, 'careful');
  });

  test('parses an HTML-style slim header', () => {
    const text = [
      `<!-- ${SLIM_HEADER_MARKER}`,
      '@version 0.4.0 | 2026-04-06',
      '@purpose Doc file.',
      '@sidecar readme.md.header.md',
      '@layer docs | @hex _none_ | @ctx _none_',
      '@public true',
      '@edit rewrite-ok',
      '-->',
      '',
      '# Title',
    ].join('\n');

    const parsed = parseSlimHeader('readme.md', text);
    assert.ok(parsed);
    assert.equal(parsed.layer, 'docs');
    assert.equal(parsed.public, 'true');
  });

  test('returns null for text without a slim header', () => {
    assert.equal(parseSlimHeader('file.mjs', 'const x = 1;'), null);
  });

  test('returns null for sidecar-style files', () => {
    assert.equal(parseSlimHeader('data.json', '{}'), null);
  });

  test('does not match old @HEADER-START format', () => {
    const text = `\n`;
    const parsed = parseSlimHeader('file.mjs', text);
    assert.equal(parsed, null);
  });
});

// ---------------------------------------------------------------------------
// Slim header — hasSlimHeader
// ---------------------------------------------------------------------------

describe('hasSlimHeader()', () => {
  test('returns true for file with slim header', () => {
    const text = `/* ${SLIM_HEADER_MARKER}\n * @version 0.4.0 | 2026-04-06\n * @purpose Test\n * @sidecar t.mjs.header.md\n * @layer root | @hex _none_ | @ctx _none_\n * @public false\n * @edit careful\n */\n`;
    assert.equal(hasSlimHeader('file.mjs', text), true);
  });

  test('returns false for file without slim header', () => {
    assert.equal(hasSlimHeader('file.mjs', 'const x = 1;'), false);
  });

  test('returns false for file with only old header', () => {
    const text = `/* ${HEADER_START}\nversion 0.3.0\n${HEADER_END} */\n`;
    assert.equal(hasSlimHeader('file.mjs', text), false);
  });
});

// ---------------------------------------------------------------------------
// Slim header — removeSlimHeaderBlocks
// ---------------------------------------------------------------------------

describe('removeSlimHeaderBlocks()', () => {
  test('removes a block-style slim header', () => {
    const text = `/* ${SLIM_HEADER_MARKER}\n * @version 0.4.0 | 2026-04-06\n * @purpose Test\n * @sidecar t.mjs.header.md\n * @layer root | @hex _none_ | @ctx _none_\n * @public false\n * @edit careful\n */\n\nconst x = 1;`;
    const result = removeSlimHeaderBlocks('file.mjs', text);
    assert.ok(!result.includes(SLIM_HEADER_MARKER));
    assert.ok(result.includes('const x = 1'));
  });

  test('does not remove old @HEADER-START headers', () => {
    const text = `/* ${HEADER_START}\nversion 0.3.0\n${HEADER_END} */\ncode`;
    const result = removeSlimHeaderBlocks('file.mjs', text);
    assert.ok(result.includes(HEADER_START));
  });
});

// ---------------------------------------------------------------------------
// Slim header — injectSlimHeader
// ---------------------------------------------------------------------------

describe('injectSlimHeader()', () => {
  test('injects a slim header into headerless JS code', () => {
    const result = injectSlimHeader('file.mjs', 'const x = 1;');
    assert.ok(result.includes(SLIM_HEADER_MARKER));
    assert.ok(!result.includes(HEADER_START));
    assert.ok(result.includes('const x = 1;'));
  });

  test('replaces an old heavy header with slim', () => {
    const oldHeader = renderInlineHeader('file.mjs', { purpose: 'Old purpose' });
    const text = `${oldHeader}const x = 1;`;
    const result = injectSlimHeader('file.mjs', text, { purpose: 'New purpose' });
    assert.ok(result.includes(SLIM_HEADER_MARKER));
    assert.ok(!result.includes(HEADER_START));
    assert.ok(result.includes('@purpose New purpose'));
    assert.ok(result.includes('const x = 1;'));
  });

  test('preserves shebang lines', () => {
    const text = '#!/usr/bin/env node\nconsole.log("hi");';
    const result = injectSlimHeader('file.mjs', text);
    assert.ok(result.startsWith('#!/usr/bin/env node\n'));
    assert.ok(result.includes(SLIM_HEADER_MARKER));
  });

  test('returns unchanged text for sidecar-style files', () => {
    const text = '{"key": "value"}';
    assert.equal(injectSlimHeader('data.json', text), text);
  });
});

// ---------------------------------------------------------------------------
// Sparse sidecar — renderSparseSidecar
// ---------------------------------------------------------------------------

describe('renderSparseSidecar()', () => {
  test('puts all fields in YAML frontmatter', () => {
    const result = renderSparseSidecar('modules/auth/domain/user.mjs', {
      fileinfo: {
        FileId: 'contextrail-template:modules:auth:domain:user',
        'Module/Package': 'modules/auth',
        Stability: 'evolving',
        Steward: 'shared',
        HexLayer: 'domain',
        BoundedContext: 'auth',
        Owns: 'User domain entity.',
        Boundaries: 'Pure domain logic.',
        Invariants: 'Must be framework-free.',
        NotesForLLM: 'Test in isolation.',
        PortType: '_none_',
        AdapterType: '_none_',
        Generated: 'false',
      },
    });
    // Machine fields in YAML
    assert.ok(result.includes('fileId: contextrail-template:modules:auth:domain:user'));
    assert.ok(result.includes('hexLayer: domain'));
    // Narrative fields now in YAML frontmatter as camelCase keys
    assert.ok(result.includes('owns: User domain entity.'));
    assert.ok(result.includes('boundaries: Pure domain logic.'));
    assert.ok(result.includes('invariants: Must be framework-free.'));
    assert.ok(result.includes('notesForLLM: Test in isolation.'));
    // _none_ and false fields should be excluded
    assert.ok(!result.includes('portType'));
    assert.ok(!result.includes('adapterType'));
    assert.ok(!result.includes('generated: false'));
    // Body is just the heading, no narrative fields
    const afterFrontmatter = result.split('---\n').pop();
    assert.ok(!afterFrontmatter.includes('Owns:'));
    assert.ok(!afterFrontmatter.includes('Boundaries:'));
  });

  test('omits _none_ narrative fields', () => {
    const result = renderSparseSidecar('test.mjs', {
      fileinfo: {
        Owns: '_none_',
        Boundaries: 'Real boundary.',
        Invariants: '_none_',
        NotesForLLM: '_none_',
        Tests: '_none_',
        Risks: '_none_',
      },
    });
    assert.ok(result.includes('boundaries: Real boundary.'));
    assert.ok(!result.includes('owns:'));
    assert.ok(!result.includes('invariants:'));
  });

  test('includes file basename as markdown heading', () => {
    const result = renderSparseSidecar('modules/auth/domain/user.mjs', { fileinfo: {} });
    assert.ok(result.includes('# user.mjs'));
  });

  test('formats DependsOn as yaml array', () => {
    const result = renderSparseSidecar('file.mjs', {
      fileinfo: {
        DependsOn: 'node:path; node:fs',
      },
    });
    assert.ok(result.includes('dependsOn:'));
    assert.ok(result.includes('  - node:path'));
    assert.ok(result.includes('  - node:fs'));
  });

  test('formats semicolon-separated narrative lists as yaml arrays', () => {
    const result = renderSparseSidecar('file.mjs', {
      fileinfo: {
        Tests: 'tests/unit/foo.test.mjs; tests/contract/bar.test.mjs',
        LinkedDocs: 'docs/prd/feature.md',
        Related: 'modules/auth/public-api.mjs; modules/cache/public-api.mjs',
      },
    });
    // Multi-item → array
    assert.ok(result.includes('tests:'));
    assert.ok(result.includes('  - tests/unit/foo.test.mjs'));
    assert.ok(result.includes('  - tests/contract/bar.test.mjs'));
    // Single-item → inline
    assert.ok(result.includes('linkedDocs: docs/prd/feature.md'));
    // Multi-item → array
    assert.ok(result.includes('related:'));
    assert.ok(result.includes('  - modules/auth/public-api.mjs'));
  });

  test('quotes values containing YAML-special characters', () => {
    const result = renderSparseSidecar('file.mjs', {
      fileinfo: {
        Summary: 'CLI: node scripts/checks/header-check.mjs [--changed]',
      },
    });
    // Contains `: ` so it should be quoted
    assert.ok(result.includes('summary: "CLI: node scripts/checks/header-check.mjs [--changed]"'));
  });

  test('includes changelog when non-empty', () => {
    const result = renderSparseSidecar('file.mjs', {
      fileinfo: {},
      changelog: {
        Summary: ['- Added new feature'],
        Added: ['- New thing'],
        Changed: ['- _none_'],
        Fixed: ['- _none_'],
        Removed: ['- _none_'],
        Notes: ['- _none_'],
      },
    });
    // Changelog is no longer emitted in sidecars (single source: CHANGELOG.md)
    assert.ok(!result.includes('changelog:'));
    assert.ok(!result.includes('summary:'));
    assert.ok(!result.includes('Added new feature'));
  });
});

// ---------------------------------------------------------------------------
// commentStyle() — extension-first check for comment-unsafe formats (TPL-277)
// ---------------------------------------------------------------------------

describe('commentStyle() — JSON/SVG/binary get sidecar regardless of path', () => {
  test('returns sidecar for .githooks/policy.json (JSON inside hook dir)', () => {
    assert.equal(commentStyle('.githooks/policy.json'), 'sidecar');
  });

  test('returns sidecar for .githooks/.fingerprints.json', () => {
    assert.equal(commentStyle('.githooks/.fingerprints.json'), 'sidecar');
  });

  test('returns sidecar for .githooks/icon.svg', () => {
    assert.equal(commentStyle('.githooks/icon.svg'), 'sidecar');
  });

  test('returns hash for .githooks/pre-commit (no extension, shebang)', () => {
    assert.equal(commentStyle('.githooks/pre-commit', '#!/usr/bin/env node\n'), 'hash');
  });

  test('returns hash for .githooks/pre-push (no extension, shebang)', () => {
    assert.equal(commentStyle('.githooks/pre-push', '#!/bin/sh\n'), 'hash');
  });

  test('returns sidecar for top-level package.json', () => {
    assert.equal(commentStyle('package.json'), 'sidecar');
  });

  test('returns sidecar for .svg at any path', () => {
    assert.equal(commentStyle('apps/starter/logo.svg'), 'sidecar');
  });
});

// ---------------------------------------------------------------------------
// isHeaderExempt() — operational claim files are short-lived coordination
// artefacts; tracked example claims are documentation. See TPL-204.
// ---------------------------------------------------------------------------

describe('isHeaderExempt() — operational claims', () => {
  test('exempts operational claims with random hex IDs', () => {
    assert.equal(isHeaderExempt('.claims/clm-a85b4e.json'), true);
    assert.equal(isHeaderExempt('.claims/clm-deadbeef.json'), true);
    assert.equal(isHeaderExempt('.claims/clm-31ae7d.json'), true);
  });

  test('does NOT exempt tracked example claims (clm-ex prefix)', () => {
    assert.equal(isHeaderExempt('.claims/clm-ex0001.json'), false);
    assert.equal(isHeaderExempt('.claims/clm-ex0002.json'), false);
    assert.equal(isHeaderExempt('.claims/clm-example-foo.json'), false);
  });

  test('handles backslash-separated paths (Windows) by normalising', () => {
    assert.equal(isHeaderExempt('.claims\\clm-a85b4e.json'), true);
    assert.equal(isHeaderExempt('.claims\\clm-ex0001.json'), false);
  });

  test('exempts teardown-stale-marker files produced by coa-worktree', () => {
    assert.equal(isHeaderExempt('.claims/teardown-stale-marker-e3b0c44298fc1c14.json'), true);
    assert.equal(isHeaderExempt('.claims/teardown-stale-marker-abc123.json'), true);
  });

  test('does NOT exempt other .claims/ files (config.json, README.md)', () => {
    assert.equal(isHeaderExempt('.claims/config.json'), false);
    assert.equal(isHeaderExempt('.claims/README.md'), false);
  });

  test('does NOT exempt clm-* files outside .claims/', () => {
    assert.equal(isHeaderExempt('docs/clm-a85b4e.json'), false);
    assert.equal(isHeaderExempt('clm-a85b4e.json'), false);
  });

  test('preserves existing exemption rules', () => {
    assert.equal(isHeaderExempt('CHANGELOG.md'), true);
    assert.equal(isHeaderExempt('AGENTS.md'), true);
    assert.equal(isHeaderExempt('.agents/skills/foo.md'), true);
    assert.equal(isHeaderExempt('docs/something.help.md'), true);
    assert.equal(isHeaderExempt('docs/random.md'), false);
  });
});
