/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Describe the role of bad-dynamic-import-fixture in this repository.
 * @sidecar bad-dynamic-import.fixture.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

// Bad fixture: dynamic import of child_process to dodge static analysis.
// Expected verdict: violation { pattern: 'dynamic-import-cp' }

export async function run() {
  const cp = await import('node:child_process');
  return cp.execSync('git status');
}
