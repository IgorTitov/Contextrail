/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Validate that product-data persona-economics files are well-formed and reference existing personas.
 * @sidecar product-data-check.mjs.header.md
 * @layer tooling | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { access, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs, result } from './_shared.mjs';
import { ValidationError } from '../lib/errors.mjs';

const ROOT = process.cwd();
const args = parseArgs();
const wantJson = args.has('--json');
const errors = [];

function abs(relPath) {
  return path.join(ROOT, relPath);
}

async function exists(relPath) {
  try {
    await access(abs(relPath));
    return true;
  } catch {
    return false;
  }
}

async function readText(relPath) {
  return readFile(abs(relPath), 'utf8');
}

function fail(message) {
  errors.push(new ValidationError(message));
}

const REQUIRED_ECONOMICS_FIELDS = [
  'id',
  'personaRef',
  'estimatedSegmentSize',
  'currentCustomers',
  'avgCheck',
  'ltv',
  'cac',
  'subscriptionMix',
  'status',
  'notes',
];

const TEMPLATE_FILES = new Set(['README.md', 'economics-template.md']);

function extractPersonaEconomicsJson(text) {
  const re = /```persona-economics\s*\n([\s\S]*?)```/;
  const match = text.match(re);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return undefined;
  }
}

async function collectPersonaIds() {
  const personasDir = abs('docs/usm/personas');
  const ids = new Set();
  try {
    const entries = await readdir(personasDir);
    for (const entry of entries) {
      if (
        !entry.endsWith('.md') ||
        entry === 'README.md' ||
        entry === 'template.md' ||
        entry === 'persona-template.md'
      ) {
        continue;
      }
      const text = await readFile(path.join(personasDir, entry), 'utf8');
      const cpMatch = text.match(/```cockpit-persona\s*\n([\s\S]*?)```/);
      if (cpMatch) {
        try {
          const cp = JSON.parse(cpMatch[1]);
          if (cp.id) ids.add(cp.id);
        } catch {
          /* skip malformed */
        }
      }
      // Also add key-based id as fallback
      const key = entry.replace(/\.md$/, '');
      ids.add(`persona-${key}`);
    }
  } catch {
    /* dir may not exist yet */
  }
  return ids;
}

async function main() {
  // Check product-data area exists
  const hasProductData = await exists('docs/product-data');
  if (!hasProductData) {
    // Product-data is optional — if the area doesn't exist, pass silently
    const output = result('product-data-check', true, [], [], {
      checked: [],
      note: 'docs/product-data/ does not exist; skipping',
    });
    if (wantJson) console.log(JSON.stringify(output, null, 2));
    else console.log('product-data-check: OK (no product-data area)');
    process.exit(0);
  }

  // Check README exists
  if (!(await exists('docs/product-data/README.md'))) {
    fail('docs/product-data/ exists but is missing README.md');
  }

  // Check persona-economics area
  const hasEconomics = await exists('docs/product-data/persona-economics');
  if (!hasEconomics) {
    // Persona economics subfolder is optional
    const output = result('product-data-check', errors.length === 0, errors, [], {
      checked: ['docs/product-data/README.md'],
    });
    if (wantJson) {
      console.log(JSON.stringify(output, null, 2));
      process.exit(output.ok ? 0 : 1);
    }
    if (!output.ok) {
      console.error(
        'product-data-check failed:\n' + errors.map((e) => `- ${e.message ?? e}`).join('\n'),
      );
      process.exit(1);
    }
    console.log('product-data-check: OK');
    process.exit(0);
  }

  // Check economics template exists
  if (!(await exists('docs/product-data/persona-economics/economics-template.md'))) {
    fail('docs/product-data/persona-economics/ is missing economics-template.md');
  }

  if (!(await exists('docs/product-data/persona-economics/README.md'))) {
    fail('docs/product-data/persona-economics/ is missing README.md');
  }

  // Validate each economics file
  const economicsDir = abs('docs/product-data/persona-economics');
  const entries = await readdir(economicsDir);
  const personaIds = await collectPersonaIds();
  const checked = [
    'docs/product-data/README.md',
    'docs/product-data/persona-economics/README.md',
    'docs/product-data/persona-economics/economics-template.md',
  ];
  let realEconomicsCount = 0;

  for (const entry of entries) {
    if (!entry.endsWith('.md') || TEMPLATE_FILES.has(entry) || entry.endsWith('.header.md')) {
      continue;
    }
    const relPath = `docs/product-data/persona-economics/${entry}`;
    checked.push(relPath);
    const text = await readText(relPath);

    const data = extractPersonaEconomicsJson(text);
    if (data === null) {
      fail(`${relPath}: missing persona-economics JSON block`);
      continue;
    }
    if (data === undefined) {
      fail(`${relPath}: persona-economics JSON block is malformed`);
      continue;
    }

    realEconomicsCount++;

    for (const field of REQUIRED_ECONOMICS_FIELDS) {
      if (data[field] === undefined || data[field] === null) {
        fail(`${relPath}: persona-economics block is missing required field: ${field}`);
      }
    }

    if (data.personaRef && !personaIds.has(data.personaRef)) {
      fail(`${relPath}: personaRef "${data.personaRef}" does not match any known persona id`);
    }

    if (data.status && !['provisional', 'validated'].includes(data.status)) {
      fail(`${relPath}: status must be "provisional" or "validated", got "${data.status}"`);
    }

    if (data.subscriptionMix && Array.isArray(data.subscriptionMix)) {
      for (const plan of data.subscriptionMix) {
        if (!plan.planId || !plan.label || plan.share === undefined) {
          fail(`${relPath}: each subscriptionMix entry must have planId, label, and share`);
          break;
        }
      }
    }
  }

  const output = result('product-data-check', errors.length === 0, errors, [], {
    checked,
    realEconomicsCount,
  });

  if (wantJson) {
    console.log(JSON.stringify(output, null, 2));
    process.exit(output.ok ? 0 : 1);
  }

  if (!output.ok) {
    console.error(
      'product-data-check failed:\n' + errors.map((e) => `- ${e.message ?? e}`).join('\n'),
    );
    process.exit(1);
  }

  console.log('product-data-check: OK');
}

main().catch((error) => {
  const output = result('product-data-check', false, [
    error instanceof Error ? error.message : String(error),
  ]);
  if (wantJson) console.log(JSON.stringify(output, null, 2));
  else console.error(output.errors[0]);
  process.exit(1);
});
