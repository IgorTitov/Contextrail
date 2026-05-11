/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose GraphQL demo route — execute a query against a sample schema via the graphql module.
 * @sidecar graphql.mjs.header.md
 * @layer app | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

// SpecRefs: TPL-001
/**
 * GraphQL demo route — exercises the graphql module's public API from a
 * host server. A small in-process schema with `hello`, `greeting(name)`,
 * and `me { id name }` is parsed + executed per request via the
 * in-memory transport. Real deployments swap the transport adapter for
 * an HTTP- or WebSocket-backed implementation behind the same port.
 *
 * GET /api/graphql?query=<url-encoded>
 */

import {
  createSchema,
  createMemoryGraphqlTransport,
} from '../../../modules/graphql/public-api.mjs';

const DEMO_SCHEMA = createSchema({
  types: {
    User: {
      fields: {
        id: { type: 'ID' },
        name: { type: 'String' },
      },
    },
  },
  queries: {
    hello: {
      type: 'String',
      resolver: () => 'Hello, world!',
    },
    greeting: {
      type: 'String',
      resolver: (_parent, args) => `Hello, ${args.name ?? 'stranger'}!`,
    },
    me: {
      type: 'User',
      resolver: () => ({ id: '42', name: 'Ada Lovelace' }),
    },
  },
});

const DEMO_TRANSPORT = createMemoryGraphqlTransport({ schema: DEMO_SCHEMA });

/**
 * @param {{ query: URLSearchParams }} req
 * @param {object} _ctx
 */
export async function graphqlHandler(req, _ctx) {
  const raw = req.query.get('query') ?? '{ hello }';
  const result = await DEMO_TRANSPORT.handleQuery(raw);
  return { query: raw, ...result };
}

export { DEMO_SCHEMA, DEMO_TRANSPORT };
