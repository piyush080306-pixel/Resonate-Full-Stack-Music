DROP POLICY IF EXISTS "insert_own_favorites" ON public.favorites;
CREATE POLICY "insert_own_favorites" ON public.favorites
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.songs s
      WHERE s.id = favorites.song_id
        AND s.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert_own_history" ON public.play_history;
CREATE POLICY "insert_own_history" ON public.play_history
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1
      FROM public.songs s
      WHERE s.id = play_history.song_id
        AND s.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert_own_playlist_songs" ON public.playlist_songs;
CREATE POLICY "insert_own_playlist_songs" ON public.playlist_songs
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.playlists p
      WHERE p.id = playlist_songs.playlist_id
        AND p.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1
      FROM public.songs s
      WHERE s.id = playlist_songs.song_id
        AND s.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "update_own_playlist_songs" ON public.playlist_songs;
CREATE POLICY "update_own_playlist_songs" ON public.playlist_songs
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.playlists p
      WHERE p.id = playlist_songs.playlist_id
        AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.playlists p
      WHERE p.id = playlist_songs.playlist_id
        AND p.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1
      FROM public.songs s
      WHERE s.id = playlist_songs.song_id
        AND s.user_id = auth.uid()
    )
  );
