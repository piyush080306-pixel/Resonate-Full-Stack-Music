/**
 * Local browser persistence for Resonate.
 *
 * Music metadata (songs, playlists, favorites, history) lives in localStorage,
 * while the actual audio/artwork blobs live in IndexedDB. This lets the app run
 * without accounts or a backend — everything stays on the user's device.
 */

export const LOCAL_USER_ID = 'local-user';

export const LOCAL_KEYS = {
  songs: 'songs',
  playlists: 'playlists',
  playlistSongs: 'playlist-songs',
  favorites: 'favorites',
  history: 'history',
} as const;

const STORAGE_PREFIX = 'resonate-local:';
const DB_NAME = 'resonate-local';
const DB_VERSION = 1;

export type BlobStore = 'audio' | 'artwork';

export interface LocalFavoriteRow {
  song_id: string;
  created_at: string;
}

export interface LocalHistoryRow {
  song_id: string;
  play_count: number;
  last_played_at: string;
}

export interface LocalPlaylistSongRow {
  id: string;
  playlist_id: string;
  song_id: string;
  position: number;
  added_at: string;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('This browser does not support local audio storage.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('audio')) db.createObjectStore('audio');
      if (!db.objectStoreNames.contains('artwork')) db.createObjectStore('artwork');
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Failed to open local storage.'));
  });

  return dbPromise;
}

export async function putBlob(store: BlobStore, key: string, blob: Blob): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).put(blob, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Failed to save file locally.'));
    tx.onabort = () => reject(tx.error ?? new Error('Failed to save file locally.'));
  });
}

export async function getBlob(store: BlobStore, key: string): Promise<Blob | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const request = tx.objectStore(store).get(key);
    request.onsuccess = () => resolve((request.result as Blob | undefined) ?? null);
    request.onerror = () => reject(request.error ?? new Error('Failed to read local file.'));
  });
}

export async function deleteBlob(store: BlobStore, key: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Failed to delete local file.'));
  });
}

export function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeLocal<T>(key: string, value: T): void {
  localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
}

export function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}
