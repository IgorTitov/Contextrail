/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Unit tests for the JSDoc @typedef parser used by capabilities-sync.
 * @sidecar jsdoc-typedef-parser.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Unit tests for scripts/checks/lib/jsdoc-typedef-parser.mjs.
 *
 * SpecRefs: TPL-179
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { parseJsdocTypedefs } from '../../scripts/checks/lib/jsdoc-typedef-parser.mjs';

describe('parseJsdocTypedefs', () => {
  it('returns empty typedefs for source with no @typedef', () => {
    const src = `
      // nothing here
      export function noop() {}
    `;
    const result = parseJsdocTypedefs(src);
    assert.deepEqual(result.typedefs, {});
  });

  it('parses a simple object typedef with plain properties', () => {
    const src = `
      /**
       * @typedef {object} CacheSetOptions
       * @property {number} ttl — time-to-live in milliseconds
       * @property {number} size — logical size hint
       */
    `;
    const result = parseJsdocTypedefs(src);
    assert.ok(result.typedefs.CacheSetOptions, 'CacheSetOptions present');
    const fields = result.typedefs.CacheSetOptions.fields;
    assert.equal(fields.ttl.type, 'number');
    assert.equal(fields.ttl.optional, false);
    assert.equal(fields.size.type, 'number');
  });

  it('parses optional properties marked with [name]', () => {
    const src = `
      /**
       * @typedef {object} CachePortOptions
       * @property {number} [maxEntries] — maximum number of entries
       * @property {number} [maxSize]
       * @property {number} [defaultTtl]
       */
    `;
    const result = parseJsdocTypedefs(src);
    const fields = result.typedefs.CachePortOptions.fields;
    assert.equal(fields.maxEntries.optional, true);
    assert.equal(fields.maxSize.optional, true);
    assert.equal(fields.defaultTtl.type, 'number');
  });

  it('parses method signatures inside a port-style typedef', () => {
    const src = `
      /**
       * @typedef {object} CachePort
       * @property {(key: string) => *|undefined} get — retrieve value
       * @property {(key: string, value: *, options?: CacheSetOptions) => void} set
       * @property {(key: string) => boolean} delete
       * @property {() => number} size
       */
    `;
    const result = parseJsdocTypedefs(src);
    const port = result.typedefs.CachePort;
    assert.ok(port, 'CachePort present');
    assert.equal(port.kind, 'interface');
    assert.ok(port.methods.get, 'get method extracted');
    assert.deepEqual(port.methods.get.params, [{ name: 'key', type: 'string' }]);
    assert.equal(port.methods.get.returns, '*|undefined');

    assert.equal(port.methods.set.params.length, 3);
    assert.equal(port.methods.set.params[0].name, 'key');
    assert.equal(port.methods.set.params[0].type, 'string');
    assert.equal(port.methods.set.params[2].name, 'options');
    assert.equal(port.methods.set.params[2].optional, true);
    assert.equal(port.methods.set.params[2].type, 'CacheSetOptions');
    assert.equal(port.methods.set.returns, 'void');

    assert.deepEqual(port.methods.size.params, []);
    assert.equal(port.methods.size.returns, 'number');
  });

  // TPL-184 parser extensions.

  it('accepts capital-O {Object} as an object-form typedef header', () => {
    const src = `
      /**
       * @typedef {Object} ApiClientPort
       * @property {(url: string) => void} get
       */
    `;
    const result = parseJsdocTypedefs(src);
    assert.ok(result.typedefs.ApiClientPort, 'ApiClientPort present');
    assert.equal(result.typedefs.ApiClientPort.kind, 'interface');
    assert.ok(result.typedefs.ApiClientPort.methods.get);
  });

  it('routes multiple object-form typedefs in one JSDoc block to the correct buckets', () => {
    const src = `
      /**
       * @typedef {object} LogEntry
       * @property {string} message
       * @property {number} timestamp
       *
       * @typedef {object} LogPort
       * @property {(msg: string) => void} info
       * @property {(msg: string) => void} warn
       */
    `;
    const result = parseJsdocTypedefs(src);
    assert.equal(result.typedefs.LogEntry.kind, 'record');
    assert.ok(result.typedefs.LogEntry.fields.message);
    assert.equal(result.typedefs.LogEntry.fields.timestamp.type, 'number');
    assert.equal(result.typedefs.LogPort.kind, 'interface');
    assert.ok(result.typedefs.LogPort.methods.info);
    assert.ok(result.typedefs.LogPort.methods.warn);
    // LogPort's methods must NOT leak into LogEntry and vice versa.
    assert.equal(result.typedefs.LogEntry.fields.info, undefined);
  });

  it('parses rest parameters (...args: any[]) in arrow signatures', () => {
    const src = `
      /**
       * @typedef {object} EventBusPort
       * @property {(event: string, ...args: any[]) => void} emit
       */
    `;
    const result = parseJsdocTypedefs(src);
    const emit = result.typedefs.EventBusPort.methods.emit;
    assert.equal(emit.params.length, 2);
    assert.equal(emit.params[0].name, 'event');
    assert.equal(emit.params[1].name, 'args');
    assert.equal(emit.params[1].type, 'any[]');
    assert.equal(emit.params[1].rest, true);
  });

  it('skips cross-module `@typedef {import(...).X} Name` re-export aliases', () => {
    const src = `
      /**
       * @typedef {import('../../ai-chat/ports/ai-chat-port.mjs').AiChatMessage} AiChatMessage
       *
       * @typedef {object} LocalLlmPort
       * @property {() => AiChatMessage[]} getHistory
       */
    `;
    const result = parseJsdocTypedefs(src);
    assert.equal(result.typedefs.AiChatMessage, undefined, 'import-alias skipped');
    assert.ok(result.typedefs.LocalLlmPort, 'port typedef still parsed');
    assert.equal(result.typedefs.LocalLlmPort.methods.getHistory.returns, 'AiChatMessage[]');
  });

  it('coalesces multi-line inline-record typedefs across stripped JSDoc lines', () => {
    const src = `
      /**
       * @typedef {{
       *   id: string,
       *   target: string,
       *   order: number,
       * }} TourStep
       */
    `;
    const result = parseJsdocTypedefs(src);
    assert.ok(result.typedefs.TourStep, 'TourStep present');
    assert.equal(result.typedefs.TourStep.kind, 'record');
    assert.equal(result.typedefs.TourStep.fields.id.type, 'string');
    assert.equal(result.typedefs.TourStep.fields.target.type, 'string');
    assert.equal(result.typedefs.TourStep.fields.order.type, 'number');
  });

  it('parses multiple typedefs in the same source and classifies them', () => {
    const src = `
      /**
       * @typedef {object} CacheEntry
       * @property {*} value
       * @property {number} createdAt
       * @property {number} [ttl]
       */

      /**
       * @typedef {object} CachePort
       * @property {(key: string) => *|undefined} get
       * @property {() => void} clear
       */
    `;
    const result = parseJsdocTypedefs(src);
    assert.equal(Object.keys(result.typedefs).length, 2);
    assert.equal(result.typedefs.CacheEntry.kind, 'record');
    assert.ok(result.typedefs.CacheEntry.fields.value);
    assert.equal(result.typedefs.CachePort.kind, 'interface');
    assert.ok(result.typedefs.CachePort.methods.get);
    assert.ok(result.typedefs.CachePort.methods.clear);
  });
});
