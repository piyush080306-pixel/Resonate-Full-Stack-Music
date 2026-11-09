import type { Song, PlaylistSong } from '@/types';
import { supabase } from './supabase';

const AUDIO_BUCKET = 'audio';
const ARTWORK_BUCKET = 'artwork';

async function requireUserId(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  if (!data.user) throw new Error('Sign in to access your music library.');
  return data.user.id;
}

function publicStorageUrl(bucket: string, path: string | null): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

function firstSongRelation(song: Song | Song[] | null | undefined): Song | null {
  return Array.isArray(song) ? song[0] ?? null : song ?? null;
}

export function hydrateSongUrls(): Promise<void> {
  return Promise.resolve();
}

export function getAudioUrl(song: Pick<Song, 'id' | 'file_path'>): string {
  return publicStorageUrl(AUDIO_BUCKET, song.file_path) ?? '';
}

export function getArtworkUrl(song: Pick<Song, 'id' | 'artwork_path'>): string | null {
  return publicStorageUrl(ARTWORK_BUCKET, song.artwork_path);
}

export interface NewSongInput {
  file: File;
  title: string;
  artist: string;
  album: string;
  genre: string;
  year: number | null;
  duration: number;
  waveform: number[];
  dominantColor: string;
  artworkBlob: Blob | null;
}

function fileExtension(name: string, fallback: string): string {
  const extension = name.split('.').pop()?.toLowerCase();
  return extension && /^[a-z0-9]{1,8}$/.test(extension) ? extension : fallback;
}

export async function createSong(input: NewSongInput): Promise<Song> {
  const userId = await requireUserId();
  const id = crypto.randomUUID();
  const audioPath = `${userId}/${id}.${fileExtension(input.file.name, 'audio')}`;
  const artworkPath = input.artworkBlob
    ? `${userId}/${id}.${fileExtension(
        input.artworkBlob.type.split('/')[1] || 'jpg',
        'jpg',
      )}`
    : null;

  const audioUpload = await supabase.storage.from(AUDIO_BUCKET).upload(audioPath, input.file, {
    contentType: input.file.type || undefined,
    upsert: false,
  });
  if (audioUpload.error) throw audioUpload.error;

  if (input.artworkBlob && artworkPath) {
    const artworkUpload = await supabase.storage.from(ARTWORK_BUCKET).upload(artworkPath, input.artworkBlob, {
      contentType: input.artworkBlob.type || undefined,
      upsert: false,
    });
    if (artworkUpload.error) {
      await supabase.storage.from(AUDIO_BUCKET).remove([audioPath]);
      throw artworkUpload.error;
    }
  }

  const song: Omit<Song, 'favorite'> = {
    id,
    user_id: userId,
    title: input.title,
    artist: input.artist,
    album: input.album,
    genre: input.genre,
    year: input.year,
    duration: input.duration,
    file_path: audioPath,
    artwork_path: artworkPath,
    dominant_color: input.dominantColor,
    waveform: input.waveform,
    file_size: input.file.size,
    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from('songs').insert(song).select().single();
  if (error) {
    await supabase.storage.from(AUDIO_BUCKET).remove([audioPath]);
    if (artworkPath) await supabase.storage.from(ARTWORK_BUCKET).remove([artworkPath]);
    throw error;
  }
  return data as Song;
}

export async function fetchSongs(): Promise<Song[]> {
  const { data, error } = await supabase.from('songs').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Song[];
}

export async function fetchStorageUsage(): Promise<{ audioBytes: number; artworkBytes: number }> {
  const userId = await requireUserId();
  const bucketSize = async (bucket: string): Promise<number> => {
    const pageSize = 100;
    let offset = 0;
    let total = 0;

    while (true) {
      const { data, error } = await supabase.storage.from(bucket).list(userId, {
        limit: pageSize,
        offset,
        sortBy: { column: 'name', order: 'asc' },
      });
      if (error) throw error;

      const files = data ?? [];
      for (const file of files) {
        if (!file.id) continue;
        const size = Number(file.metadata?.size);
        if (!Number.isFinite(size) || size < 0) {
          throw new Error(`Storage did not return a valid size for ${file.name}.`);
        }
        total += size;
      }

      if (files.length < pageSize) return total;
      offset += files.length;
    }
  };

  const [audioBytes, artworkBytes] = await Promise.all([
    bucketSize(AUDIO_BUCKET),
    bucketSize(ARTWORK_BUCKET),
  ]);
  return { audioBytes, artworkBytes };
}

export async function getFavoriteIds(): Promise<string[]> {
  const { data, error } = await supabase.from('favorites').select('song_id');
  if (error) throw error;
  return (data ?? []).map((favorite) => favorite.song_id);
}

export async function fetchFavorites(): Promise<Song[]> {
  const { data, error } = await supabase
    .from('favorites')
    .select('created_at, song:songs(*)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? [])
    .map((favorite) => firstSongRelation(favorite.song))
    .filter((song): song is Song => Boolean(song));
}

export async function fetchHistory(): Promise<Song[]> {
  const { data, error } = await supabase
    .from('play_history')
    .select('last_played_at, song:songs(*)')
    .order('last_played_at', { ascending: false });
  if (error) throw error;
  return (data ?? [])
    .map((entry) => firstSongRelation(entry.song))
    .filter((song): song is Song => Boolean(song));
}

export async function fetchHistorySince(days: number): Promise<Song[]> {
  const cutoff = new Date(Date.now() - days * 86400000).toISOString();
  const { data, error } = await supabase
    .from('play_history')
    .select('last_played_at, song:songs(*)')
    .gte('last_played_at', cutoff)
    .order('last_played_at', { ascending: false });
  if (error) throw error;
  return (data ?? [])
    .map((entry) => firstSongRelation(entry.song))
    .filter((song): song is Song => Boolean(song));
}

export async function fetchMostPlayed(): Promise<Song[]> {
  const { data, error } = await supabase
    .from('play_history')
    .select('play_count, song:songs(*)')
    .order('play_count', { ascending: false });
  if (error) throw error;
  return (data ?? [])
    .map((entry) => firstSongRelation(entry.song))
    .filter((song): song is Song => Boolean(song));
}

export async function toggleFavorite(songId: string, isFav: boolean): Promise<void> {
  if (isFav) {
    const { error } = await supabase.from('favorites').upsert(
      { song_id: songId },
      { onConflict: 'user_id,song_id' },
    );
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from('favorites').delete().eq('song_id', songId);
  if (error) throw error;
}

export async function checkFavorites(songIds: string[]): Promise<Set<string>> {
  if (!songIds.length) return new Set();
  const { data, error } = await supabase.from('favorites').select('song_id').in('song_id', songIds);
  if (error) throw error;
  return new Set((data ?? []).map((favorite) => favorite.song_id));
}

export async function recordPlay(songId: string): Promise<void> {
  const { error } = await supabase.rpc('record_play', { p_song_id: songId });
  if (error) throw error;
}

export async function deleteSong(songId: string): Promise<void> {
  const { data: song, error: fetchError } = await supabase
    .from('songs')
    .select('file_path, artwork_path')
    .eq('id', songId)
    .single();
  if (fetchError) throw fetchError;

  const audioRemove = await supabase.storage.from(AUDIO_BUCKET).remove([song.file_path]);
  if (audioRemove.error) throw audioRemove.error;
  if (song.artwork_path) {
    const artworkRemove = await supabase.storage.from(ARTWORK_BUCKET).remove([song.artwork_path]);
    if (artworkRemove.error) throw artworkRemove.error;
  }

  const { error } = await supabase.from('songs').delete().eq('id', songId);
  if (error) throw error;
}

export async function updateSong(
  songId: string,
  updates: Partial<Pick<Song, 'title' | 'artist' | 'album' | 'genre' | 'year'>>,
): Promise<void> {
  const { error } = await supabase.from('songs').update(updates).eq('id', songId);
  if (error) throw error;
}

export async function fetchPlaylistSongs(playlistId: string): Promise<PlaylistSong[]> {
  const { data, error } = await supabase
    .from('playlist_songs')
    .select('id, playlist_id, song_id, position, added_at, song:songs(*)')
    .eq('playlist_id', playlistId)
    .order('position', { ascending: true });
  if (error) throw error;
  return (data ?? [])
    .map((row) => {
      const { song, ...playlistSong } = row;
      const relatedSong = firstSongRelation(song);
      return relatedSong ? { ...playlistSong, song: relatedSong } : null;
    })
    .filter((row): row is PlaylistSong & { song: Song } => Boolean(row));
}
