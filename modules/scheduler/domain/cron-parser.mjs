/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Cron Parser domain logic for the scheduler module.
 * @sidecar cron-parser.mjs.header.md
 * @layer module | @hex domain | @ctx scheduler
 * @public false
 * @edit careful
 */

/**
 * Simple cron-like expression parser for human-friendly interval strings.
 * Pure domain logic, framework-free.
 */

import { t } from '../messages.mjs';

const UNIT_MS = {
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

const CRON_LIKE_RE = /^every\s+(\d+)\s*([smhd])$/i;

/**
 * Parse a cron-like expression into milliseconds.
 *
 * Supported formats:
 * - 'every Ns' (seconds)
 * - 'every Nm' (minutes)
 * - 'every Nh' (hours)
 * - 'every Nd' (days)
 * - Raw number (passthrough)
 *
 * @param {number | string} expression
 * @returns {number} Interval in milliseconds
 * @throws {Error} If expression is invalid
 */
export function parseCronLike(expression) {
  if (typeof expression === 'number') {
    return expression;
  }

  if (typeof expression !== 'string') {
    throw new Error(t('scheduler.cron.invalid', { expression: String(expression) }));
  }

  const match = expression.trim().match(CRON_LIKE_RE);
  if (!match) {
    throw new Error(t('scheduler.cron.invalid', { expression }));
  }

  const value = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  const multiplier = UNIT_MS[unit];

  if (!multiplier || value <= 0) {
    throw new Error(t('scheduler.cron.invalid', { expression }));
  }

  return value * multiplier;
}
