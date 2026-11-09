import { Music, Play, Pause, Heart, MoreHorizontal, ListPlus, ListEnd, ListStart, Edit3, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { Song } from '@/types';
import { usePlayer } from '@/context/PlayerContext';
import { useFavorites } from '@/hooks/useFavorites';
import { useToast } from '@/context/ToastContext';
import { formatDuration } from '@/lib/utils';
import { getArtworkUrl } from '@/lib/songs';

interface SongCardProps {
  song: Song;
  queue?: Song[];
  onEdit?: (song: Song) => void;
  onDelete?: (song: Song) => void;
  onAddToPlaylist?: (song: Song) => void;
}

export default function SongCard({ song, queue, onEdit, onDelete, onAddToPlaylist }: SongCardProps) {
  const { currentSong, isPlaying, togglePlay, playSong, playNext, playLast } = usePlayer();
  const { isFavorite, toggle } = useFavorites();
  const { showToast } = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const isCurrent = currentSong?.id === song.id;
  const fav = isFavorite(song.id);

  return (
    <div className="group relative rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all duration-300 overflow-hidden hover:shadow-xl hover:shadow-black/30 hover:-translate-y-1">
      <div className="relative aspect-square overflow-hidden bg-slate-800">
        {getArtworkUrl(song) ? (
          <img src={getArtworkUrl(song)!} alt={song.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${song.dominant_color}, #0f172a)` }}>
            <Music className="w-12 h-12 text-white/40" />
          </div>
        )}
        <button
          onClick={() => (isCurrent ? togglePlay() : playSong(song, queue, 'list'))}
          className="absolute bottom-3 right-3 w-12 h-12 rounded-full accent-bg text-white flex items-center justify-center shadow-lg opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 hover:scale-110"
        >
          {isCurrent && isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
        </button>
        <button
          onClick={() => {
            void toggle(song.id).catch((error: unknown) => {
              showToast(error instanceof Error ? error.message : 'Could not update favorite', 'error');
            });
          }}
          className={`absolute top-3 right-3 p-2 rounded-full backdrop-blur-md transition-all ${fav ? 'accent-text bg-black/40' : 'text-white bg-black/40 opacity-0 group-hover:opacity-100 hover:text-white'}`}
        >
          <Heart className={`w-4 h-4 ${fav ? 'fill-current' : ''}`} />
        </button>
      </div>
      <div className="p-3">
        <p className={`truncate text-sm font-semibold ${isCurrent ? 'accent-text' : 'text-slate-100'}`}>{song.title}</p>
        <p className="truncate text-xs text-slate-500 mt-0.5">{song.artist}</p>
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-slate-600">{formatDuration(song.duration)}</span>
          <div className="relative">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="p-1.5 rounded-md text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-all"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 bottom-full mb-1 z-20 w-44 rounded-lg bg-slate-800 border border-slate-700 shadow-xl py-1 animate-scale-in origin-bottom-right">
                  <button onClick={() => { playNext(song); setMenuOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700/60">
                    <ListStart className="w-4 h-4" /> Play next
                  </button>
                  <button onClick={() => { playLast(song); setMenuOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700/60">
                    <ListEnd className="w-4 h-4" /> Add to queue
                  </button>
                  {onAddToPlaylist && (
                    <button onClick={() => { onAddToPlaylist(song); setMenuOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700/60">
                      <ListPlus className="w-4 h-4" /> Add to playlist
                    </button>
                  )}
                  {onEdit && (
                    <button onClick={() => { onEdit(song); setMenuOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700/60">
                      <Edit3 className="w-4 h-4" /> Edit details
                    </button>
                  )}
                  {onDelete && (
                    <button onClick={() => { onDelete(song); setMenuOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-rose-400 hover:bg-rose-500/10">
                      <Trash2 className="w-4 h-4" /> Delete
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
