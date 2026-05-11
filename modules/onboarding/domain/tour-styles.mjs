/* @HEADER
 * @version 0.7.50 | 2026-05-03
 * @purpose Tour Styles domain logic for the onboarding module.
 * @sidecar tour-styles.mjs.header.md
 * @layer module | @hex domain | @ctx onboarding
 * @public false
 * @edit careful
 */

/**
 * Pure CSS generation for the onboarding spotlight overlay.
 * Extracted from dom-adapter to keep adapter size within tiered limits.
 *
 * @param {{ overlayColor: string, borderRadius: number, zIndex: number }} opts
 * @returns {string} CSS text to inject into <style>
 */
export function buildTourStylesheet({ overlayColor, borderRadius, zIndex }) {
  return `
.__onboarding-backdrop {
  position: fixed;
  inset: 0;
  z-index: ${zIndex};
  pointer-events: auto;
}
.__onboarding-spotlight {
  position: fixed;
  border-radius: ${borderRadius}px;
  box-shadow: 0 0 0 9999px ${overlayColor};
  z-index: ${zIndex + 1};
  pointer-events: none;
  transition: top 0.3s ease, left 0.3s ease, width 0.3s ease, height 0.3s ease;
}
.__onboarding-popover {
  position: fixed;
  z-index: ${zIndex + 2};
  background: #fff;
  color: #1a1a2e;
  border-radius: ${borderRadius}px;
  padding: 20px;
  max-width: 340px;
  min-width: 240px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.18);
  font-family: system-ui, -apple-system, sans-serif;
  line-height: 1.5;
  transition: top 0.3s ease, left 0.3s ease, bottom 0.3s ease, right 0.3s ease;
}
.__onboarding-popover[data-theme="dark"] {
  background: #1e1e2e;
  color: #e0e0e0;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4);
}
.__onboarding-title {
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 8px;
}
.__onboarding-description {
  font-size: 0.875rem;
  margin: 0 0 16px;
  opacity: 0.85;
}
.__onboarding-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.__onboarding-step-counter {
  font-size: 0.75rem;
  opacity: 0.6;
}
.__onboarding-buttons {
  display: flex;
  gap: 6px;
}
.__onboarding-btn {
  padding: 6px 14px;
  border: none;
  border-radius: 6px;
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s ease;
}
.__onboarding-btn--prev {
  background: transparent;
  color: inherit;
  opacity: 0.7;
}
.__onboarding-btn--prev:hover { opacity: 1; }
.__onboarding-btn--next {
  background: #3b82f6;
  color: #fff;
}
.__onboarding-btn--next:hover { background: #2563eb; }
.__onboarding-btn--close {
  position: absolute;
  top: 8px;
  right: 8px;
  background: transparent;
  border: none;
  font-size: 1.125rem;
  cursor: pointer;
  opacity: 0.5;
  color: inherit;
  line-height: 1;
  padding: 2px 6px;
}
.__onboarding-btn--close:hover { opacity: 1; }
`;
}
