/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Pure email-message domain — address validation, recipient normalization, message construction.
 * @sidecar email-message.mjs.header.md
 * @layer domain | @hex _none_ | @ctx email
 * @public false
 * @edit careful
 */

import { t } from '../messages.mjs';

/**
 * Pure domain for outbound email messages. Validates addresses, normalizes
 * recipients to a canonical shape, and returns an immutable message ready to
 * be handed to any EmailPort adapter (memory, console, SMTP, HTTP API …).
 *
 * No I/O, no timers, no framework dependencies — all side effects happen in
 * adapters behind `EmailPort.send`.
 *
 * @typedef {'queued' | 'sent' | 'failed'} EmailStatus
 * @typedef {{ to: string | string[], from: string, subject: string, text?: string, html?: string, cc?: string | string[], bcc?: string | string[], replyTo?: string, headers?: Record<string, string> }} EmailMessageInput
 * @typedef {{ id?: string, to: string[], from: string, subject: string, text?: string, html?: string, cc: string[], bcc: string[], replyTo?: string, headers: Record<string, string> }} EmailMessage
 * @typedef {{ id: string, status: EmailStatus, message: EmailMessage, error?: string, sentAt?: number }} EmailRecord
 */

/**
 * Minimal but strict-ish email address validator. Enough to catch typos and
 * invalid strings, deliberately not a full RFC 5322 parser (which nobody
 * wants to maintain). If you need stricter validation, compose a second
 * validator on top.
 *
 * @param {unknown} address
 * @returns {boolean}
 */
export function isValidEmailAddress(address) {
  if (typeof address !== 'string' || address.length === 0 || address.length > 254) return false;
  // local@domain.tld — one @, at least one dot in the domain, no whitespace.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address);
}

/**
 * Assert that a value is a valid email address or throw a TypeError with
 * the i18n key already interpolated.
 *
 * @param {unknown} address
 */
export function assertEmailAddress(address) {
  if (!isValidEmailAddress(address)) {
    throw new TypeError(t('email.message.invalid_address', { address: String(address ?? '') }));
  }
}

/**
 * Normalize a single string or array of strings into a canonical string[].
 * Validates every address; throws TypeError on the first invalid entry.
 *
 * @param {string | string[] | undefined} input
 * @returns {string[]}
 */
export function normalizeRecipients(input) {
  if (input == null) return [];
  const list = Array.isArray(input) ? input : [input];
  for (const entry of list) {
    if (typeof entry !== 'string' || entry.length === 0) {
      throw new TypeError(t('email.message.invalid_list'));
    }
    assertEmailAddress(entry);
  }
  return [...list];
}

/**
 * Validate raw input and return a normalized {@link EmailMessage}. Throws
 * TypeError on any structural or address problem. Domain only — caller
 * assigns the id (usually an adapter).
 *
 * @param {EmailMessageInput} input
 * @returns {EmailMessage}
 */
export function createEmailMessage(input) {
  if (!input || typeof input !== 'object') {
    throw new TypeError(t('email.message.invalid'));
  }
  if (typeof input.from !== 'string' || input.from.length === 0) {
    throw new TypeError(t('email.message.missing_from'));
  }
  assertEmailAddress(input.from);

  if (input.to == null || (Array.isArray(input.to) && input.to.length === 0)) {
    throw new TypeError(t('email.message.missing_to'));
  }
  const to = normalizeRecipients(input.to);
  if (to.length === 0) {
    throw new TypeError(t('email.message.missing_to'));
  }

  if (typeof input.subject !== 'string' || input.subject.length === 0) {
    throw new TypeError(t('email.message.missing_subject'));
  }

  const hasText = typeof input.text === 'string' && input.text.length > 0;
  const hasHtml = typeof input.html === 'string' && input.html.length > 0;
  if (!hasText && !hasHtml) {
    throw new TypeError(t('email.message.missing_body'));
  }

  if (input.replyTo != null) assertEmailAddress(input.replyTo);

  const cc = normalizeRecipients(input.cc);
  const bcc = normalizeRecipients(input.bcc);

  const headers = { ...(input.headers ?? {}) };

  /** @type {EmailMessage} */
  const message = {
    from: input.from,
    to,
    subject: input.subject,
    cc,
    bcc,
    headers,
  };
  if (hasText) message.text = input.text;
  if (hasHtml) message.html = input.html;
  if (input.replyTo) message.replyTo = input.replyTo;
  return message;
}

/**
 * Compute the total number of unique recipients across to/cc/bcc.
 *
 * @param {EmailMessage} message
 * @returns {number}
 */
export function recipientCount(message) {
  return new Set([...message.to, ...message.cc, ...message.bcc]).size;
}
