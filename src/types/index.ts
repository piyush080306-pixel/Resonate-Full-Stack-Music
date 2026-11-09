export interface Song {
  id: string;
  user_id: string;
  title: string;
  artist: string;
  album: string;
  genre: string;
  year: number | null;
  duration: number;
  file_path: string;
  artwork_path: string | null;
  dominant_color: string;
  waveform: number[];
  file_size: number;
  created_at: string;
  favorite?: boolean;
}

export interface Playlist {
  id: string;
  user_id: string;
  name: string;
  description: string;
  cover_color: string;
  created_at: string;
  song_count?: number;
}

export interface PlaylistSong {
  id: string;
  playlist_id: string;
  song_id: string;
  position: number;
  added_at: string;
  song?: Song;
}

export interface Favorite {
  id: string;
  user_id: string;
  song_id: string;
  created_at: string;
  song?: Song;
}

export interface PlayHistoryEntry {
  id: string;
  user_id: string;
  song_id: string;
  play_count: number;
  last_played_at: string;
  song?: Song;
}

export interface UserSettings {
  theme: 'dark' | 'light';
  accentColor: string;
  defaultVolume: number;
  autoPlay: boolean;
  crossfadeDuration: number;
  defaultPlaybackSpeed: number;
}

export type RepeatMode = 'off' | 'all' | 'one';

export interface QueueItem {
  song: Song;
  source: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

export interface UploadItem {
  id: string;
  file: File;
  progress: number;
  speed: number;
  status: 'queued' | 'uploading' | 'processing' | 'done' | 'error' | 'cancelled';
  error?: string;
}
