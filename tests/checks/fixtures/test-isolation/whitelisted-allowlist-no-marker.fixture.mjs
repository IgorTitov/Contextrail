/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Describe the role of whitelisted-allowlist-no-marker-fixture in this repository.
 * @sidecar whitelisted-allowlist-no-marker.fixture.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

// Allowlist-only fixture: file IS in synthetic allowlist for self-test
// but does NOT carry the marker. The mechanism requires BOTH halves.
// Expected verdict: violation { pattern: 'whitelist-incomplete' }

import { execSync } from 'node:child_process';

execSync('git status');
