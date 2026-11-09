import { useEffect, useState } from 'react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Input from './ui/Input';
import { ListMusic, Plus, Loader2 } from 'lucide-react';
import type { Song, Playlist } from '@/types';
import { fetchPlaylists, createPlaylist, addSongToPlaylist, addSongsToPlaylist, deletePlaylist } from '@/lib/playlists';
import { useToast } from '@/context/ToastContext';

interface AddToPlaylistModalProps {
  open: boolean;
  onClose: () => void;
  song: Song | null;
  songs?: Song[];
}

export default function AddToPlaylistModal({ open, onClose, song, songs }: AddToPlaylistModalProps) {
  const { showToast } = useToast();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [adding, setAdding] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchPlaylists();
      setPlaylists(data);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to load playlists', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleAdd = async (playlistId: string) => {
    const songIds = songs?.map((item) => item.id) ?? (song ? [song.id] : []);
    if (!songIds.length) return;
    setAdding(playlistId);
    try {
      let addedCount = 1;
      if (songs) addedCount = await addSongsToPlaylist(playlistId, songIds);
      else await addSongToPlaylist(playlistId, songIds[0]);
      showToast(
        addedCount
          ? `Added ${addedCount} ${addedCount === 1 ? 'song' : 'songs'} to playlist`
          : 'All selected songs are already in this playlist',
        addedCount ? 'success' : 'info',
      );
      onClose();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to add to playlist', 'error');
    } finally {
      setAdding(null);
    }
  };

  const handleCreate = async () => {
    const songIds = songs?.map((item) => item.id) ?? (song ? [song.id] : []);
    if (!newName.trim() || !songIds.length) return;
    setCreating(true);
    let playlistId: string | null = null;
    try {
      const pl = await createPlaylist(newName.trim());
      playlistId = pl.id;
      if (songs) await addSongsToPlaylist(pl.id, songIds);
      else await addSongToPlaylist(pl.id, songIds[0]);
      showToast(
        songs
          ? `Playlist created with ${songIds.length} ${songIds.length === 1 ? 'song' : 'songs'}`
          : 'Playlist created and song added',
        'success',
      );
      setNewName('');
      onClose();
    } catch (err) {
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
      showToast(err instanceof Error ? err.message : 'Failed to create playlist', 'error');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={songs ? `Add ${songs.length} Songs to Playlist` : 'Add to Playlist'} size="md">
      <div className="p-6">
        <div className="flex gap-2 mb-5">
          <Input
            placeholder="New playlist name..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
          <Button variant="primary" onClick={handleCreate} disabled={creating || !newName.trim()} className="shrink-0">
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          </Button>
        </div>

        <div className="border-t border-slate-800 pt-4">
          <p className="text-xs uppercase tracking-wider text-slate-500 mb-3">Existing Playlists</p>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin accent-text" /></div>
          ) : playlists.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-6">No playlists yet. Create one above.</p>
          ) : (
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {playlists.map((pl) => (
                <button
                  key={pl.id}
                  onClick={() => handleAdd(pl.id)}
                  disabled={adding === pl.id}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-800/60 transition-all text-left disabled:opacity-50"
                >
                  <div className="w-9 h-9 rounded-md flex items-center justify-center" style={{ backgroundColor: pl.cover_color }}>
                    <ListMusic className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm text-slate-200">{pl.name}</p>
                    <p className="text-xs text-slate-500">{pl.song_count || 0} songs</p>
                  </div>
                  {adding === pl.id && <Loader2 className="w-4 h-4 animate-spin accent-text" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
