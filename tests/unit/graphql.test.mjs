/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Unit proof for the graphql bounded module — schema, parser subset, executor, port, memory transport.
 * @sidecar graphql.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createSchema,
  stripTypeDecoration,
  isBuiltinScalar,
  parseQuery,
  executeQuery,
  assertGraphqlTransportPort,
  createMemoryGraphqlTransport,
} from '../../modules/graphql/public-api.mjs';

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

describe('graphql domain — createSchema', () => {
  test('accepts a minimal schema with only query fields', () => {
    const schema = createSchema({
      types: {},
      queries: { hello: { type: 'String', resolver: () => 'hi' } },
    });
    assert.equal(typeof schema.queries.hello.resolver, 'function');
    assert.ok(Object.isFrozen(schema));
  });

  test('accepts custom types referenced from queries', () => {
    const schema = createSchema({
      types: {
        User: { fields: { id: { type: 'ID' }, name: { type: 'String' } } },
      },
      queries: { me: { type: 'User' } },
    });
    assert.ok(schema.types.User);
    assert.equal(schema.queries.me.type, 'User');
  });

  test('accepts list and non-null type decoration', () => {
    assert.doesNotThrow(() =>
      createSchema({
        types: { Tag: { fields: { name: { type: 'String!' } } } },
        queries: { tags: { type: '[Tag!]!' } },
      }),
    );
  });

  test('rejects null / non-object input', () => {
    assert.throws(() => createSchema(null), TypeError);
    // @ts-expect-error invalid
    assert.throws(() => createSchema('x'), TypeError);
  });

  test('rejects a type with missing fields', () => {
    assert.throws(
      // @ts-expect-error invalid
      () => createSchema({ types: { User: {} }, queries: {} }),
      TypeError,
    );
  });

  test('rejects a field with a missing type string', () => {
    assert.throws(
      () =>
        createSchema({
          // @ts-expect-error invalid
          types: { User: { fields: { id: {} } } },
          queries: {},
        }),
      TypeError,
    );
  });

  test('rejects a field resolver that is not a function', () => {
    assert.throws(
      () =>
        createSchema({
          types: {},
          // @ts-expect-error invalid
          queries: { hello: { type: 'String', resolver: 'not a fn' } },
        }),
      TypeError,
    );
  });

  test('rejects an unknown type ref', () => {
    assert.throws(
      () =>
        createSchema({
          types: {},
          queries: { me: { type: 'User' } },
        }),
      TypeError,
    );
  });
});

describe('graphql domain — type helpers', () => {
  test('stripTypeDecoration strips ! and [T] decoration', () => {
    assert.equal(stripTypeDecoration('String'), 'String');
    assert.equal(stripTypeDecoration('String!'), 'String');
    assert.equal(stripTypeDecoration('[String]'), 'String');
    assert.equal(stripTypeDecoration('[String!]!'), 'String');
  });

  test('isBuiltinScalar recognizes the five GraphQL scalars', () => {
    for (const s of ['String', 'Int', 'Float', 'Boolean', 'ID']) {
      assert.equal(isBuiltinScalar(s), true);
    }
    assert.equal(isBuiltinScalar('User'), false);
  });
});

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

describe('graphql domain — parseQuery subset', () => {
  test('parses a simple field list', () => {
    const ast = parseQuery('{ hello world }');
    assert.equal(ast.kind, 'Query');
    assert.equal(ast.operation, 'query');
    assert.equal(ast.selections.length, 2);
    assert.equal(ast.selections[0].name, 'hello');
    assert.equal(ast.selections[1].name, 'world');
  });

  test('parses the optional query keyword wrapper', () => {
    const ast = parseQuery('query { hello }');
    assert.equal(ast.operation, 'query');
    assert.equal(ast.selections[0].name, 'hello');
  });

  test('parses the mutation keyword wrapper', () => {
    const ast = parseQuery('mutation { ping }');
    assert.equal(ast.operation, 'mutation');
  });

  test('parses string arguments', () => {
    const ast = parseQuery('{ greeting(name: "Alice") }');
    const field = ast.selections[0];
    assert.equal(field.name, 'greeting');
    assert.equal(field.args.length, 1);
    assert.equal(field.args[0].name, 'name');
    assert.equal(field.args[0].value, 'Alice');
  });

  test('parses number and boolean arguments', () => {
    const ast = parseQuery('{ items(limit: 10, descending: true, score: -1.5) }');
    const args = Object.fromEntries(ast.selections[0].args.map((a) => [a.name, a.value]));
    assert.equal(args.limit, 10);
    assert.equal(args.descending, true);
    assert.equal(args.score, -1.5);
  });

  test('parses nested selection sets', () => {
    const ast = parseQuery('{ me { id name } }');
    const me = ast.selections[0];
    assert.equal(me.name, 'me');
    assert.equal(me.selections.length, 2);
    assert.equal(me.selections[0].name, 'id');
    assert.equal(me.selections[1].name, 'name');
  });

  test('parses line comments', () => {
    const ast = parseQuery('{\n  # a comment\n  hello\n}');
    assert.equal(ast.selections[0].name, 'hello');
  });

  test('rejects empty and non-string input', () => {
    assert.throws(() => parseQuery(''), TypeError);
    assert.throws(() => parseQuery('   '), TypeError);
    // @ts-expect-error invalid
    assert.throws(() => parseQuery(null), TypeError);
  });

  test('rejects a query without a selection set', () => {
    assert.throws(() => parseQuery('hello'), SyntaxError);
  });

  test('rejects an unterminated selection set', () => {
    assert.throws(() => parseQuery('{ hello'), SyntaxError);
  });

  test('rejects an unterminated string argument', () => {
    assert.throws(() => parseQuery('{ greet(name: "Alice) }'), SyntaxError);
  });

  test('rejects fragments with a subset-specific message', () => {
    assert.throws(() => parseQuery('{ ...UserFields }'), /fragment/);
    assert.throws(() => parseQuery('{ ... on User { id } }'), /fragment/);
  });

  test('rejects variables with a subset-specific message', () => {
    assert.throws(() => parseQuery('{ user(id: $id) }'), /variable/);
  });

  test('rejects directives with a subset-specific message', () => {
    assert.throws(() => parseQuery('{ field @skip(if: true) }'), /directive/);
  });
});

// ---------------------------------------------------------------------------
// Executor
// ---------------------------------------------------------------------------

describe('graphql domain — executeQuery', () => {
  const helloSchema = createSchema({
    types: {},
    queries: {
      hello: { type: 'String', resolver: () => 'Hello, world!' },
      greeting: {
        type: 'String',
        resolver: (_p, args) => `Hello, ${args.name}!`,
      },
    },
  });

  test('resolves a flat query with arguments', async () => {
    const ast = parseQuery('{ hello greeting(name: "Alice") }');
    const result = await executeQuery(helloSchema, ast);
    assert.deepEqual(result.data, {
      hello: 'Hello, world!',
      greeting: 'Hello, Alice!',
    });
    assert.deepEqual(result.errors, []);
  });

  test('resolves a nested object with trivial parent access', async () => {
    const schema = createSchema({
      types: {
        User: { fields: { id: { type: 'ID' }, name: { type: 'String' } } },
      },
      queries: {
        me: {
          type: 'User',
          resolver: () => ({ id: '42', name: 'Alice' }),
        },
      },
    });
    const ast = parseQuery('{ me { id name } }');
    const result = await executeQuery(schema, ast);
    assert.deepEqual(result.data, { me: { id: '42', name: 'Alice' } });
    assert.deepEqual(result.errors, []);
  });

  test('aggregates resolver errors into result.errors with the field path', async () => {
    const schema = createSchema({
      types: {},
      queries: {
        fine: { type: 'String', resolver: () => 'ok' },
        broken: {
          type: 'String',
          resolver: () => {
            throw new Error('resolver exploded');
          },
        },
      },
    });
    const result = await executeQuery(schema, parseQuery('{ fine broken }'));
    assert.equal(result.data.fine, 'ok');
    assert.equal(result.data.broken, null);
    assert.equal(result.errors.length, 1);
    assert.equal(result.errors[0].message, 'resolver exploded');
    assert.deepEqual(result.errors[0].path, ['broken']);
  });

  test('records an error for an unknown root field', async () => {
    const result = await executeQuery(helloSchema, parseQuery('{ unknown }'));
    assert.equal(result.data.unknown, null);
    assert.equal(result.errors.length, 1);
    assert.deepEqual(result.errors[0].path, ['unknown']);
  });

  test('dispatches a mutation query against schema.mutations', async () => {
    const schema = createSchema({
      types: {},
      queries: { noop: { type: 'String', resolver: () => 'noop' } },
      mutations: {
        echo: { type: 'String', resolver: (_p, args) => String(args.msg) },
      },
    });
    const result = await executeQuery(schema, parseQuery('mutation { echo(msg: "hi") }'));
    assert.equal(result.data.echo, 'hi');
  });

  test('throws on an invalid AST', async () => {
    await assert.rejects(
      // @ts-expect-error invalid
      () => executeQuery(helloSchema, null),
      TypeError,
    );
  });
});

// ---------------------------------------------------------------------------
// Port assertion
// ---------------------------------------------------------------------------

describe('graphql ports — assertGraphqlTransportPort', () => {
  test('accepts a complete adapter', () => {
    assert.doesNotThrow(() => assertGraphqlTransportPort({ handleQuery() {} }));
  });

  test('rejects null and non-object', () => {
    assert.throws(() => assertGraphqlTransportPort(null), TypeError);
    assert.throws(() => assertGraphqlTransportPort('no'), TypeError);
  });

  test('rejects adapter missing handleQuery', () => {
    assert.throws(() => assertGraphqlTransportPort({}), TypeError);
  });
});

// ---------------------------------------------------------------------------
// Memory transport adapter
// ---------------------------------------------------------------------------

describe('graphql adapters — createMemoryGraphqlTransport', () => {
  const schema = createSchema({
    types: {},
    queries: {
      hello: { type: 'String', resolver: () => 'hi' },
      greeting: {
        type: 'String',
        resolver: (_p, args) => `Hello, ${args.name}!`,
      },
    },
  });

  test('satisfies the port contract', () => {
    const transport = createMemoryGraphqlTransport({ schema });
    assert.doesNotThrow(() => assertGraphqlTransportPort(transport));
  });

  test('round-trips a simple query', async () => {
    const transport = createMemoryGraphqlTransport({ schema });
    const result = await transport.handleQuery('{ hello }');
    assert.deepEqual(result.data, { hello: 'hi' });
    assert.deepEqual(result.errors, []);
  });

  test('returns parse errors in the canonical { data, errors } shape', async () => {
    const transport = createMemoryGraphqlTransport({ schema });
    const result = await transport.handleQuery('{ ...Frag }');
    assert.equal(result.data, null);
    assert.equal(result.errors.length, 1);
    assert.match(result.errors[0].message, /fragment/);
  });

  test('round-trips a query with a string argument', async () => {
    const transport = createMemoryGraphqlTransport({ schema });
    const result = await transport.handleQuery('{ greeting(name: "Alice") }');
    assert.equal(result.data.greeting, 'Hello, Alice!');
  });
});
