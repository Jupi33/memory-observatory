# Frontend Architecture

Memory Observatory is structured as a cinematic React application with a deliberately split rendering model: WebGL handles spatial atmosphere and constellation motion, while DOM handles text, editor workflows, accessibility, and stable testing.

## Runtime Loading

- The locked entrance is part of the initial bundle.
- `OpeningPrelude`, `CosmicObservatory`, and `MemoryEditorOverlay` are loaded with `React.lazy`.
- The WebGL-heavy observatory path is not requested until the visitor enters the experience.
- Playwright verifies this behavior in `lazy-loading.spec.ts`.

## WebGL And DOM Boundary

- `AtlasView` owns the React Three Fiber canvas shell.
- Atmosphere, camera motion, constellation threads, and star nodes are split into focused modules.
- Star glow is rendered with lightweight mesh layers, while global vignette and grain are handled in CSS.
- DOM overlays remain outside the canvas so headings, forms, buttons, keyboard navigation, and screen-reader labels stay inspectable.

## Accessibility Strategy

- Modal surfaces use `useModalFocus` for initial focus, Tab trapping, Escape-to-close, and focus restoration.
- Canvas-only interactions have an accessible DOM route through the hidden keyboard memory list.
- Creation and deletion feedback is announced through a polite live region.
- Automated checks use Axe through Playwright, plus keyboard-specific e2e coverage.

## Performance Review

- `npm run analyze` creates a Rollup treemap at `dist/stats.html`.
- `npm run lighthouse` builds the app and runs Lighthouse CI against the static output.
- Budgets live in `performance-budget.json` and are enforced in `lighthouserc.cjs`.
- The current CI treats accessibility and resource budgets as hard gates, while Lighthouse performance score is warning-only because WebGL timing varies across runners.

## Persistence Adapter Boundary

The frontend talks to `mediaRepository` rather than Supabase directly. In static demo mode, that repository chooses the localStorage adapter. In Vercel production mode, `VITE_API_BASE_URL=/api` switches it to the API adapter, which sends requests with `credentials: include` so the server can validate the HttpOnly editor session cookie.
