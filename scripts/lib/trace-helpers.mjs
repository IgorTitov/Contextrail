/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Work-item and BDD trace parsing utilities shared across repository scripts.
 * @sidecar trace-helpers.mjs.header.md
 * @layer tooling | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { walk, readText } from './fs-helpers.mjs';

export function parseBddRef(ref) {
  const raw = String(ref || '').trim();
  if (!raw) return { file: '', scenario: '' };
  const [filePart, anchorPart = ''] = raw.split('#');
  const file = filePart.trim();
  const anchor = anchorPart.trim();
  if (!anchor) return { file, scenario: '' };
  const scenario = anchor
    .replace(/^Scenario Outline:\s*/i, '')
    .replace(/^Scenario:\s*/i, '')
    .trim();
  return { file, scenario };
}

function stripFenceIndent(line) {
  return String(line).replace(/\t/g, '  ');
}

function parseTraceWorkItemBlock(blockText) {
  const item = {
    id: '',
    type: '',
    title: '',
    parent_ref: '',
    status: '',
    module_ref: '',
    depends_on: [],
    spec_refs: [],
    test_refs: [],
    bdd_refs: [],
    acceptance: [],
  };

  const lines = String(blockText).split(/\r?\n/).map(stripFenceIndent);
  let currentArrayKey = null;
  let inWorkItem = false;

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+$/, '');
    if (!line.trim()) continue;
    if (!inWorkItem) {
      if (/^work_item:\s*$/.test(line.trim())) inWorkItem = true;
      continue;
    }

    const arrayItem = line.match(/^\s*-\s*(.+)$/);
    if (arrayItem && currentArrayKey) {
      item[currentArrayKey].push(arrayItem[1].trim());
      continue;
    }

    const keyValue = line.match(/^\s*([a-z_]+):\s*(.*)$/i);
    if (!keyValue) continue;
    const [, key, value] = keyValue;
    if (!(key in item)) continue;

    if (Array.isArray(item[key])) {
      currentArrayKey = value ? null : key;
      if (value) item[key].push(value.trim());
      continue;
    }

    currentArrayKey = null;
    item[key] = value.trim();
  }

  return item;
}

export async function collectWorkItems() {
  const candidateRoots = ['docs/backlog', 'docs/prd', 'docs/usm'];
  const files = [];
  for (const root of candidateRoots) {
    files.push(
      ...(await walk(root)).filter(
        (file) =>
          file.endsWith('.md') &&
          !file.includes('/_generated/') &&
          !file.includes('/templates/') &&
          !file.endsWith('/README.md'),
      ),
    );
  }

  const items = [];
  for (const file of [...new Set(files)].sort()) {
    const text = await readText(file).catch(() => '');
    const matches = text.matchAll(/```trace-yaml\r?\n([\s\S]*?)```/g);
    for (const match of matches) {
      const parsed = parseTraceWorkItemBlock(match[1]);
      if (!parsed.id) continue;
      items.push({
        ...parsed,
        source_file: file,
        depends_on: parsed.depends_on || [],
        spec_refs: parsed.spec_refs || [],
        test_refs: parsed.test_refs || [],
        bdd_refs: parsed.bdd_refs || [],
        acceptance: parsed.acceptance || [],
      });
    }
  }

  return items;
}
