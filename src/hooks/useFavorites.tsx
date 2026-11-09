import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { getFavoriteIds, toggleFavorite } from '@/lib/songs';

interface FavoritesContextValue {
  favIds: Set<string>;
  isFavorite: (songId: string) => boolean;
  toggle: (songId: string) => Promise<void>;
  loading: boolean;
  refresh: () => void;
}

const FavoritesContext = createContext<FavoritesContextValue | undefined>(undefined);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favIds, setFavIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setLoading(true);
    void getFavoriteIds()
      .then((ids) => setFavIds(new Set(ids)))
      .catch((error: unknown) => console.error('Could not load favorites:', error))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const isFavorite = useCallback((songId: string) => favIds.has(songId), [favIds]);

  const toggle = useCallback(async (songId: string) => {
    const currentlyFavorite = favIds.has(songId);
    setFavIds((prev) => {
      const next = new Set(prev);
      if (currentlyFavorite) next.delete(songId);
      else next.add(songId);
      return next;
    });
    try {
      await toggleFavorite(songId, !currentlyFavorite);
    } catch (error) {
      setFavIds((prev) => {
        const next = new Set(prev);
        if (currentlyFavorite) next.add(songId);
        else next.delete(songId);
        return next;
      });
      throw error;
    }
  }, [favIds]);

  return (
    <FavoritesContext.Provider value={{ favIds, isFavorite, toggle, loading, refresh }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) throw new Error('useFavorites must be used within FavoritesProvider');
  return context;
}
