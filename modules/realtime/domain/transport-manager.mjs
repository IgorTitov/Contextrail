/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Transport Manager domain logic for the realtime module.
 * @sidecar transport-manager.mjs.header.md
 * @layer module | @hex domain | @ctx realtime
 * @public false
 * @edit careful
 */

/**
 * Primus-style transport manager.
 * Composes multiple TransportPort instances into a single RealtimePort
 * with automatic transport selection, fallback, reconnection, and heartbeat.
 *
 * SpecRefs: TPL-153
 */

import { createConnectionStateMachine } from './connection-state.mjs';
import { createReconnectionStrategy } from './reconnection.mjs';
import { createHeartbeat } from './heartbeat.mjs';
import { createChannelRouter } from './channel-router.mjs';
import { t } from '../messages.mjs';

/**
 * Create a transport manager implementing the RealtimePort contract over an
 * ordered list of TransportPort fallbacks. See ../ports/realtime-port.mjs and
 * ../ports/transport-port.mjs for the typed contracts; options accept
 * { reconnection, heartbeat, autoReconnect=true }.
 */
export function createTransportManager(transports, options = {}) {
  const { autoReconnect = true } = options;
  const stateMachine = createConnectionStateMachine();
  const reconnection = createReconnectionStrategy(options.reconnection);
  const heartbeat = createHeartbeat(options.heartbeat);
  const router = createChannelRouter();

  let activeTransport = null;
  let lastUrl = '';
  let lastOptions;
  let intentionalDisconnect = false;

  stateMachine.onStateChange((newState) => {
    router.notifyConnectionChange(newState);
  });

  function wireTransport(transport) {
    transport.onMessage(router.handleMessage);
    transport.onStateChange((newState) => {
      if (newState === 'disconnected' && autoReconnect && !intentionalDisconnect) {
        attemptReconnect();
      }
    });
  }

  async function connectFrom(url, connectOptions, startIndex = 0) {
    for (let i = startIndex; i < transports.length; i++) {
      const transport = transports[i];
      if (!transport.isSupported()) continue;
      try {
        wireTransport(transport);
        await transport.open(url, connectOptions);
        activeTransport = transport;
        return;
      } catch {
        continue;
      }
    }
    throw new Error(t('realtime.manager.all_transports_failed'));
  }

  async function attemptReconnect() {
    const s = stateMachine.getState();
    if (s === 'reconnecting' || s === 'failed') return;
    try {
      stateMachine.transition('reconnecting');
    } catch {
      return;
    }
    heartbeat.stop();

    const delay = reconnection.nextDelay();
    await new Promise((r) => setTimeout(r, delay));

    try {
      stateMachine.transition('connecting');
      await connectFrom(lastUrl, lastOptions, 0);
      reconnection.reset();
      stateMachine.transition('connected');
      startHeartbeat();
    } catch {
      try {
        stateMachine.transition('failed');
      } catch {
        // Already in failed state
      }
    }
  }

  function startHeartbeat() {
    heartbeat.start(
      () => {
        if (activeTransport && activeTransport.getState() === 'connected') {
          try {
            activeTransport.send(JSON.stringify({ channel: '_heartbeat', data: 'ping' }));
          } catch {
            /* ignore send errors during heartbeat */
          }
        }
      },
      () => {
        if (autoReconnect) attemptReconnect();
      },
    );
  }

  const manager = {
    async connect(url, connectOptions) {
      intentionalDisconnect = false;
      lastUrl = url;
      lastOptions = connectOptions;

      const supported = transports.filter((tr) => tr.isSupported());
      if (supported.length === 0) throw new Error(t('realtime.manager.no_supported_transport'));
      stateMachine.transition('connecting');

      try {
        await connectFrom(url, connectOptions, 0);
        reconnection.reset();
        stateMachine.transition('connected');
        startHeartbeat();
      } catch (err) {
        stateMachine.transition('failed');
        throw err;
      }
    },

    async disconnect() {
      intentionalDisconnect = true;
      heartbeat.stop();
      if (activeTransport) {
        await activeTransport.close();
        activeTransport = null;
      }
      if (stateMachine.getState() !== 'disconnected') {
        stateMachine.transition('disconnected');
      }
    },

    send(channel, data) {
      if (!activeTransport || stateMachine.getState() !== 'connected') {
        throw new Error(t('realtime.transport.not_connected'));
      }
      activeTransport.send(JSON.stringify({ channel, data }));
    },

    subscribe: router.subscribe,
    unsubscribe: router.unsubscribe,
    onConnectionChange: router.onConnectionChange,

    getState() {
      return stateMachine.getState();
    },
  };

  return manager;
}
