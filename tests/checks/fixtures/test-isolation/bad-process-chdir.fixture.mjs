/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Describe the role of bad-process-chdir-fixture in this repository.
 * @sidecar bad-process-chdir.fixture.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

// Bad fixture: process.chdir present even with no immediately-following
// git call. process.chdir is entirely banned in tests because it
// silently shifts the global cwd for subsequent code.
// Expected verdict: violation { pattern: 'process-chdir' }

export function run(target) {
  process.chdir(target);
  return 'ok';
}
