/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Vite build configuration for the react-starter app.
 * @sidecar vite.config.js.header.md
 * @layer app | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { appVersionPlugin } from '../../scripts/lib/vite-version-plugin.mjs';

export default defineConfig({
  plugins: [react(), appVersionPlugin()],
  server: {
    port: 3000,
  },
  build: {
    outDir: 'dist',
  },
  resolve: {
    alias: {
      '@modules': resolve(__dirname, '../../modules'),
    },
  },
});
