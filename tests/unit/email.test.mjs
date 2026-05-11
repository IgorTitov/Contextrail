/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Unit proof for the email bounded module — validation, adapters, record shape.
 * @sidecar email.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createEmailMessage,
  isValidEmailAddress,
  assertEmailAddress,
  normalizeRecipients,
  recipientCount,
  assertEmailPort,
  createMemoryEmailAdapter,
  createConsoleEmailAdapter,
} from '../../modules/email/public-api.mjs';

describe('email domain — address validation', () => {
  test('accepts a canonical address', () => {
    assert.equal(isValidEmailAddress('alice@example.com'), true);
  });

  test('rejects empty, whitespace, and missing parts', () => {
    assert.equal(isValidEmailAddress(''), false);
    assert.equal(isValidEmailAddress('not an email'), false);
    assert.equal(isValidEmailAddress('alice@'), false);
    assert.equal(isValidEmailAddress('@example.com'), false);
    assert.equal(isValidEmailAddress('alice@example'), false);
    assert.equal(isValidEmailAddress(123), false);
    assert.equal(isValidEmailAddress(null), false);
  });

  test('assertEmailAddress throws TypeError with i18n message', () => {
    assert.throws(() => assertEmailAddress('nope'), {
      name: 'TypeError',
      message: /nope/,
    });
  });
});

describe('email domain — normalizeRecipients', () => {
  test('accepts a single string and returns a length-1 array', () => {
    assert.deepEqual(normalizeRecipients('alice@example.com'), ['alice@example.com']);
  });

  test('accepts an array and returns a copy', () => {
    const input = ['a@x.co', 'b@x.co'];
    const out = normalizeRecipients(input);
    assert.deepEqual(out, ['a@x.co', 'b@x.co']);
    assert.notStrictEqual(out, input);
  });

  test('returns empty array on null/undefined', () => {
    assert.deepEqual(normalizeRecipients(undefined), []);
    assert.deepEqual(normalizeRecipients(null), []);
  });

  test('throws on any invalid address in the list', () => {
    assert.throws(() => normalizeRecipients(['a@x.co', 'nope']), TypeError);
  });

  test('throws on non-string entries', () => {
    assert.throws(() => normalizeRecipients(['a@x.co', 42]), TypeError);
  });
});

describe('email domain — createEmailMessage', () => {
  const baseInput = {
    from: 'hello@example.com',
    to: 'alice@example.com',
    subject: 'Welcome',
    text: 'Hi!',
  };

  test('builds a canonical message from minimal input', () => {
    const message = createEmailMessage(baseInput);
    assert.equal(message.from, 'hello@example.com');
    assert.deepEqual(message.to, ['alice@example.com']);
    assert.equal(message.subject, 'Welcome');
    assert.equal(message.text, 'Hi!');
    assert.deepEqual(message.cc, []);
    assert.deepEqual(message.bcc, []);
    assert.deepEqual(message.headers, {});
  });

  test('normalizes to/cc/bcc lists', () => {
    const message = createEmailMessage({
      ...baseInput,
      to: ['a@x.co', 'b@x.co'],
      cc: 'c@x.co',
      bcc: ['d@x.co'],
    });
    assert.equal(message.to.length, 2);
    assert.deepEqual(message.cc, ['c@x.co']);
    assert.deepEqual(message.bcc, ['d@x.co']);
  });

  test('accepts html body without text', () => {
    const message = createEmailMessage({
      from: baseInput.from,
      to: baseInput.to,
      subject: baseInput.subject,
      html: '<p>Hi</p>',
    });
    assert.equal(message.html, '<p>Hi</p>');
    assert.equal(message.text, undefined);
  });

  test('throws TypeError on null input', () => {
    assert.throws(() => createEmailMessage(null), TypeError);
  });

  test('throws when from is missing or invalid', () => {
    assert.throws(() => createEmailMessage({ ...baseInput, from: '' }), TypeError);
    assert.throws(() => createEmailMessage({ ...baseInput, from: 'not-email' }), TypeError);
  });

  test('throws when to is empty', () => {
    assert.throws(() => createEmailMessage({ ...baseInput, to: [] }), TypeError);
    assert.throws(() => createEmailMessage({ ...baseInput, to: undefined }), TypeError);
  });

  test('throws when subject is missing', () => {
    assert.throws(() => createEmailMessage({ ...baseInput, subject: '' }), TypeError);
  });

  test('throws when neither text nor html is provided', () => {
    assert.throws(
      () =>
        createEmailMessage({
          from: baseInput.from,
          to: baseInput.to,
          subject: baseInput.subject,
        }),
      TypeError,
    );
  });

  test('throws on invalid replyTo', () => {
    assert.throws(() => createEmailMessage({ ...baseInput, replyTo: 'nope' }), TypeError);
  });

  test('recipientCount counts unique across to/cc/bcc', () => {
    const message = createEmailMessage({
      ...baseInput,
      to: ['a@x.co', 'b@x.co'],
      cc: ['b@x.co', 'c@x.co'], // b@x.co duplicated
      bcc: ['d@x.co'],
    });
    assert.equal(recipientCount(message), 4);
  });
});

describe('email port — assertEmailPort', () => {
  test('accepts a fully-featured adapter', () => {
    assert.doesNotThrow(() => assertEmailPort(createMemoryEmailAdapter()));
  });

  test('rejects non-objects', () => {
    assert.throws(() => assertEmailPort(null), TypeError);
    assert.throws(() => assertEmailPort(42), TypeError);
  });

  test('rejects adapters missing required methods', () => {
    assert.throws(() => assertEmailPort({ send: () => {}, list: () => [] }), TypeError);
    assert.throws(() => assertEmailPort({ send: () => {}, clear: () => {} }), TypeError);
  });
});

describe('email adapter — memory', () => {
  test('sends a message and returns a stored record with sent status', async () => {
    const now = 1000;
    const mailer = createMemoryEmailAdapter({
      now: () => now,
      idFactory: (() => {
        let n = 0;
        return () => `e${++n}`;
      })(),
    });
    const record = await mailer.send({
      from: 'hello@example.com',
      to: 'alice@example.com',
      subject: 'Welcome',
      text: 'Hi',
    });
    assert.equal(record.id, 'e1');
    assert.equal(record.status, 'sent');
    assert.equal(record.sentAt, 1000);
    assert.equal(record.message.id, 'e1');
  });

  test('list snapshot includes every sent message', async () => {
    const mailer = createMemoryEmailAdapter();
    await mailer.send({ from: 'a@x.co', to: 'b@x.co', subject: 's', text: 't' });
    await mailer.send({ from: 'a@x.co', to: 'c@x.co', subject: 's', text: 't' });
    assert.equal(mailer.list().length, 2);
    assert.equal(mailer.list('sent').length, 2);
    assert.equal(mailer.list('failed').length, 0);
  });

  test('clear empties the record store', async () => {
    const mailer = createMemoryEmailAdapter();
    await mailer.send({ from: 'a@x.co', to: 'b@x.co', subject: 's', text: 't' });
    mailer.clear();
    assert.equal(mailer.list().length, 0);
  });

  test('propagates validation errors from the domain', async () => {
    const mailer = createMemoryEmailAdapter();
    await assert.rejects(
      () => mailer.send({ from: 'a@x.co', to: 'b@x.co', subject: 's' }),
      TypeError,
    );
  });
});

describe('email adapter — console', () => {
  test('validates through the domain and routes to the injected log sink', async () => {
    const logged = [];
    const mailer = createConsoleEmailAdapter({
      log: (entry) => logged.push(entry),
      now: () => 5000,
      idFactory: (() => {
        let n = 0;
        return () => `c${++n}`;
      })(),
    });
    const record = await mailer.send({
      from: 'hello@example.com',
      to: ['a@x.co', 'b@x.co'],
      subject: 'Hi',
      text: 'body',
    });
    assert.equal(record.id, 'c1');
    assert.equal(logged.length, 1);
    assert.equal(logged[0].id, 'c1');
    assert.equal(logged[0].recipients, 2);
    assert.equal(mailer.list().length, 1);
  });

  test('still records messages when the log sink throws? — sink errors are the host problem', async () => {
    // Document the current contract: the console adapter does not catch log errors.
    // If a host wants swallow-safe logging, wrap the sink.
    const mailer = createConsoleEmailAdapter({
      log: () => {
        throw new Error('boom');
      },
    });
    await assert.rejects(
      () => mailer.send({ from: 'a@x.co', to: 'b@x.co', subject: 's', text: 't' }),
      /boom/,
    );
  });
});
