/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Describe the role of whitelisted-with-marker-and-allowlist-fixture in this repository.
 * @sidecar whitelisted-with-marker-and-allowlist.fixture.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

// @test-isolation: live-repo-allowed | reason: This fixture exists ONLY to verify the whitelist mechanism works end-to-end. It is included in the synthetic allowlist used by --self-test, so detection is suppressed and the verdict is "whitelisted".

// Whitelisted fixture (marker present + file in allowlist): the static
// check should suppress violations and mark the result as whitelisted.

import { execSync } from 'node:child_process';

execSync('git status'); // intentionally bad — but whitelisted
