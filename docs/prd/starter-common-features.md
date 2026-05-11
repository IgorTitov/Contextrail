<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Define the umbrella PRD for the 8 starter template common features covering preferences, i18n, theming, layout, navigation, notifications, loading states, and error handling.
@sidecar starter-common-features.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# Starter Template Common Features

## Requirement intent

The starter application should ship with 8 common features that demonstrate hex architecture, i18n, accessibility, and conventional web UX patterns. These features establish the baseline quality bar for any application built from this template.

All features must follow the existing architecture conventions: hex modules for domain logic with port/adapter pattern, bounded UI selector registries, i18n message layer for all user-facing copy, and CSS-only styling with no build step.

## Persona

- `docs/usm/personas/template-user.md`

## Features in scope

### 1. User Preferences (TPL-006)

Hex module at `modules/user-preferences/` providing persistent user settings via localStorage.

- Domain: preference keys, values, defaults, and validation
- Port: `PreferenceStore` interface for get/set/subscribe
- Adapter: `LocalStoragePreferenceAdapter` implementing the port
- Application: wiring between preferences and consuming features (theme, language)
- Constraints: no framework dependency, ESM only, graceful degradation when localStorage is unavailable

### 2. Language Picker (TPL-007)

Second locale (ru) with a UI picker component wired to the preferences module.

- Add Russian translations to the i18n messages layer (`apps/starter/messages.mjs`)
- Picker component renders available locales and persists selection via the preference port
- Page re-renders with the selected locale without full reload
- All user-facing copy routes through the i18n layer
- Constraints: must work with the existing `messages.mjs` pattern, no external i18n library

### 3. Theme Toggle (TPL-008)

Light and dark themes using CSS custom properties, with a toggle component.

- CSS variables define the color tokens for each theme
- Default derives from `prefers-color-scheme` media query
- Toggle component switches the active theme and persists via the preference port
- Theme applies immediately without page reload
- Constraints: CSS-only theming, no JS-based style injection beyond class toggling

### 4. Responsive Layout Skeleton (TPL-009)

Mobile-first CSS Grid layout with semantic HTML5 structure.

- `<header>`, `<main>`, `<footer>` semantic landmarks
- CSS Grid defines the layout with mobile-first breakpoints
- Layout adapts from single-column mobile to multi-region desktop
- No fixed pixel widths; fluid and responsive
- Constraints: CSS Grid only, no layout framework, semantic HTML5

### 5. Accessible Navigation (TPL-010)

Skip-to-content link, ARIA landmarks, keyboard navigation, and reduced-motion support.

- Skip-to-content link visible on focus, jumps to `<main>`
- ARIA landmark roles on header, nav, main, footer
- All interactive elements reachable and operable via keyboard
- `prefers-reduced-motion` disables animations and transitions
- Constraints: WCAG 2.1 AA compliance target

### 6. Toast Notifications (TPL-011)

Hex module at `modules/notifications/` with application-layer wiring and accessible live regions.

- Domain: notification type (info, success, warning, error), message, duration, dismissibility
- Port: `NotificationEmitter` interface for show/dismiss/subscribe
- Adapter: DOM adapter rendering toasts into an ARIA live region
- Application: wiring between app events and the notification port
- Auto-dismiss with configurable duration; manual dismiss available
- Constraints: ARIA `role="status"` or `role="alert"` for screen readers, no framework dependency

### 7. Loading/Skeleton States (TPL-012)

CSS shimmer animation with helper functions and accessibility markup.

- CSS `@keyframes` shimmer animation on placeholder elements
- Helper functions to toggle skeleton visibility and swap with real content
- `aria-busy="true"` on loading containers
- Skeleton shapes match the layout structure (cards, text lines, avatars)
- `prefers-reduced-motion` disables the shimmer animation
- Constraints: CSS-only animation, JS helpers for state management only

### 8. Error Boundary (TPL-013)

Global error handler with fallback UI and optional toast integration.

- `window.onerror` and `unhandledrejection` handlers
- Fallback UI replaces the main content area with a recoverable error message
- Optional integration with the notifications module for non-fatal errors
- Error details logged to console in development
- Constraints: graceful degradation, user-facing copy through i18n layer

## Out of scope

- Server-side rendering or build tooling
- Third-party UI component libraries
- Backend API integration
- Authentication or authorization
- State management libraries
- Automated browser testing infrastructure (covered separately)

## Cross-cutting constraints

- All features use vanilla JS (ESM, no build step)
- All user-facing copy goes through the i18n messages layer
- All automation-facing DOM hooks come from bounded selector registries
- Hex modules follow the port/adapter pattern demonstrated by `modules/example-greeter/`
- CSS-only styling; no CSS preprocessors
- Accessibility: WCAG 2.1 AA compliance target for all features

## Acceptance boundaries

- Each feature is independently implementable and testable
- Preferences persist across browser sessions via localStorage
- Language switching re-renders all visible copy without page reload
- Theme switching applies immediately and respects system preference as default
- Layout adapts from mobile to desktop without horizontal scrolling
- All interactive elements are keyboard-accessible
- Screen readers can perceive notifications, loading states, and errors
- Reduced-motion preference disables all animations
- Global errors display a recoverable fallback UI
- All features degrade gracefully when a dependency is unavailable

```trace-yaml
work_item:
  id: TPL-005
  type: epic
  title: Starter Template Common Features
  parent_ref:
  status: approved
  module_ref: starter
  spec_refs:
    - docs/prd/starter-common-features.md
    - docs/prd/index.md
    - docs/usm/personas/template-user.md
    - docs/usm/scenarios/template-user/preferences-workflow.md
    - docs/usm/scenarios/template-user/navigation-workflow.md
    - docs/usm/scenarios/template-user/feedback-workflow.md
  test_refs:
    - tests/contract/product-docs-contract.test.mjs
  bdd_refs:
    - tests/bdd/features/starter-common.feature#Scenario: User preferences persist across sessions
    - tests/bdd/features/starter-common.feature#Scenario: Language picker switches locale
    - tests/bdd/features/starter-common.feature#Scenario: Theme toggle switches appearance
    - tests/bdd/features/starter-common.feature#Scenario: Layout adapts to viewport
    - tests/bdd/features/starter-common.feature#Scenario: Navigation is keyboard accessible
    - tests/bdd/features/starter-common.feature#Scenario: Toast notifications appear and auto-dismiss
    - tests/bdd/features/starter-common.feature#Scenario: Loading skeletons display during async work
    - tests/bdd/features/starter-common.feature#Scenario: Error boundary catches and displays fallback
  acceptance:
    - All 8 features are independently implementable and testable.
    - All user-facing copy routes through the i18n layer.
    - All hex modules follow the port/adapter pattern.
    - WCAG 2.1 AA compliance target is met.
```
