import { useEffect, useMemo, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { LayoutGrid, List, ArrowUpDown, CheckSquare, Square, Trash2, Heart, ListPlus, Upload, Library as LibraryIcon, Play, Shuffle } from 'lucide-react';
import type { Song } from '@/types';
import { fetchSongs, deleteSong } from '@/lib/songs';
import SongRow, { SongRowHeader } from '@/components/SongRow';
import SongCard from '@/components/SongCard';
import EditSongModal from '@/components/EditSongModal';
import AddToPlaylistModal from '@/components/AddToPlaylistModal';
import ConfirmDialog from '@/components/ConfirmDialog';
import { FullPageSpinner, CenteredMessage } from '@/components/ui/Spinner';
import Button from '@/components/ui/Button';
import { sortSongs } from '@/lib/utils';
import { useToast } from '@/context/ToastContext';
import { usePlayer } from '@/context/PlayerContext';
import { useFavorites } from '@/hooks/useFavorites';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { PAGE_SIZE } from '@/lib/constants';

type View = 'grid' | 'list';
type SortBy = 'title' | 'artist' | 'album' | 'genre' | 'duration' | 'year' | 'created_at';

interface OutletCtx {
  openUpload: () => void;
  refreshLibrary: () => void;
  libraryVersion: number;
}

export default function LibraryPage() {
  const { openUpload, libraryVersion } = useOutletContext<OutletCtx>();
  const { showToast } = useToast();
  const { playSong, shufflePlay } = usePlayer();
  const { toggle: toggleFav, isFavorite } = useFavorites();
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>(() => (localStorage.getItem('library-view') as View) || 'grid');
  const [sortBy, setSortBy] = useState<SortBy>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [filter, setFilter] = useState('');
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [editSong, setEditSong] = useState<Song | null>(null);
  const [playlistSong, setPlaylistSong] = useState<Song | null>(null);
  const [bulkPlaylistOpen, setBulkPlaylistOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Song | null>(null);
  const [bulkDelete, setBulkDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSongs();
      setSongs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load library');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // Reload whenever an upload finishes.
  }, [libraryVersion]);

  const filtered = useMemo(() => {
    let result = songs;
    if (filter.trim()) {
      const q = filter.toLowerCase();
      result = result.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.artist.toLowerCase().includes(q) ||
          s.album.toLowerCase().includes(q) ||
          s.genre.toLowerCase().includes(q),
      );
    }
    return sortSongs(result, sortBy, sortDir);
  }, [songs, filter, sortBy, sortDir]);

  const { visible, sentinelRef, hasMore } = useInfiniteScroll(filtered, PAGE_SIZE);

  const handlePlayAll = () => {
    if (!filtered.length) return;
    playSong(filtered[0], filtered, 'library');
  };

  const handleShuffleAll = () => {
    if (!filtered.length) return;
    shufflePlay(filtered, 'library:shuffle');
  };

  const setViewPersist = (v: View) => {
    setView(v);
    localStorage.setItem('library-view', v);
  };

  const toggleSelection = (id: string) => {
    setSelection((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelection(new Set());

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteSong(deleteTarget.id);
      setSongs((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      showToast('Song deleted', 'success');
      setDeleteTarget(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete song', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleBulkDelete = async () => {
    setDeleting(true);
    try {
      const targets = songs.filter((s) => selection.has(s.id));
      await Promise.all(targets.map((s) => deleteSong(s.id)));
      setSongs((prev) => prev.filter((s) => !selection.has(s.id)));
      setSelection(new Set());
      setBulkDelete(false);
      showToast(`${targets.length} songs deleted`, 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Bulk delete failed', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleBulkFavorite = async () => {
    const targets = songs.filter((song) => selection.has(song.id) && !isFavorite(song.id));
    try {
      await Promise.all(targets.map((song) => toggleFav(song.id)));
      showToast(`${targets.length} ${targets.length === 1 ? 'song' : 'songs'} favorited`, 'success');
      setSelection(new Set());
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to favorite songs', 'error');
    }
  };

  if (loading) return <FullPageSpinner label="Loading your library..." />;
  if (error) return <CenteredMessage title="Something went wrong" subtitle={error} action={<Button onClick={load}>Retry</Button>} />;

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Library</h1>
          <p className="text-sm text-slate-500 mt-0.5">{songs.length} {songs.length === 1 ? 'song' : 'songs'}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter library..."
            className="px-3 py-2 rounded-lg bg-slate-800/60 border border-slate-700 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 accent-ring w-40 sm:w-52"
          />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="px-3 py-2 rounded-lg bg-slate-800/60 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:ring-2 accent-ring"
          >
            <option value="created_at">Date added</option>
            <option value="title">Title</option>
            <option value="artist">Artist</option>
            <option value="album">Album</option>
            <option value="genre">Genre</option>
            <option value="duration">Duration</option>
            <option value="year">Year</option>
          </select>
          <button
            onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
            className="p-2 rounded-lg bg-slate-800/60 border border-slate-700 text-slate-300 hover:text-slate-100 transition-all"
            title={`Sort ${sortDir === 'asc' ? 'ascending' : 'descending'}`}
          >
            <ArrowUpDown className="w-4 h-4" />
          </button>
          <Button variant="secondary" onClick={handlePlayAll} disabled={!filtered.length}>
            <Play className="w-4 h-4 fill-current" /> Play all
          </Button>
          <Button variant="secondary" onClick={handleShuffleAll} disabled={!filtered.length}>
            <Shuffle className="w-4 h-4" /> Shuffle
          </Button>
          <div className="flex rounded-lg bg-slate-800/60 border border-slate-700 p-0.5">
            <button onClick={() => setViewPersist('grid')} className={`p-1.5 rounded-md transition-all ${view === 'grid' ? 'accent-bg text-white' : 'text-slate-400 hover:text-slate-200'}`}>
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button onClick={() => setViewPersist('list')} className={`p-1.5 rounded-md transition-all ${view === 'list' ? 'accent-bg text-white' : 'text-slate-400 hover:text-slate-200'}`}>
              <List className="w-4 h-4" />
            </button>
          </div>
          <Button variant="primary" onClick={openUpload}>
            <Upload className="w-4 h-4" /> Upload
          </Button>
        </div>
      </div>

      {selection.size > 0 && (
        <div className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-slate-800/60 border border-slate-700 animate-slide-down">
          <span className="text-sm text-slate-200">{selection.size} selected</span>
          <button onClick={clearSelection} className="text-xs text-slate-400 hover:text-slate-200">Clear</button>
          <div className="flex-1" />
          <Button size="sm" variant="ghost" onClick={handleBulkFavorite}><Heart className="w-4 h-4" /> Favorite</Button>
          <Button size="sm" variant="ghost" onClick={() => setBulkPlaylistOpen(true)}><ListPlus className="w-4 h-4" /> Add to playlist</Button>
          <Button size="sm" variant="danger" onClick={() => setBulkDelete(true)}><Trash2 className="w-4 h-4" /> Delete</Button>
        </div>
      )}

      {filtered.length === 0 ? (
        <CenteredMessage
          icon={<LibraryIcon className="w-12 h-12" />}
          title={songs.length === 0 ? 'Your library is empty' : 'No songs match your filter'}
          subtitle={songs.length === 0 ? 'Upload your first track to get started.' : 'Try a different search term.'}
          action={songs.length === 0 ? <Button variant="primary" onClick={openUpload}><Upload className="w-4 h-4" /> Upload Music</Button> : <Button variant="secondary" onClick={() => setFilter('')}>Clear filter</Button>}
        />
      ) : view === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {visible.map((song) => (
            <div key={song.id} className="relative">
              {selection.size > 0 && (
                <button
                  onClick={() => toggleSelection(song.id)}
                  className="absolute top-2 left-2 z-10 text-white"
                >
                  {selection.has(song.id) ? <CheckSquare className="w-5 h-5 accent-text" /> : <Square className="w-5 h-5" />}
                </button>
              )}
              <SongCard song={song} queue={filtered} onEdit={setEditSong} onDelete={setDeleteTarget} onAddToPlaylist={setPlaylistSong} />
            </div>
          ))}
        </div>
      ) : (
        <div>
          <SongRowHeader />
          <div className="space-y-0.5">
            {visible.map((song, idx) => (
              <div key={song.id} className="relative">
                {selection.size > 0 && (
                  <button
                    onClick={() => toggleSelection(song.id)}
                    className="absolute left-1 top-1/2 -translate-y-1/2 z-10"
                  >
                    {selection.has(song.id) ? <CheckSquare className="w-5 h-5 accent-text" /> : <Square className="w-5 h-5 text-slate-500" />}
                  </button>
                )}
                <SongRow song={song} index={idx} queue={filtered} showAdded onEdit={setEditSong} onDelete={setDeleteTarget} onAddToPlaylist={setPlaylistSong} />
              </div>
            ))}
          </div>
        </div>
      )}

      {hasMore && <div ref={sentinelRef} className="h-10" />}

      <EditSongModal open={!!editSong} onClose={() => setEditSong(null)} song={editSong} onSaved={load} />
      <AddToPlaylistModal open={!!playlistSong} onClose={() => setPlaylistSong(null)} song={playlistSong} />
      <AddToPlaylistModal
        open={bulkPlaylistOpen}
        onClose={() => setBulkPlaylistOpen(false)}
        song={null}
        songs={songs.filter((song) => selection.has(song.id))}
      />
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Song"
        message={`Are you sure you want to delete "${deleteTarget?.title}"? This will permanently remove the audio file and cannot be undone.`}
        confirmLabel="Delete"
        danger
        loading={deleting}
      />
      <ConfirmDialog
        open={bulkDelete}
        onClose={() => setBulkDelete(false)}
        onConfirm={handleBulkDelete}
        title="Delete Selected Songs"
        message={`Delete ${selection.size} selected songs? This permanently removes the audio files and cannot be undone.`}
        confirmLabel="Delete All"
        danger
        loading={deleting}
      />
    </div>
  );
}
