/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose CLI argument parsing utilities shared across repository scripts.
 * @sidecar cli-helpers.mjs.header.md
 * @layer tooling | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

export function parseArgs(argv = process.argv.slice(2)) {
  const map = new Map();
  for (const arg of argv) {
    if (!arg.startsWith('--')) {
      map.set(arg, true);
      continue;
    }
    const [k, v] = arg.split('=');
    map.set(k, v ?? true);
  }
  return map;
}
