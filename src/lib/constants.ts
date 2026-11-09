export const ACCENT_COLORS = [
  { name: 'Sky', value: '#0ea5e9' },
  { name: 'Emerald', value: '#10b981' },
  { name: 'Rose', value: '#f43f5e' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Violet', value: '#8b5cf6' },
  { name: 'Cyan', value: '#06b6d4' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Lime', value: '#84cc16' },
];

export const DEFAULT_SETTINGS = {
  theme: 'dark' as const,
  accentColor: '#0ea5e9',
  defaultVolume: 70,
  autoPlay: true,
  crossfadeDuration: 0,
  defaultPlaybackSpeed: 1,
};

export const STORAGE_KEYS = {
  queue: 'music-queue',
  originalQueue: 'music-original-queue',
  currentIndex: 'music-current-index',
  volume: 'music-volume',
  speed: 'music-speed',
  repeat: 'music-repeat',
  shuffle: 'music-shuffle',
  position: 'music-position',
  currentSongId: 'music-current-song-id',
  settings: 'music-settings',
};

export const ACCEPTED_AUDIO_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/wave',
  'audio/x-wav',
  'audio/ogg',
  'audio/flac',
  'audio/x-flac',
  'audio/aac',
  'audio/mp4',
  'audio/x-m4a',
];

export const MAX_UPLOAD_SIZE = 50 * 1024 * 1024 * 1024; // 50GB

export const PAGE_SIZE = 24;
