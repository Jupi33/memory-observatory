# Memory Observatory

A cinematic React memory archive that turns dated media entries into an interactive constellation.

![Demo preview](public/media/intro/intro-01.jpg)

## What It Does

Memory Observatory is an interactive, full-screen archive for personal media collections. Instead of showing a conventional grid of photos, it maps memories into a living constellation where dates, categories, emotional tone, and manual links determine the position and relationships between stars.

The public repository ships with sanitized sample media and neutral demo records. Production deployments can connect to Supabase so uploaded memories, descriptions, responses, and media files persist across devices without storing private content in Git.

The experience is designed for mobile-first sharing by QR or direct link, while still supporting desktop navigation, keyboard zoom, editor flows, and a richer cinematic presentation.

## Tech Stack

- React 19, Vite, TypeScript
- React Three Fiber, Three.js, Drei, react-postprocessing
- Zustand for client state
- GSAP and Motion for cinematic transitions
- Howler.js for audio playback and fades
- Supabase client, database, and storage integration
- Vercel deployment with a keepalive API route

## Key Features

- Ritual-style entrance sequence before the main experience
- Full-screen constellation interface with deterministic layout and anti-overlap spacing
- Atlas, trajectory, and letter views backed by the same memory data model
- Inline editor for creating, editing, linking, responding to, and deleting memories
- Supabase-backed persistence with localStorage fallback for development
- Mobile safeguards for reduced rendering cost, no horizontal overflow, and touch navigation
- Public-safe seeded data and placeholder media for recruiter review

## Architecture

```mermaid
flowchart LR
  "React App" --> "Entrance"
  "React App" --> "Cosmic Observatory"
  "Cosmic Observatory" --> "Constellation Engine"
  "Cosmic Observatory" --> "Memory Editor"
  "Memory Editor" --> "Media Repository"
  "Media Repository" --> "Supabase"
  "Media Repository" --> "localStorage fallback"
  "Audio Director" --> "Howler cues"
```

The app is organized around a small set of runtime systems:

- `src/entrance/` controls the console-style access flow and intro montage.
- `src/cosmic/` renders the WebGL observatory and computes deterministic star placement.
- `src/memories/` contains the editor and linking workflow.
- `src/services/` abstracts Supabase persistence, media uploads, and local fallback behavior.
- `api/keepalive.ts` is a Vercel function used to keep the Supabase project active.

## Getting Started

```bash
git clone <repo-url>
cd memory-observatory
npm install
npm run dev
```

Open `http://127.0.0.1:5173/`.

Useful checks:

```bash
npm run lint
npm run format:check
npm run build
```

## Environment Variables

Copy `.env.example` to `.env.local` and fill the values when using Supabase:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_SUPABASE_MEDIA_BUCKET=memory-media
```

For Vercel keepalive, configure `CRON_SECRET` in the Vercel project environment. The repository intentionally does not include real secrets, production media, or private notes.

## Live Demo

Add the public deployment URL here after publishing a sanitized demo environment.

The public repository uses sample data. Any production deployment should load private memories from Supabase or another backend configured outside the repo.
