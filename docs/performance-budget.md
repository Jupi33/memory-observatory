# Frontend Performance Budget

This project is intentionally frontend-heavy: the observatory combines WebGL rendering, DOM overlays, media previews, motion, and audio. The budget below makes those trade-offs explicit so future work can improve the experience without silently increasing runtime cost.

## Current Budget

- Initial route must remain usable on a mid-range mobile device after the entrance interaction.
- The WebGL vendor chunk is isolated as `webgl`; the warning limit is set to `1200 kB` because Three.js, React Three Fiber, and Drei are expected costs for this project.
- Non-WebGL chunks should stay small enough that the interface can render before optional effects finish loading.
- The public demo should pass `npm run ci`, `npm run test:e2e`, `npm run test:e2e:mobile`, and `npm run test:a11y` before release.
- Bundle review is generated with `npm run analyze`, which writes the Rollup visualizer report to `dist/stats.html`.
- Lighthouse CI runs with hard gates for resource budgets, accessibility, and best practices.

## Lighthouse Gates

- JavaScript: `1900 KB` maximum.
- CSS: `80 KB` maximum.
- Fonts: `360 KB` maximum.
- Accessibility category: `0.90` minimum.
- Best practices category: `0.85` minimum.
- Performance category: warning-only at `0.45` minimum until WebGL timing is profiled on stable hardware.

## Quality Gates

- `npm run format:check`: formatting consistency.
- `npm run lint`: unused code and React/TypeScript issues.
- `npm run test:unit`: deterministic layout, date parsing, and repository behavior.
- `npm run test:e2e`: desktop smoke test with screenshot artifacts.
- `npm run test:e2e:mobile`: mobile smoke test with screenshot artifacts.
- `npm run test:a11y`: automated check for severe WCAG violations.
- `npm run analyze`: bundle composition report.
- `npm run lighthouse`: Lighthouse CI budgets and report.

## Known Trade-Offs

- WebGL is used for constellation depth, glow, camera motion, and future 3D navigation. DOM remains responsible for text-heavy panels, forms, modals, and accessibility.
- The demo favors deterministic layout over physics simulation so the constellation stays stable across reloads, tests, and screenshots.
- Audio and media are optional. Missing assets should never block the archive from loading.
