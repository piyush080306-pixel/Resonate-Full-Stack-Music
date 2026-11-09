import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Heart, Clock, Star, Disc3, Calendar, Music, Play, Shuffle } from 'lucide-react';
import type { Song } from '@/types';
import { fetchFavorites, fetchHistory, fetchHistorySince, fetchMostPlayed, fetchSongs } from '@/lib/songs';
import { usePlayer } from '@/context/PlayerContext';
import { useToast } from '@/context/ToastContext';
import SongRow, { SongRowHeader } from '@/components/SongRow';
import Button from '@/components/ui/Button';
import { FullPageSpinner, CenteredMessage } from '@/components/ui/Spinner';

type SmartType = 'favorites' | 'recently-played' | 'recently-added' | 'most-played' | 'never-played' | 'last-week' | 'last-month';

const META: Record<SmartType, { title: string; icon: typeof Heart; color: string }> = {
  favorites: { title: 'Favorites', icon: Heart, color: '#f43f5e' },
  'recently-played': { title: 'Recently Played', icon: Clock, color: '#0ea5e9' },
  'recently-added': { title: 'Recently Added', icon: Star, color: '#10b981' },
  'most-played': { title: 'Most Played', icon: Disc3, color: '#f59e0b' },
  'never-played': { title: 'Never Played', icon: Calendar, color: '#8b5cf6' },
  'last-week': { title: 'Last Week', icon: Clock, color: '#06b6d4' },
  'last-month': { title: 'Last Month', icon: Clock, color: '#f97316' },
};

export default function SmartPlaylistPage() {
  const { type } = useParams<{ type: SmartType }>();
  const { playSong, shufflePlay } = usePlayer();
  const { showToast } = useToast();
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        let result: Song[] = [];
        switch (type) {
          case 'favorites': result = await fetchFavorites(); break;
          case 'recently-played': result = await fetchHistory(); break;
          case 'most-played': result = await fetchMostPlayed(); break;
          case 'last-week': result = await fetchHistorySince(7); break;
          case 'last-month': result = await fetchHistorySince(30); break;
          case 'recently-added':
          case 'never-played': {
            const [all, history] = await Promise.all([fetchSongs(), fetchHistory()]);
            const playedIds = new Set(history.map((h) => h.id));
            if (type === 'recently-added') {
              result = all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            } else {
              result = all.filter((s) => !playedIds.has(s.id));
            }
            break;
          }
          default: result = [];
        }
        if (active) setSongs(result);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load';
        if (active) {
          setError(message);
          showToast(message, 'error');
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [type, showToast, reload]);

  if (!type || !META[type]) return <CenteredMessage title="Unknown playlist" />;
  if (loading) return <FullPageSpinner label="Loading..." />;
  if (error) {
    return (
      <CenteredMessage
        title="Could not load smart playlist"
        subtitle={error}
        action={<Button onClick={() => setReload((value) => value + 1)}>Retry</Button>}
      />
    );
  }

  const meta = META[type];
  const Icon = meta.icon;

  const handlePlay = () => {
    if (!songs.length) { showToast('Nothing to play', 'info'); return; }
    playSong(songs[0], songs, `smart:${type}`);
  };

  const handleShuffle = () => {
    if (!songs.length) return;
    shufflePlay(songs, `smart:${type}:shuffle`);
  };

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row gap-6 mb-8">
        <div className="w-40 h-40 rounded-2xl shrink-0 flex items-center justify-center shadow-2xl" style={{ background: `linear-gradient(135deg, ${meta.color}, #0f172a)` }}>
          <Icon className="w-16 h-16 text-white/50" />
        </div>
        <div className="flex-1 flex flex-col justify-end">
          <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">Smart Playlist</p>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-100 mb-2">{meta.title}</h1>
          <p className="text-sm text-slate-400">{songs.length} {songs.length === 1 ? 'song' : 'songs'}</p>
          {songs.length > 0 && (
            <div className="flex gap-3 mt-4">
              <Button variant="primary" onClick={handlePlay}><Play className="w-4 h-4 fill-current" /> Play</Button>
              <Button variant="secondary" onClick={handleShuffle}><Shuffle className="w-4 h-4" /> Shuffle</Button>
            </div>
          )}
        </div>
      </div>

      {songs.length === 0 ? (
        <CenteredMessage icon={<Music className="w-12 h-12" />} title="No songs here yet" subtitle="This smart playlist will fill in automatically as you use the app." />
      ) : (
        <>
          <SongRowHeader />
          <div className="space-y-0.5">
            {songs.map((song, idx) => (
              <SongRow key={song.id} song={song} index={idx} queue={songs} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
