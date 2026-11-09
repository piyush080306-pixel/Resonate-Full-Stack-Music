import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search as SearchIcon, Music, User, Disc3, Tag, ListMusic } from 'lucide-react';
import type { Playlist, Song } from '@/types';
import { fetchSongs } from '@/lib/songs';
import { fetchPlaylists } from '@/lib/playlists';
import { useDebounce } from '@/hooks/useDebounce';
import SongRow from '@/components/SongRow';
import SongCard from '@/components/SongCard';
import { FullPageSpinner, CenteredMessage } from '@/components/ui/Spinner';
import Button from '@/components/ui/Button';

type Category = 'all' | 'song' | 'artist' | 'album' | 'genre' | 'playlist';

interface GroupedResults {
  songs: Song[];
  artists: { name: string; count: number; cover: string }[];
  albums: { name: string; count: number; cover: string }[];
  genres: { name: string; count: number }[];
  playlists: Playlist[];
}

export default function SearchPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(() => params.get('q') || '');
  const debounced = useDebounce(query, 300);
  const [allSongs, setAllSongs] = useState<Song[]>([]);
  const [allPlaylists, setAllPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [category, setCategory] = useState<Category>('all');
  const [view, setView] = useState<'grid' | 'list'>('list');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    Promise.all([fetchSongs(), fetchPlaylists()])
      .then(([songs, playlists]) => {
        if (!active) return;
        setAllSongs(songs);
        setAllPlaylists(playlists);
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Failed to load search data');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [reload]);

  useEffect(() => {
    const urlQuery = params.get('q') || '';
    setQuery((current) => current === urlQuery ? current : urlQuery);
  }, [params]);

  useEffect(() => {
    const urlQuery = params.get('q') || '';
    if (urlQuery === debounced) return;
    if (debounced.trim()) setParams({ q: debounced }, { replace: true });
    else setParams({}, { replace: true });
  }, [debounced, params, setParams]);

  const results: GroupedResults = useMemo(() => {
    if (!debounced.trim()) return { songs: [], artists: [], albums: [], genres: [], playlists: [] };
    const q = debounced.toLowerCase();
    const matched = allSongs.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.artist.toLowerCase().includes(q) ||
        s.album.toLowerCase().includes(q) ||
        s.genre.toLowerCase().includes(q) ||
        (s.year && String(s.year).includes(q)),
    );
    const artistMap = new Map<string, { count: number; cover: string }>();
    const albumMap = new Map<string, { count: number; cover: string }>();
    const genreMap = new Map<string, number>();
    matched.forEach((s) => {
      const a = artistMap.get(s.artist) || { count: 0, cover: s.dominant_color };
      a.count++;
      artistMap.set(s.artist, a);
      if (s.album) {
        const al = albumMap.get(s.album) || { count: 0, cover: s.dominant_color };
        al.count++;
        albumMap.set(s.album, al);
      }
      if (s.genre) genreMap.set(s.genre, (genreMap.get(s.genre) || 0) + 1);
    });
    return {
      songs: matched,
      artists: Array.from(artistMap.entries()).map(([name, v]) => ({ name, ...v })),
      albums: Array.from(albumMap.entries()).map(([name, v]) => ({ name, ...v })),
      genres: Array.from(genreMap.entries()).map(([name, count]) => ({ name, count })),
      playlists: allPlaylists.filter(
        (playlist) =>
          playlist.name.toLowerCase().includes(q) ||
          (playlist.description ?? '').toLowerCase().includes(q),
      ),
    };
  }, [debounced, allPlaylists, allSongs]);

  if (loading) return <FullPageSpinner label="Loading search..." />;

  if (error) {
    return (
      <CenteredMessage
        title="Could not load search"
        subtitle={error}
        action={<Button onClick={() => setReload((value) => value + 1)}>Retry</Button>}
      />
    );
  }

  const hasVisibleResults = category === 'playlist'
    ? results.playlists.length > 0
    : category === 'song'
      ? results.songs.length > 0
      : category === 'artist'
        ? results.artists.length > 0
        : category === 'album'
          ? results.albums.length > 0
          : category === 'genre'
            ? results.genres.length > 0
            : results.songs.length > 0 || results.artists.length > 0 ||
              results.albums.length > 0 || results.genres.length > 0 || results.playlists.length > 0;

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      <div className="relative mb-6 max-w-2xl">
        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search songs, artists, albums, genres, playlists..."
          className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-800/60 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 accent-ring focus:border-transparent transition-all"
        />
      </div>

      {debounced.trim() && (
        <div className="flex flex-wrap gap-2 mb-6">
          {(
            [
              ['all', 'All'],
              ['song', 'Songs'],
              ['artist', 'Artists'],
              ['album', 'Albums'],
              ['genre', 'Genres'],
              ['playlist', 'Playlists'],
            ] as [Category, string][]
          ).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setCategory(value)}
              className={`px-4 py-1.5 rounded-full text-sm border transition-all ${
                category === value
                  ? 'accent-bg text-white border-transparent'
                  : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:text-slate-100 hover:border-slate-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {!debounced.trim() ? (
        <CenteredMessage icon={<SearchIcon className="w-12 h-12" />} title="Search your library" subtitle="Find songs by title, artist, album, genre, or year." />
      ) : !hasVisibleResults ? (
        <CenteredMessage icon={<SearchIcon className="w-12 h-12" />} title="No results found" subtitle={`Nothing matched "${debounced}". Try a different query.`} />
      ) : (
        <div className="space-y-8">
          {results.playlists.length > 0 && (category === 'all' || category === 'playlist') && (
            <section>
              <h2 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2"><ListMusic className="w-5 h-5 accent-text" /> Playlists</h2>
              <div className="flex flex-wrap gap-3">
                {results.playlists.map((playlist) => (
                  <button
                    key={playlist.id}
                    onClick={() => navigate(`/playlists/${playlist.id}`)}
                    className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-left hover:border-slate-600"
                  >
                    <span
                      className="flex h-11 w-11 items-center justify-center rounded-md"
                      style={{ backgroundColor: playlist.cover_color }}
                    >
                      <ListMusic className="h-5 w-5 text-white/80" />
                    </span>
                    <span>
                      <span className="block max-w-48 truncate text-sm font-medium text-slate-100">{playlist.name}</span>
                      <span className="text-xs text-slate-500">{playlist.song_count ?? 0} songs</span>
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}
          {results.artists.length > 0 && (category === 'all' || category === 'artist') && (
            <section>
              <h2 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2"><User className="w-5 h-5 accent-text" /> Artists</h2>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {results.artists.slice(0, 10).map((a) => (
                  <button
                    key={a.name}
                    onClick={() => setQuery(a.name)}
                    className="shrink-0 w-32 text-center group"
                  >
                    <div className="w-32 h-32 rounded-full mx-auto mb-2 flex items-center justify-center transition-transform group-hover:scale-105" style={{ background: `linear-gradient(135deg, ${a.cover}, #0f172a)` }}>
                      <User className="w-10 h-10 text-white/70" />
                    </div>
                    <p className="truncate text-sm font-medium text-slate-200">{a.name}</p>
                    <p className="text-xs text-slate-500">{a.count} songs</p>
                  </button>
                ))}
              </div>
            </section>
          )}

          {results.albums.length > 0 && (category === 'all' || category === 'album') && (
            <section>
              <h2 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2"><Disc3 className="w-5 h-5 accent-text" /> Albums</h2>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {results.albums.slice(0, 10).map((al) => (
                  <button
                    key={al.name}
                    onClick={() => setQuery(al.name)}
                    className="shrink-0 w-36 text-center group"
                  >
                    <div className="w-36 h-36 rounded-lg mx-auto mb-2 flex items-center justify-center transition-transform group-hover:scale-105" style={{ background: `linear-gradient(135deg, ${al.cover}, #0f172a)` }}>
                      <Disc3 className="w-10 h-10 text-white/70" />
                    </div>
                    <p className="truncate text-sm font-medium text-slate-200">{al.name}</p>
                    <p className="text-xs text-slate-500">{al.count} songs</p>
                  </button>
                ))}
              </div>
            </section>
          )}

          {results.genres.length > 0 && (category === 'all' || category === 'genre') && (
            <section>
              <h2 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2"><Tag className="w-5 h-5 accent-text" /> Genres</h2>
              <div className="flex flex-wrap gap-2">
                {results.genres.map((g) => (
                  <button
                    key={g.name}
                    onClick={() => setQuery(g.name)}
                    className="px-4 py-2 rounded-full bg-slate-800 border border-slate-700 text-sm text-slate-200 hover:bg-slate-700 hover:border-slate-600 transition-all"
                  >
                    {g.name} <span className="text-slate-500">· {g.count}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {results.songs.length > 0 && (category === 'all' || category === 'song') && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2"><Music className="w-5 h-5 accent-text" /> Songs</h2>
                <div className="flex rounded-lg bg-slate-800/60 border border-slate-700 p-0.5">
                  <button onClick={() => setView('list')} className={`p-1.5 rounded-md text-xs ${view === 'list' ? 'accent-bg text-white' : 'text-slate-400'}`}>List</button>
                  <button onClick={() => setView('grid')} className={`p-1.5 rounded-md text-xs ${view === 'grid' ? 'accent-bg text-white' : 'text-slate-400'}`}>Grid</button>
                </div>
              </div>
              {view === 'list' ? (
                <div className="space-y-0.5">
                  {results.songs.map((song, idx) => (
                    <SongRow key={song.id} song={song} index={idx} queue={results.songs} />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {results.songs.map((song) => (
                    <SongCard key={song.id} song={song} queue={results.songs} />
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
