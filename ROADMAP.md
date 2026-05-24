# Roadmap

This roadmap documents the technical evolution of Memory Observatory. The public repository starts with sanitized demo data, while private deployments can connect real data through Supabase.

## Milestone 1: Cinematic Prototype

- Establish the ritual-style entrance and intro montage.
- Define the visual language: editorial typography, dark cinematic canvas, soft violet lighting, and restrained audio.
- Replace generic page sections with an immersive, full-screen experience.

## Milestone 2: Constellation Interaction Model

- Map memories into deterministic star positions based on date, era, mood, and manual relationships.
- Add atlas navigation, trajectory view, letter view, star selection, keyboard zoom, and touch-safe mobile behavior.
- Improve visual density with anti-overlap layout and cleaner constellation links.

## Milestone 3: Persistence And Editor Workflows

- Connect memories, responses, and media uploads to Supabase through Vercel API routes.
- Keep localStorage fallback behavior for development and public static demos.
- Protect create, edit, delete, link, upload, and response flows behind a signed editor session.
- Keep the Supabase service role key server-side and record editor audit events.

## Milestone 4: Public Demo Hardening

- Sanitize private assets, copy, and local configuration before publishing.
- Add linting, formatting, build checks, audit checks, and deployment automation.
- Publish a GitHub Pages demo with sample data and document the architecture for technical review.

## Future Work

- Add optional 3D navigation mode for changing constellation perspective without losing the current visual identity.
- Expand automated UI tests beyond the current smoke path into editor mutation, memory detail, and mobile-specific flows.
- Add deeper mobile performance profiling for lower-end devices.
- Add accessibility passes for keyboard flow, focus management, reduced motion, and color contrast.
- Add a private deployment guide for applying the production Supabase schema and rotating editor keys.
