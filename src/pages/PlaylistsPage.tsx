import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ListMusic, MoreHorizontal, Edit3, Copy, Trash2, Download, Upload, Play, Search as SearchIcon } from 'lucide-react';
import type { Playlist } from '@/types';
import { fetchPlaylists, deletePlaylist, duplicatePlaylist, exportPlaylist, createPlaylist, updatePlaylist, addSongsToPlaylist } from '@/lib/playlists';
import { useToast } from '@/context/ToastContext';
import { usePlayer } from '@/context/PlayerContext';
import { fetchPlaylistSongs, fetchSongs } from '@/lib/songs';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';
import { FullPageSpinner, CenteredMessage } from '@/components/ui/Spinner';
import { ACCENT_COLORS } from '@/lib/constants';

export default function PlaylistsPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { playSong } = usePlayer();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<Playlist | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState(ACCENT_COLORS[0].value);
  const [deleteTarget, setDeleteTarget] = useState<Playlist | null>(null);
  const [search, setSearch] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [importData, setImportData] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await fetchPlaylists();
      setPlaylists(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load playlists';
      setLoadError(message);
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const handlePlay = async (pl: Playlist) => {
    try {
      const items = await fetchPlaylistSongs(pl.id);
      if (!items.length) {
        showToast('Playlist is empty', 'info');
        return;
      }
      const songs = items.map((i) => i.song!);
      playSong(songs[0], songs, `playlist:${pl.id}`);
    } catch {
      showToast('Failed to play playlist', 'error');
    }
  };

  const handleDuplicate = async (pl: Playlist) => {
    try {
      await duplicatePlaylist(pl.id, `${pl.name} (Copy)`);
      showToast('Playlist duplicated', 'success');
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to duplicate', 'error');
    }
  };

  const handleExport = async (pl: Playlist) => {
    try {
      const data = await exportPlaylist(pl.id);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${pl.name.replace(/\s+/g, '_')}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Playlist exported', 'success');
    } catch {
      showToast('Failed to export playlist', 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deletePlaylist(deleteTarget.id);
      setPlaylists((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      showToast('Playlist deleted', 'success');
      setDeleteTarget(null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to delete', 'error');
    }
  };

  const handleEditSave = async () => {
    if (!editTarget || !editName.trim()) return;
    try {
      await updatePlaylist(editTarget.id, { name: editName.trim(), cover_color: editColor });
      showToast('Playlist updated', 'success');
      setEditTarget(null);
      load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update', 'error');
    }
  };

  const handleImport = async () => {
    let createdPlaylistId: string | null = null;
    try {
      const parsed = JSON.parse(importData) as {
        name?: string;
        description?: string;
        songs?: { title?: string; artist?: string; album?: string }[];
      };
      if (!parsed.name || !Array.isArray(parsed.songs)) throw new Error('Invalid format');

      const pl = await createPlaylist(parsed.name, parsed.description || '');
      createdPlaylistId = pl.id;

      const allSongs = await fetchSongs();
      const norm = (value?: string) => (value || '').trim().toLowerCase();
      const matchedSongIds: string[] = [];

      for (const entry of parsed.songs) {
        const title = norm(entry.title);
        if (!title) continue;
        const artist = norm(entry.artist);
        const song =
          allSongs.find((s) => norm(s.title) === title && (!artist || norm(s.artist) === artist)) ??
          allSongs.find((s) => norm(s.title) === title) ??
          allSongs.find((s) => norm(s.title).includes(title) || title.includes(norm(s.title)));

        if (song) matchedSongIds.push(song.id);
      }
      const matched = await addSongsToPlaylist(pl.id, matchedSongIds);

      showToast(
        matched > 0
          ? `Imported "${pl.name}" with ${matched} of ${parsed.songs.length} songs`
          : `Playlist "${pl.name}" created — no matching songs in your library`,
        matched > 0 ? 'success' : 'info',
      );
      setImportOpen(false);
      setImportData('');
      navigate(`/playlists/${pl.id}`);
    } catch (err) {
      if (createdPlaylistId) {
        try {
          await deletePlaylist(createdPlaylistId);
        } catch (cleanupError) {
          showToast(
            cleanupError instanceof Error
              ? `Could not remove the incomplete playlist: ${cleanupError.message}`
              : 'Could not remove the incomplete playlist',
            'error',
          );
        }
      }
      showToast(err instanceof Error ? err.message : 'Invalid import data', 'error');
    }
  };

  const filtered = playlists.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <FullPageSpinner label="Loading playlists..." />;
  if (loadError) {
    return (
      <CenteredMessage
        title="Could not load playlists"
        subtitle={loadError}
        action={<Button onClick={() => void load()}>Retry</Button>}
      />
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Playlists</h1>
          <p className="text-sm text-slate-500 mt-0.5">{playlists.length} {playlists.length === 1 ? 'playlist' : 'playlists'}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search playlists..."
              className="pl-9 pr-3 py-2 rounded-lg bg-slate-800/60 border border-slate-700 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 accent-ring w-40 sm:w-52"
            />
          </div>
          <Button variant="secondary" onClick={() => setImportOpen(true)}><Upload className="w-4 h-4" /> Import</Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <CenteredMessage
          icon={<ListMusic className="w-12 h-12" />}
          title={playlists.length === 0 ? 'No playlists yet' : 'No matching playlists'}
          subtitle={playlists.length === 0 ? 'Create a playlist from the sidebar to organize your music.' : 'Try a different search.'}
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filtered.map((pl) => (
            <div key={pl.id} className="group relative rounded-xl bg-slate-900/60 border border-slate-800 hover:border-slate-700 transition-all duration-300 overflow-hidden hover:shadow-xl hover:shadow-black/30 hover:-translate-y-1">
              <div className="aspect-square flex items-center justify-center relative" style={{ background: `linear-gradient(135deg, ${pl.cover_color}, #0f172a)` }}>
                <button
                  onClick={() => navigate(`/playlists/${pl.id}`)}
                  aria-label={`Open ${pl.name}`}
                  className="absolute inset-0 flex items-center justify-center"
                >
                  <ListMusic className="w-12 h-12 text-white/40" />
                </button>
                <button
                  onClick={() => handlePlay(pl)}
                  aria-label={`Play ${pl.name}`}
                  className="absolute bottom-3 right-3 w-11 h-11 rounded-full accent-bg text-white flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-all hover:scale-110"
                >
                  <Play className="w-5 h-5 fill-current ml-0.5" />
                </button>
              </div>
              <button onClick={() => navigate(`/playlists/${pl.id}`)} className="block w-full p-3 text-left">
                <p className="truncate text-sm font-semibold text-slate-100">{pl.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">{pl.song_count || 0} songs</p>
              </button>
              <div className="absolute top-2 right-2">
                <button
                  onClick={() => setMenuOpen(menuOpen === pl.id ? null : pl.id)}
                  className="p-1.5 rounded-md bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/60"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
                {menuOpen === pl.id && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />
                    <div className="absolute right-0 top-full mt-1 z-20 w-44 rounded-lg bg-slate-800 border border-slate-700 shadow-xl py-1 animate-scale-in origin-top-right">
                      <button onClick={() => { setEditTarget(pl); setEditName(pl.name); setEditColor(pl.cover_color); setMenuOpen(null); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700/60">
                        <Edit3 className="w-4 h-4" /> Edit
                      </button>
                      <button onClick={() => { handleDuplicate(pl); setMenuOpen(null); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700/60">
                        <Copy className="w-4 h-4" /> Duplicate
                      </button>
                      <button onClick={() => { handleExport(pl); setMenuOpen(null); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700/60">
                        <Download className="w-4 h-4" /> Export
                      </button>
                      <button onClick={() => { setDeleteTarget(pl); setMenuOpen(null); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-rose-400 hover:bg-rose-500/10">
                        <Trash2 className="w-4 h-4" /> Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit Playlist" size="sm">
        <div className="p-6 space-y-4">
          <Input label="Name" value={editName} onChange={(e) => setEditName(e.target.value)} />
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Cover Color</label>
            <div className="flex gap-2 flex-wrap">
              {ACCENT_COLORS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setEditColor(c.value)}
                  className={`w-8 h-8 rounded-full transition-all ${editColor === c.value ? 'ring-2 ring-offset-2 ring-offset-slate-900 accent-ring scale-110' : 'hover:scale-110'}`}
                  style={{ backgroundColor: c.value }}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setEditTarget(null)}>Cancel</Button>
            <Button variant="primary" onClick={handleEditSave} disabled={!editName.trim()}>Save</Button>
          </div>
        </div>
      </Modal>

      <Modal open={importOpen} onClose={() => setImportOpen(false)} title="Import Playlist" size="md">
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-400">Paste exported playlist JSON below to create a new playlist.</p>
          <textarea
            value={importData}
            onChange={(e) => setImportData(e.target.value)}
            rows={8}
            placeholder='{"name": "...", "songs": [...]}'
            className="w-full px-3 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 accent-ring font-mono"
          />
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setImportOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleImport} disabled={!importData.trim()}>Import</Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Playlist"
        message={`Delete "${deleteTarget?.name}"? The songs themselves will remain in your library.`}
        confirmLabel="Delete"
        danger
      />
    </div>
  );
}
