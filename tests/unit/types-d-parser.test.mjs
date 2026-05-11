/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Unit tests for the bounded TypeScript interface parser used by capabilities-sync.
 * @sidecar types-d-parser.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Unit tests for scripts/checks/lib/types-d-parser.mjs.
 *
 * The parser supports a narrow TypeScript interface subset documented in
 * ADR-0010 "Port-types convention". Positive cases lock in the supported
 * features; negative cases lock in that unsupported features are rejected
 * with a clean, line-numbered error (not a crash).
 *
 * SpecRefs: TPL-180; TPL-178
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { parseTypesDeclaration } from '../../scripts/checks/lib/types-d-parser.mjs';

const ROOT = process.cwd();

describe('parseTypesDeclaration: positive cases', () => {
  it('returns empty typedefs for a source with no interfaces', () => {
    const src = `
      // nothing here
      export declare function noop(): void;
    `;
    const result = parseTypesDeclaration(src);
    assert.deepEqual(result.typedefs, {});
  });

  it('parses a method-only interface as kind=interface', () => {
    const src = `
      export interface CachePort {
        get(key: string): string;
        set(key: string, value: string): void;
        clear(): void;
      }
    `;
    const { typedefs } = parseTypesDeclaration(src);
    assert.ok(typedefs.CachePort);
    assert.equal(typedefs.CachePort.kind, 'interface');
    assert.ok(typedefs.CachePort.methods.get);
    assert.deepEqual(typedefs.CachePort.methods.get.params, [{ name: 'key', type: 'string' }]);
    assert.equal(typedefs.CachePort.methods.get.returns, 'string');
    assert.equal(typedefs.CachePort.methods.set.params.length, 2);
    assert.equal(typedefs.CachePort.methods.clear.returns, 'void');
    assert.deepEqual(typedefs.CachePort.methods.clear.params, []);
  });

  it('parses a field-only interface as kind=record', () => {
    const src = `
      export interface Options {
        ttl: number;
        size: number;
      }
    `;
    const { typedefs } = parseTypesDeclaration(src);
    assert.equal(typedefs.Options.kind, 'record');
    assert.equal(typedefs.Options.fields.ttl.type, 'number');
    assert.equal(typedefs.Options.fields.ttl.optional, false);
    assert.equal(typedefs.Options.fields.size.type, 'number');
  });

  it('parses optional fields with ?', () => {
    const src = `
      export interface Options {
        topK?: number;
        minScore?: number;
      }
    `;
    const { typedefs } = parseTypesDeclaration(src);
    const f = typedefs.Options.fields;
    assert.equal(f.topK.optional, true);
    assert.equal(f.topK.type, 'number');
    assert.equal(f.minScore.optional, true);
  });

  it('parses Promise<T>, Record<K,V>, and array types', () => {
    const src = `
      export interface Port {
        load(source: string): Promise<Doc[]>;
        meta(): Record<string, unknown>;
        list(): Array<string>;
      }
    `;
    const { typedefs } = parseTypesDeclaration(src);
    const m = typedefs.Port.methods;
    assert.equal(m.load.returns, 'Promise<Doc[]>');
    assert.equal(m.meta.returns, 'Record<string, unknown>');
    assert.equal(m.list.returns, 'Array<string>');
  });

  it('parses union types in parameters and returns', () => {
    const src = `
      export interface Port {
        transform(q: string): string | string[];
        embed(input: Float32Array | number[]): void;
      }
    `;
    const { typedefs } = parseTypesDeclaration(src);
    const m = typedefs.Port.methods;
    assert.equal(m.transform.returns, 'string | string[]');
    assert.equal(m.embed.params[0].type, 'Float32Array | number[]');
  });

  it('parses optional method parameters', () => {
    const src = `
      export interface Port {
        search(q: string, opts?: SearchOptions): void;
      }
    `;
    const { typedefs } = parseTypesDeclaration(src);
    const params = typedefs.Port.methods.search.params;
    assert.equal(params[0].name, 'q');
    assert.equal(params[0].optional, undefined);
    assert.equal(params[1].name, 'opts');
    assert.equal(params[1].optional, true);
    assert.equal(params[1].type, 'SearchOptions');
  });

  it('parses cross-references between interfaces in the same file', () => {
    const src = `
      export interface Document {
        id: string;
        content: string;
      }

      export interface Port {
        addDocuments(docs: Document[]): Promise<string[]>;
      }
    `;
    const { typedefs } = parseTypesDeclaration(src);
    assert.equal(typedefs.Document.kind, 'record');
    assert.equal(typedefs.Port.kind, 'interface');
    assert.equal(typedefs.Port.methods.addDocuments.params[0].type, 'Document[]');
  });

  it('handles line comments and JSDoc comments inside interfaces', () => {
    const src = `
      export interface Options {
        // a leading line comment
        /** docstring */
        ttl?: number;
      }
    `;
    const { typedefs } = parseTypesDeclaration(src);
    assert.equal(typedefs.Options.fields.ttl.optional, true);
    assert.equal(typedefs.Options.fields.ttl.type, 'number');
  });

  it('treats non-export interfaces the same as export interface', () => {
    const src = `
      interface LocalShape {
        x: number;
      }
    `;
    const { typedefs } = parseTypesDeclaration(src);
    assert.ok(typedefs.LocalShape);
    assert.equal(typedefs.LocalShape.kind, 'record');
  });

  it('round-trips modules/retrieval/types.d.ts with all 7 ports present', () => {
    const src = readFileSync(path.join(ROOT, 'modules/retrieval/types.d.ts'), 'utf8');
    const { typedefs } = parseTypesDeclaration(src);

    const expectedPorts = [
      'RetrievalPort',
      'ChunkerPort',
      'TokenizerPort',
      'EmbedderPort',
      'ReRankerPort',
      'DocumentLoaderPort',
      'QueryTransformerPort',
    ];
    for (const p of expectedPorts) {
      assert.ok(typedefs[p], `${p} present`);
      assert.equal(typedefs[p].kind, 'interface', `${p} is interface`);
    }

    // RetrievalPort has 4 methods
    assert.equal(
      Object.keys(typedefs.RetrievalPort.methods).length,
      4,
      'RetrievalPort has 4 methods',
    );
    assert.equal(typedefs.RetrievalPort.methods.addDocuments.params[0].type, 'RetrievalDocument[]');
    assert.equal(typedefs.RetrievalPort.methods.addDocuments.returns, 'Promise<string[]>');
    assert.equal(typedefs.RetrievalPort.methods.search.params[1].optional, true);

    // Supporting record is present too
    assert.ok(typedefs.RetrievalDocument);
    assert.equal(typedefs.RetrievalDocument.kind, 'record');
    assert.equal(typedefs.RetrievalDocument.fields.id.optional, true);
    assert.equal(typedefs.RetrievalDocument.fields.content.optional, false);
  });
});

describe('parseTypesDeclaration: negative cases', () => {
  it('rejects interface generics with a clean error naming the feature and line', () => {
    const src = `
      export interface Foo<T> {
        x: T;
      }
    `;
    assert.throws(
      () => parseTypesDeclaration(src),
      (err) => err instanceof Error && /generic/i.test(err.message) && /line\s*2/.test(err.message),
    );
  });

  it('rejects extends clauses on interfaces', () => {
    const src = `
      export interface Foo extends Bar {
        x: number;
      }
    `;
    assert.throws(
      () => parseTypesDeclaration(src),
      (err) => err instanceof Error && /extends/i.test(err.message) && /line\s*2/.test(err.message),
    );
  });

  it('rejects type aliases', () => {
    const src = `
      export type Handler = (x: string) => void;
    `;
    assert.throws(
      () => parseTypesDeclaration(src),
      (err) =>
        err instanceof Error && /type alias/i.test(err.message) && /line\s*2/.test(err.message),
    );
  });

  it('rejects namespaces', () => {
    const src = `
      export namespace Foo {
        export interface X { y: number; }
      }
    `;
    assert.throws(
      () => parseTypesDeclaration(src),
      (err) =>
        err instanceof Error && /namespace/i.test(err.message) && /line\s*2/.test(err.message),
    );
  });

  it('rejects decorators', () => {
    const src = `
      @sealed
      export interface Foo {
        x: number;
      }
    `;
    assert.throws(
      () => parseTypesDeclaration(src),
      (err) =>
        err instanceof Error && /decorator/i.test(err.message) && /line\s*2/.test(err.message),
    );
  });

  it('rejects mapped types in interface bodies', () => {
    const src = `
      export interface Foo {
        items: { [K in string]: number };
      }
    `;
    assert.throws(
      () => parseTypesDeclaration(src),
      (err) => err instanceof Error && /mapped type/i.test(err.message),
    );
  });
});
