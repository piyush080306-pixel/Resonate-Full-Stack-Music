GRANT USAGE ON SCHEMA public TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.songs,
  public.playlists,
  public.playlist_songs,
  public.favorites,
  public.play_history,
  public.user_settings
TO authenticated;

GRANT EXECUTE ON FUNCTION public.record_play(uuid) TO authenticated;
