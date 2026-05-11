/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose ESLint flat config for Contextrail — enforces code quality across all .mjs source files.
 * @sidecar eslint.config.mjs.header.md
 * @layer root | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import prettierPlugin from 'eslint-plugin-prettier';

/** Browser + Node globals that our modules legitimately use. */
const sharedGlobals = {
  // Browser APIs (modules target browser by default)
  window: 'readonly',
  document: 'readonly',
  navigator: 'readonly',
  localStorage: 'readonly',
  sessionStorage: 'readonly',
  indexedDB: 'readonly',
  fetch: 'readonly',
  URL: 'readonly',
  URLSearchParams: 'readonly',
  Headers: 'readonly',
  Request: 'readonly',
  Response: 'readonly',
  AbortController: 'readonly',
  AbortSignal: 'readonly',
  Event: 'readonly',
  EventTarget: 'readonly',
  CustomEvent: 'readonly',
  MutationObserver: 'readonly',
  ResizeObserver: 'readonly',
  IntersectionObserver: 'readonly',
  HTMLElement: 'readonly',
  FileReader: 'readonly',
  Blob: 'readonly',
  File: 'readonly',
  FormData: 'readonly',
  Worker: 'readonly',
  WebSocket: 'readonly',
  EventSource: 'readonly',
  RTCPeerConnection: 'readonly',
  RTCSessionDescription: 'readonly',
  RTCIceCandidate: 'readonly',
  BroadcastChannel: 'readonly',
  MediaRecorder: 'readonly',
  Notification: 'readonly',
  crypto: 'readonly',
  performance: 'readonly',
  requestAnimationFrame: 'readonly',
  cancelAnimationFrame: 'readonly',
  Intl: 'readonly',
  TextEncoder: 'readonly',
  TextDecoder: 'readonly',
  structuredClone: 'readonly',
  queueMicrotask: 'readonly',
  location: 'readonly',
  self: 'readonly',
  caches: 'readonly',
  atob: 'readonly',
  btoa: 'readonly',
  DOMParser: 'readonly',
  Image: 'readonly',
  Audio: 'readonly',
  XMLHttpRequest: 'readonly',
  // Timers (available in both browser and Node)
  setTimeout: 'readonly',
  clearTimeout: 'readonly',
  setInterval: 'readonly',
  clearInterval: 'readonly',
  // Console
  console: 'readonly',
  // Node.js globals (for scripts and tests)
  process: 'readonly',
  Buffer: 'readonly',
  global: 'readonly',
  __dirname: 'readonly',
  __filename: 'readonly',
};

export default [
  // Ignore patterns — must come first in flat config
  {
    ignores: ['node_modules/**', '.backups/**', 'dist/**', 'test-results/**', 'coverage/**'],
  },

  // Base recommended rules
  js.configs.recommended,

  // Prettier integration — disables ESLint formatting rules that conflict
  prettier,

  // Project-wide settings
  {
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
      globals: sharedGlobals,
    },
    plugins: { prettier: prettierPlugin },
    rules: {
      'prettier/prettier': 'warn',
      'no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      'no-console': 'off',
      'prefer-const': 'error',
      'no-var': 'error',
      eqeqeq: ['warn', 'always', { null: 'ignore' }],
      curly: ['error', 'multi-line'],
      'no-throw-literal': 'warn',
      'no-useless-assignment': 'warn',
      'preserve-caught-error': 'warn',
    },
  },

  // Test files — relax some rules
  {
    files: ['tests/**/*.mjs', 'tests/**/*.test.mjs'],
    rules: {
      'no-unused-vars': 'off',
    },
  },
];
