/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Pure money value object — minor-unit integer amount + ISO-4217 currency code.
 * @sidecar money.mjs.header.md
 * @layer domain | @hex _none_ | @ctx payments
 * @public false
 * @edit careful
 */

import { t } from '../messages.mjs';

/**
 * Pure money value object. Amounts are stored as non-negative integers in the
 * smallest currency unit (cents for USD/EUR, pennies for GBP, yen for JPY)
 * to avoid every floating-point bug that has ever bankrupted an e-commerce
 * site. Currency is a 3-letter ISO-4217 code, upper-cased for comparison.
 *
 * No I/O, no framework imports. All errors carry i18n keys.
 *
 * @typedef {object} Money
 * @property {number} amount    Non-negative integer in minor units.
 * @property {string} currency  3-letter ISO-4217 code (upper case).
 */

const CURRENCY_RE = /^[A-Z]{3}$/;

/**
 * Validate and construct a {@link Money} value object.
 *
 * @param {{ amount: number, currency: string }} input
 * @returns {Money}
 */
export function createMoney(input) {
  if (!input || typeof input !== 'object') {
    throw new TypeError(t('payments.money.invalid'));
  }
  const { amount, currency } = input;
  if (!Number.isInteger(amount) || amount < 0) {
    throw new TypeError(t('payments.money.invalid_amount'));
  }
  if (typeof currency !== 'string' || !CURRENCY_RE.test(currency.toUpperCase())) {
    throw new TypeError(t('payments.money.invalid_currency'));
  }
  return { amount, currency: currency.toUpperCase() };
}

/**
 * Add two Money values. Throws if the currencies differ.
 *
 * @param {Money} a
 * @param {Money} b
 * @returns {Money}
 */
export function addMoney(a, b) {
  const left = createMoney(a);
  const right = createMoney(b);
  if (left.currency !== right.currency) {
    throw new TypeError(t('payments.money.invalid_currency'));
  }
  return { amount: left.amount + right.amount, currency: left.currency };
}

/**
 * Subtract `b` from `a`. Throws if the currencies differ or the result
 * would be negative.
 *
 * @param {Money} a
 * @param {Money} b
 * @returns {Money}
 */
export function subtractMoney(a, b) {
  const left = createMoney(a);
  const right = createMoney(b);
  if (left.currency !== right.currency) {
    throw new TypeError(t('payments.money.invalid_currency'));
  }
  const next = left.amount - right.amount;
  if (next < 0) {
    throw new TypeError(t('payments.money.invalid_amount'));
  }
  return { amount: next, currency: left.currency };
}

/**
 * Format a {@link Money} value as a simple `"12.34 USD"` string. Integer
 * currencies like JPY render without decimals. This is a domain convenience,
 * not a locale-aware formatter — real user output should go through a
 * presentation adapter.
 *
 * @param {Money} money
 * @returns {string}
 */
export function formatMoney(money) {
  const { amount, currency } = createMoney(money);
  const zeroDecimal = currency === 'JPY' || currency === 'KRW' || currency === 'VND';
  if (zeroDecimal) return `${amount} ${currency}`;
  const major = Math.floor(amount / 100);
  const minor = (amount % 100).toString().padStart(2, '0');
  return `${major}.${minor} ${currency}`;
}
