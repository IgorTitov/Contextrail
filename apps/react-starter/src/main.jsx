/* @HEADER
 * @version 0.6.8 | 2026-04-28
 * @purpose Main entry point for the react-starter application.
 * @sidecar main.jsx.header.md
 * @layer app | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './components/App.jsx';
// eslint-disable-next-line import/no-unresolved
import appVersion from 'virtual:app-version';

console.log(
  `%cContextrail react-starter v${appVersion}%c | ${import.meta.env.MODE}`,
  'font-weight:bold;font-size:13px;color:#4f8cff',
  'font-weight:normal;font-size:12px;color:inherit',
);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
