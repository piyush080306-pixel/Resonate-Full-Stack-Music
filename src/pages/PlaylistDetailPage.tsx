import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Play, Shuffle, ArrowLeft, Music, GripVertical, Search as SearchIcon } from 'lucide-react';
import type { Playlist, PlaylistSong, Song } from '@/types';
import { fetchPlaylistSongs } from '@/lib/songs';
import { fetchPlaylists, removeSongFromPlaylist, reorderPlaylistSongs } from '@/lib/playlists';
import { usePlayer } from '@/context/PlayerContext';
import { useToast } from '@/context/ToastContext';
import Button from '@/components/ui/Button';
import SongRow, { SongRowHeader } from '@/components/SongRow';
import AddToPlaylistModal from '@/components/AddToPlaylistModal';
import { FullPageSpinner, CenteredMessage } from '@/components/ui/Spinner';

export default function PlaylistDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { playSong, shufflePlay } = usePlayer();
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [items, setItems] = useState<PlaylistSong[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [addSong, setAddSong] = useState<Song | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setLoadError(null);
    try {
      const [pls, songs] = await Promise.all([fetchPlaylists(), fetchPlaylistSongs(id)]);
      const pl = pls.find((p) => p.id === id) || null;
      setPlaylist(pl);
      setItems(songs);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load playlist';
      setLoadError(message);
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  }, [id, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const songs = items.map((i) => i.song!);
  const filtered = search.trim()
    ? items.filter((i) => i.song && (i.song.title.toLowerCase().includes(search.toLowerCase()) || i.song.artist.toLowerCase().includes(search.toLowerCase())))
    : items;

  const handlePlayAll = () => {
    if (!songs.length) {
      showToast('Playlist is empty', 'info');
      return;
    }
    playSong(songs[0], songs, `playlist:${id}`);
  };

  const handleShufflePlay = () => {
    if (!songs.length) return;
    shufflePlay(songs, `playlist:${id}:shuffle`);
  };

  const handleRemove = async (songId: string) => {
    if (!id) return;
    try {
      await removeSongFromPlaylist(id, songId);
      setItems((prev) => prev.filter((i) => i.song_id !== songId));
      showToast('Removed from playlist', 'success');
    } catch {
      showToast('Failed to remove song', 'error');
    }
  };

  const handleReorder = async (from: number, to: number) => {
    if (!id || from === to) return;
    const ordered = [...items];
    const [moved] = ordered.splice(from, 1);
    ordered.splice(to, 0, moved);
    setItems(ordered);
    try {
      await reorderPlaylistSongs(id, ordered.map((i) => i.song_id));
    } catch {
      showToast('Failed to reorder', 'error');
      load();
    }
  };

  if (loading) return <FullPageSpinner label="Loading playlist..." />;

  if (loadError) {
    return (
      <CenteredMessage
        title="Could not load playlist"
        subtitle={loadError}
        action={<Button onClick={() => void load()}>Retry</Button>}
      />
    );
  }

  if (!playlist) return <CenteredMessage title="Playlist not found" action={<Button onClick={() => navigate('/playlists')}>Back to Playlists</Button>} />;

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto">
      <button onClick={() => navigate('/playlists')} className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Playlists
      </button>

      <div className="flex flex-col sm:flex-row gap-6 mb-8">
        <div className="w-40 h-40 rounded-2xl shrink-0 flex items-center justify-center shadow-2xl" style={{ background: `linear-gradient(135deg, ${playlist.cover_color}, #0f172a)` }}>
          <Music className="w-16 h-16 text-white/40" />
        </div>
        <div className="flex-1 flex flex-col justify-end">
          <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">Playlist</p>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-100 mb-2">{playlist.name}</h1>
          <p className="text-sm text-slate-400">{items.length} {items.length === 1 ? 'song' : 'songs'}</p>
          <div className="flex gap-3 mt-4">
            <Button variant="primary" onClick={handlePlayAll}><Play className="w-4 h-4 fill-current" /> Play</Button>
            <Button variant="secondary" onClick={handleShufflePlay}><Shuffle className="w-4 h-4" /> Shuffle</Button>
          </div>
        </div>
      </div>

      {items.length === 0 ? (
        <CenteredMessage icon={<Music className="w-12 h-12" />} title="This playlist is empty" subtitle="Add songs from your library using the song menu." />
      ) : (
        <>
          <div className="relative mb-4 max-w-md">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search in playlist..."
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-800/60 border border-slate-700 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 accent-ring"
            />
          </div>
          <SongRowHeader />
          <div className="space-y-0.5">
            {filtered.map((item, idx) => {
              const sourceIndex = items.findIndex((playlistItem) => playlistItem.id === item.id);
              return (
                <div
                  key={item.id}
                  draggable={!search.trim()}
                  onDragStart={() => setDragIndex(sourceIndex)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (dragIndex !== null) handleReorder(dragIndex, sourceIndex);
                    setDragIndex(null);
                  }}
                  className="flex items-center group"
                >
                  <GripVertical className={`w-4 h-4 text-slate-600 transition-opacity shrink-0 ${search.trim() ? 'opacity-0' : 'cursor-grab opacity-0 group-hover:opacity-100'}`} />
                  <div className="flex-1">
                    <SongRow
                      song={item.song!}
                      index={idx}
                      queue={songs}
                      onAddToPlaylist={setAddSong}
                      onDelete={(s) => handleRemove(s.id)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <AddToPlaylistModal open={!!addSong} onClose={() => setAddSong(null)} song={addSong} />
    </div>
  );
}
