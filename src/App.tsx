import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from '@/context/ToastContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { SettingsProvider } from '@/context/SettingsContext';
import { PlayerProvider } from '@/context/PlayerContext';
import { FavoritesProvider } from '@/hooks/useFavorites';
import { useTheme } from '@/context/ThemeContext';
import AppLayout from '@/components/AppLayout';
import AuthPage from '@/pages/AuthPage';
import LibraryPage from '@/pages/LibraryPage';
import SearchPage from '@/pages/SearchPage';
import PlaylistsPage from '@/pages/PlaylistsPage';
import PlaylistDetailPage from '@/pages/PlaylistDetailPage';
import SmartPlaylistPage from '@/pages/SmartPlaylistPage';
import SettingsPage from '@/pages/SettingsPage';
import NotFoundPage from '@/pages/NotFoundPage';
import { FullPageSpinner } from '@/components/ui/Spinner';

function ThemeApplier() {
  useTheme();
  return null;
}

function AppContent() {
  const { session, loading } = useAuth();
  if (loading) return <FullPageSpinner label="Connecting to your music library..." />;
  if (!session) return <AuthPage />;

  return (
    <SettingsProvider>
      <ThemeApplier />
      <FavoritesProvider>
        <PlayerProvider>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/library" element={<LibraryPage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/playlists" element={<PlaylistsPage />} />
              <Route path="/playlists/:id" element={<PlaylistDetailPage />} />
              <Route path="/smart/:type" element={<SmartPlaylistPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
            <Route path="/" element={<Navigate to="/library" replace />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </PlayerProvider>
      </FavoritesProvider>
    </SettingsProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
