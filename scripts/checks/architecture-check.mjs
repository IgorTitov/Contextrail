/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Validate hexagonal boundaries, public APIs, and file-size discipline
 * @sidecar architecture-check.mjs.header.md
 * @layer tooling | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import path from 'node:path';
import { readFileSync, existsSync } from 'node:fs';
import { parseArgs, readText, resolveScope, result, walk } from './_shared.mjs';
import { FileNotFoundError, ValidationError } from '../lib/errors.mjs';

const args = parseArgs();
const wantJson = args.has('--json');
const strictSize = args.has('--strict-size');
const { filter: scopeFilter, isScoped } = resolveScope(args.get('--scope'));
/** Tiered file-size soft limits (see ADR-0007). */
const LINE_LIMIT_DEFAULT = 180;
const LINE_LIMIT_ADAPTER = 400;

function importsFrom(text) {
  const results = [];
  for (const regex of [
    /from\s+['"]([^'"]+)['"]/g,
    /import\s+['"]([^'"]+)['"]/g,
    /require\(\s*['"]([^'"]+)['"]\s*\)/g,
  ]) {
    for (const match of text.matchAll(regex)) results.push(match[1]);
  }
  return [...new Set(results)];
}

function moduleName(file) {
  const parts = file.split('/');
  const idx = parts.indexOf('modules');
  return idx >= 0 ? parts[idx + 1] : null;
}

function layer(file) {
  if (file.includes('/src/domain/')) return 'domain';
  if (file.includes('/src/application/')) return 'application';
  if (file.includes('/src/ports/')) return 'ports';
  if (file.includes('/src/adapters/')) return 'adapters';
  if (file.includes('/src/di/')) return 'di';
  if (/\/(?:src\/)?public-api\.[cm]?[jt]sx?$/.test(file)) return 'public-api';
  if (file.includes('/domain/')) return 'domain';
  if (file.includes('/application/')) return 'application';
  if (file.includes('/ports/')) return 'ports';
  if (file.includes('/adapters/')) return 'adapters';
  if (file.includes('/di/')) return 'di';
  return 'other';
}

function relativeCrossesModule(file, source) {
  if (!source.startsWith('.')) return false;
  const fromModule = moduleName(file);
  const resolved = path.normalize(path.join(path.dirname(file), source)).replaceAll('\\', '/');
  const toModule = moduleName(resolved);
  return Boolean(fromModule && toModule && fromModule !== toModule);
}

function frameworkLeak(source) {
  const tokens = ['react', 'next', 'electron', 'express', 'fastify', 'vite', 'fs', 'path', 'node:'];
  return tokens.some((token) => source === token || source.startsWith(token));
}

async function main() {
  const errors = [];
  const warnings = [];

  const moduleFiles = (await walk('modules'))
    .filter((file) => /\.(ts|tsx|js|jsx|mjs|cjs)$/i.test(file))
    .filter(scopeFilter);
  const appPackageFiles = (await Promise.all(['apps', 'packages'].map(walk)))
    .flat()
    .filter((file) => /\.(ts|tsx|js|jsx|mjs|cjs)$/i.test(file))
    .filter(scopeFilter);

  const PUBLIC_API_CANDIDATES = [
    'src/public-api.ts',
    'src/public-api.mjs',
    'src/public-api.js',
    'public-api.ts',
    'public-api.mjs',
    'public-api.js',
  ];
  const modules = new Set(moduleFiles.map(moduleName).filter(Boolean));
  // When scoped, only check public-api for modules that have source files in scope
  const modulesToCheck = isScoped
    ? new Set([...modules].filter((m) => scopeFilter(`modules/${m}/`)))
    : modules;
  for (const mod of modulesToCheck) {
    let found = false;
    for (const candidate of PUBLIC_API_CANDIDATES) {
      try {
        await readText(`modules/${mod}/${candidate}`);
        found = true;
        break;
      } catch {
        /* try next */
      }
    }
    if (!found) {
      errors.push(
        new FileNotFoundError(
          `Missing public API: modules/${mod}/public-api.{ts,mjs,js} or modules/${mod}/src/public-api.{ts,mjs,js}`,
          { file: `modules/${mod}/public-api.*` },
        ),
      );
    }
  }

  for (const file of moduleFiles) {
    const text = await readText(file);
    const imports = importsFrom(text);
    const currentLayer = layer(file);
    const lines = text.split(/\r?\n/).length;
    const limit = currentLayer === 'adapters' ? LINE_LIMIT_ADAPTER : LINE_LIMIT_DEFAULT;
    const msg = `${file}: ${lines} lines exceeds soft limit ${limit} (${currentLayer})`;
    if (lines > limit) {
      if (strictSize) errors.push(msg);
      else warnings.push(msg);
    }

    for (const source of imports) {
      if (relativeCrossesModule(file, source)) {
        errors.push(
          new ValidationError(`${file}: relative import crosses module boundary ("${source}")`, {
            file,
            details: { source },
          }),
        );
      }
      if (
        /modules\/[^/]+\/(?:src\/(?!public-api\.[cm]?[jt]sx?)|(?:domain|application|ports|adapters|di)\/)/.test(
          source,
        )
      ) {
        errors.push(
          new ValidationError(`${file}: deep module import is forbidden ("${source}")`, {
            file,
            details: { source },
          }),
        );
      }
      if ((currentLayer === 'domain' || currentLayer === 'application') && frameworkLeak(source)) {
        errors.push(
          new ValidationError(
            `${file}: ${currentLayer} layer must not import framework/infra dependency ("${source}")`,
            { file, details: { layer: currentLayer, source } },
          ),
        );
      }
      if (
        (currentLayer === 'domain' || currentLayer === 'application' || currentLayer === 'ports') &&
        /\/adapters\//.test(source)
      ) {
        errors.push(
          new ValidationError(
            `${file}: ${currentLayer} layer must not import adapters ("${source}")`,
            { file, details: { layer: currentLayer, source } },
          ),
        );
      }
      if ((currentLayer === 'domain' || currentLayer === 'application') && /\/di\//.test(source)) {
        errors.push(
          new ValidationError(`${file}: ${currentLayer} layer must not import DI ("${source}")`, {
            file,
            details: { layer: currentLayer, source },
          }),
        );
      }
    }
  }

  // ── Maturity field validation ──
  const VALID_MATURITY = ['stable', 'beta', 'example'];
  for (const mod of modulesToCheck) {
    const manifestPath = `modules/${mod}/manifest.json`;
    try {
      const raw = await readText(manifestPath);
      const manifest = JSON.parse(raw);
      if (!manifest.maturity) {
        errors.push(
          new ValidationError(`${manifestPath}: missing required "maturity" field`, {
            file: manifestPath,
          }),
        );
      } else if (!VALID_MATURITY.includes(manifest.maturity)) {
        errors.push(
          new ValidationError(
            `${manifestPath}: invalid maturity "${manifest.maturity}" (expected: ${VALID_MATURITY.join(', ')})`,
            { file: manifestPath, details: { maturity: manifest.maturity } },
          ),
        );
      }
    } catch {
      // manifest.json doesn't exist — not this check's concern
    }
  }

  for (const file of appPackageFiles) {
    const text = await readText(file);
    for (const source of importsFrom(text)) {
      if (
        /modules\/[^/]+\/(?:src\/(?!public-api\.[cm]?[jt]sx?)|(?:domain|application|ports|adapters|di)\/)/.test(
          source,
        )
      ) {
        errors.push(
          new ValidationError(
            `${file}: app/package import bypasses module public API ("${source}")`,
            { file, details: { source } },
          ),
        );
      }
    }
  }

  // D-16: max dependency depth gate (3 = max allowed)
  const MAX_DEPENDENCY_DEPTH = 3;
  const depGraphPath = path.join(process.cwd(), 'docs/_generated/dependency-graph.json');
  if (existsSync(depGraphPath)) {
    try {
      const graph = JSON.parse(readFileSync(depGraphPath, 'utf8'));
      if (graph.maxDependencyDepth > MAX_DEPENDENCY_DEPTH) {
        errors.push(
          new ValidationError(
            `Dependency depth ${graph.maxDependencyDepth} exceeds maximum ${MAX_DEPENDENCY_DEPTH}. Restructure module boundaries.`,
            {
              details: {
                maxDependencyDepth: graph.maxDependencyDepth,
                limit: MAX_DEPENDENCY_DEPTH,
              },
            },
          ),
        );
      }
    } catch {
      // dependency-graph.json not parseable — skip depth check
    }
  }

  const output = result('architecture-check', errors.length === 0, errors, warnings, {
    moduleFileCount: moduleFiles.length,
    appPackageFileCount: appPackageFiles.length,
    strictSize,
    scoped: isScoped,
  });

  if (wantJson) {
    console.log(JSON.stringify(output, null, 2));
    process.exit(output.ok ? 0 : 1);
  }
  console.log(`architecture-check: ${output.ok ? 'OK' : 'FAIL'}`);
  for (const warning of warnings) console.log(`warning: ${warning}`);
  if (!output.ok) {
    for (const error of errors) console.error(`error: ${error}`);
    process.exit(1);
  }
}

main().catch((error) => {
  const output = result('architecture-check', false, [
    error instanceof Error ? error.message : String(error),
  ]);
  if (wantJson) console.log(JSON.stringify(output, null, 2));
  else console.error(output.errors[0]);
  process.exit(1);
});
