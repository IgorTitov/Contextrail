/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Scan sidecar .header.md free-text fields for suspicious action-oriented content that could constitute prompt injection.
 * @sidecar sidecar-content-check.mjs.header.md
 * @layer tooling | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { readText, isSidecarHeader } from './_shared.mjs';
import { execSync } from 'node:child_process';

/**
 * Suspicious keyword patterns for sidecar free-text fields.
 * These match action-oriented language that should not appear in metadata.
 */
export const SUSPICIOUS_PATTERNS = [
  {
    label: 'delete directive',
    pattern: /\bagents?\b.*\b(?:must|should|always)\b.*\b(?:delete|remove|destroy)\b/i,
  },
  {
    label: 'skip safety',
    pattern:
      /\bagents?\b.*\b(?:skip|bypass|disable|ignore)\b.*\b(?:test|check|gate|hook|review|safety)\b/i,
  },
  { label: 'do not ask', pattern: /\bdo not (?:ask|confirm|verify|check|review)\b/i },
  {
    label: 'agent behavioral override',
    pattern:
      /\bagents?\b.*\b(?:must|always|immediately)\b.*\b(?:delete|remove|disable|skip|execute|run)\b/i,
  },
  {
    label: 'deprecated override',
    pattern: /\bDEPRECATED\b.*\bagents?\b.*\b(?:must|should|replace)\b/i,
  },
  {
    label: 'critical urgency',
    pattern: /\bCRITICAL\b.*\b(?:immediately|urgent)\b.*\b(?:delete|remove|disable|without)\b/i,
  },
  {
    label: 'security false alarm',
    pattern: /\b(?:CVE|vulnerability|exploit)\b.*\b(?:delete|remove|disable|patch immediately)\b/i,
  },
  {
    label: 'permission escalation',
    pattern: /\b(?:grant|allow|enable)\b.*\b(?:all permissions|everything|unrestricted access)\b/i,
  },
];

/** Free-text sidecar fields to scan. `risks` is excluded — it legitimately describes failure scenarios. */
const SCANNABLE_FIELDS = ['purpose', 'summary', 'notes', 'notesForLLM', 'owns', 'boundaries'];

function extractFieldValue(text, fieldName) {
  const re = new RegExp(`^${fieldName}:\\s*(.+)$`, 'mi');
  const match = text.match(re);
  return match ? match[1].trim() : null;
}

function scanSidecar(filePath, text) {
  const findings = [];
  for (const field of SCANNABLE_FIELDS) {
    const value = extractFieldValue(text, field);
    if (!value) continue;

    for (const spec of SUSPICIOUS_PATTERNS) {
      if (spec.pattern.test(value)) {
        findings.push({
          file: filePath,
          field,
          value: value.length > 80 ? value.slice(0, 77) + '...' : value,
          label: spec.label,
        });
      }
    }
  }
  return findings;
}

function collectSidecars() {
  const out = execSync('git ls-files --cached', { encoding: 'utf8' });
  return out
    .split('\n')
    .filter((f) => f && isSidecarHeader(f))
    .sort();
}

const sidecars = collectSidecars();

const allFindings = [];
for (const sc of sidecars) {
  let text;
  try {
    text = await readText(sc);
  } catch {
    continue;
  }
  const findings = scanSidecar(sc, text);
  allFindings.push(...findings);
}

if (allFindings.length > 0) {
  console.error(`sidecar-content-check: ${allFindings.length} suspicious field(s) found:\n`);
  for (const f of allFindings) {
    console.error(`  ${f.file}:${f.field} — ${f.label}`);
    console.error(`    value: "${f.value}"\n`);
  }
  process.exit(1);
} else {
  console.log(
    `sidecar-content-check: OK — ${sidecars.length} sidecars scanned, no suspicious content`,
  );
}
