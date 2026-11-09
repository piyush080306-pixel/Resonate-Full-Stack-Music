import jsmediatags from 'jsmediatags/dist/jsmediatags.min.js';
import { hexToRgb } from './utils';

export interface ExtractedMetadata {
  title: string;
  artist: string;
  album: string;
  genre: string;
  year: number | null;
  artworkBlob: Blob | null;
}

export async function extractMetadata(file: File): Promise<ExtractedMetadata> {
  return new Promise((resolve) => {
    const fallback: ExtractedMetadata = {
      title: file.name.replace(/\.[^/.]+$/, ''),
      artist: 'Unknown Artist',
      album: '',
      genre: '',
      year: null,
      artworkBlob: null,
    };
    try {
      new jsmediatags.Reader(file as unknown as Buffer)
        .setTagsToRead(['title', 'artist', 'album', 'genre', 'year', 'picture'])
        .read({
          onSuccess: ({ tags }: { tags: Record<string, unknown> }) => {
            const picture = tags.picture as
              | { data: number[]; format: string }
              | undefined;
            let artworkBlob: Blob | null = null;
            if (picture && picture.data && picture.format) {
              artworkBlob = new Blob([new Uint8Array(picture.data)], {
                type: picture.format,
              });
            }
            resolve({
              title: (tags.title as string) || fallback.title,
              artist: (tags.artist as string) || fallback.artist,
              album: (tags.album as string) || fallback.album,
              genre: (tags.genre as string) || fallback.genre,
              year: tags.year ? parseInt(String(tags.year), 10) || null : null,
              artworkBlob,
            });
          },
          onError: () => resolve(fallback),
        });
    } catch {
      resolve(fallback);
    }
  });
}

export async function getAudioDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    try {
      const url = URL.createObjectURL(file);
      const audio = new Audio();
      audio.preload = 'metadata';
      audio.onloadedmetadata = () => {
        const d = audio.duration;
        URL.revokeObjectURL(url);
        resolve(isNaN(d) ? 0 : d);
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(0);
      };
      audio.src = url;
    } catch {
      resolve(0);
    }
  });
}

export async function generateWaveform(file: File, samples = 100): Promise<number[]> {
  return new Promise((resolve) => {
    try {
      const url = URL.createObjectURL(file);
      const audio = new Audio();
      audio.preload = 'auto';
      audio.onloadedmetadata = async () => {
        try {
          const AudioCtx =
            window.AudioContext ||
            (window as unknown as { webkitAudioContext: typeof AudioContext })
              .webkitAudioContext;
          const ctx = new AudioCtx();
          const res = await fetch(url);
          const buf = await res.arrayBuffer();
          const audioBuf = await ctx.decodeAudioData(buf);
          const channel = audioBuf.getChannelData(0);
          const blockSize = Math.floor(channel.length / samples);
          const peaks: number[] = [];
          for (let i = 0; i < samples; i++) {
            const start = i * blockSize;
            let sum = 0;
            for (let j = 0; j < blockSize; j++) {
              sum += Math.abs(channel[start + j] || 0);
            }
            peaks.push(Math.min(1, sum / blockSize));
          }
          const max = Math.max(...peaks, 0.001);
          const normalized = peaks.map((p) => +(p / max).toFixed(3));
          URL.revokeObjectURL(url);
          ctx.close();
          resolve(normalized);
        } catch {
          URL.revokeObjectURL(url);
          resolve(Array(samples).fill(0.3));
        }
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(Array(samples).fill(0.3));
      };
      audio.src = url;
    } catch {
      resolve(Array(samples).fill(0.3));
    }
  });
}

export async function getDominantColor(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    try {
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const size = 50;
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            URL.revokeObjectURL(url);
            resolve('#1e293b');
            return;
          }
          ctx.drawImage(img, 0, 0, size, size);
          const data = ctx.getImageData(0, 0, size, size).data;
          let r = 0, g = 0, b = 0, count = 0;
          for (let i = 0; i < data.length; i += 4) {
            const a = data[i + 3];
            if (a < 125) continue;
            r += data[i];
            g += data[i + 1];
            b += data[i + 2];
            count++;
          }
          count = count || 1;
          r = Math.round(r / count);
          g = Math.round(g / count);
          b = Math.round(b / count);
          URL.revokeObjectURL(url);
          resolve(
            `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`,
          );
        } catch {
          URL.revokeObjectURL(url);
          resolve('#1e293b');
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve('#1e293b');
      };
      img.src = url;
    } catch {
      resolve('#1e293b');
    }
  });
}

export function getContrastColor(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#0f172a' : '#ffffff';
}
