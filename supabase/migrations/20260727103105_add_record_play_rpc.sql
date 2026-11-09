/*
# Add record_play RPC function

1. Functions
- `record_play(p_song_id uuid)` — upserts play_history row for the calling user, incrementing play_count and updating last_played_at. Uses auth.uid() for the owner.

2. Security
- SECURITY DEFINER so it can write to play_history on behalf of the authenticated caller.
- Validates the calling user owns the song before recording.
*/

CREATE OR REPLACE FUNCTION record_play(p_song_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM songs
    WHERE id = p_song_id
      AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Song not found or not owned by the caller';
  END IF;

  INSERT INTO play_history (user_id, song_id, play_count, last_played_at)
  VALUES (auth.uid(), p_song_id, 1, now())
  ON CONFLICT (user_id, song_id)
  DO UPDATE SET play_count = play_history.play_count + 1, last_played_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION record_play(uuid) TO authenticated;
