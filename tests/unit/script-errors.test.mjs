/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Prove the shape, inheritance, and serialization of the typed error hierarchy for repo scripts.
 * @sidecar script-errors.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ScriptError,
  ValidationError,
  FileNotFoundError,
  ParseError,
  SchemaError,
} from '../../scripts/lib/errors.mjs';

test('ScriptError carries code, file, and details', () => {
  const err = new ScriptError('something broke', {
    code: 'CUSTOM',
    file: 'foo.mjs',
    details: { line: 42 },
  });
  assert.ok(err instanceof Error);
  assert.ok(err instanceof ScriptError);
  assert.equal(err.name, 'ScriptError');
  assert.equal(err.code, 'CUSTOM');
  assert.equal(err.file, 'foo.mjs');
  assert.deepEqual(err.details, { line: 42 });
  assert.equal(err.message, 'something broke');
});

test('ScriptError defaults code to SCRIPT_ERROR', () => {
  const err = new ScriptError('bare error');
  assert.equal(err.code, 'SCRIPT_ERROR');
  assert.equal(err.file, undefined);
  assert.equal(err.details, undefined);
});

test('ScriptError.toJSON() produces a structured object', () => {
  const err = new ScriptError('msg', { code: 'X', file: 'a.md', details: { k: 1 } });
  const json = err.toJSON();
  assert.deepEqual(json, {
    name: 'ScriptError',
    code: 'X',
    message: 'msg',
    file: 'a.md',
    details: { k: 1 },
  });
});

test('toJSON() omits file and details when unset', () => {
  const json = new ScriptError('bare').toJSON();
  assert.ok(!('file' in json));
  assert.ok(!('details' in json));
});

test('subclasses set correct default codes', () => {
  assert.equal(new ValidationError('v').code, 'VALIDATION_ERROR');
  assert.equal(new FileNotFoundError('f').code, 'FILE_NOT_FOUND');
  assert.equal(new ParseError('p').code, 'PARSE_ERROR');
  assert.equal(new SchemaError('s').code, 'SCHEMA_ERROR');
});

test('subclasses are instanceof ScriptError and Error', () => {
  for (const Cls of [ValidationError, FileNotFoundError, ParseError, SchemaError]) {
    const err = new Cls('test');
    assert.ok(err instanceof ScriptError);
    assert.ok(err instanceof Error);
  }
});

test('subclass code can be overridden', () => {
  const err = new ValidationError('custom', { code: 'BOUNDARY_VIOLATION' });
  assert.equal(err.code, 'BOUNDARY_VIOLATION');
});

test('subclass carries file and details through to toJSON', () => {
  const err = new FileNotFoundError('missing README.md', {
    file: 'docs/README.md',
    details: { dir: 'docs' },
  });
  const json = err.toJSON();
  assert.equal(json.name, 'FileNotFoundError');
  assert.equal(json.code, 'FILE_NOT_FOUND');
  assert.equal(json.file, 'docs/README.md');
  assert.deepEqual(json.details, { dir: 'docs' });
});
