/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Inject a visible cursor dot and click ripple into headed Playwright sessions for visual debugging and screen recordings.
 * @sidecar visual-cursor.mjs.header.md
 * @layer tests | @hex _none_ | @ctx _none_
 * @public false
 * @edit careful
 */

/**
 * Visual cursor overlay for headed E2E tests.
 *
 * Injects a bright red dot that follows the mouse, expanding click rings,
 * and touch-point indicators so user interactions are clearly visible
 * during headed Playwright runs and demo recordings.
 *
 * Usage:
 *   import { injectCursorOverlay } from './visual-cursor.mjs';
 *   await injectCursorOverlay(page);               // defaults
 *   await injectCursorOverlay(page, { color: '#3b82f6', size: 24 });
 *
 * The recommended way is to use the custom fixture from ./fixtures.mjs
 * which auto-injects in headed mode.
 */

/**
 * Default configuration for the cursor overlay.
 * Adopters can override any of these when calling injectCursorOverlay().
 */
export const CURSOR_DEFAULTS = Object.freeze({
  /** CSS color for the cursor dot and click rings */
  color: '#ef4444',
  /** Diameter of the cursor dot in px */
  size: 20,
  /** Max scale multiplier for the expanding click ring */
  clickScale: 3,
  /** Duration of the click ring animation in ms */
  clickDuration: 400,
  /** Whether to visualize touch events */
  showTouch: true,
  /** Opacity of the cursor dot (0-1) */
  opacity: 0.85,
});

/**
 * Inject a visible cursor overlay into the given Playwright page.
 *
 * The overlay is added via addInitScript so it re-injects automatically
 * on every navigation within the page.
 *
 * @param {import('@playwright/test').Page} page
 * @param {Partial<typeof CURSOR_DEFAULTS>} [options]
 */
export async function injectCursorOverlay(page, options = {}) {
  const merged = { ...CURSOR_DEFAULTS, ...options };

  await page.addInitScript((cfg) => {
    /* ---- browser context ---- */

    function boot() {
      // Guard against double-init (frame re-attach, SPA navigations).
      if (document.getElementById('__e2e_cursor_overlay__')) return;

      // --- CSS -----------------------------------------------------------
      const half = cfg.size / 2;
      const pressed = Math.round(cfg.size * 0.7);
      const ringEnd = cfg.size * cfg.clickScale;
      const touchSize = Math.round(cfg.size * 1.5);

      const style = document.createElement('style');
      style.id = '__e2e_cursor_overlay__';
      style.textContent = [
        `.__e2e-cursor {`,
        `  position: fixed;`,
        `  width: ${cfg.size}px; height: ${cfg.size}px;`,
        `  border-radius: 50%;`,
        `  background: ${cfg.color};`,
        `  opacity: ${cfg.opacity};`,
        `  pointer-events: none;`,
        `  z-index: 2147483647;`,
        `  transform: translate(-50%, -50%);`,
        `  transition: width 0.1s ease-out, height 0.1s ease-out, opacity 0.08s;`,
        `  box-shadow: 0 0 ${half}px ${cfg.color}80;`,
        `  will-change: left, top;`,
        `}`,

        `.__e2e-cursor--pressed {`,
        `  width: ${pressed}px; height: ${pressed}px;`,
        `  opacity: 1;`,
        `}`,

        `.__e2e-click-ring {`,
        `  position: fixed;`,
        `  border-radius: 50%;`,
        `  border: 2px solid ${cfg.color};`,
        `  pointer-events: none;`,
        `  z-index: 2147483646;`,
        `  transform: translate(-50%, -50%);`,
        `  animation: __e2e-ring-expand ${cfg.clickDuration}ms ease-out forwards;`,
        `}`,

        `@keyframes __e2e-ring-expand {`,
        `  0%   { width: ${cfg.size}px; height: ${cfg.size}px; opacity: 0.8; }`,
        `  100% { width: ${ringEnd}px;  height: ${ringEnd}px;  opacity: 0;   }`,
        `}`,

        `.__e2e-touch-dot {`,
        `  position: fixed;`,
        `  width: ${touchSize}px; height: ${touchSize}px;`,
        `  border-radius: 50%;`,
        `  background: ${cfg.color};`,
        `  opacity: 0.5;`,
        `  pointer-events: none;`,
        `  z-index: 2147483645;`,
        `  transform: translate(-50%, -50%);`,
        `  transition: opacity 0.3s;`,
        `}`,
      ].join('\n');
      document.head.appendChild(style);

      // --- Cursor dot ----------------------------------------------------
      const dot = document.createElement('div');
      dot.className = '__e2e-cursor';
      dot.style.left = '-100px';
      dot.style.top = '-100px';
      document.body.appendChild(dot);

      // --- Mouse tracking ------------------------------------------------
      document.addEventListener(
        'mousemove',
        (e) => {
          dot.style.left = e.clientX + 'px';
          dot.style.top = e.clientY + 'px';
        },
        { passive: true },
      );

      // --- Click animation -----------------------------------------------
      document.addEventListener('mousedown', (e) => {
        dot.classList.add('__e2e-cursor--pressed');

        const ring = document.createElement('div');
        ring.className = '__e2e-click-ring';
        ring.style.left = e.clientX + 'px';
        ring.style.top = e.clientY + 'px';
        document.body.appendChild(ring);
        ring.addEventListener('animationend', () => ring.remove());
      });

      document.addEventListener('mouseup', () => {
        dot.classList.remove('__e2e-cursor--pressed');
      });

      // --- Touch visualization -------------------------------------------
      if (cfg.showTouch) {
        const touchDots = new Map();

        document.addEventListener(
          'touchstart',
          (e) => {
            for (const touch of e.changedTouches) {
              const td = document.createElement('div');
              td.className = '__e2e-touch-dot';
              td.style.left = touch.clientX + 'px';
              td.style.top = touch.clientY + 'px';
              document.body.appendChild(td);
              touchDots.set(touch.identifier, td);
            }
          },
          { passive: true },
        );

        document.addEventListener(
          'touchmove',
          (e) => {
            for (const touch of e.changedTouches) {
              const td = touchDots.get(touch.identifier);
              if (td) {
                td.style.left = touch.clientX + 'px';
                td.style.top = touch.clientY + 'px';
              }
            }
          },
          { passive: true },
        );

        document.addEventListener(
          'touchend',
          (e) => {
            for (const touch of e.changedTouches) {
              const td = touchDots.get(touch.identifier);
              if (td) {
                td.style.opacity = '0';
                setTimeout(() => td.remove(), 300);
                touchDots.delete(touch.identifier);
              }
            }
          },
          { passive: true },
        );
      }
    }

    // Run after the DOM is ready so document.body exists.
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', boot);
    } else {
      boot();
    }
  }, merged);
}
