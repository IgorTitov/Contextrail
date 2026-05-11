/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Describe the role of realtime-hex-contract-test in this repository.
 * @sidecar realtime-hex-contract.test.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const BASE = new URL('../../modules/realtime/', import.meta.url);

test('realtime has the required hex folder structure', () => {
  for (const dir of ['domain', 'ports', 'adapters']) {
    assert.ok(existsSync(new URL(`${dir}/`, BASE)), `${dir}/ directory must exist`);
  }
});

test('realtime has a public-api.mjs entry point', () => {
  assert.ok(existsSync(new URL('public-api.mjs', BASE)));
});

test('realtime has a manifest.json', () => {
  const manifestPath = new URL('manifest.json', BASE);
  assert.ok(existsSync(manifestPath));
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  assert.equal(manifest.name, 'realtime');
  assert.ok(Array.isArray(manifest.exports));
  assert.ok(manifest.exports.includes('public-api.mjs'));
});

test('realtime has a README documenting the module', () => {
  const readmePath = new URL('README.md', BASE);
  assert.ok(existsSync(readmePath));
  const content = readFileSync(readmePath, 'utf8');
  assert.ok(
    content.includes('realtime') || content.includes('transport'),
    'README should describe the module',
  );
});

test('realtime has a messages.mjs i18n layer', () => {
  assert.ok(existsSync(new URL('messages.mjs', BASE)));
});

test('public-api.mjs exports expected symbols', async () => {
  const mod = await import(new URL('public-api.mjs', BASE));

  // Ports
  assert.equal(typeof mod.assertRealtimePort, 'function');
  assert.equal(typeof mod.assertTransportPort, 'function');

  // Domain
  assert.equal(typeof mod.createConnectionStateMachine, 'function');
  assert.ok(mod.ConnectionStates);
  assert.equal(typeof mod.createReconnectionStrategy, 'function');
  assert.equal(typeof mod.createHeartbeat, 'function');
  assert.equal(typeof mod.createTransportManager, 'function');

  // Adapters
  assert.equal(typeof mod.createWebSocketTransport, 'function');
  assert.equal(typeof mod.createSseTransport, 'function');
  assert.equal(typeof mod.createLongPollingTransport, 'function');
  assert.equal(typeof mod.createWebRtcTransport, 'function');
  assert.equal(typeof mod.createWsServerTransport, 'function');

  // Messages
  assert.equal(typeof mod.t, 'function');
  assert.equal(typeof mod.setLocale, 'function');
  assert.equal(typeof mod.getLocale, 'function');
  assert.equal(typeof mod.registerLocale, 'function');
  assert.equal(typeof mod.resetLocale, 'function');
});

test('each hex layer contains its expected source files', () => {
  // Ports
  assert.ok(existsSync(new URL('ports/realtime-port.mjs', BASE)));
  assert.ok(existsSync(new URL('ports/transport-port.mjs', BASE)));

  // Domain
  assert.ok(existsSync(new URL('domain/channel-router.mjs', BASE)));
  assert.ok(existsSync(new URL('domain/connection-state.mjs', BASE)));
  assert.ok(existsSync(new URL('domain/reconnection.mjs', BASE)));
  assert.ok(existsSync(new URL('domain/heartbeat.mjs', BASE)));
  assert.ok(existsSync(new URL('domain/transport-manager.mjs', BASE)));

  // Adapters
  assert.ok(existsSync(new URL('adapters/websocket-transport.mjs', BASE)));
  assert.ok(existsSync(new URL('adapters/sse-transport.mjs', BASE)));
  assert.ok(existsSync(new URL('adapters/long-polling-transport.mjs', BASE)));
  assert.ok(existsSync(new URL('adapters/webrtc-transport.mjs', BASE)));
  assert.ok(existsSync(new URL('adapters/ws-server-transport.mjs', BASE)));
});

test('unit test file exists for the realtime module', () => {
  assert.ok(existsSync(new URL('../../tests/unit/realtime.test.mjs', import.meta.url)));
});

test('unit test imports from public-api.mjs, not from internals', () => {
  const content = readFileSync(
    new URL('../../tests/unit/realtime.test.mjs', import.meta.url),
    'utf8',
  );
  assert.ok(content.includes('public-api.mjs'));
  assert.ok(!content.includes("from '../../modules/realtime/domain/"));
  assert.ok(!content.includes("from '../../modules/realtime/ports/"));
  assert.ok(!content.includes("from '../../modules/realtime/adapters/"));
});
