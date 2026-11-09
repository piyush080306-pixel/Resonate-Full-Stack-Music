/*
# Create music streaming schema (multi-user, owner-scoped)

1. New Tables
- `songs` — uploaded audio tracks with metadata, duration, waveform, dominant color, artwork/storage paths.
- `playlists` — user-created playlists.
- `playlist_songs` — join table ordering songs within a playlist.
- `favorites` — user-favorited songs.
- `play_history` — recently played songs with play count.
- `user_settings` — per-user player/theme settings (JSONB).

2. Security
- RLS enabled on every table.
- Owner-scoped CRUD policies using auth.uid() = user_id.
- user_id columns default to auth.uid() so client inserts omitting user_id succeed.

3. Notes
- Storage buckets `audio` and `artwork` are public-read for playback; writes via authenticated user.
- waveform stored as numeric array (JSONB) of peak values for visualizer fallback.
*/

CREATE TABLE IF NOT EXISTS songs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  artist text DEFAULT 'Unknown Artist',
  album text DEFAULT '',
  genre text DEFAULT '',
  year int,
  duration numeric NOT NULL DEFAULT 0,
  file_path text NOT NULL,
  artwork_path text,
  dominant_color text DEFAULT '#1e293b',
  waveform jsonb DEFAULT '[]'::jsonb,
  file_size bigint DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS playlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text DEFAULT '',
  cover_color text DEFAULT '#0ea5e9',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS playlist_songs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id uuid NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
  song_id uuid NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  position int NOT NULL DEFAULT 0,
  added_at timestamptz DEFAULT now(),
  UNIQUE (playlist_id, song_id)
);

CREATE TABLE IF NOT EXISTS favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  song_id uuid NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, song_id)
);

CREATE TABLE IF NOT EXISTS play_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  song_id uuid NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  play_count int NOT NULL DEFAULT 1,
  last_played_at timestamptz DEFAULT now(),
  UNIQUE (user_id, song_id)
);

CREATE TABLE IF NOT EXISTS user_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlist_songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE play_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- songs policies
DROP POLICY IF EXISTS "select_own_songs" ON songs;
CREATE POLICY "select_own_songs" ON songs FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_songs" ON songs;
CREATE POLICY "insert_own_songs" ON songs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_songs" ON songs;
CREATE POLICY "update_own_songs" ON songs FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_songs" ON songs;
CREATE POLICY "delete_own_songs" ON songs FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- playlists policies
DROP POLICY IF EXISTS "select_own_playlists" ON playlists;
CREATE POLICY "select_own_playlists" ON playlists FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_playlists" ON playlists;
CREATE POLICY "insert_own_playlists" ON playlists FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_playlists" ON playlists;
CREATE POLICY "update_own_playlists" ON playlists FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_playlists" ON playlists;
CREATE POLICY "delete_own_playlists" ON playlists FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- playlist_songs policies (scoped via parent playlist ownership)
DROP POLICY IF EXISTS "select_own_playlist_songs" ON playlist_songs;
CREATE POLICY "select_own_playlist_songs" ON playlist_songs FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM playlists p WHERE p.id = playlist_id AND p.user_id = auth.uid()));
DROP POLICY IF EXISTS "insert_own_playlist_songs" ON playlist_songs;
CREATE POLICY "insert_own_playlist_songs" ON playlist_songs FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM playlists p WHERE p.id = playlist_id AND p.user_id = auth.uid()));
DROP POLICY IF EXISTS "update_own_playlist_songs" ON playlist_songs;
CREATE POLICY "update_own_playlist_songs" ON playlist_songs FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM playlists p WHERE p.id = playlist_id AND p.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM playlists p WHERE p.id = playlist_id AND p.user_id = auth.uid()));
DROP POLICY IF EXISTS "delete_own_playlist_songs" ON playlist_songs;
CREATE POLICY "delete_own_playlist_songs" ON playlist_songs FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM playlists p WHERE p.id = playlist_id AND p.user_id = auth.uid()));

-- favorites policies
DROP POLICY IF EXISTS "select_own_favorites" ON favorites;
CREATE POLICY "select_own_favorites" ON favorites FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_favorites" ON favorites;
CREATE POLICY "insert_own_favorites" ON favorites FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_favorites" ON favorites;
CREATE POLICY "delete_own_favorites" ON favorites FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- play_history policies
DROP POLICY IF EXISTS "select_own_history" ON play_history;
CREATE POLICY "select_own_history" ON play_history FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_history" ON play_history;
CREATE POLICY "insert_own_history" ON play_history FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_history" ON play_history;
CREATE POLICY "update_own_history" ON play_history FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- user_settings policies
DROP POLICY IF EXISTS "select_own_settings" ON user_settings;
CREATE POLICY "select_own_settings" ON user_settings FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_settings" ON user_settings;
CREATE POLICY "insert_own_settings" ON user_settings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_settings" ON user_settings;
CREATE POLICY "update_own_settings" ON user_settings FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- indexes
CREATE INDEX IF NOT EXISTS idx_songs_user ON songs(user_id);
CREATE INDEX IF NOT EXISTS idx_songs_created ON songs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_playlists_user ON playlists(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_history_user ON play_history(user_id, last_played_at DESC);

-- Storage buckets and owner-scoped upload policies.
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('audio', 'audio', true),
  ('artwork', 'artwork', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

DROP POLICY IF EXISTS "public_read_audio" ON storage.objects;
CREATE POLICY "public_read_audio" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'audio');

DROP POLICY IF EXISTS "public_read_artwork" ON storage.objects;
CREATE POLICY "public_read_artwork" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'artwork');

DROP POLICY IF EXISTS "authenticated_upload_audio" ON storage.objects;
CREATE POLICY "authenticated_upload_audio" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'audio' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "authenticated_update_audio" ON storage.objects;
CREATE POLICY "authenticated_update_audio" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'audio' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'audio' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "authenticated_delete_audio" ON storage.objects;
CREATE POLICY "authenticated_delete_audio" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'audio' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "authenticated_upload_artwork" ON storage.objects;
CREATE POLICY "authenticated_upload_artwork" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'artwork' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "authenticated_update_artwork" ON storage.objects;
CREATE POLICY "authenticated_update_artwork" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'artwork' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'artwork' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "authenticated_delete_artwork" ON storage.objects;
CREATE POLICY "authenticated_delete_artwork" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'artwork' AND (storage.foldername(name))[1] = auth.uid()::text);
