/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Scaffold a new hex module skeleton (domain, ports, adapters, public-api, manifest, README, sidecars) so adopters can add a bounded context with one command instead of copying example-greeter by hand.
 * @sidecar create-module.mjs.header.md
 * @layer tooling | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const TODAY = new Date().toISOString().slice(0, 10);
const VERSION = '0.4.0';

// Build the literal "@HEADER" marker via concatenation so that header-fix
// (which scans for @HEADER blocks in source files) does not strip the slim
// headers out of the generated-file templates below. The marker only needs
// to materialize in the generator's *output*, not in this source file.
const AT = '@';
const HEADER_TAG = `${AT}HEADER`;

/**
 * Build a slim ADR-0009 inline header block for a generated .mjs file.
 *
 * @param {{ purpose: string, sidecar: string, layer: string, hex?: string, ctx?: string, isPublic?: boolean, edit?: string }} opts
 * @returns {string}
 */
function slimJsHeader({
  purpose,
  sidecar,
  layer,
  hex = '_none_',
  ctx = '_none_',
  isPublic = false,
  edit = 'careful',
}) {
  return (
    `/* ${HEADER_TAG}\n` +
    ` * ${AT}version ${VERSION} | ${TODAY}\n` +
    ` * ${AT}purpose ${purpose}\n` +
    ` * ${AT}sidecar ${sidecar}\n` +
    ` * ${AT}layer ${layer} | ${AT}hex ${hex} | ${AT}ctx ${ctx}\n` +
    ` * ${AT}public ${isPublic}\n` +
    ` * ${AT}edit ${edit}\n` +
    ` */\n`
  );
}

/**
 * Build a slim ADR-0009 inline header block for a generated README.md file.
 *
 * @param {{ purpose: string, sidecar: string, layer: string, hex?: string, ctx?: string, isPublic?: boolean, edit?: string }} opts
 * @returns {string}
 */
function slimMdHeader({
  purpose,
  sidecar,
  layer,
  hex = '_none_',
  ctx = '_none_',
  isPublic = false,
  edit = 'careful',
}) {
  return (
    `<!-- ${HEADER_TAG}\n` +
    `${AT}version ${VERSION} | ${TODAY}\n` +
    `${AT}purpose ${purpose}\n` +
    `${AT}sidecar ${sidecar}\n` +
    `${AT}layer ${layer} | ${AT}hex ${hex} | ${AT}ctx ${ctx}\n` +
    `${AT}public ${isPublic}\n` +
    `${AT}edit ${edit} -->\n`
  );
}

/**
 * Validate a module name. Pure helper, exported for tests.
 *
 * @param {string} name
 * @returns {{ ok: boolean, error?: string }}
 */
export function validateModuleName(name) {
  if (!name || typeof name !== 'string') {
    return { ok: false, error: 'module name is required' };
  }
  if (!/^[a-z][a-z0-9-]*[a-z0-9]$/.test(name)) {
    return {
      ok: false,
      error:
        'module name must be kebab-case (lowercase letters, digits, and hyphens; must start with a letter)',
    };
  }
  if (name.length < 2 || name.length > 40) {
    return { ok: false, error: 'module name must be between 2 and 40 characters' };
  }
  return { ok: true };
}

/**
 * Convert a kebab-case module name to PascalCase (for port type names).
 *
 * @param {string} name
 * @returns {string}
 */
export function toPascalCase(name) {
  return name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

/**
 * Convert a kebab-case module name to camelCase (for default adapter export name).
 *
 * @param {string} name
 * @returns {string}
 */
export function toCamelCase(name) {
  const pascal = toPascalCase(name);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

/**
 * Build the file map for a new module. Pure function, exported for tests.
 * Returns a map from relative file path → file content. The caller writes
 * them to disk.
 *
 * @param {string} name
 * @param {string} description
 * @returns {Record<string, string>}
 */
export function buildModuleFiles(name, description) {
  const Pascal = toPascalCase(name);
  const camel = toCamelCase(name);
  const portTypeName = `${Pascal}Port`;
  const adapterExportName = `default${Pascal}Adapter`;
  const desc = description || `A bounded ${name} hex module.`;

  const files = {};

  // ── public-api.mjs ─────────────────────────────────────────────────────────
  files[`modules/${name}/public-api.mjs`] =
    slimJsHeader({
      purpose: `Single cross-module entry point for the ${name} module.`,
      sidecar: 'public-api.mjs.header.md',
      layer: 'public-api',
      ctx: name,
      isPublic: true,
    }) +
    `\nexport { ${camel} } from './domain/${name}.mjs';
export { assert${portTypeName} } from './ports/${name}-port.mjs';
export { ${adapterExportName} } from './adapters/default-adapter.mjs';

// Messages
export { t, setLocale, getLocale, registerLocale, resetLocale } from './messages.mjs';
`;

  files[`modules/${name}/public-api.mjs.header.md`] = sidecar({
    name,
    file: 'public-api.mjs',
    layer: 'public-api',
    summary: `Single cross-module entry point for the ${name} module.`,
    notesForLLM: `Only this file may be imported from other modules. Do not deep-import into domain/, ports/, or adapters/.`,
  });

  // ── domain/<name>.mjs ──────────────────────────────────────────────────────
  files[`modules/${name}/domain/${name}.mjs`] =
    slimJsHeader({
      purpose: `Pure domain logic for the ${name} module.`,
      sidecar: `${name}.mjs.header.md`,
      layer: 'domain',
      ctx: name,
    }) +
    `\n/**
 * Pure domain entry point for ${name}. Replace this stub with the real
 * use-case logic. Domain code must not import from adapters or
 * infrastructure.
 *
 * @param {object} input
 * @returns {object}
 */
export function ${camel}(input) {
  return { ok: true, input };
}
`;

  files[`modules/${name}/domain/${name}.mjs.header.md`] = sidecar({
    name,
    file: `${name}.mjs`,
    layer: 'domain',
    summary: `Pure domain logic for the ${name} module.`,
    notesForLLM: `Domain stays framework-free. Do not import from adapters/ or infrastructure.`,
  });

  files[`modules/${name}/domain/README.md`] = readmeFile(
    `modules/${name}/domain/`,
    `Pure domain logic for the ${name} module. Framework-free, no infrastructure imports.`,
  );
  files[`modules/${name}/domain/README.md.header.md`] = readmeSidecar(name, 'domain');

  // ── ports/<name>-port.mjs ──────────────────────────────────────────────────
  files[`modules/${name}/ports/${name}-port.mjs`] =
    slimJsHeader({
      purpose: `Port contract that adapters must satisfy for the ${name} module.`,
      sidecar: `${name}-port.mjs.header.md`,
      layer: 'port',
      ctx: name,
    }) +
    `\nimport { t } from '../messages.mjs';

/**
 * Port contract — any ${name} adapter must satisfy this shape.
 *
 * @typedef {object} ${portTypeName}
 * @property {() => Promise<unknown> | unknown} run  Execute the adapter's primary operation.
 */

/**
 * Validate that an adapter conforms to the ${portTypeName} contract.
 *
 * @param {unknown} adapter
 * @throws {TypeError} If the adapter does not satisfy the port.
 */
export function assert${portTypeName}(adapter) {
  if (!adapter || typeof adapter.run !== 'function') {
    throw new TypeError(t('${name}.port.missing_run'));
  }
}
`;

  files[`modules/${name}/ports/${name}-port.mjs.header.md`] = sidecar({
    name,
    file: `${name}-port.mjs`,
    layer: 'port',
    summary: `Port contract that adapters must satisfy for the ${name} module.`,
    notesForLLM: `Ports define what the domain needs, not how it is provided. Add typedef shapes here when you grow the contract.`,
  });

  files[`modules/${name}/ports/README.md`] = readmeFile(
    `modules/${name}/ports/`,
    `Port contracts for the ${name} module. These define what adapters must satisfy.`,
  );
  files[`modules/${name}/ports/README.md.header.md`] = readmeSidecar(name, 'ports');

  // ── adapters/default-adapter.mjs ───────────────────────────────────────────
  files[`modules/${name}/adapters/default-adapter.mjs`] =
    slimJsHeader({
      purpose: `Default adapter for the ${name} module.`,
      sidecar: 'default-adapter.mjs.header.md',
      layer: 'adapter',
      ctx: name,
    }) +
    `\n/**
 * Default ${name} adapter — placeholder implementation.
 *
 * @type {import('../ports/${name}-port.mjs').${portTypeName}}
 */
export const ${adapterExportName} = {
  run() {
    return { ok: true };
  },
};
`;

  files[`modules/${name}/adapters/default-adapter.mjs.header.md`] = sidecar({
    name,
    file: 'default-adapter.mjs',
    layer: 'adapter',
    summary: `Default adapter for the ${name} module.`,
    notesForLLM: `Replace the placeholder with a real implementation. Adapters isolate infrastructure; the domain must not import this file.`,
  });

  files[`modules/${name}/adapters/README.md`] = readmeFile(
    `modules/${name}/adapters/`,
    `Concrete adapters for the ${name} module that implement the port contracts.`,
  );
  files[`modules/${name}/adapters/README.md.header.md`] = readmeSidecar(name, 'adapters');

  // ── messages.mjs ───────────────────────────────────────────────────────────
  files[`modules/${name}/messages.mjs`] =
    slimJsHeader({
      purpose: `i18n message registry for the ${name} module.`,
      sidecar: 'messages.mjs.header.md',
      layer: 'messages',
      ctx: name,
    }) +
    `\n/**
 * Bounded i18n messages for the ${name} module.
 * All user-facing copy from ${name} flows through this layer.
 */

const locales = {
  en: {
    '${name}.port.missing_run': 'Adapter must implement run().',
  },
};

let currentLocale = 'en';

/** @param {string} locale */
export function setLocale(locale) {
  if (!locales[locale]) {
    throw new Error(\`Unknown locale: \${locale}\`);
  }
  currentLocale = locale;
}

/** @returns {string} */
export function getLocale() {
  return currentLocale;
}

/**
 * @param {string} key
 * @param {Record<string, string | number>} [params]
 * @returns {string}
 */
export function t(key, params = {}) {
  const template = locales[currentLocale]?.[key];
  if (template == null) return key;
  return Object.entries(params).reduce(
    (str, [k, v]) => str.replaceAll(\`{\${k}}\`, String(v)),
    template,
  );
}

/**
 * @param {string} locale
 * @param {Record<string, string>} messages
 */
export function registerLocale(locale, messages) {
  locales[locale] = { ...(locales[locale] || {}), ...messages };
}

export function resetLocale() {
  currentLocale = 'en';
}
`;

  files[`modules/${name}/messages.mjs.header.md`] = sidecar({
    name,
    file: 'messages.mjs',
    layer: 'messages',
    summary: `i18n message registry for the ${name} module.`,
    notesForLLM: `All user-facing copy from this module flows through t(). Add new locales via registerLocale().`,
  });

  // ── manifest.json ──────────────────────────────────────────────────────────
  const manifest = {
    name,
    description: desc,
    exports: ['public-api.mjs'],
    dependencies: { modules: [], external: [], builtins: [] },
    dependents: [],
    structure: {
      domain: [`${name}.mjs`],
      ports: [`${name}-port.mjs`],
      adapters: ['default-adapter.mjs'],
      root: ['public-api.mjs'],
    },
    testFiles: [`tests/unit/${name}.test.mjs`],
    capabilities: { adapters: ['default-adapter.mjs'], ports: {}, typedefs: {} },
  };
  files[`modules/${name}/manifest.json`] = JSON.stringify(manifest, null, 2) + '\n';

  files[`modules/${name}/manifest.json.header.md`] = `---
fileId: contextrail-template:modules:${name}:manifest.json.header
module: modules/${name}
stability: evolving
steward: shared
api: Documentation
boundedContext: ${name}
dependsOn: modules/${name}/manifest.json
summary: Sidecar header for the ${name} module manifest.
owns: Documentation for modules/${name}/manifest.json without modifying the comment-sensitive file body.
boundaries: Sidecar metadata only. Module configuration lives in manifest.json.
invariants: Must stay aligned with manifest.json content and module exports.
notesForLLM: Capabilities surface is regenerated by capabilities-sync; do not hand-edit the capabilities block.
linkedDocs: modules/${name}/README.md
specRefs:
  - TPL-001
---

# manifest.json
`;

  // ── README.md ──────────────────────────────────────────────────────────────
  files[`modules/${name}/README.md`] =
    slimMdHeader({
      purpose: `Overview and navigation guide for the ${name} hex module.`,
      sidecar: 'README.md.header.md',
      layer: 'module',
      ctx: name,
    }) +
    `\n# ${name}

${desc}

## Structure

\`\`\`
modules/${name}/
├── domain/
│   └── ${name}.mjs        # Pure domain logic (no deps)
├── ports/
│   └── ${name}-port.mjs   # Port contract + validator
├── adapters/
│   └── default-adapter.mjs # Concrete adapter
├── messages.mjs            # i18n message registry
├── manifest.json           # Module metadata + capability surface
├── public-api.mjs          # Single cross-module entry point
└── README.md
\`\`\`

## Usage

\`\`\`javascript
import { ${camel}, assert${portTypeName}, ${adapterExportName} } from '../../modules/${name}/public-api.mjs';

assert${portTypeName}(${adapterExportName});

const result = ${camel}({ /* domain input */ });
\`\`\`

## Rules

- Cross-module consumers import from \`public-api.mjs\` only.
- Deep imports into \`domain/\`, \`ports/\`, or \`adapters/\` are forbidden.
- Domain must stay framework-free.
- All user-facing copy uses i18n keys via \`messages.mjs\`.
`;

  files[`modules/${name}/README.md.header.md`] = `---
fileId: contextrail-template:modules:${name}:README
module: modules/${name}
stability: evolving
steward: shared
api: Documentation
boundedContext: ${name}
summary: Overview and navigation guide for the ${name} hex module.
owns: Directory listing and purpose description for the ${name} module.
boundaries: Documentation only. Must not duplicate code or config.
invariants: Must stay current with the module's file structure and exports.
notesForLLM: Start here to understand the ${name} module. Then read public-api.mjs for the export surface.
specRefs:
  - TPL-001
---

# README.md
`;

  return files;
}

function sidecar({ name, file, layer, summary, notesForLLM }) {
  return `---
fileId: contextrail-template:modules:${name}:${file.replace(/\.mjs$/, '')}
module: modules/${name}
stability: evolving
steward: shared
api: "${layer === 'public-api' ? 'Public API' : layer.charAt(0).toUpperCase() + layer.slice(1)}"
boundedContext: ${name}
summary: ${summary}
owns: ${summary}
boundaries: Stays inside the ${name} bounded context. Do not couple to other modules' internals.
invariants: ${layer === 'domain' ? 'Pure functions only; no IO.' : layer === 'port' ? 'Contract definition only; no implementation.' : layer === 'adapter' ? 'Implements a port contract; isolates infrastructure.' : 'Bounded to the ${name} module.'}
notesForLLM: ${notesForLLM}
specRefs:
  - TPL-001
---

# ${file}
`;
}

function readmeFile(folder, summary) {
  const slug = folder.replace(/^modules\//, '').replace(/\/$/, '');
  return (
    slimMdHeader({
      purpose: `Directory overview for ${slug}.`,
      sidecar: 'README.md.header.md',
      layer: 'module',
    }) + `\n# ${folder}\n\n${summary}\n`
  );
}

function readmeSidecar(name, layer) {
  return `---
fileId: contextrail-template:modules:${name}:${layer}:README
module: modules/${name}/${layer}
stability: evolving
steward: shared
api: Documentation
boundedContext: ${name}
summary: Directory overview for the ${name} module's ${layer} layer.
owns: Documentation entry point for modules/${name}/${layer}/.
boundaries: Documentation only.
invariants: Must stay current with the layer's file contents.
notesForLLM: ${layer === 'domain' ? 'Pure code only; no infrastructure.' : layer === 'ports' ? 'Contracts only; no implementations.' : 'Concrete implementations of port contracts.'}
specRefs:
  - TPL-001
---

# README.md
`;
}

/**
 * Write a file map to disk under repoRoot. Creates directories as needed.
 * Pure helper exported for tests.
 *
 * @param {Record<string, string>} files
 * @param {string} repoRoot
 * @param {{ overwrite?: boolean }} [opts]
 * @returns {{ written: string[], skipped: string[] }}
 */
export function writeModuleFiles(files, repoRoot, { overwrite = false } = {}) {
  const written = [];
  const skipped = [];
  for (const [relative, content] of Object.entries(files)) {
    const absolute = join(repoRoot, relative);
    if (existsSync(absolute) && !overwrite) {
      skipped.push(relative);
      continue;
    }
    mkdirSync(dirname(absolute), { recursive: true });
    writeFileSync(absolute, content, 'utf8');
    written.push(relative);
  }
  return { written, skipped };
}

function main() {
  const args = process.argv.slice(2);
  let name;
  let description;
  let force = false;

  for (const arg of args) {
    if (arg === '--force') force = true;
    else if (arg.startsWith('--name=')) name = arg.slice('--name='.length);
    else if (arg.startsWith('--description=')) description = arg.slice('--description='.length);
    else if (arg === '--help' || arg === '-h') {
      console.log(
        'Usage: node scripts/checks/create-module.mjs --name=<kebab-name> [--description="..."] [--force]',
      );
      console.log('');
      console.log('Scaffolds a new hex module under modules/<name>/ with the canonical');
      console.log('domain/ports/adapters/public-api/messages/manifest/README skeleton');
      console.log('and ADR-0009 slim+sidecar headers on every file.');
      process.exit(0);
    } else if (!arg.startsWith('--') && !name) {
      name = arg;
    }
  }

  const validation = validateModuleName(name);
  if (!validation.ok) {
    console.error(`create-module: ${validation.error}`);
    console.error('Run with --help for usage.');
    process.exit(1);
  }

  const moduleDir = join(REPO_ROOT, 'modules', name);
  if (existsSync(moduleDir) && !force) {
    console.error(`create-module: modules/${name}/ already exists. Use --force to overwrite.`);
    process.exit(1);
  }

  const files = buildModuleFiles(name, description);
  const { written, skipped } = writeModuleFiles(files, REPO_ROOT, { overwrite: force });

  console.log(`create-module: scaffolded modules/${name}/`);
  console.log(`  wrote ${written.length} file(s)`);
  if (skipped.length > 0) {
    console.log(`  skipped ${skipped.length} existing file(s) (use --force to overwrite)`);
  }
  console.log('');
  console.log('Next steps:');
  console.log(`  1. Replace the domain stub in modules/${name}/domain/${name}.mjs`);
  console.log(`  2. Grow the port contract in modules/${name}/ports/${name}-port.mjs`);
  console.log(`  3. Add a real adapter in modules/${name}/adapters/`);
  console.log(`  4. Write tests in tests/unit/${name}.test.mjs`);
  console.log('  5. Run: node scripts/checks/capabilities-sync.mjs');
  console.log('  6. Run: node scripts/checks/header-check.mjs');
}

if (process.argv[1]?.endsWith('create-module.mjs')) {
  main();
}
