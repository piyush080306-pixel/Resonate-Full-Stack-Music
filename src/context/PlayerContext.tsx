import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import type { Song, QueueItem, RepeatMode } from '@/types';
import { fetchSongs, getArtworkUrl, getAudioUrl, hydrateSongUrls, recordPlay } from '@/lib/songs';
import { shuffleArray, clamp } from '@/lib/utils';
import { STORAGE_KEYS } from '@/lib/constants';
import { useSettings } from './SettingsContext';

interface PlayerContextValue {
  currentSong: Song | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
  speed: number;
  repeat: RepeatMode;
  shuffle: boolean;
  queue: QueueItem[];
  originalQueue: QueueItem[];
  currentIndex: number;
  history: string[];
  crossfadeDuration: number;
  sleepTimer: number | null;
  audioElement: HTMLAudioElement | null;
  playSong: (song: Song, queue?: Song[], source?: string) => void;
  shufflePlay: (queue: Song[], source?: string) => void;
  togglePlay: () => void;
  next: () => void;
  previous: () => void;
  seek: (time: number) => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  setSpeed: (s: number) => void;
  toggleRepeat: () => void;
  toggleShuffle: () => void;
  playQueueItem: (index: number) => void;
  removeFromQueue: (index: number) => void;
  moveQueueItem: (from: number, to: number) => void;
  playNext: (song: Song) => void;
  playLast: (song: Song) => void;
  clearQueue: () => void;
  saveQueue: () => void;
  setSleepTimer: (minutes: number | null) => void;
  getAnalyser: () => AnalyserNode | null;
}

interface PersistedPlayerState {
  queue: QueueItem[];
  originalQueue: QueueItem[];
  currentIndex: number;
  currentSong: Song | null;
  position: number;
}

const PlayerContext = createContext<PlayerContextValue | undefined>(undefined);

function parseQueue(raw: string | null): QueueItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return (parsed as QueueItem[]).filter(
      (item) => item && item.song && typeof item.song.id === 'string',
    );
  } catch {
    return [];
  }
}

function findQueueItemIndex(
  items: QueueItem[],
  target: QueueItem | undefined,
  songId?: string,
): number {
  if (target) {
    const exactIndex = items.indexOf(target);
    if (exactIndex >= 0) return exactIndex;
  }
  return songId ? items.findIndex((item) => item.song.id === songId) : -1;
}

function shuffleUpcoming(items: QueueItem[], previousSongId?: string): QueueItem[] {
  const shuffled = shuffleArray(items);
  if (previousSongId && shuffled.length > 1 && shuffled[0].song.id === previousSongId) {
    const alternative = shuffled.findIndex((item) => item.song.id !== previousSongId);
    if (alternative > 0) {
      [shuffled[0], shuffled[alternative]] = [shuffled[alternative], shuffled[0]];
    }
  }
  return shuffled;
}

/** Read the last session synchronously so the first render already has it. */
function loadPersistedState(): PersistedPlayerState {
  const storedQueue = parseQueue(localStorage.getItem(STORAGE_KEYS.queue));
  let originalQueue = parseQueue(localStorage.getItem(STORAGE_KEYS.originalQueue));
  const queue = storedQueue.length ? storedQueue : originalQueue;
  if (!originalQueue.length) originalQueue = queue;

  let currentIndex = -1;
  if (queue.length) {
    const savedSongId = localStorage.getItem(STORAGE_KEYS.currentSongId);
    const savedIndex = parseInt(localStorage.getItem(STORAGE_KEYS.currentIndex) || '-1', 10);
    if (savedSongId) currentIndex = queue.findIndex((item) => item.song.id === savedSongId);
    if (currentIndex < 0 && savedIndex >= 0 && savedIndex < queue.length) currentIndex = savedIndex;
    if (currentIndex < 0) currentIndex = 0;
  }

  let position = 0;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.position);
    if (raw) {
      const parsed = JSON.parse(raw) as { songId?: string; position?: number };
      if (
        parsed &&
        typeof parsed.position === 'number' &&
        parsed.songId === queue[currentIndex]?.song.id
      ) {
        position = parsed.position;
      }
    }
  } catch {
    // Older position format — start from the beginning.
  }

  return {
    queue,
    originalQueue,
    currentIndex,
    currentSong: currentIndex >= 0 ? queue[currentIndex].song : null,
    position,
  };
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings();
  const [initial] = useState<PersistedPlayerState>(loadPersistedState);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const sleepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settingsRef = useRef(settings);

  // Refs to hold the latest values for event listeners bound only once.
  const currentIndexRef = useRef(initial.currentIndex);
  const repeatRef = useRef<RepeatMode>(
    (localStorage.getItem(STORAGE_KEYS.repeat) as RepeatMode) || 'off',
  );
  const shuffleRef = useRef(localStorage.getItem(STORAGE_KEYS.shuffle) === 'true');
  const queueRef = useRef<QueueItem[]>(initial.queue);
  const originalQueueRef = useRef<QueueItem[]>(initial.originalQueue);
  const currentSongRef = useRef<Song | null>(initial.currentSong);
  const historyRef = useRef<string[]>([]);
  const loadAndPlayRef = useRef<(song: Song, pos?: number) => void>(() => {});
  const nextRef = useRef<() => void>(() => {});

  const [currentSong, setCurrentSong] = useState<Song | null>(initial.currentSong);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(initial.position);
  const [duration, setDuration] = useState(initial.currentSong?.duration || 0);
  const [audioReady, setAudioReady] = useState(false);
  const [volume, setVolumeState] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.volume);
    return stored ? parseFloat(stored) : settings.defaultVolume / 100;
  });
  const [muted, setMuted] = useState(false);
  const [speed, setSpeedState] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEYS.speed);
    return stored ? parseFloat(stored) : settings.defaultPlaybackSpeed;
  });
  const [repeat, setRepeat] = useState<RepeatMode>(() => {
    return (localStorage.getItem(STORAGE_KEYS.repeat) as RepeatMode) || 'off';
  });
  const [shuffle, setShuffle] = useState(() => localStorage.getItem(STORAGE_KEYS.shuffle) === 'true');
  const [queue, setQueue] = useState<QueueItem[]>(initial.queue);
  const [originalQueue, setOriginalQueue] = useState<QueueItem[]>(initial.originalQueue);
  const [currentIndex, setCurrentIndex] = useState(initial.currentIndex);
  const [history, setHistory] = useState<string[]>([]);
  const crossfadeDuration = settings.crossfadeDuration || 0;
  const [sleepTimer, setSleepTimerState] = useState<number | null>(null);

  // Keep refs in sync with the latest state.
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);
  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);
  useEffect(() => {
    repeatRef.current = repeat;
    localStorage.setItem(STORAGE_KEYS.repeat, repeat);
  }, [repeat]);
  useEffect(() => {
    shuffleRef.current = shuffle;
    localStorage.setItem(STORAGE_KEYS.shuffle, String(shuffle));
  }, [shuffle]);
  useEffect(() => {
    queueRef.current = queue;
    localStorage.setItem(STORAGE_KEYS.queue, JSON.stringify(queue));
  }, [queue]);
  useEffect(() => {
    originalQueueRef.current = originalQueue;
    localStorage.setItem(STORAGE_KEYS.originalQueue, JSON.stringify(originalQueue));
  }, [originalQueue]);
  useEffect(() => {
    currentSongRef.current = currentSong;
    if (currentSong) {
      localStorage.setItem(STORAGE_KEYS.currentSongId, currentSong.id);
      localStorage.setItem(STORAGE_KEYS.currentIndex, String(currentIndex));
    } else {
      localStorage.removeItem(STORAGE_KEYS.currentSongId);
      localStorage.removeItem(STORAGE_KEYS.currentIndex);
    }
  }, [currentSong, currentIndex]);

  const pushHistory = useCallback((songId?: string | null) => {
    if (!songId) return;
    const last = historyRef.current[historyRef.current.length - 1];
    if (last === songId) return;
    const nextHistory = [...historyRef.current, songId].slice(-200);
    historyRef.current = nextHistory;
    setHistory(nextHistory);
  }, []);

  const popHistory = useCallback((items: QueueItem[]): number | null => {
    const rest = [...historyRef.current];
    while (rest.length) {
      const songId = rest.pop() as string;
      const index = items.findIndex((item) => item.song.id === songId);
      if (index >= 0) {
        historyRef.current = rest;
        setHistory(rest);
        return index;
      }
    }
    historyRef.current = rest;
    setHistory(rest);
    return null;
  }, []);

  // Create the audio element once.
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'auto';
    audio.crossOrigin = 'anonymous';
    audio.volume = muted ? 0 : volume;
    audio.playbackRate = speed;
    audioRef.current = audio;

    const onTime = () => setCurrentTime(audio.currentTime);
    const onDuration = () => setDuration(audio.duration || 0);
    const onEnd = () => {
      if (repeatRef.current === 'one') {
        audio.currentTime = 0;
        audio.play().catch(() => {});
        return;
      }
      nextRef.current();
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => {
      setIsPlaying(false);
      const song = currentSongRef.current;
      if (song) {
        localStorage.setItem(
          STORAGE_KEYS.position,
          JSON.stringify({ songId: song.id, position: audio.currentTime }),
        );
      }
    };

    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('durationchange', onDuration);
    audio.addEventListener('ended', onEnd);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);

    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('durationchange', onDuration);
      audio.removeEventListener('ended', onEnd);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.pause();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Restore the previous session (paused) once the local audio blobs are ready.
  useEffect(() => {
    if (!initial.currentSong) return;
    let cancelled = false;
    void hydrateSongUrls().then(() => {
      const audio = audioRef.current;
      if (cancelled || !audio) return;
      audio.src = getAudioUrl(initial.currentSong as Song);
      audio.load();
      setCurrentTime(initial.position);
      setDuration(initial.currentSong?.duration || 0);
      if (initial.position > 0) {
        try {
          audio.currentTime = initial.position;
        } catch {
          // Some browsers reject seeking before metadata is ready.
        }
      }
    });
    return () => {
      cancelled = true;
    };
  }, [initial]);

  // Persist volume/mute and respect crossfade routing.
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.volume, String(volume));
    const audio = audioRef.current;
    if (audio) audio.volume = crossfadeDuration > 0 ? 1 : muted ? 0 : volume;
  }, [volume, muted, crossfadeDuration]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.speed, String(speed));
    if (audioRef.current) audioRef.current.playbackRate = speed;
  }, [speed]);

  // Persist playback position for the current track.
  useEffect(() => {
    const id = setInterval(() => {
      const audio = audioRef.current;
      const song = currentSongRef.current;
      if (audio && song && !audio.paused) {
        localStorage.setItem(
          STORAGE_KEYS.position,
          JSON.stringify({ songId: song.id, position: audio.currentTime }),
        );
      }
    }, 2000);
    return () => clearInterval(id);
  }, []);

  const setupAudioContext = useCallback(() => {
    if (!audioRef.current) return;
    if (audioCtxRef.current) return;
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      const source = ctx.createMediaElementSource(audioRef.current);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      const gain = ctx.createGain();
      source.connect(analyser);
      analyser.connect(gain);
      gain.connect(ctx.destination);
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      sourceNodeRef.current = source;
      gainRef.current = gain;
      setAudioReady(true);
    } catch (e) {
      console.error('AudioContext setup failed:', e);
    }
  }, []);

  const getAnalyser = useCallback(() => analyserRef.current, []);

  const loadAndPlay = useCallback(
    (song: Song, pos = 0) => {
      if (!audioRef.current) return;
      setupAudioContext();
      if (audioCtxRef.current?.state === 'suspended') {
        audioCtxRef.current.resume();
      }
      audioRef.current.src = getAudioUrl(song);
      audioRef.current.load();
      if (pos > 0) {
        audioRef.current.currentTime = pos;
      }
      setCurrentTime(pos);
      setDuration(song.duration || 0);
      localStorage.setItem(STORAGE_KEYS.position, JSON.stringify({ songId: song.id, position: pos }));
      audioRef.current
        .play()
        .then(() => {
          recordPlay(song.id).catch((error: unknown) => {
            console.error('Could not record play history:', error);
          });
        })
        .catch((err) => {
          console.error('Playback failed:', err);
          setIsPlaying(false);
        });
    },
    [setupAudioContext],
  );

  useEffect(() => {
    loadAndPlayRef.current = loadAndPlay;
  }, [loadAndPlay]);

  /**
   * Play a song. The selected track is always first in the queue, even when
   * shuffle is on — the rest of the list is shuffled behind it.
   */
  const playSong = useCallback(
    (song: Song, list?: Song[], source = 'library') => {
      const sourceSongs = list && list.length ? list : [song];
      const queueItems: QueueItem[] = sourceSongs.map((item) => ({ song: item, source }));
      const hasSong = queueItems.some((item) => item.song.id === song.id);
      const newOriginal = hasSong
        ? queueItems
        : [{ song, source }, ...queueItems];

      setOriginalQueue(newOriginal);
      originalQueueRef.current = newOriginal;

      if (shuffleRef.current && newOriginal.length > 1) {
        const selectedIndex = newOriginal.findIndex((item) => item.song.id === song.id);
        const first = newOriginal[selectedIndex];
        const rest = newOriginal.filter((_, index) => index !== selectedIndex);
        const shuffled = [first, ...shuffleUpcoming(rest, song.id)];
        queueRef.current = shuffled;
        setQueue(shuffled);
        currentIndexRef.current = 0;
        setCurrentIndex(0);
      } else {
        const index = newOriginal.findIndex((item) => item.song.id === song.id);
        queueRef.current = newOriginal;
        setQueue(newOriginal);
        currentIndexRef.current = index < 0 ? 0 : index;
        setCurrentIndex(index < 0 ? 0 : index);
      }

      pushHistory(currentSongRef.current?.id);
      currentSongRef.current = song;
      setCurrentSong(song);
      loadAndPlay(song);
    },
    [loadAndPlay, pushHistory],
  );

  /**
   * Turn shuffle on (if needed), pick a random starting track, and shuffle the
   * rest behind it — the expected behaviour of a "Shuffle play" button.
   */
  const shufflePlay = useCallback(
    (list: Song[], source = 'library') => {
      if (!list.length) return;
      if (!shuffleRef.current) {
        shuffleRef.current = true;
        setShuffle(true);
      }
      const currentId = currentSongRef.current?.id;
      const alternatives = currentId ? list.filter((song) => song.id !== currentId) : list;
      const candidates = alternatives.length ? alternatives : list;
      const chosen = candidates[Math.floor(Math.random() * candidates.length)];
      playSong(chosen, list, source);
    },
    [playSong],
  );

  const playQueueItem = useCallback(
    (index: number) => {
      const items = queueRef.current;
      if (index < 0 || index >= items.length) return;
      if (index === currentIndexRef.current && currentSongRef.current?.id === items[index].song.id) {
        const audio = audioRef.current;
        if (audio) {
          if (audio.paused) audio.play().catch(() => {});
          else audio.pause();
        }
        return;
      }
      pushHistory(currentSongRef.current?.id);
      currentIndexRef.current = index;
      currentSongRef.current = items[index].song;
      setCurrentIndex(index);
      setCurrentSong(items[index].song);
      loadAndPlay(items[index].song);
    },
    [loadAndPlay, pushHistory],
  );

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!currentSongRef.current) {
      const items = queueRef.current;
      if (items.length) {
        currentIndexRef.current = 0;
        currentSongRef.current = items[0].song;
        setCurrentIndex(0);
        setCurrentSong(items[0].song);
        loadAndPlay(items[0].song);
      }
      return;
    }
    setupAudioContext();
    if (audioCtxRef.current?.state === 'suspended') audioCtxRef.current.resume();
    if (audio.paused) {
      audio.play().catch((e) => console.error('Play failed:', e));
    } else {
      audio.pause();
    }
  }, [loadAndPlay, setupAudioContext]);

  const next = useCallback(() => {
    const items = queueRef.current;
    const index = currentIndexRef.current;
    if (!items.length) return;

    let nextItems = items;
    let nextIndex: number;
    if (index < items.length - 1) {
      nextIndex = index + 1;
    } else if (repeatRef.current === 'all') {
      if (shuffleRef.current && items.length > 1) {
        const nextQueue = shuffleUpcoming(
          originalQueueRef.current.length ? originalQueueRef.current : items,
          currentSongRef.current?.id,
        );
        nextItems = nextQueue;
        queueRef.current = nextQueue;
        setQueue(nextQueue);
        currentIndexRef.current = 0;
        nextIndex = 0;
      } else {
        nextIndex = 0;
      }
    } else if (settingsRef.current.autoPlay) {
      // Autoplay: keep the music going by appending songs from the library
      // that aren't already in the queue (like Spotify's recommended tracks).
      const existing = new Set(items.map((item) => item.song.id));
      void fetchSongs().then((library) => {
        const picks = shuffleArray(library.filter((song) => !existing.has(song.id))).slice(0, 10);
        if (!picks.length) {
          setIsPlaying(false);
          if (audioRef.current) audioRef.current.currentTime = 0;
          return;
        }
        const additions: QueueItem[] = picks.map((song) => ({ song, source: 'autoplay' }));
        const appended = [...queueRef.current, ...additions];
        const appendedOriginal = [...originalQueueRef.current, ...additions];
        queueRef.current = appended;
        originalQueueRef.current = appendedOriginal;
        setQueue(appended);
        setOriginalQueue(appendedOriginal);

        const playIndex = appended.length - additions.length;
        pushHistory(currentSongRef.current?.id);
        currentIndexRef.current = playIndex;
        currentSongRef.current = appended[playIndex].song;
        setCurrentIndex(playIndex);
        setCurrentSong(appended[playIndex].song);
        loadAndPlay(appended[playIndex].song);
      });
      return;
    } else {
      setIsPlaying(false);
      if (audioRef.current) audioRef.current.currentTime = 0;
      return;
    }

    pushHistory(currentSongRef.current?.id);
    currentIndexRef.current = nextIndex;
    currentSongRef.current = nextItems[nextIndex].song;
    setCurrentIndex(nextIndex);
    setCurrentSong(nextItems[nextIndex].song);
    loadAndPlay(nextItems[nextIndex].song);
  }, [loadAndPlay, pushHistory]);

  useEffect(() => {
    nextRef.current = next;
  }, [next]);

  const previous = useCallback(() => {
    const items = queueRef.current;
    if (!items.length) return;
    if (audioRef.current && audioRef.current.currentTime > 3) {
      audioRef.current.currentTime = 0;
      return;
    }

    const historyIndex = popHistory(items);
    let prevIndex = historyIndex;
    if (prevIndex === null) {
      const index = currentIndexRef.current;
      if (index > 0) prevIndex = index - 1;
      else if (repeatRef.current === 'all') prevIndex = items.length - 1;
    }

    if (prevIndex === null) {
      if (audioRef.current) audioRef.current.currentTime = 0;
      return;
    }

    currentIndexRef.current = prevIndex;
    currentSongRef.current = items[prevIndex].song;
    setCurrentIndex(prevIndex);
    setCurrentSong(items[prevIndex].song);
    loadAndPlay(items[prevIndex].song);
  }, [loadAndPlay, popHistory]);

  const seek = useCallback(
    (time: number) => {
      if (audioRef.current) {
        audioRef.current.currentTime = clamp(time, 0, duration || audioRef.current.duration);
      }
    },
    [duration],
  );

  const setVolume = useCallback((v: number) => {
    setVolumeState(clamp(v, 0, 1));
    if (v > 0) setMuted(false);
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((m) => !m);
  }, []);

  const setSpeed = useCallback((s: number) => {
    setSpeedState(s);
  }, []);

  const toggleRepeat = useCallback(() => {
    setRepeat((r) => (r === 'off' ? 'all' : r === 'all' ? 'one' : 'off'));
  }, []);

  /**
   * Shuffle only the upcoming tracks, preserving the current track and played
   * portion of the queue. Turning shuffle off restores the original order.
   */
  const toggleShuffle = useCallback(() => {
    const enable = !shuffleRef.current;
    shuffleRef.current = enable;
    setShuffle(enable);

    const current = currentSongRef.current;
    if (enable) {
      const base = queueRef.current;
      if (!base.length) return;
      const currentItem = queueRef.current[currentIndexRef.current];
      const index = findQueueItemIndex(base, currentItem, current?.id);
      const played = index >= 0 ? base.slice(0, index + 1) : [];
      const upcoming = index >= 0 ? base.slice(index + 1) : base;
      const shuffled = [...played, ...shuffleUpcoming(upcoming, current?.id)];
      queueRef.current = shuffled;
      setOriginalQueue(base);
      originalQueueRef.current = base;
      setQueue(shuffled);
      currentIndexRef.current = index;
      setCurrentIndex(index);
    } else {
      const original = originalQueueRef.current;
      if (!original.length) return;
      const currentItem = queueRef.current[currentIndexRef.current];
      const index = findQueueItemIndex(original, currentItem, current?.id);
      const restoredIndex = index >= 0 ? index : current ? -1 : 0;
      queueRef.current = original;
      setQueue(original);
      currentIndexRef.current = restoredIndex;
      setCurrentIndex(restoredIndex);
    }
  }, []);

  const removeFromQueue = useCallback(
    (index: number) => {
      const items = queueRef.current;
      if (index < 0 || index >= items.length) return;
      const removed = items[index];
      const nextQueue = items.filter((_, i) => i !== index);

      // Remove a single copy from the original order. When shuffle is off the
      // two lists match index-for-index; when it's on, drop the first matching
      // entry so duplicate queue items stay intact.
      const nextOriginal = [...originalQueueRef.current];
      if (!shuffleRef.current && nextOriginal.length === items.length) {
        nextOriginal.splice(index, 1);
      } else {
        const originalIndex = findQueueItemIndex(nextOriginal, removed, removed.song.id);
        if (originalIndex >= 0) nextOriginal.splice(originalIndex, 1);
      }

      queueRef.current = nextQueue;
      originalQueueRef.current = nextOriginal;
      setQueue(nextQueue);
      setOriginalQueue(nextOriginal);

      if (index === currentIndexRef.current) {
        if (!nextQueue.length) {
          currentSongRef.current = null;
          currentIndexRef.current = -1;
          setCurrentSong(null);
          setCurrentIndex(-1);
          if (audioRef.current) audioRef.current.pause();
        } else {
          const nextIndex = Math.min(index, nextQueue.length - 1);
          currentIndexRef.current = nextIndex;
          currentSongRef.current = nextQueue[nextIndex].song;
          setCurrentIndex(nextIndex);
          setCurrentSong(nextQueue[nextIndex].song);
          loadAndPlay(nextQueue[nextIndex].song);
        }
      } else if (index < currentIndexRef.current) {
        currentIndexRef.current -= 1;
        setCurrentIndex(currentIndexRef.current);
      }
    },
    [loadAndPlay],
  );

  const moveQueueItem = useCallback((from: number, to: number) => {
    const items = queueRef.current;
    if (from < 0 || from >= items.length || to < 0 || to >= items.length || from === to) return;
    const nextQueue = [...items];
    const [item] = nextQueue.splice(from, 1);
    nextQueue.splice(to, 0, item);

    let nextIndex = currentIndexRef.current;
    if (from === currentIndexRef.current) {
      nextIndex = to;
    } else if (from < currentIndexRef.current && to >= currentIndexRef.current) {
      nextIndex = currentIndexRef.current - 1;
    } else if (from > currentIndexRef.current && to <= currentIndexRef.current) {
      nextIndex = currentIndexRef.current + 1;
    }

    queueRef.current = nextQueue;
    setQueue(nextQueue);
    currentIndexRef.current = nextIndex;
    setCurrentIndex(nextIndex);
    // While shuffle is off the queue *is* the original order, so keep both in sync.
    if (!shuffleRef.current) {
      originalQueueRef.current = nextQueue;
      setOriginalQueue(nextQueue);
    }
  }, []);

  const playNext = useCallback(
    (song: Song) => {
      const items = queueRef.current;
      const index = currentIndexRef.current;

      if (!currentSongRef.current && !items.length) {
        const item = { song, source: 'next' } as QueueItem;
        queueRef.current = [item];
        originalQueueRef.current = [item];
        setQueue([item]);
        setOriginalQueue([item]);
        currentIndexRef.current = 0;
        currentSongRef.current = song;
        setCurrentIndex(0);
        setCurrentSong(song);
        loadAndPlay(song);
        return;
      }

      const insertAt = index >= 0 ? index + 1 : items.length;
      const nextQueue = [...items];
      nextQueue.splice(insertAt, 0, { song, source: 'next' });
      queueRef.current = nextQueue;
      setQueue(nextQueue);

      const original = originalQueueRef.current;
      const currentId = currentSongRef.current?.id;
      const originalIndex = currentId
        ? original.findIndex((item) => item.song.id === currentId)
        : -1;
      const nextOriginal = [...original];
      nextOriginal.splice(originalIndex >= 0 ? originalIndex + 1 : original.length, 0, {
        song,
        source: 'next',
      });
      originalQueueRef.current = nextOriginal;
      setOriginalQueue(nextOriginal);

      if (index < 0) {
        currentIndexRef.current = 0;
        setCurrentIndex(0);
      }
    },
    [loadAndPlay],
  );

  const playLast = useCallback(
    (song: Song) => {
      const item = { song, source: 'last' } as QueueItem;
      if (!currentSongRef.current && !queueRef.current.length) {
        queueRef.current = [item];
        originalQueueRef.current = [item];
        setQueue([item]);
        setOriginalQueue([item]);
        currentIndexRef.current = 0;
        currentSongRef.current = song;
        setCurrentIndex(0);
        setCurrentSong(song);
        loadAndPlay(song);
        return;
      }
      const nextQueue = [...queueRef.current, item];
      const nextOriginal = [...originalQueueRef.current, item];
      queueRef.current = nextQueue;
      originalQueueRef.current = nextOriginal;
      setQueue(nextQueue);
      setOriginalQueue(nextOriginal);
    },
    [loadAndPlay],
  );

  const clearQueue = useCallback(() => {
    queueRef.current = [];
    originalQueueRef.current = [];
    setQueue([]);
    setOriginalQueue([]);
    currentIndexRef.current = -1;
    currentSongRef.current = null;
    setCurrentIndex(-1);
    setCurrentSong(null);
    setHistory([]);
    historyRef.current = [];
    localStorage.removeItem(STORAGE_KEYS.position);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
  }, []);

  const saveQueue = useCallback(() => {
    localStorage.setItem(STORAGE_KEYS.queue, JSON.stringify(queueRef.current));
    localStorage.setItem(STORAGE_KEYS.originalQueue, JSON.stringify(originalQueueRef.current));
  }, []);

  const setSleepTimer = useCallback((minutes: number | null) => {
    if (sleepTimerRef.current) {
      clearTimeout(sleepTimerRef.current);
      sleepTimerRef.current = null;
    }
    setSleepTimerState(minutes);
    if (minutes !== null) {
      sleepTimerRef.current = setTimeout(() => {
        if (audioRef.current) audioRef.current.pause();
        setSleepTimerState(null);
      }, minutes * 60 * 1000);
    }
  }, []);

  // Fade the tail of each track using the shared gain node.
  useEffect(() => {
    const audio = audioRef.current;
    const gain = gainRef.current;
    if (!audio) return;

    if (crossfadeDuration <= 0 || !gain) {
      if (gain) gain.gain.value = 1;
      audio.volume = muted ? 0 : volume;
      return;
    }

    audio.volume = 1;
    const applyGain = () => {
      const total = duration || audio.duration || 0;
      const remaining = total - audio.currentTime;
      const target =
        remaining > 0 && remaining < crossfadeDuration
          ? clamp(remaining / crossfadeDuration, 0, 1) * (muted ? 0 : volume)
          : muted
            ? 0
            : volume;
      gain.gain.value = target;
    };
    applyGain();
    audio.addEventListener('timeupdate', applyGain);
    return () => {
      audio.removeEventListener('timeupdate', applyGain);
      if (gain) gain.gain.value = 1;
    };
  }, [crossfadeDuration, duration, volume, muted, audioReady]);

  // Media Session (OS media keys, lock screen, headphones).
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    if (!currentSong) {
      navigator.mediaSession.metadata = null;
      document.title = 'Resonate';
      return;
    }
    const artworkUrl = getArtworkUrl(currentSong);
    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentSong.title,
      artist: currentSong.artist,
      album: currentSong.album || '',
      artwork: artworkUrl ? [{ src: artworkUrl, sizes: '512x512' }] : [],
    });
    document.title = `${currentSong.title} • ${currentSong.artist} — Resonate`;
  }, [currentSong]);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
  }, [isPlaying]);

  const controlsRef = useRef({ togglePlay, next, previous, seek });
  useEffect(() => {
    controlsRef.current = { togglePlay, next, previous, seek };
  }, [togglePlay, next, previous, seek]);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    const session = navigator.mediaSession;
    const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
      ['play', () => controlsRef.current.togglePlay()],
      ['pause', () => controlsRef.current.togglePlay()],
      ['previoustrack', () => controlsRef.current.previous()],
      ['nexttrack', () => controlsRef.current.next()],
      [
        'seekbackward',
        (details) =>
          controlsRef.current.seek(
            (audioRef.current?.currentTime || 0) - (details.seekOffset || 10),
          ),
      ],
      [
        'seekforward',
        (details) =>
          controlsRef.current.seek(
            (audioRef.current?.currentTime || 0) + (details.seekOffset || 10),
          ),
      ],
      [
        'seekto',
        (details) => {
          if (typeof details.seekTime === 'number') controlsRef.current.seek(details.seekTime);
        },
      ],
      ['stop', () => audioRef.current?.pause()],
    ];

    handlers.forEach(([action, handler]) => {
      try {
        session.setActionHandler(action, handler);
      } catch {
        // Some browsers reject unsupported actions.
      }
    });

    return () => {
      handlers.forEach(([action]) => {
        try {
          session.setActionHandler(action, null);
        } catch {
          // Ignore.
        }
      });
    };
  }, []);

  const value: PlayerContextValue = {
    currentSong,
    isPlaying,
    currentTime,
    duration,
    volume,
    muted,
    speed,
    repeat,
    shuffle,
    queue,
    originalQueue,
    currentIndex,
    history,
    crossfadeDuration,
    sleepTimer,
    audioElement: audioRef.current,
    playSong,
    shufflePlay,
    togglePlay,
    next,
    previous,
    seek,
    setVolume,
    toggleMute,
    setSpeed,
    toggleRepeat,
    toggleShuffle,
    playQueueItem,
    removeFromQueue,
    moveQueueItem,
    playNext,
    playLast,
    clearQueue,
    saveQueue,
    setSleepTimer,
    getAnalyser,
  };

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used within PlayerProvider');
  return ctx;
}
