# Resonate

Resonate is a personal, cloud-backed music library and web player. Upload and organize your own audio, build playlists, search your collection, and listen with a persistent playback queue and customizable player.

The app is built with React and TypeScript and uses Supabase for authentication, database records, and audio/artwork storage.

## Features

### Music library

- Upload audio files and extract available track metadata and embedded artwork.
- Browse the library in grid or list view; search, filter, sort, and load more tracks as needed.
- Edit track details, remove tracks, and manage favorites.
- Select multiple tracks for supported bulk actions.
- View personal audio and artwork storage usage in Settings.

### Listening and playback

- Play, pause, skip, seek, mute, and adjust volume and playback speed.
- Shuffle tracks and choose repeat off, repeat all, or repeat one.
- Continue playback while navigating between app pages.
- Restore supported player state, including the queue and playback position, after a browser refresh.
- Visualize audio frequencies while listening and display artwork-derived colors in the player.
- Use the queue to play tracks next, reorder or remove queued tracks, and save the queue as a playlist.

### Playlists and discovery

- Create, rename, duplicate, and delete playlists.
- Add one or more tracks, reorder playlist tracks, and shuffle a playlist.
- Import and export playlist data as JSON.
- Search across tracks, artists, albums, genres, and playlists.
- Browse automatically generated views: Favorites, Recently Played, Recently Added, Most Played, Never Played, Last Week, and Last Month.

### Preferences and accessibility

- Choose a dark or light theme and an accent color.
- Configure default volume, playback speed, autoplay, and track fade-out duration.
- Use keyboard shortcuts for common playback actions.
- Responsive layouts for desktop, tablet, and mobile screens.

## Technology

| Area | Technologies |
| --- | --- |
| UI | React 18, TypeScript, Tailwind CSS, Lucide |
| Build and development | Vite |
| Routing | React Router |
| Authentication and cloud data | Supabase Auth, PostgreSQL, Row Level Security |
| File storage | Supabase Storage |
| Audio and metadata | HTML audio, Web Audio API, `jsmediatags` |

## Requirements

- Node.js 18 or newer and npm.
- A Supabase project with access to its Project URL and publishable (or legacy `anon`) key.

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure Supabase

Create a local `.env` file using `.env.example` as a template:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-publishable-or-anon-key
```

Use the Project URL and publishable/anon key from **Supabase Dashboard → Project Settings → API**. These `VITE_` variables are included in the browser bundle; **never put a Supabase `service_role` key or other secret in them**.

### 3. Apply the database migrations

Apply every SQL file in `supabase/migrations/` to your Supabase project, in timestamp/name order. You can run them from the Supabase SQL Editor or use the Supabase CLI if your project is configured for it.

The migrations create and secure the music-library schema, play-history RPC, required authenticated database grants, storage buckets and policies, and ownership checks for playlist/favorite/history references. Apply all migrations before using the app; do not rely on manual schema changes that are not recorded in migrations.

### 4. Start the development server

```bash
npm run dev
```

Open the local URL printed by Vite. Create an account or sign in with email and password. If email confirmation is enabled for your Supabase project, confirm the new account before signing in.

## Available commands

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite development server. |
| `npm run typecheck` | Run the TypeScript application type check. |
| `npm run lint` | Run ESLint. |
| `npm run build` | Create the production build in `dist/`. |
| `npm run preview` | Preview the production build locally. Run `npm run build` first. |

## Supabase and data model

The app uses Supabase Auth to identify each account. PostgreSQL stores music and user-library relationships, while Supabase Storage stores uploaded audio and artwork. The migrations define the tables, row-level security policies, grants, storage policies, and the `record_play` RPC used by the app.

User-owned records include songs, playlists, favorites, play history, and playlist track relationships. Row-level security and ownership policies are essential: keep them enabled and apply the included migrations to any Supabase project used by this app.

The app expects the `audio` and `artwork` storage buckets configured by the migrations. Storage limits and costs are determined by your Supabase plan and project configuration; the client-side upload limit is not a storage quota.

### Browser-local state

Playback preferences and queue/position restoration use browser storage. Settings are cached per signed-in account in that browser and synchronized with the account's `user_settings` record in Supabase. Browser-local playback state is not a backup of uploaded media or cloud library data. Signing out clears the saved queue and current-track position for that browser.

Existing files from an older local-only library are not automatically uploaded or migrated. Upload those files through the app after signing in.

## Deployment

Build the static site:

```bash
npm run build
```

Deploy the contents of `dist/` to a static hosting provider. Configure the production environment with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` before building. Configure the host to serve the app entry point for client-side routes (SPA fallback), and add the production site URL to your Supabase Auth URL configuration. Apply migrations to the production Supabase project before directing users to the deployed app.

## Project structure

```text
src/
  components/       Shared UI, navigation, upload, queue, and player components
    ui/             Reusable buttons, inputs, modals, and spinners
  context/          Authentication, player, settings, theme, and toast state
  hooks/            Favorites, keyboard shortcuts, infinite scroll, and debounce
  lib/              Supabase access, songs, playlists, audio, and utilities
  pages/            Authentication, library, search, playlists, smart views, settings
  types/            Shared TypeScript types
supabase/
  migrations/       Ordered SQL schema, access, and policy migrations
```

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `Space` | Play or pause |
| `←` / `→` | Previous / next track |
| `↑` / `↓` | Increase / decrease volume |
| `M` | Mute or unmute |
| `S` | Toggle shuffle |
| `R` | Cycle repeat mode |

## Troubleshooting

- **Supabase connection error:** Check that both environment variables are present, correctly named, and point to the intended project. Restart Vite after changing `.env`.
- **Database or permission errors:** Confirm that all migrations were applied in order and that row-level security, grants, and storage policies are present.
- **Uploads fail:** Check the Supabase Storage buckets and policies, project storage limits, and the selected file's supported audio type.
- **Deep links return 404 after deployment:** Enable SPA fallback/rewrites to `index.html` in your hosting provider.
- **Account creation does not immediately sign in:** Check your Supabase email-confirmation settings and verify the address if confirmation is required.

## Contributing

Keep schema changes in new timestamped SQL migrations. Before submitting changes, run:

```bash
npm run typecheck
npm run lint
npm run build
```

