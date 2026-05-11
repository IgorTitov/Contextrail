/* @HEADER
 * @version 0.8.15 | 2026-05-11
 * @purpose Describe the role of bad-claims-write-fixture in this repository.
 * @sidecar bad-claims-write.fixture.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/* slim header block — NOT a @HEADER block; header-fix must not parse this file.
 * purpose: Bad fixture for R1.3 self-test (claims-dir-leak detection).
 * This file deliberately constructs a path to the live .claims/ directory
 * using both canonical forms that R1.3 detects. Expected verdict: violation
 * with pattern 'claims-dir-leak'. See ADR-0052.
 */

// Bad fixture: builds a path to the real .claims/ directory.
// This is the pattern that caused the ZVX-DEV-1000 auto-pick pollution incident.
// R1.3 (ADR-0052) must flag this as claims-dir-leak.

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const LIVE_CLAIMS_DIR = fileURLToPath(new URL('../../.claims', import.meta.url));
writeFileSync(join(LIVE_CLAIMS_DIR, 'test-fixture.json'), '{}');
