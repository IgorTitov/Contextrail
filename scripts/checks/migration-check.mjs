/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Compare a Contextrail-based project against the template to identify upgrade gaps.
 * @sidecar migration-check.mjs.header.md
 * @layer tooling | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Migration check.
 * Compares the current project against the Contextrail template to
 * identify what needs updating.
 *
 * Usage:
 *   node scripts/checks/migration-check.mjs --template=<path>
 *   node scripts/checks/migration-check.mjs --template=../contextrail-template [--json]
 */

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = import.meta.dirname ?? dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..', '..');

const args = process.argv.slice(2);
const templateArg = args.find((a) => a.startsWith('--template='));
const wantJson = args.includes('--json');

if (!templateArg) {
  console.error(
    'Usage: node scripts/checks/migration-check.mjs --template=<path-to-contextrail-template>',
  );
  process.exit(1);
}

const TEMPLATE_ROOT = resolve(templateArg.split('=')[1]);

if (!existsSync(join(TEMPLATE_ROOT, 'package.json'))) {
  console.error(`Template not found at ${TEMPLATE_ROOT}`);
  process.exit(1);
}

const findings = [];

function finding(category, severity, message) {
  findings.push({ category, severity, message });
}

// ---------------------------------------------------------------------------
// 1. Version comparison
// ---------------------------------------------------------------------------

function compareVersions() {
  try {
    const projPkg = JSON.parse(readFileSync(join(PROJECT_ROOT, 'package.json'), 'utf8'));
    const tmplPkg = JSON.parse(readFileSync(join(TEMPLATE_ROOT, 'package.json'), 'utf8'));
    const projVer = projPkg.version || '0.0.0';
    const tmplVer = tmplPkg.version || '0.0.0';

    if (projVer !== tmplVer) {
      finding('version', 'info', `Project: ${projVer} → Template: ${tmplVer}`);
    }
  } catch {
    /* skip */
  }
}

// ---------------------------------------------------------------------------
// 2. Script path check
// ---------------------------------------------------------------------------

function checkScriptPath() {
  if (existsSync(join(PROJECT_ROOT, 'scripts', 'claude'))) {
    finding('scripts', 'critical', 'scripts/claude/ exists — rename to scripts/checks/');
  }
  if (!existsSync(join(PROJECT_ROOT, 'scripts', 'checks'))) {
    finding('scripts', 'critical', 'scripts/checks/ missing');
  }
}

// ---------------------------------------------------------------------------
// 3. Missing scripts
// ---------------------------------------------------------------------------

function checkMissingScripts() {
  const tmplScripts = join(TEMPLATE_ROOT, 'scripts', 'checks');
  const projScripts = join(PROJECT_ROOT, 'scripts', 'checks');
  if (!existsSync(tmplScripts) || !existsSync(projScripts)) return;

  const tmplFiles = readdirSync(tmplScripts).filter(
    (f) => f.endsWith('.mjs') && !f.endsWith('.header.md'),
  );
  const projFiles = new Set(readdirSync(projScripts).filter((f) => f.endsWith('.mjs')));

  for (const f of tmplFiles) {
    if (!projFiles.has(f)) {
      finding('scripts', 'medium', `Missing script: scripts/checks/${f}`);
    }
  }
}

// ---------------------------------------------------------------------------
// 4. Missing infrastructure
// ---------------------------------------------------------------------------

function checkInfrastructure() {
  const required = [
    ['.claims/config.json', 'Claims protocol not configured'],
    ['SECURITY.md', 'SECURITY.md missing'],
    ['GOVERNANCE.md', 'GOVERNANCE.md missing'],
    ['MAINTAINERS.md', 'MAINTAINERS.md missing'],
    ['.github/CODEOWNERS', 'CODEOWNERS missing'],
    ['.github/copilot-instructions.md', 'Copilot adapter missing'],
  ];

  for (const [file, msg] of required) {
    if (!existsSync(join(PROJECT_ROOT, file))) {
      finding('infrastructure', 'medium', msg);
    }
  }
}

// ---------------------------------------------------------------------------
// 5. Module comparison
// ---------------------------------------------------------------------------

function checkModules() {
  const projModules = join(PROJECT_ROOT, 'modules');
  const tmplModules = join(TEMPLATE_ROOT, 'modules');
  if (!existsSync(projModules)) {
    finding('modules', 'info', 'No modules/ directory — control-plane-only project');
    return;
  }

  const projMods = readdirSync(projModules, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
  const tmplMods = new Set(
    readdirSync(tmplModules, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name),
  );

  for (const mod of projMods) {
    if (!tmplMods.has(mod)) {
      finding('modules', 'info', `Custom module: ${mod} (not in template)`);
      continue;
    }

    // Check manifest for maturity field
    const manifest = join(projModules, mod, 'manifest.json');
    if (existsSync(manifest)) {
      try {
        const m = JSON.parse(readFileSync(manifest, 'utf8'));
        if (!m.maturity) {
          finding('modules', 'medium', `${mod}/manifest.json: missing "maturity" field`);
        }
        if (!m.capabilities) {
          finding('modules', 'medium', `${mod}/manifest.json: missing "capabilities" field`);
        }
      } catch {
        /* skip */
      }
    }
  }
}

// ---------------------------------------------------------------------------
// 6. ADR check
// ---------------------------------------------------------------------------

function checkADRs() {
  const tmplAdr = join(TEMPLATE_ROOT, 'docs', 'adr');
  const projAdr = join(PROJECT_ROOT, 'docs', 'adr');
  if (!existsSync(tmplAdr)) return;

  const tmplAdrs = readdirSync(tmplAdr).filter(
    (f) => f.match(/^\d{4}-.*\.md$/) && !f.endsWith('.header.md'),
  );
  const projAdrs = new Set(
    existsSync(projAdr) ? readdirSync(projAdr).filter((f) => f.match(/^\d{4}-.*\.md$/)) : [],
  );

  for (const adr of tmplAdrs) {
    if (!projAdrs.has(adr)) {
      finding('docs', 'low', `Missing ADR: ${adr}`);
    }
  }
}

// ---------------------------------------------------------------------------
// 7. Header format check
// ---------------------------------------------------------------------------

function checkHeaderFormat() {
  // Sample a few files for old-style headers
  const sampleDirs = ['modules', 'apps', 'scripts'];
  let oldFormat = 0;
  let total = 0;

  for (const dir of sampleDirs) {
    const dirPath = join(PROJECT_ROOT, dir);
    if (!existsSync(dirPath)) continue;

    try {
      const files = readdirSync(dirPath, { recursive: true })
        .filter((f) => typeof f === 'string' && f.endsWith('.mjs'))
        .slice(0, 10);

      for (const f of files) {
        total++;
        try {
          const content = readFileSync(join(dirPath, f), 'utf8');
          if (content.includes('@HEADER-START') || content.includes('FILEINFO-BEGIN')) {
            oldFormat++;
          }
        } catch {
          /* skip */
        }
      }
    } catch {
      /* skip */
    }
  }

  if (oldFormat > 0) {
    finding(
      'headers',
      'high',
      `${oldFormat}/${total} sampled files use old heavy header format — run header-migrate.mjs`,
    );
  }
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

compareVersions();
checkScriptPath();
checkMissingScripts();
checkInfrastructure();
checkModules();
checkADRs();
checkHeaderFormat();

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

if (wantJson) {
  console.log(JSON.stringify({ findings, total: findings.length }, null, 2));
} else {
  if (findings.length === 0) {
    console.log('migration-check: project is up to date with template');
  } else {
    console.log(`migration-check: ${findings.length} gap(s) found\n`);

    const bySev = { critical: [], high: [], medium: [], low: [], info: [] };
    for (const f of findings) {
      (bySev[f.severity] || bySev.info).push(f);
    }

    for (const sev of ['critical', 'high', 'medium', 'low', 'info']) {
      if (bySev[sev].length === 0) continue;
      console.log(`  ${sev.toUpperCase()} (${bySev[sev].length}):`);
      for (const f of bySev[sev]) {
        console.log(`    [${f.category}] ${f.message}`);
      }
      console.log('');
    }
  }
}
