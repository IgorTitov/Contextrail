/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose i18n message registry for the payments module.
 * @sidecar messages.mjs.header.md
 * @layer messages | @hex _none_ | @ctx payments
 * @public false
 * @edit careful
 */

/**
 * Bounded i18n messages for the payments module.
 * All user-facing copy from payments flows through this layer.
 */

const locales = {
  en: {
    'payments.port.not_object': 'Payments adapter must be a non-null object.',
    'payments.port.missing_createCustomer':
      'Payments adapter must implement createCustomer(input).',
    'payments.port.missing_createPaymentIntent':
      'Payments adapter must implement createPaymentIntent(input).',
    'payments.port.missing_confirmPaymentIntent':
      'Payments adapter must implement confirmPaymentIntent(id, options).',
    'payments.port.missing_refund': 'Payments adapter must implement refund(intentId, options).',
    'payments.port.missing_verifyWebhook':
      'Payments adapter must implement verifyWebhook(rawBody, signature, secret).',
    'payments.port.missing_listIntents': 'Payments adapter must implement listIntents(filter?).',
    'payments.port.missing_clear': 'Payments adapter must implement clear().',

    'payments.money.invalid': 'money must be a non-null object with amount and currency.',
    'payments.money.invalid_amount':
      'money amount must be a non-negative integer number of minor units.',
    'payments.money.invalid_currency':
      'money currency must be a 3-letter ISO-4217 code (e.g. USD, EUR).',

    'payments.intent.invalid': 'payment intent input must be a non-null object.',
    'payments.intent.missing_amount': 'payment intent must include amount as Money.',
    'payments.intent.invalid_customer':
      'payment intent customerId must be a non-empty string when provided.',
    'payments.intent.invalid_description':
      'payment intent description must be a string when provided.',
    'payments.intent.invalid_metadata':
      'payment intent metadata must be a flat string map when provided.',
    'payments.intent.not_found': 'payment intent "{id}" not found.',
    'payments.intent.not_confirmable':
      'payment intent "{id}" cannot be confirmed from status "{status}".',
    'payments.intent.missing_payment_method':
      'confirmPaymentIntent requires a paymentMethod string.',
    'payments.intent.not_refundable':
      'payment intent "{id}" cannot be refunded from status "{status}".',
    'payments.intent.refund_too_large':
      'refund amount exceeds remaining refundable balance on intent "{id}".',

    'payments.customer.invalid': 'customer input must be a non-null object.',
    'payments.customer.missing_email': 'customer email must be a non-empty string.',
    'payments.customer.invalid_name': 'customer name must be a string when provided.',

    'payments.webhook.invalid_signature_header':
      'webhook signature header is missing or malformed.',
    'payments.webhook.invalid_timestamp': 'webhook signature timestamp is missing or not a number.',
    'payments.webhook.signature_mismatch': 'webhook signature does not match the computed HMAC.',
    'payments.webhook.timestamp_out_of_range':
      'webhook signature timestamp is outside the allowed tolerance.',
    'payments.webhook.invalid_body': 'webhook raw body must be a non-empty string.',
    'payments.webhook.invalid_secret': 'webhook secret must be a non-empty string.',
  },
};

let currentLocale = 'en';

/** @param {string} locale */
export function setLocale(locale) {
  if (!locales[locale]) {
    throw new Error(`Unknown locale: ${locale}`);
  }
  currentLocale = locale;
}

/** @returns {string} */
export function getLocale() {
  return currentLocale;
}

/**
 * @param {string} key
 * @param {Record<string, string | number>} [params]
 * @returns {string}
 */
export function t(key, params = {}) {
  const template = locales[currentLocale]?.[key];
  if (template == null) return key;
  return Object.entries(params).reduce(
    (str, [k, v]) => str.replaceAll(`{${k}}`, String(v)),
    template,
  );
}

/**
 * @param {string} locale
 * @param {Record<string, string>} messages
 */
export function registerLocale(locale, messages) {
  locales[locale] = { ...(locales[locale] || {}), ...messages };
}

export function resetLocale() {
  currentLocale = 'en';
}
