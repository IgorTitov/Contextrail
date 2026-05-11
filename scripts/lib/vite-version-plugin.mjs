/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Shared Vite plugin — exposes monorepo VERSION as virtual:app-version module with live HMR reload on change.
 * @sidecar vite-version-plugin.mjs.header.md
 * @layer tooling | @hex _none_ | @ctx _none_
 * @public true
 * @edit careful
 */

/**
 * Auto-version banner Vite plugin.
 *
 * Exposes the current project version as a virtual module
 * `virtual:app-version` that any app can import. The version is
 * read from the monorepo root VERSION file (fallback: package.json).
 *
 * In dev mode, the plugin watches VERSION and triggers a full-reload
 * over the existing HMR socket when it changes — no dev server
 * restart required. In production builds, the version string is
 * baked into the bundle at build time.
 *
 * Usage in vite.config.ts:
 *
 *   import { appVersionPlugin } from '../../scripts/lib/vite-version-plugin.mjs'
 *   export default defineConfig({
 *     plugins: [appVersionPlugin()],
 *   })
 *
 * Usage in app entry (main.tsx / main.ts):
 *
 *   import appVersion from 'virtual:app-version'
 *   console.log(`MyApp v${appVersion}`)
 *
 * TypeScript declaration (add to src/vite-env.d.ts):
 *
 *   declare module 'virtual:app-version' {
 *     const version: string
 *     export default version
 *   }
 *
 * Architecture note: NEVER call server.restart() on VERSION change —
 * it tears down the HMR WebSocket and pushes the client into a
 * 100k+ errors/sec retry loop. ws.send({type:'full-reload'}) over
 * the existing socket is the safe replacement.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const VIRTUAL_ID = 'virtual:app-version';
const RESOLVED_ID = '\0' + VIRTUAL_ID;

/**
 * Read the current version from VERSION file or package.json.
 * @param {string} root — monorepo root directory
 * @returns {string} version string or 'dev'
 */
function readAppVersion(root) {
  const versionPath = join(root, 'VERSION');
  const pkgPath = join(root, 'package.json');

  try {
    const v = readFileSync(versionPath, 'utf-8').trim();
    if (v) return v;
  } catch { /* ignore */ }

  try {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    if (typeof pkg.version === 'string') return pkg.version;
  } catch { /* ignore */ }

  return 'dev';
}

/**
 * Create the Vite plugin.
 * @param {object} [options]
 * @param {string} [options.root] — monorepo root (default: two dirs up from cwd)
 * @param {string} [options.name] — plugin name (default: 'coa-app-version')
 * @returns {import('vite').Plugin}
 */
export function appVersionPlugin(options = {}) {
  const root = options.root || join(process.cwd(), '..', '..');
  const pluginName = options.name || 'coa-app-version';
  const versionPath = join(root, 'VERSION');
  const pkgPath = join(root, 'package.json');

  return {
    name: pluginName,

    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID;
      return null;
    },

    load(id) {
      if (id !== RESOLVED_ID) return null;
      return `export default ${JSON.stringify(readAppVersion(root))};`;
    },

    configureServer(server) {
      server.watcher.add(versionPath);
      server.watcher.add(pkgPath);
      server.watcher.on('change', (file) => {
        const norm = file.replace(/\\/g, '/');
        const vNorm = versionPath.replace(/\\/g, '/');
        const pNorm = pkgPath.replace(/\\/g, '/');
        if (norm !== vNorm && norm !== pNorm) return;

        const mod = server.moduleGraph.getModuleById(RESOLVED_ID);
        if (mod) server.moduleGraph.invalidateModule(mod);
        // Full-reload over the EXISTING HMR socket. Never server.restart().
        server.ws.send({ type: 'full-reload' });
      });
    },
  };
}
