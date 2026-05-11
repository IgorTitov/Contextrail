/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Unit proof for the seo bounded module — meta tags, sitemap, robots, port, memory adapter.
 * @sidecar seo.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createMetaTags,
  renderMetaTagsHtml,
  escapeAttribute,
  createSitemap,
  renderSitemapXml,
  escapeXml,
  createRobotsTxt,
  renderRobotsTxt,
  assertSeoPublisherPort,
  createMemorySeoPublisher,
} from '../../modules/seo/public-api.mjs';

// ---------------------------------------------------------------------------
// Meta tags
// ---------------------------------------------------------------------------

describe('seo domain — createMetaTags', () => {
  test('accepts a minimal valid descriptor', () => {
    const meta = createMetaTags({ title: 'Home' });
    assert.equal(meta.title, 'Home');
    assert.equal(meta.description, undefined);
    assert.ok(Object.isFrozen(meta));
  });

  test('accepts full descriptor', () => {
    const meta = createMetaTags({
      title: 'Home',
      description: 'Hi',
      canonical: 'https://example.com/',
      robots: 'index,follow',
      openGraph: { title: 'Home', type: 'website' },
      twitter: { card: 'summary' },
    });
    assert.equal(meta.description, 'Hi');
    assert.equal(meta.canonical, 'https://example.com/');
    assert.equal(meta.robots, 'index,follow');
    assert.equal(meta.openGraph?.type, 'website');
    assert.equal(meta.twitter?.card, 'summary');
  });

  test('rejects missing/empty title', () => {
    assert.throws(() => createMetaTags({ title: '' }), TypeError);
    assert.throws(() => createMetaTags({}), TypeError);
  });

  test('rejects null input', () => {
    assert.throws(() => createMetaTags(null), TypeError);
  });

  test('rejects non-string description', () => {
    assert.throws(
      // @ts-expect-error invalid
      () => createMetaTags({ title: 'T', description: 42 }),
      TypeError,
    );
  });

  test('rejects array openGraph', () => {
    assert.throws(
      // @ts-expect-error invalid
      () => createMetaTags({ title: 'T', openGraph: [] }),
      TypeError,
    );
  });
});

describe('seo domain — escapeAttribute', () => {
  test('escapes HTML metacharacters', () => {
    assert.equal(escapeAttribute('<b>"hi"</b>'), '&lt;b&gt;&quot;hi&quot;&lt;/b&gt;');
    assert.equal(escapeAttribute("O'Neill & Co."), 'O&#39;Neill &amp; Co.');
  });
});

describe('seo domain — renderMetaTagsHtml', () => {
  test('renders title and description with escaping', () => {
    const meta = createMetaTags({ title: 'A & B', description: '"hi"' });
    const html = renderMetaTagsHtml(meta);
    assert.ok(html.includes('<title>A &amp; B</title>'));
    assert.ok(html.includes('<meta name="description" content="&quot;hi&quot;">'));
  });

  test('renders canonical, robots, openGraph, twitter', () => {
    const meta = createMetaTags({
      title: 'T',
      canonical: 'https://example.com/',
      robots: 'noindex',
      openGraph: { title: 'T', url: 'https://example.com/', type: 'website' },
      twitter: { card: 'summary', site: '@a' },
    });
    const html = renderMetaTagsHtml(meta);
    assert.ok(html.includes('<link rel="canonical" href="https://example.com/">'));
    assert.ok(html.includes('<meta name="robots" content="noindex">'));
    assert.ok(html.includes('<meta property="og:title" content="T">'));
    assert.ok(html.includes('<meta property="og:type" content="website">'));
    assert.ok(html.includes('<meta name="twitter:card" content="summary">'));
  });

  test('injected titles cannot break out of the attribute', () => {
    const meta = createMetaTags({ title: '"><script>alert(1)</script>' });
    const html = renderMetaTagsHtml(meta);
    assert.ok(!html.includes('<script>'));
    assert.ok(html.includes('&lt;script&gt;'));
  });
});

// ---------------------------------------------------------------------------
// Sitemap
// ---------------------------------------------------------------------------

describe('seo domain — createSitemap', () => {
  test('accepts a minimal valid sitemap', () => {
    const sitemap = createSitemap({ urls: [{ loc: 'https://example.com/' }] });
    assert.equal(sitemap.urls.length, 1);
    assert.equal(sitemap.urls[0].loc, 'https://example.com/');
  });

  test('rejects non-object input', () => {
    assert.throws(() => createSitemap(null), TypeError);
    // @ts-expect-error invalid
    assert.throws(() => createSitemap({}), TypeError);
  });

  test('rejects non-absolute loc', () => {
    assert.throws(() => createSitemap({ urls: [{ loc: '/relative' }] }), TypeError);
  });

  test('rejects invalid lastmod', () => {
    assert.throws(
      () => createSitemap({ urls: [{ loc: 'https://x/', lastmod: 'yesterday' }] }),
      TypeError,
    );
  });

  test('accepts ISO lastmod date and datetime', () => {
    const sitemap = createSitemap({
      urls: [
        { loc: 'https://x/', lastmod: '2026-04-09' },
        { loc: 'https://y/', lastmod: '2026-04-09T12:00:00Z' },
      ],
    });
    assert.equal(sitemap.urls.length, 2);
  });

  test('rejects invalid changefreq and priority', () => {
    assert.throws(
      () =>
        createSitemap({
          // @ts-expect-error invalid
          urls: [{ loc: 'https://x/', changefreq: 'rarely' }],
        }),
      TypeError,
    );
    assert.throws(() => createSitemap({ urls: [{ loc: 'https://x/', priority: 2 }] }), TypeError);
  });
});

describe('seo domain — renderSitemapXml', () => {
  test('emits a valid sitemaps.org urlset', () => {
    const sitemap = createSitemap({
      urls: [
        { loc: 'https://example.com/', lastmod: '2026-04-09', changefreq: 'daily', priority: 1 },
        { loc: 'https://example.com/about' },
      ],
    });
    const xml = renderSitemapXml(sitemap);
    assert.ok(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
    assert.ok(xml.includes('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'));
    assert.ok(xml.includes('<loc>https://example.com/</loc>'));
    assert.ok(xml.includes('<lastmod>2026-04-09</lastmod>'));
    assert.ok(xml.includes('<changefreq>daily</changefreq>'));
    assert.ok(xml.includes('<priority>1.0</priority>'));
    assert.ok(xml.endsWith('</urlset>'));
  });

  test('escapes XML entities in loc', () => {
    const sitemap = createSitemap({ urls: [{ loc: 'https://example.com/?a=1&b=2' }] });
    const xml = renderSitemapXml(sitemap);
    assert.ok(xml.includes('<loc>https://example.com/?a=1&amp;b=2</loc>'));
  });
});

describe('seo domain — escapeXml', () => {
  test('escapes <, >, &, ", and apostrophe', () => {
    assert.equal(
      escapeXml(`<a href="x">&'</a>`),
      '&lt;a href=&quot;x&quot;&gt;&amp;&apos;&lt;/a&gt;',
    );
  });
});

// ---------------------------------------------------------------------------
// Robots
// ---------------------------------------------------------------------------

describe('seo domain — createRobotsTxt', () => {
  test('accepts a minimal valid robots.txt', () => {
    const robots = createRobotsTxt({ rules: [{ userAgent: '*' }] });
    assert.equal(robots.rules.length, 1);
    assert.deepEqual([...robots.sitemaps], []);
  });

  test('accepts allow, disallow and sitemaps', () => {
    const robots = createRobotsTxt({
      rules: [
        { userAgent: '*', disallow: ['/admin/'] },
        { userAgent: 'Googlebot', allow: ['/public/'], disallow: ['/private/'] },
      ],
      sitemaps: ['https://example.com/sitemap.xml'],
    });
    assert.equal(robots.rules.length, 2);
    assert.equal(robots.sitemaps[0], 'https://example.com/sitemap.xml');
  });

  test('rejects missing rules array', () => {
    // @ts-expect-error invalid
    assert.throws(() => createRobotsTxt({}), TypeError);
  });

  test('rejects rule without userAgent', () => {
    // @ts-expect-error invalid
    assert.throws(() => createRobotsTxt({ rules: [{ disallow: ['/x'] }] }), TypeError);
  });

  test('rejects non-absolute sitemap URL', () => {
    assert.throws(
      () => createRobotsTxt({ rules: [{ userAgent: '*' }], sitemaps: ['/sitemap.xml'] }),
      TypeError,
    );
  });
});

describe('seo domain — renderRobotsTxt', () => {
  test('emits user-agent and disallow lines in order', () => {
    const robots = createRobotsTxt({
      rules: [
        { userAgent: '*', disallow: ['/admin/', '/private/'] },
        { userAgent: 'Googlebot', allow: ['/public/'] },
      ],
      sitemaps: ['https://example.com/sitemap.xml'],
    });
    const txt = renderRobotsTxt(robots);
    assert.ok(txt.includes('User-agent: *'));
    assert.ok(txt.includes('Disallow: /admin/'));
    assert.ok(txt.includes('Disallow: /private/'));
    assert.ok(txt.includes('User-agent: Googlebot'));
    assert.ok(txt.includes('Allow: /public/'));
    assert.ok(txt.includes('Sitemap: https://example.com/sitemap.xml'));
    // Order: first block before second block
    assert.ok(txt.indexOf('User-agent: *') < txt.indexOf('User-agent: Googlebot'));
  });

  test('empty sitemaps omits the footer', () => {
    const robots = createRobotsTxt({ rules: [{ userAgent: '*' }] });
    const txt = renderRobotsTxt(robots);
    assert.ok(!txt.includes('Sitemap:'));
  });
});

// ---------------------------------------------------------------------------
// Port assertion
// ---------------------------------------------------------------------------

describe('seo ports — assertSeoPublisherPort', () => {
  test('accepts a complete adapter', () => {
    const fake = {
      publishSitemap() {},
      publishRobots() {},
      publishMeta() {},
      clear() {},
    };
    assert.doesNotThrow(() => assertSeoPublisherPort(fake));
  });

  test('rejects null and non-object', () => {
    assert.throws(() => assertSeoPublisherPort(null), TypeError);
  });

  test('rejects adapter missing each method', () => {
    const base = {
      publishSitemap() {},
      publishRobots() {},
      publishMeta() {},
      clear() {},
    };
    for (const method of ['publishSitemap', 'publishRobots', 'publishMeta', 'clear']) {
      const broken = { ...base };
      delete (/** @type {any} */ (broken)[method]);
      assert.throws(() => assertSeoPublisherPort(broken), TypeError);
    }
  });
});

// ---------------------------------------------------------------------------
// Memory publisher
// ---------------------------------------------------------------------------

describe('seo adapters — createMemorySeoPublisher', () => {
  test('satisfies the port contract', () => {
    const pub = createMemorySeoPublisher();
    assert.doesNotThrow(() => assertSeoPublisherPort(pub));
  });

  test('publishes sitemap XML and returns a record', async () => {
    const now = 100;
    const pub = createMemorySeoPublisher({ now: () => now });
    const xml = renderSitemapXml(createSitemap({ urls: [{ loc: 'https://example.com/' }] }));
    const rec = await pub.publishSitemap(xml);
    assert.equal(rec.kind, 'sitemap');
    assert.equal(rec.path, 'sitemap.xml');
    assert.equal(rec.contentType, 'application/xml');
    assert.equal(rec.publishedAt, 100);
    assert.equal(pub.getSitemap(), xml);
  });

  test('publishes robots.txt and meta HTML', async () => {
    const pub = createMemorySeoPublisher();
    const robots = renderRobotsTxt(createRobotsTxt({ rules: [{ userAgent: '*' }] }));
    const metaRec = await pub.publishMeta('home', '<title>Home</title>');
    const robotsRec = await pub.publishRobots(robots);
    assert.equal(metaRec.kind, 'meta');
    assert.equal(metaRec.path, 'meta/home.html');
    assert.equal(robotsRec.kind, 'robots');
    assert.equal(pub.getRobots(), robots);
    assert.equal(pub.getMeta('home'), '<title>Home</title>');
  });

  test('rejects empty sitemap XML and robots text', async () => {
    const pub = createMemorySeoPublisher();
    await assert.rejects(() => pub.publishSitemap(''), TypeError);
    await assert.rejects(() => pub.publishRobots(''), TypeError);
  });

  test('rejects empty pageId', async () => {
    const pub = createMemorySeoPublisher();
    await assert.rejects(() => pub.publishMeta('', '<title>x</title>'), TypeError);
  });

  test('listAssets returns snapshot and clear empties the store', async () => {
    const pub = createMemorySeoPublisher();
    await pub.publishSitemap('<?xml version="1.0"?><urlset/>');
    await pub.publishRobots('User-agent: *\n');
    await pub.publishMeta('home', '<title>Home</title>');
    assert.equal(pub.listAssets().length, 3);
    pub.clear();
    assert.equal(pub.listAssets().length, 0);
    assert.equal(pub.getSitemap(), null);
    assert.equal(pub.getRobots(), null);
    assert.equal(pub.getMeta('home'), null);
  });
});
