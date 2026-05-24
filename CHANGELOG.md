# Changelog

This repository is a sanitized public release of a project first developed privately. It keeps the technical structure, demo behavior, and deployment workflow public while excluding private media, secrets, and personal production data.

## Unreleased

### Added

- Refreshed the README preview image and walkthrough GIF from the current public demo.
- Added Vercel API routes for public memory reads, protected editor writes, signed media upload URLs, responses, and editor sessions.
- Added signed HttpOnly editor cookies backed by a server-only editor secret hash.
- Added API validation tests for editor sessions, memory payloads, uploads, and unauthenticated write rejection.
- Added backend architecture documentation covering the GitHub Pages demo mode and Vercel/Supabase production mode.

### Changed

- Moved browser persistence behind localStorage and API repository adapters; the browser no longer writes directly to Supabase.
- Updated the production Supabase schema template to enable RLS, remove public write policies, and record editor audit events.
- Updated the keepalive route to use server-only Supabase credentials instead of public anon credentials.

## v0.1.0 Public Demo Release - 2026-05-23

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
