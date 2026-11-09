import { X, Trash2, ArrowUp, ArrowDown, Play, Pause, Save, GripVertical, Music } from 'lucide-react';
import { usePlayer } from '@/context/PlayerContext';
import { getArtworkUrl } from '@/lib/songs';
import { addSongsToPlaylist, createPlaylist, deletePlaylist } from '@/lib/playlists';
import { useToast } from '@/context/ToastContext';

interface QueueDrawerProps {
  open: boolean;
  onClose: () => void;
}

export default function QueueDrawer({ open, onClose }: QueueDrawerProps) {
  const { queue, currentIndex, playQueueItem, removeFromQueue, moveQueueItem, clearQueue, saveQueue, isPlaying, currentSong } = usePlayer();
  const { showToast } = useToast();

  const handleSave = async () => {
    saveQueue();
    if (!queue.length) {
      showToast('Your queue is empty', 'info');
      return;
    }
    let playlistId: string | null = null;
    try {
      const stamp = new Date().toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      const playlist = await createPlaylist(`Queue · ${stamp}`, 'Saved from your play queue');
      playlistId = playlist.id;
      const savedCount = await addSongsToPlaylist(
        playlist.id,
        queue.map((item) => item.song.id),
      );
      showToast(`Saved ${savedCount} unique tracks to "${playlist.name}"`, 'success');
    } catch (error) {
      if (playlistId) {
        try {
          await deletePlaylist(playlistId);
        } catch (cleanupError) {
          showToast(
            cleanupError instanceof Error
              ? `Could not remove the incomplete playlist: ${cleanupError.message}`
              : 'Could not remove the incomplete playlist',
            'error',
          );
        }
      }
      showToast(error instanceof Error ? error.message : 'Could not save queue', 'error');
    }
  };

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/40 z-30 lg:z-20" onClick={onClose} />}
      <aside
        className={`fixed lg:static top-0 right-0 bottom-0 z-40 lg:z-20 w-80 lg:w-80 bg-slate-900/95 glass border-l border-slate-800 flex flex-col transition-transform duration-300 ${
          open ? 'translate-x-0' : 'translate-x-full lg:translate-x-0 lg:w-0 lg:border-l-0 overflow-hidden'
        }`}
      >
        <div className="flex items-center justify-between px-4 h-16 border-b border-slate-800 shrink-0">
          <h2 className="font-semibold text-slate-100">Play Queue</h2>
          <div className="flex items-center gap-1">
            <button onClick={handleSave} className="p-2 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all" title="Save queue">
              <Save className="w-4 h-4" />
            </button>
            <button onClick={clearQueue} className="p-2 rounded-md text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-all" title="Clear queue">
              <Trash2 className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="p-2 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {queue.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-20">
              <Music className="w-10 h-10 text-slate-700 mb-3" />
              <p className="text-sm text-slate-500">Your queue is empty</p>
              <p className="text-xs text-slate-600 mt-1">Play a song to start the queue</p>
            </div>
          ) : (
            <div className="space-y-1">
              {queue.map((item, idx) => {
                const isCurrent = idx === currentIndex && currentSong?.id === item.song.id;
                return (
                  <div
                    key={`${item.song.id}-${idx}`}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData('text/plain', String(idx))}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      const from = parseInt(e.dataTransfer.getData('text/plain'), 10);
                      if (!isNaN(from)) moveQueueItem(from, idx);
                    }}
                    className={`group flex items-center gap-2 px-2 py-2 rounded-lg transition-all ${isCurrent ? 'bg-slate-800/60' : 'hover:bg-slate-800/40'}`}
                  >
                    <GripVertical className="w-4 h-4 text-slate-600 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    <button
                      onClick={() => playQueueItem(idx)}
                      className="relative w-10 h-10 rounded-md overflow-hidden shrink-0 bg-slate-800"
                    >
                      {getArtworkUrl(item.song) ? (
                        <img src={getArtworkUrl(item.song)!} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: item.song.dominant_color }}>
                          <Music className="w-4 h-4 text-white/60" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        {isCurrent && isPlaying ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white fill-current" />}
                      </div>
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`truncate text-sm ${isCurrent ? 'accent-text font-medium' : 'text-slate-200'}`}>{item.song.title}</p>
                      <p className="truncate text-xs text-slate-500">{item.song.artist}</p>
                    </div>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => moveQueueItem(idx, idx - 1)} disabled={idx === 0} className="p-1 text-slate-500 hover:text-slate-300 disabled:opacity-30">
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => moveQueueItem(idx, idx + 1)} disabled={idx === queue.length - 1} className="p-1 text-slate-500 hover:text-slate-300 disabled:opacity-30">
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => removeFromQueue(idx)} className="p-1 text-slate-500 hover:text-rose-400">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
