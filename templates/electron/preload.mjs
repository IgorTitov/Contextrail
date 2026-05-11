/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Electron preload script that exposes a minimal electronAPI bridge to the renderer via contextBridge.
 * @sidecar preload.mjs.header.md
 * @layer templates | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Electron preload script — exposes a minimal electronAPI bridge.
 *
 * The starter app's environment-detect.mjs checks for window.electronAPI
 * to identify the Electron runtime. This preload exposes the bridge
 * with contextIsolation enabled for security.
 *
 * Extend this file to expose additional IPC channels as needed.
 *
 * SpecRefs: TPL-033
 */

import { contextBridge } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  version: process.versions.electron,
});
