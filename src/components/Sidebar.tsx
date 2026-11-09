import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Music, Library, Search, ListMusic, Settings, Heart, Clock, Plus, Star, Disc3, Calendar, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import type { Playlist } from '@/types';
import Modal from './ui/Modal';
import Input from './ui/Input';
import Button from './ui/Button';
import { createPlaylist, fetchPlaylists } from '@/lib/playlists';
import { useToast } from '@/context/ToastContext';
import { ACCENT_COLORS } from '@/lib/constants';

interface SidebarProps {
  onUpload: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export default function Sidebar({ onUpload, mobileOpen, onCloseMobile }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState(ACCENT_COLORS[0].value);
  const [creating, setCreating] = useState(false);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);

  const loadPlaylists = useCallback(async () => {
    try {
      setPlaylists(await fetchPlaylists());
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to load playlists', 'error');
    }
  }, [showToast]);

  useEffect(() => {
    void loadPlaylists();
  }, [loadPlaylists, location.pathname]);

  useEffect(() => {
    window.addEventListener('resonate:playlists-changed', loadPlaylists);
    return () => window.removeEventListener('resonate:playlists-changed', loadPlaylists);
  }, [loadPlaylists]);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      const playlist = await createPlaylist(name.trim(), '', color);
      setPlaylists((current) => [playlist, ...current]);
      showToast('Playlist created', 'success');
      setName('');
      setCreateOpen(false);
      navigate('/playlists');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to create playlist', 'error');
    } finally {
      setCreating(false);
    }
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
      isActive ? 'accent-text bg-slate-800/60 font-medium' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
    }`;

  return (
    <>
      {mobileOpen && <div className="fixed inset-0 bg-black/60 z-30 lg:hidden" onClick={onCloseMobile} />}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-slate-900/95 glass border-r border-slate-800 flex flex-col transition-transform duration-300 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex items-center justify-between px-5 h-16 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg accent-gradient flex items-center justify-center">
              <Music className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg text-slate-100">Resonate</span>
          </div>
          <button onClick={onCloseMobile} className="lg:hidden text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3">
          <Button variant="primary" className="w-full" onClick={onUpload}>
            <Plus className="w-4 h-4" /> Upload Music
          </Button>
        </div>

        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          <NavLink to="/library" className={linkClass} onClick={onCloseMobile}>
            <Library className="w-5 h-5" /> Library
          </NavLink>
          <NavLink to="/search" className={linkClass} onClick={onCloseMobile}>
            <Search className="w-5 h-5" /> Search
          </NavLink>
          <NavLink to="/playlists" className={linkClass} onClick={onCloseMobile}>
            <ListMusic className="w-5 h-5" /> Playlists
          </NavLink>

          <div className="pt-4">
            <p className="px-3 text-xs uppercase tracking-wider text-slate-600 mb-2">Smart Playlists</p>
            <NavLink to="/smart/favorites" className={linkClass} onClick={onCloseMobile}>
              <Heart className="w-5 h-5" /> Favorites
            </NavLink>
            <NavLink to="/smart/recently-played" className={linkClass} onClick={onCloseMobile}>
              <Clock className="w-5 h-5" /> Recently Played
            </NavLink>
            <NavLink to="/smart/recently-added" className={linkClass} onClick={onCloseMobile}>
              <Star className="w-5 h-5" /> Recently Added
            </NavLink>
            <NavLink to="/smart/most-played" className={linkClass} onClick={onCloseMobile}>
              <Disc3 className="w-5 h-5" /> Most Played
            </NavLink>
            <NavLink to="/smart/never-played" className={linkClass} onClick={onCloseMobile}>
              <Calendar className="w-5 h-5" /> Never Played
            </NavLink>
            <NavLink to="/smart/last-week" className={linkClass} onClick={onCloseMobile}>
              <Clock className="w-5 h-5" /> Last Week
            </NavLink>
            <NavLink to="/smart/last-month" className={linkClass} onClick={onCloseMobile}>
              <Calendar className="w-5 h-5" /> Last Month
            </NavLink>
          </div>

          <div className="pt-4">
            <div className="flex items-center justify-between px-3 mb-2">
              <p className="text-xs uppercase tracking-wider text-slate-600">My Playlists</p>
              <button onClick={() => setCreateOpen(true)} className="text-slate-500 hover:text-slate-300 transition-colors">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <button onClick={() => { setCreateOpen(true); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 transition-all">
              <Plus className="w-5 h-5" /> Create Playlist
            </button>
            <div className="mt-1 space-y-1">
              {playlists.map((playlist) => (
                <NavLink
                  key={playlist.id}
                  to={`/playlists/${playlist.id}`}
                  onClick={onCloseMobile}
                  className={linkClass}
                >
                  <ListMusic className="w-5 h-5" />
                  <span className="truncate">{playlist.name}</span>
                </NavLink>
              ))}
            </div>
          </div>
        </nav>

        <div className="p-3 border-t border-slate-800 space-y-1">
          <NavLink to="/settings" className={linkClass} onClick={onCloseMobile}>
            <Settings className="w-5 h-5" /> Settings
          </NavLink>
        </div>
      </aside>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create Playlist" size="sm">
        <div className="p-6 space-y-4">
          <Input label="Playlist Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="My Awesome Mix" autoFocus />
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Cover Color</label>
            <div className="flex gap-2 flex-wrap">
              {ACCENT_COLORS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setColor(c.value)}
                  className={`w-8 h-8 rounded-full transition-all ${color === c.value ? 'ring-2 ring-offset-2 ring-offset-slate-900 accent-ring scale-110' : 'hover:scale-110'}`}
                  style={{ backgroundColor: c.value }}
                />
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCreate} disabled={creating || !name.trim()}>
              {creating ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
