<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Overview and navigation guide for the onboarding hex module.
@sidecar README.md.header.md
@layer module | @hex _none_ | @ctx onboarding
@public false
@edit careful -->

# onboarding

Guided walkthrough tours with spotlight overlay and step-by-step popovers for new-user onboarding.

## Hexagonal architecture

| Layer | Files | Role |
|-------|-------|------|
| Domain | `tour-step.mjs`, `tour-state.mjs` | Pure value objects and state machine |
| Port | `onboarding-port.mjs` | Adapter contract + runtime validator |
| Adapters | `dom-adapter.mjs`, `memory-adapter.mjs` | Vanilla DOM overlay; test-friendly in-memory |
| Root | `public-api.mjs`, `messages.mjs` | Barrel exports; i18n strings |

## Quick start

```js
import {
  createTourStep,
  createDomOnboardingAdapter,
} from '../../modules/onboarding/public-api.mjs';

const adapter = createDomOnboardingAdapter({
  onComplete: () => console.log('Tour finished'),
});

adapter.startTour([
  createTourStep('site-header', 'Header', 'This is the main navigation.', { order: 1 }),
  createTourStep('site-main',   'Content', 'Your main content area.',      { order: 2 }),
  createTourStep('site-footer', 'Footer',  'Copyright and links.',         { order: 3 }),
]);
```

## DOM adapter behavior

The vanilla DOM adapter creates three elements:

1. **Backdrop** — full-screen click-to-close overlay
2. **Spotlight** — a `box-shadow: 0 0 0 9999px` cutout around the target element with smooth CSS transitions
3. **Popover** — dialog with title, description, step counter, navigation buttons, and close button

Features:
- Keyboard navigation: Escape closes, Arrow keys navigate steps
- Auto-scrolls target into view
- Repositions on window resize
- Dark theme detection via `data-theme="dark"`
- Viewport clamping prevents popover overflow
- ARIA `role="dialog"` for accessibility
- All elements use `data-testid` from the bounded selector registry

### Options

| Option | Default | Description |
|--------|---------|-------------|
| `overlayColor` | `rgba(0, 0, 0, 0.65)` | Backdrop color |
| `padding` | `10` | Spotlight padding around target (px) |
| `borderRadius` | `8` | Spotlight and popover corner radius (px) |
| `zIndex` | `100000` | Base z-index for overlay layers |
| `scrollBehavior` | `smooth` | Scroll behavior when bringing target into view |
| `onStepChange` | — | Callback `(index) => void` on step change |
| `onComplete` | — | Callback `() => void` when tour ends |

## Memory adapter

For unit and integration tests — no DOM required:

```js
import {
  createTourStep,
  createMemoryOnboardingAdapter,
} from '../../modules/onboarding/public-api.mjs';

const adapter = createMemoryOnboardingAdapter();
adapter.startTour([createTourStep('el', 'Title', 'Desc')]);
adapter.isActive();       // true
adapter.getCurrentIndex(); // 0
adapter.getState();       // full state object for assertions
```

## Pure domain functions

The state machine is fully pure and testable without adapters:

```js
import {
  createTourStep,
  createTourState,
  startTour,
  nextStep,
  getCurrentStep,
  canAdvance,
} from '../../modules/onboarding/public-api.mjs';

let state = createTourState([
  createTourStep('a', 'A', 'First', { order: 1 }),
  createTourStep('b', 'B', 'Second', { order: 2 }),
]);

state = startTour(state);
getCurrentStep(state); // step A
canAdvance(state);     // true

state = nextStep(state);
getCurrentStep(state); // step B
```

## Upgrading to Driver.js

The vanilla DOM adapter covers most use cases. For advanced features (animations, progress bars, custom renderers), swap in [Driver.js](https://driverjs.com/) (~5 KB, MIT, zero deps):

```bash
pnpm add driver.js
```

Create a custom adapter that implements `OnboardingPort`:

```js
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { assertOnboardingPort } from '../../modules/onboarding/public-api.mjs';

export function createDriverAdapter(options = {}) {
  const d = driver({ animate: true, ...options });
  let steps = [];

  const adapter = {
    startTour(tourSteps) {
      steps = [...tourSteps].sort((a, b) => a.order - b.order);
      d.setSteps(steps.map(s => ({
        element: `[data-testid="${s.target}"]`,
        popover: { title: s.title, description: s.description, side: s.position },
      })));
      d.drive();
    },
    endTour()       { d.destroy(); },
    nextStep()      { d.moveNext(); },
    previousStep()  { d.movePrevious(); },
    isActive()      { return d.isActive(); },
    getCurrentIndex() { return d.getActiveIndex() ?? -1; },
    destroy()       { d.destroy(); },
  };

  assertOnboardingPort(adapter);
  return adapter;
}
```

## UI selectors

Automation hooks are in `apps/starter/onboarding/ui-selectors.mjs`:

```js
export const onboarding = {
  backdrop:    'onboarding-backdrop',
  spotlight:   'onboarding-spotlight',
  popover:     'onboarding-popover',
  title:       'onboarding-title',
  description: 'onboarding-description',
  counter:     'onboarding-counter',
  nextButton:  'onboarding-next',
  prevButton:  'onboarding-prev',
  closeButton: 'onboarding-close',
};
```

## Tests

```bash
pnpm test:unit     # 51 onboarding tests (domain + port + adapter + messages)
pnpm test:contract # hex structure compliance
```
