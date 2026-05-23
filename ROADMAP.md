# Roadmap

This roadmap documents the intended technical evolution of Memory Observatory. The public repository starts at a sanitized demo snapshot, while private deployments can connect real data through Supabase.

## Phase 1: Cinematic Prototype

- Establish the ritual-style entrance and intro montage.
- Define the visual language: editorial typography, dark cinematic canvas, soft violet lighting, and restrained audio.
- Replace generic page sections with an immersive, full-screen experience.

## Phase 2: Constellation Interaction Model

- Map memories into deterministic star positions based on date, era, mood, and manual relationships.
- Add atlas navigation, trajectory view, letter view, star selection, keyboard zoom, and touch-safe mobile behavior.
- Improve visual density with anti-overlap layout and cleaner constellation links.

## Phase 3: Persistence And Editor Workflows

- Connect memories, responses, and media uploads to Supabase.
- Keep localStorage fallback behavior for development and public static demos.
- Support create, edit, delete, link, and response flows without exposing backend details in the UI.

## Phase 4: Public Demo Hardening

- Sanitize private assets, copy, and local configuration before publishing.
- Add linting, formatting, build checks, audit checks, and deployment automation.
- Publish a GitHub Pages demo with sample data and document the architecture for technical review.

## Future Work

- Add optional 3D navigation mode for changing constellation perspective without losing the current visual identity.
- Add automated UI smoke tests for the entrance, editor, memory detail, and view switching flows.
- Add deeper mobile performance profiling for lower-end devices.
- Add accessibility passes for keyboard flow, focus management, reduced motion, and color contrast.
- Add a private deployment guide for Supabase-backed production environments.
