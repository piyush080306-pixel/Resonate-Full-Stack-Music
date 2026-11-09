import { useCallback, useRef, useState } from 'react';
import { Upload, X, FileAudio, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import type { UploadItem } from '@/types';
import { extractMetadata, getAudioDuration, generateWaveform, getDominantColor } from '@/lib/audio';
import { createSong } from '@/lib/songs';
import { uniqueId, formatBytes } from '@/lib/utils';
import { ACCEPTED_AUDIO_TYPES, MAX_UPLOAD_SIZE } from '@/lib/constants';
import { useToast } from '@/context/ToastContext';

interface UploadModalProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export default function UploadModal({ open, onClose, onComplete }: UploadModalProps) {
  const { showToast } = useToast();
  const [items, setItems] = useState<UploadItem[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const cancelledIdsRef = useRef(new Set<string>());

  const validateFile = (file: File): string | null => {
    const validType = ACCEPTED_AUDIO_TYPES.includes(file.type) || /\.(mp3|wav|ogg|flac|m4a|aac)$/i.test(file.name);
    if (!validType) return 'Unsupported file type';
    if (file.size > MAX_UPLOAD_SIZE) return `File exceeds ${formatBytes(MAX_UPLOAD_SIZE)} limit`;
    return null;
  };

  const processItem = useCallback(
    async (item: UploadItem) => {
      const validationError = validateFile(item.file);
      if (validationError) {
        setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: 'error', error: validationError } : i)));
        return;
      }

      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: 'processing' } : i)));

      try {
        const [meta, duration, waveform] = await Promise.all([
          extractMetadata(item.file),
          getAudioDuration(item.file),
          generateWaveform(item.file),
        ]);
        if (cancelledIdsRef.current.has(item.id)) return;

        let dominantColor = '#1e293b';
        if (meta.artworkBlob) {
          dominantColor = await getDominantColor(meta.artworkBlob);
        }
        if (cancelledIdsRef.current.has(item.id)) return;

        setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: 'uploading' } : i)));

        await createSong({
          file: item.file,
          title: meta.title,
          artist: meta.artist,
          album: meta.album,
          genre: meta.genre,
          year: meta.year,
          duration: Math.round(duration),
          waveform,
          dominantColor,
          artworkBlob: meta.artworkBlob,
        });

        setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: 'done', progress: 100 } : i)));
      } catch (err) {
        if (!cancelledIdsRef.current.has(item.id)) {
          const msg = err instanceof Error ? err.message : 'Failed to add song';
          setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status: 'error', error: msg } : i)));
        }
      } finally {
        cancelledIdsRef.current.delete(item.id);
      }
    },
    [],
  );

  const addFiles = useCallback((files: FileList | File[]) => {
    const newItems: UploadItem[] = Array.from(files).map((file) => ({
      id: uniqueId(),
      file,
      progress: 0,
      speed: 0,
      status: 'queued',
    }));
    setItems((prev) => [...prev, ...newItems]);
    newItems.forEach((item) => void processItem(item));
  }, [processItem]);

  const cancelItem = (id: string) => {
    cancelledIdsRef.current.add(id);
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status: 'cancelled' } : i)));
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  };

  const handleClose = () => {
    const hasActive = items.some((i) => i.status === 'uploading' || i.status === 'processing' || i.status === 'queued');
    if (hasActive) {
      showToast('Please wait for uploads to finish or cancel them', 'info');
      return;
    }
    const anyDone = items.some((i) => i.status === 'done');
    setItems([]);
    onClose();
    if (anyDone) onComplete();
  };

  const doneCount = items.filter((i) => i.status === 'done').length;
  const errorCount = items.filter((i) => i.status === 'error').length;

  return (
    <Modal open={open} onClose={handleClose} title="Upload Music" size="lg">
      <div className="p-6">
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${dragOver ? 'accent-border bg-slate-800/40' : 'border-slate-700 hover:border-slate-600 hover:bg-slate-800/30'}`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="audio/*"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) addFiles(e.target.files);
              e.target.value = '';
            }}
          />
          <div className="inline-flex w-16 h-16 rounded-full accent-bg items-center justify-center mb-4">
            <Upload className="w-7 h-7 text-white" />
          </div>
          <p className="text-slate-200 font-medium">Drag and drop audio files here</p>
          <p className="text-sm text-slate-500 mt-1">or click to browse — MP3, WAV, OGG, FLAC, M4A (max {formatBytes(MAX_UPLOAD_SIZE)})</p>
        </div>

        {items.length > 0 && (
          <div className="mt-6 space-y-2 max-h-80 overflow-y-auto pr-1">
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-3 rounded-lg bg-slate-800/50 border border-slate-700/50 px-3 py-2.5 animate-fade-in">
                <div className="shrink-0">
                  {item.status === 'done' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : item.status === 'error' ? (
                    <AlertCircle className="w-5 h-5 text-rose-400" />
                  ) : item.status === 'processing' || item.status === 'uploading' || item.status === 'queued' ? (
                    <Loader2 className="w-5 h-5 accent-text animate-spin" />
                  ) : (
                    <FileAudio className="w-5 h-5 text-slate-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm text-slate-200">{item.file.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {item.status === 'uploading' && (
                      <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full w-1/3 accent-bg animate-pulse" />
                      </div>
                    )}
                    {item.status === 'uploading' && <span className="text-xs text-slate-400">Uploading...</span>}
                    {item.status === 'processing' && <span className="text-xs text-slate-400">Extracting metadata...</span>}
                    {item.status === 'queued' && <span className="text-xs text-slate-500">Queued</span>}
                    {item.status === 'done' && <span className="text-xs text-emerald-400">Added to library</span>}
                    {item.status === 'error' && <span className="text-xs text-rose-400 truncate">{item.error}</span>}
                    {item.status === 'cancelled' && <span className="text-xs text-slate-500">Cancelled</span>}
                    <span className="text-xs text-slate-600 shrink-0">{formatBytes(item.file.size)}</span>
                  </div>
                </div>
                {(item.status === 'queued' || item.status === 'processing') && (
                  <button onClick={() => cancelItem(item.id)} className="p-1 text-slate-500 hover:text-slate-300">
                    <X className="w-4 h-4" />
                  </button>
                )}
                {(item.status === 'done' || item.status === 'error' || item.status === 'cancelled') && (
                  <button onClick={() => removeItem(item.id)} className="p-1 text-slate-500 hover:text-slate-300">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {(doneCount > 0 || errorCount > 0) && (
          <p className="mt-4 text-sm text-slate-400">
            {doneCount} added, {errorCount} failed
          </p>
        )}

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={handleClose}>Close</Button>
        </div>
      </div>
    </Modal>
  );
}
