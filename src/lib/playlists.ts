import type { Playlist, Song } from '@/types';
import { supabase } from './supabase';
import { fetchPlaylistSongs } from './songs';

function notifyPlaylistsChanged(): void {
  window.dispatchEvent(new Event('resonate:playlists-changed'));
}

export async function fetchPlaylists(): Promise<Playlist[]> {
  const { data: playlists, error } = await supabase
    .from('playlists')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  if (!playlists?.length) return [];

  const { data: rows, error: songsError } = await supabase
    .from('playlist_songs')
    .select('playlist_id')
    .in('playlist_id', playlists.map((playlist) => playlist.id));
  if (songsError) throw songsError;

  const counts = new Map<string, number>();
  (rows ?? []).forEach((row) => counts.set(row.playlist_id, (counts.get(row.playlist_id) ?? 0) + 1));
  return playlists.map((playlist) => ({
    ...playlist,
    song_count: counts.get(playlist.id) ?? 0,
  })) as Playlist[];
}

export async function createPlaylist(
  name: string,
  description = '',
  coverColor = '#0ea5e9',
): Promise<Playlist> {
  const { data, error } = await supabase
    .from('playlists')
    .insert({ name, description, cover_color: coverColor })
    .select()
    .single();
  if (error) throw error;
  notifyPlaylistsChanged();
  return { ...data, song_count: 0 } as Playlist;
}

export async function updatePlaylist(
  id: string,
  updates: Partial<Pick<Playlist, 'name' | 'description' | 'cover_color'>>,
): Promise<void> {
  const { error } = await supabase.from('playlists').update(updates).eq('id', id);
  if (error) throw error;
  notifyPlaylistsChanged();
}

export async function deletePlaylist(id: string): Promise<void> {
  const { error } = await supabase.from('playlists').delete().eq('id', id);
  if (error) throw error;
  notifyPlaylistsChanged();
}

export async function duplicatePlaylist(id: string, newName: string): Promise<Playlist> {
  const { data: source, error } = await supabase
    .from('playlists')
    .select('description, cover_color')
    .eq('id', id)
    .single();
  if (error) throw error;

  const duplicate = await createPlaylist(newName, source.description ?? '', source.cover_color ?? '#0ea5e9');
  const songs = await fetchPlaylistSongs(id);
  if (songs.length) {
    const { error: insertError } = await supabase.from('playlist_songs').insert(
      songs.map((item, position) => ({
        playlist_id: duplicate.id,
        song_id: item.song_id,
        position,
      })),
    );
    if (insertError) {
      await deletePlaylist(duplicate.id);
      throw insertError;
    }
  }
  notifyPlaylistsChanged();
  return { ...duplicate, song_count: songs.length };
}

export async function addSongToPlaylist(playlistId: string, songId: string): Promise<void> {
  const { data: existing, error: lookupError } = await supabase
    .from('playlist_songs')
    .select('id')
    .eq('playlist_id', playlistId)
    .eq('song_id', songId)
    .maybeSingle();
  if (lookupError) throw lookupError;
  if (existing) return;

  const { data: rows, error: listError } = await supabase
    .from('playlist_songs')
    .select('position')
    .eq('playlist_id', playlistId);
  if (listError) throw listError;
  const position = (rows ?? []).reduce((max, row) => Math.max(max, row.position), -1) + 1;
  const { error } = await supabase.from('playlist_songs').insert({
    playlist_id: playlistId,
    song_id: songId,
    position,
  });
  if (error) throw error;
  notifyPlaylistsChanged();
}

export async function addSongsToPlaylist(playlistId: string, songIds: string[]): Promise<number> {
  const uniqueSongIds = [...new Set(songIds)];
  if (!uniqueSongIds.length) return 0;

  const { data: existingRows, error: existingError } = await supabase
    .from('playlist_songs')
    .select('song_id, position')
    .eq('playlist_id', playlistId);
  if (existingError) throw existingError;

  const existingIds = new Set((existingRows ?? []).map((row) => row.song_id));
  const newSongIds = uniqueSongIds.filter((songId) => !existingIds.has(songId));
  if (!newSongIds.length) return 0;

  const firstPosition = (existingRows ?? []).reduce(
    (max, row) => Math.max(max, row.position),
    -1,
  ) + 1;
  const { error } = await supabase.from('playlist_songs').insert(
    newSongIds.map((songId, index) => ({
      playlist_id: playlistId,
      song_id: songId,
      position: firstPosition + index,
    })),
  );
  if (error) throw error;
  notifyPlaylistsChanged();
  return newSongIds.length;
}

export async function removeSongFromPlaylist(playlistId: string, songId: string): Promise<void> {
  const { error } = await supabase
    .from('playlist_songs')
    .delete()
    .eq('playlist_id', playlistId)
    .eq('song_id', songId);
  if (error) throw error;
  notifyPlaylistsChanged();
}

export async function reorderPlaylistSongs(playlistId: string, orderedSongIds: string[]): Promise<void> {
  if (!orderedSongIds.length) return;
  const { error } = await supabase.from('playlist_songs').upsert(
    orderedSongIds.map((songId, position) => ({
      playlist_id: playlistId,
      song_id: songId,
      position,
    })),
    { onConflict: 'playlist_id,song_id' },
  );
  if (error) throw error;
  notifyPlaylistsChanged();
}

export interface PlaylistExport {
  name: string;
  description: string;
  songs: { title: string; artist: string; album: string }[];
}

export async function exportPlaylist(playlistId: string): Promise<PlaylistExport> {
  const { data: playlist, error } = await supabase
    .from('playlists')
    .select('name, description')
    .eq('id', playlistId)
    .single();
  if (error) throw error;

  const playlistSongs = await fetchPlaylistSongs(playlistId);
  return {
    name: playlist.name,
    description: playlist.description || '',
    songs: playlistSongs
      .map((item) => item.song)
      .filter((song): song is Song => Boolean(song))
      .map((song) => ({ title: song.title, artist: song.artist, album: song.album })),
  };
}
