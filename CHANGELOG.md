# Changelog

This public repository is a sanitized snapshot prepared from a private/local project. It keeps the technical structure, demo behavior, and deployment workflow public while excluding private media, secrets, and personal production data.

## v0.1.0 Public Demo Snapshot - 2026-05-23

### Added

- Published a sanitized React/Vite demo with placeholder media and neutral sample memory data.
- Added the full-screen WebGL constellation interface, including atlas, trajectory, and letter views.
- Added a memory editor flow with create, edit, delete, linking, responses, and local fallback behavior.
- Added Supabase integration points for database persistence, storage uploads, and a Vercel keepalive route.
- Added cinematic entrance, intro montage, audio director, keyboard zoom, and mobile-safe interaction behavior.
- Added GitHub Pages deployment through GitHub Actions for a public static demo.

### Changed

- Replaced private media, music, and personal copy with recruiter-safe placeholders and sample records.
- Moved runtime configuration to documented environment variables with `.env.example`.
- Split WebGL, React, and motion dependencies into dedicated build chunks.
- Switched typography to local Fontsource packages so the demo does not depend on Google Fonts at runtime.

### Tooling

- Added ESLint, Prettier, TypeScript build checks, Git attributes, and production build configuration.
- Added a professional README with architecture notes, setup instructions, and live demo link.
- Added npm audit validation and stabilized deployment dependencies for GitHub Actions.
- Added Vitest unit coverage for constellation layout, date parsing, ordering, and local repository behavior.
- Added Playwright smoke coverage for the entrance and primary observatory views.
- Added security documentation, a stricter production Supabase schema template, and an MIT license.
- Split the observatory UI into focused modules for the atlas, trajectory, letter, HUD, memory scene, and editor controls.
