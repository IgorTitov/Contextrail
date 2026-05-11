/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Webrtc Transport adapter for the realtime module.
 * @sidecar webrtc-transport.mjs.header.md
 * @layer module | @hex adapter | @ctx realtime
 * @public false
 * @edit careful
 */

/**
 * WebRTC data channel transport adapter.
 * Implements TransportPort using native RTCPeerConnection + RTCDataChannel.
 * Signaling is dependency-injected via signalingFn.
 *
 * SpecRefs: TPL-152
 *
 * @param {(signal: { type: string, payload: unknown }) => Promise<unknown>} signalingFn
 *   — injected function for offer/answer/ICE exchange
 * @returns {import('../ports/transport-port.mjs').TransportPort}
 */
export function createWebRtcTransport(signalingFn) {
  /** @type {RTCPeerConnection | null} */
  let pc = null;
  /** @type {RTCDataChannel | null} */
  let channel = null;
  /** @type {string} */
  let state = 'disconnected';
  /** @type {Array<(data: unknown) => void>} */
  const messageListeners = [];
  /** @type {Array<(state: string) => void>} */
  const stateListeners = [];

  /**
   * @param {string} newState
   */
  function setState(newState) {
    state = newState;
    for (const cb of stateListeners) {
      cb(state);
    }
  }

  return {
    isSupported() {
      return typeof RTCPeerConnection !== 'undefined';
    },

    getState() {
      return state;
    },

    /**
     * @param {string} _url — unused for WebRTC (signaling is injected)
     * @param {object} [options]
     * @param {RTCConfiguration} [options.rtcConfig]
     * @param {string} [options.channelLabel='data']
     */
    open(_url, options = {}) {
      return new Promise((resolve, reject) => {
        setState('connecting');
        const { rtcConfig, channelLabel = 'data' } = options;

        try {
          pc = new RTCPeerConnection(rtcConfig);
        } catch (err) {
          setState('failed');
          reject(err);
          return;
        }

        // Create data channel — ordered and reliable by default
        channel = pc.createDataChannel(channelLabel, {
          ordered: true,
        });

        channel.onopen = () => {
          setState('connected');
          resolve();
        };

        channel.onmessage = (event) => {
          for (const cb of messageListeners) {
            cb(event.data);
          }
        };

        channel.onclose = () => {
          setState('disconnected');
        };

        // ICE candidate gathering
        pc.onicecandidate = (event) => {
          if (event.candidate) {
            signalingFn({ type: 'ice-candidate', payload: event.candidate });
          }
        };

        // Map ICE connection state to transport state
        pc.oniceconnectionstatechange = () => {
          if (!pc) return;
          const iceState = pc.iceConnectionState;
          if (iceState === 'failed') {
            setState('failed');
          } else if (iceState === 'disconnected') {
            setState('disconnected');
          }
        };

        // Create offer and send via signaling
        pc.createOffer()
          .then((offer) => pc.setLocalDescription(offer))
          .then(() => signalingFn({ type: 'offer', payload: pc.localDescription }))
          .then((answer) => {
            if (answer && typeof answer === 'object') {
              return pc.setRemoteDescription(/** @type {RTCSessionDescriptionInit} */ (answer));
            }
          })
          .catch((err) => {
            setState('failed');
            reject(err);
          });
      });
    },

    close() {
      return new Promise((resolve) => {
        if (channel) {
          channel.close();
          channel = null;
        }
        if (pc) {
          pc.close();
          pc = null;
        }
        setState('disconnected');
        resolve();
      });
    },

    send(data) {
      if (!channel || state !== 'connected') {
        throw new Error('Cannot send data while not connected.');
      }
      channel.send(typeof data === 'string' ? data : JSON.stringify(data));
    },

    onMessage(callback) {
      messageListeners.push(callback);
    },

    onStateChange(callback) {
      stateListeners.push(callback);
    },
  };
}
