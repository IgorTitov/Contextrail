/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Unit proof for the prerender bounded module — manifest, result, plan, runner, memory output.
 * @sidecar prerender.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createRouteManifest,
  isRouteManifest,
  createRenderResult,
  createPrerenderPlan,
  planToTargets,
  assertRenderFunction,
  assertStaticOutputPort,
  createMemoryStaticOutput,
  createSequentialPrerenderRunner,
} from '../../modules/prerender/public-api.mjs';

// ---------------------------------------------------------------------------
// Route manifest
// ---------------------------------------------------------------------------

describe('prerender domain — createRouteManifest', () => {
  test('accepts an empty routes list and returns a frozen manifest', () => {
    const manifest = createRouteManifest({ routes: [] });
    assert.deepEqual(manifest.routes, []);
    assert.ok(Object.isFrozen(manifest));
    assert.ok(Object.isFrozen(manifest.routes));
    assert.ok(isRouteManifest(manifest));
  });

  test('accepts routes with path, title, and meta', () => {
    const manifest = createRouteManifest({
      routes: [{ path: '/', title: 'Home', meta: { description: 'Landing' } }, { path: '/about' }],
    });
    assert.equal(manifest.routes.length, 2);
    assert.equal(manifest.routes[0].path, '/');
    assert.equal(manifest.routes[0].title, 'Home');
    assert.equal(manifest.routes[0].meta.description, 'Landing');
    assert.ok(Object.isFrozen(manifest.routes[0]));
    assert.ok(Object.isFrozen(manifest.routes[0].meta));
  });

  test('rejects null or non-object input', () => {
    assert.throws(() => createRouteManifest(null), TypeError);
    // @ts-expect-error invalid
    assert.throws(() => createRouteManifest('x'), TypeError);
  });

  test('rejects a non-array routes field', () => {
    // @ts-expect-error invalid
    assert.throws(() => createRouteManifest({ routes: {} }), TypeError);
  });

  test('rejects a route whose path does not start with /', () => {
    assert.throws(() => createRouteManifest({ routes: [{ path: 'about' }] }), TypeError);
  });

  test('rejects a route with a non-string path', () => {
    assert.throws(
      // @ts-expect-error invalid
      () => createRouteManifest({ routes: [{ path: 42 }] }),
      TypeError,
    );
  });

  test('rejects duplicate paths', () => {
    assert.throws(
      () =>
        createRouteManifest({
          routes: [{ path: '/a' }, { path: '/a' }],
        }),
      /duplicate/,
    );
  });

  test('rejects a non-string title', () => {
    assert.throws(
      () =>
        createRouteManifest({
          // @ts-expect-error invalid
          routes: [{ path: '/a', title: 42 }],
        }),
      TypeError,
    );
  });

  test('rejects a non-object meta', () => {
    assert.throws(
      () =>
        createRouteManifest({
          // @ts-expect-error invalid
          routes: [{ path: '/a', meta: 'not-an-object' }],
        }),
      TypeError,
    );
  });

  test('isRouteManifest returns false for plain objects', () => {
    assert.equal(isRouteManifest(null), false);
    assert.equal(isRouteManifest({ routes: [] }), false);
  });
});

// ---------------------------------------------------------------------------
// Render result
// ---------------------------------------------------------------------------

describe('prerender domain — createRenderResult', () => {
  test('accepts a minimal { path, html } input and defaults status to 200', () => {
    const r = createRenderResult({ path: '/', html: '<h1>Home</h1>' });
    assert.equal(r.status, 200);
    assert.deepEqual(r.headers, {});
    assert.ok(Object.isFrozen(r));
    assert.ok(Object.isFrozen(r.headers));
  });

  test('accepts a custom status and headers map', () => {
    const r = createRenderResult({
      path: '/x',
      html: '',
      status: 201,
      headers: { 'content-type': 'text/html' },
    });
    assert.equal(r.status, 201);
    assert.equal(r.headers['content-type'], 'text/html');
  });

  test('rejects a path that does not start with /', () => {
    assert.throws(() => createRenderResult({ path: 'about', html: '' }), TypeError);
  });

  test('rejects a non-string html', () => {
    assert.throws(
      // @ts-expect-error invalid
      () => createRenderResult({ path: '/', html: 123 }),
      TypeError,
    );
  });

  test('rejects a status outside 100..599', () => {
    assert.throws(() => createRenderResult({ path: '/', html: '', status: 42 }), TypeError);
    assert.throws(() => createRenderResult({ path: '/', html: '', status: 700 }), TypeError);
  });

  test('rejects a non-integer status', () => {
    assert.throws(() => createRenderResult({ path: '/', html: '', status: 200.5 }), TypeError);
  });

  test('rejects a non-object headers map', () => {
    assert.throws(
      // @ts-expect-error invalid
      () => createRenderResult({ path: '/', html: '', headers: 'nope' }),
      TypeError,
    );
  });
});

// ---------------------------------------------------------------------------
// Plan
// ---------------------------------------------------------------------------

describe('prerender domain — createPrerenderPlan + planToTargets', () => {
  const manifest = createRouteManifest({
    routes: [{ path: '/' }, { path: '/about' }],
  });

  test('accepts a valid absolute http base URL', () => {
    const plan = createPrerenderPlan({
      manifest,
      baseUrl: 'https://example.com',
    });
    assert.equal(plan.baseUrl, 'https://example.com');
    assert.ok(Object.isFrozen(plan));
  });

  test('canonicalizes a trailing slash in the base URL', () => {
    const plan = createPrerenderPlan({
      manifest,
      baseUrl: 'https://example.com/',
    });
    assert.equal(plan.baseUrl, 'https://example.com');
  });

  test('rejects a base URL with a path component', () => {
    assert.throws(
      () =>
        createPrerenderPlan({
          manifest,
          baseUrl: 'https://example.com/app',
        }),
      TypeError,
    );
  });

  test('rejects a non-http protocol', () => {
    assert.throws(() => createPrerenderPlan({ manifest, baseUrl: 'ftp://x.test' }), TypeError);
  });

  test('rejects a manifest that was not produced by createRouteManifest', () => {
    assert.throws(
      // @ts-expect-error invalid
      () => createPrerenderPlan({ manifest: { routes: [] }, baseUrl: 'https://x.test' }),
      TypeError,
    );
  });

  test('planToTargets projects routes into absolute URLs', () => {
    const plan = createPrerenderPlan({
      manifest,
      baseUrl: 'https://example.com',
    });
    const targets = planToTargets(plan);
    assert.equal(targets.length, 2);
    assert.equal(targets[0].path, '/');
    assert.equal(targets[0].absoluteUrl, 'https://example.com/');
    assert.equal(targets[1].absoluteUrl, 'https://example.com/about');
    assert.ok(Object.isFrozen(targets));
    assert.ok(Object.isFrozen(targets[0]));
  });
});

// ---------------------------------------------------------------------------
// Port assertions
// ---------------------------------------------------------------------------

describe('prerender ports — assertRenderFunction', () => {
  test('accepts any function', () => {
    assert.doesNotThrow(() => assertRenderFunction(() => ({ html: '' })));
  });

  test('rejects non-functions', () => {
    assert.throws(() => assertRenderFunction(null), TypeError);
    assert.throws(() => assertRenderFunction({}), TypeError);
  });
});

describe('prerender ports — assertStaticOutputPort', () => {
  test('accepts a complete adapter', () => {
    assert.doesNotThrow(() =>
      assertStaticOutputPort({
        write() {},
        list() {},
        clear() {},
      }),
    );
  });

  test('rejects null and non-object', () => {
    assert.throws(() => assertStaticOutputPort(null), TypeError);
    assert.throws(() => assertStaticOutputPort('x'), TypeError);
  });

  test('rejects adapter missing write', () => {
    assert.throws(() => assertStaticOutputPort({ list() {}, clear() {} }), TypeError);
  });

  test('rejects adapter missing list', () => {
    assert.throws(() => assertStaticOutputPort({ write() {}, clear() {} }), TypeError);
  });

  test('rejects adapter missing clear', () => {
    assert.throws(() => assertStaticOutputPort({ write() {}, list() {} }), TypeError);
  });
});

// ---------------------------------------------------------------------------
// Memory output adapter
// ---------------------------------------------------------------------------

describe('prerender adapters — createMemoryStaticOutput', () => {
  test('satisfies the port contract', () => {
    const output = createMemoryStaticOutput();
    assert.doesNotThrow(() => assertStaticOutputPort(output));
  });

  test('writes and reads back HTML by path', async () => {
    const output = createMemoryStaticOutput({ now: () => 1000 });
    const record = await output.write('/', '<h1>Home</h1>');
    assert.equal(record.path, '/');
    assert.equal(record.publishedAt, 1000);
    assert.equal(record.size, Buffer.byteLength('<h1>Home</h1>'));
    assert.equal(output.get('/'), '<h1>Home</h1>');
  });

  test('list returns a snapshot of all stored assets', async () => {
    const output = createMemoryStaticOutput();
    await output.write('/', 'a');
    await output.write('/about', 'b');
    const snapshot = output.list();
    assert.equal(snapshot.length, 2);
    assert.deepEqual(snapshot.map((r) => r.path).sort(), ['/', '/about']);
  });

  test('clear wipes all stored assets', async () => {
    const output = createMemoryStaticOutput();
    await output.write('/', 'a');
    output.clear();
    assert.equal(output.list().length, 0);
    assert.equal(output.get('/'), null);
  });

  test('write rejects an invalid path', async () => {
    const output = createMemoryStaticOutput();
    await assert.rejects(() => output.write('about', 'a'), TypeError);
  });

  test('write rejects non-string html', async () => {
    const output = createMemoryStaticOutput();
    // @ts-expect-error invalid
    await assert.rejects(() => output.write('/', 42), TypeError);
  });
});

// ---------------------------------------------------------------------------
// Sequential runner
// ---------------------------------------------------------------------------

describe('prerender adapters — createSequentialPrerenderRunner', () => {
  const manifest = createRouteManifest({
    routes: [{ path: '/' }, { path: '/about' }, { path: '/contact' }],
  });
  const plan = createPrerenderPlan({
    manifest,
    baseUrl: 'https://example.com',
  });

  test('walks every target and writes results to the output port', async () => {
    const output = createMemoryStaticOutput();
    const runner = createSequentialPrerenderRunner({
      renderFn: async (path) => ({ html: `<title>${path}</title>` }),
      output,
    });
    const summary = await runner.run(plan);
    assert.equal(summary.rendered.length, 3);
    assert.equal(summary.failed.length, 0);
    assert.ok(summary.durationMs >= 0);
    assert.equal(output.get('/'), '<title>/</title>');
    assert.equal(output.get('/about'), '<title>/about</title>');
    assert.equal(output.get('/contact'), '<title>/contact</title>');
  });

  test('passes the absolute URL as render context', async () => {
    const output = createMemoryStaticOutput();
    const seen = [];
    const runner = createSequentialPrerenderRunner({
      renderFn: async (path, context) => {
        seen.push(context.absoluteUrl);
        return { html: path };
      },
      output,
    });
    await runner.run(plan);
    assert.deepEqual(seen, [
      'https://example.com/',
      'https://example.com/about',
      'https://example.com/contact',
    ]);
  });

  test('aggregates failures without aborting the run', async () => {
    const output = createMemoryStaticOutput();
    const runner = createSequentialPrerenderRunner({
      renderFn: async (path) => {
        if (path === '/about') {
          throw new Error('template missing');
        }
        return { html: `ok:${path}` };
      },
      output,
    });
    const summary = await runner.run(plan);
    assert.equal(summary.rendered.length, 2);
    assert.equal(summary.failed.length, 1);
    assert.equal(summary.failed[0].path, '/about');
    assert.match(summary.failed[0].error, /template missing/);
    assert.equal(output.get('/'), 'ok:/');
    assert.equal(output.get('/about'), null);
    assert.equal(output.get('/contact'), 'ok:/contact');
  });

  test('surfaces an invalid render function return value as a failure', async () => {
    const output = createMemoryStaticOutput();
    const runner = createSequentialPrerenderRunner({
      // @ts-expect-error invalid
      renderFn: async () => null,
      output,
    });
    const summary = await runner.run(
      createPrerenderPlan({
        manifest: createRouteManifest({ routes: [{ path: '/' }] }),
        baseUrl: 'https://x.test',
      }),
    );
    assert.equal(summary.rendered.length, 0);
    assert.equal(summary.failed.length, 1);
    assert.equal(summary.failed[0].path, '/');
  });

  test('rejects an unfrozen plan', async () => {
    const output = createMemoryStaticOutput();
    const runner = createSequentialPrerenderRunner({
      renderFn: async () => ({ html: '' }),
      output,
    });
    await assert.rejects(
      // @ts-expect-error invalid
      () => runner.run({ manifest, baseUrl: 'https://x.test' }),
      TypeError,
    );
  });

  test('rejects construction without a render function', () => {
    const output = createMemoryStaticOutput();
    assert.throws(
      // @ts-expect-error invalid
      () => createSequentialPrerenderRunner({ output }),
      TypeError,
    );
  });

  test('rejects construction without an output port', () => {
    assert.throws(
      // @ts-expect-error invalid
      () => createSequentialPrerenderRunner({ renderFn: () => ({ html: '' }) }),
      TypeError,
    );
  });

  test('returns a frozen summary', async () => {
    const runner = createSequentialPrerenderRunner({
      renderFn: async () => ({ html: '' }),
      output: createMemoryStaticOutput(),
    });
    const summary = await runner.run(plan);
    assert.ok(Object.isFrozen(summary));
    assert.ok(Object.isFrozen(summary.rendered));
    assert.ok(Object.isFrozen(summary.failed));
  });

  test('duration uses the injectable clock', async () => {
    let t = 1000;
    const runner = createSequentialPrerenderRunner({
      renderFn: async () => ({ html: '' }),
      output: createMemoryStaticOutput({ now: () => t }),
      now: () => {
        const current = t;
        t += 50;
        return current;
      },
    });
    const summary = await runner.run(plan);
    assert.ok(summary.durationMs >= 50);
  });
});
