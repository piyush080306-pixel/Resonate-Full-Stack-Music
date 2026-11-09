# Resonate — Music Library & Player

A full-featured personal music streaming app. Upload your audio files, organize them into playlists, and enjoy a premium listening experience with a real audio player, visualizer, and smart playlists.

## Features

- **Upload** — Drag-and-drop or browse to upload MP3, WAV, OGG, FLAC, and M4A files. Metadata (title, artist, album, genre, year) and album artwork are extracted automatically. A waveform and dominant color are generated for each track.
- **Player** — Full playback controls: play/pause, next/previous, seek, volume, mute, playback speed, repeat (off/all/one), and real shuffle (Fisher-Yates). Playback continues while navigating between pages and resumes from the last position after a browser refresh.
- **Queue** — Play next, add to queue, remove, move up/down, drag-and-drop reorder, save, and clear.
- **Visualizer** — Animated frequency bars powered by the Web Audio API.
- **Album Colors** — Dominant color extracted from artwork; the player bar smoothly transitions between colors.
- **Playlists** — Create, rename, delete, duplicate, export (JSON), import, search, and shuffle. Drag-and-drop reordering of songs within a playlist.
- **Smart Playlists** — Auto-generated: Favorites, Recently Played, Recently Added, Most Played, Never Played, Last Week, Last Month.
- **Search** — Instant, debounced search across songs, artists, albums, genres, and playlists with grouped results and URL-shareable queries.
- **Library** — Grid and list views, sorting, filtering, infinite scroll, selection mode with bulk delete and bulk favorite.
- **Keyboard Shortcuts** — Space (play/pause), ←/→ (prev/next), ↑/↓ (volume), M (mute), S (shuffle), R (repeat).
- **Settings** — Theme (dark/light), accent color, default volume, auto-play, track fade-out duration, default playback speed, keyboard shortcut reference, and per-account cloud storage usage.
- **Responsive** — Works on desktop, laptop, tablet, mobile, and ultra-wide monitors.
- **Cloud Library** — Supabase email/password authentication, owner-scoped music and playlists, cloud audio/artwork storage, favorites, play history, and per-user settings.

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, React Router, Lucide icons
- **Backend:** Supabase Auth, Postgres with row-level security, and Storage
- **Browser Storage:** localStorage for playback preferences and queue restoration
- **Audio:** Web Audio API for the visualizer and waveform generation, jsmediatags for metadata extraction

## Getting Started

Configure `.env` with the Supabase project URL and publishable/anon key:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-publishable-or-anon-key
```

In the Supabase SQL Editor, run the migration files in timestamp order from `supabase/migrations/`. This creates the tables, row-level security policies, Storage buckets, authenticated database grants, and `record_play` RPC used by the app. Then run:

```bash
npm install
npm run dev
```

Create an account or sign in when the app opens. Music uploads are stored in the project's `audio` and `artwork` Storage buckets, and library data is stored in Supabase Postgres. Existing files in a browser's previous local-only library are not automatically migrated; upload them again after signing in.

## Scripts

- `npm run dev` — Start the dev server
- `npm run build` — Production build
- `npm run typecheck` — TypeScript type checking
- `npm run lint` — ESLint

## Project Structure

```
src/
  components/       Reusable UI components (player bar, sidebar, modals, cards)
  context/          React contexts (Player, Settings, Toast, Theme)
  hooks/            Custom hooks (keyboard shortcuts, debounce, favorites, infinite scroll)
  lib/              Utilities (local storage, audio helpers, songs/playlists API, utils)
  pages/            Route pages (Library, Search, Playlists, Settings)
  types/            TypeScript type definitions
```
