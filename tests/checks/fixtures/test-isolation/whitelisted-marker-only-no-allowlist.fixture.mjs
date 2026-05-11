/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Describe the role of whitelisted-marker-only-no-allowlist-fixture in this repository.
 * @sidecar whitelisted-marker-only-no-allowlist.fixture.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

// @test-isolation: live-repo-allowed | reason: Marker present but the file is intentionally NOT added to the allowlist — used to prove that one half of the whitelist mechanism alone is insufficient.

// Marker-only fixture: should still fail because allowlist also required.
// Expected verdict: violation { pattern: 'whitelist-incomplete' }

import { execSync } from 'node:child_process';

execSync('git status');
