import { useState } from 'react';
import { Music, Heart, MoreHorizontal, Play, Pause, Trash2, Edit3, ListPlus, ListEnd, ListStart, Clock } from 'lucide-react';
import type { Song } from '@/types';
import { usePlayer } from '@/context/PlayerContext';
import { useFavorites } from '@/hooks/useFavorites';
import { useToast } from '@/context/ToastContext';
import { formatDuration, relativeTime } from '@/lib/utils';
import { getArtworkUrl } from '@/lib/songs';

interface SongRowProps {
  song: Song;
  index?: number;
  queue?: Song[];
  showArtwork?: boolean;
  showAdded?: boolean;
  onEdit?: (song: Song) => void;
  onDelete?: (song: Song) => void;
  onAddToPlaylist?: (song: Song) => void;
}

export default function SongRow({ song, index, queue, showArtwork = true, showAdded = false, onEdit, onDelete, onAddToPlaylist }: SongRowProps) {
  const { currentSong, isPlaying, togglePlay, playSong, playNext, playLast } = usePlayer();
  const { isFavorite, toggle } = useFavorites();
  const { showToast } = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const isCurrent = currentSong?.id === song.id;
  const fav = isFavorite(song.id);

  const handlePlay = () => {
    if (isCurrent) togglePlay();
    else playSong(song, queue, 'list');
  };

  return (
    <div
      className={`group flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 hover:bg-slate-800/60 ${isCurrent ? 'bg-slate-800/40' : ''} ${menuOpen ? 'bg-slate-800/60' : ''}`}
    >
      {typeof index === 'number' && (
        <div className="w-6 text-center text-sm text-slate-500 group-hover:hidden">
          {isCurrent && isPlaying ? (
            <div className="flex items-end justify-center gap-0.5 h-4">
              <span className="eq-bar w-0.5 bg-[var(--accent)] h-full" style={{ animationDelay: '0s' }} />
              <span className="eq-bar w-0.5 bg-[var(--accent)] h-full" style={{ animationDelay: '0.2s' }} />
              <span className="eq-bar w-0.5 bg-[var(--accent)] h-full" style={{ animationDelay: '0.4s' }} />
            </div>
          ) : (
            <span>{index + 1}</span>
          )}
        </div>
      )}
      <button
        onClick={handlePlay}
        className={`${typeof index === 'number' ? 'hidden group-hover:flex' : 'flex'} w-6 items-center justify-center accent-text`}
      >
        {isCurrent && isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
      </button>

      {showArtwork && (
        <div className="relative w-10 h-10 shrink-0 rounded-md overflow-hidden bg-slate-800">
          {getArtworkUrl(song) ? (
            <img src={getArtworkUrl(song)!} alt="" className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: song.dominant_color }}>
              <Music className="w-4 h-4 text-white/70" />
            </div>
          )}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <p className={`truncate text-sm font-medium ${isCurrent ? 'accent-text' : 'text-slate-100'}`}>{song.title}</p>
        <p className="truncate text-xs text-slate-500">{song.artist}</p>
      </div>

      {showAdded && (
        <div className="hidden md:block text-xs text-slate-500 w-24 text-right">
          {relativeTime(song.created_at)}
        </div>
      )}

      <button
        onClick={() => {
          void toggle(song.id).catch((error: unknown) => {
            showToast(error instanceof Error ? error.message : 'Could not update favorite', 'error');
          });
        }}
        className={`p-1.5 rounded-md transition-all ${fav ? 'accent-text opacity-100' : 'text-slate-500 opacity-0 group-hover:opacity-100 hover:text-slate-300'}`}
      >
        <Heart className={`w-4 h-4 ${fav ? 'fill-current' : ''}`} />
      </button>

      <div className="hidden sm:block text-xs text-slate-500 w-12 text-right">
        {formatDuration(song.duration)}
      </div>

      <div className="relative">
        <button
          onClick={() => setMenuOpen((o) => !o)}
          className="p-1.5 rounded-md text-slate-500 hover:text-slate-300 hover:bg-slate-700/50 transition-all"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 top-full mt-1 z-20 w-44 rounded-lg bg-slate-800 border border-slate-700 shadow-xl py-1 animate-scale-in origin-top-right">
              <button onClick={() => { playNext(song); setMenuOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700/60 transition-colors">
                <ListStart className="w-4 h-4" /> Play next
              </button>
              <button onClick={() => { playLast(song); setMenuOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700/60 transition-colors">
                <ListEnd className="w-4 h-4" /> Add to queue
              </button>
              {onAddToPlaylist && (
                <button onClick={() => { onAddToPlaylist(song); setMenuOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700/60 transition-colors">
                  <ListPlus className="w-4 h-4" /> Add to playlist
                </button>
              )}
              {onEdit && (
                <button onClick={() => { onEdit(song); setMenuOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700/60 transition-colors">
                  <Edit3 className="w-4 h-4" /> Edit details
                </button>
              )}
              {onDelete && (
                <button onClick={() => { onDelete(song); setMenuOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-rose-400 hover:bg-rose-500/10 transition-colors">
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function SongRowHeader() {
  return (
    <div className="flex items-center gap-3 px-3 py-2 text-xs uppercase tracking-wider text-slate-500 border-b border-slate-800 mb-2">
      <div className="w-6 text-center">#</div>
      <div className="w-10" />
      <div className="flex-1">Title</div>
      <div className="hidden md:block w-24 text-right">Added</div>
      <div className="w-8" />
      <div className="hidden sm:flex w-12 items-center justify-end gap-1">
        <Clock className="w-3.5 h-3.5" />
      </div>
      <div className="w-8" />
    </div>
  );
}
