import { useCallback, useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import PlayerBar from '@/components/PlayerBar';
import QueueDrawer from '@/components/QueueDrawer';
import UploadModal from '@/components/UploadModal';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

export default function AppLayout() {
  useKeyboardShortcuts();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [mobileSidebar, setMobileSidebar] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);
  const [libraryVersion, setLibraryVersion] = useState(0);
  const refreshLibrary = useCallback(() => setLibraryVersion((version) => version + 1), []);

  return (
    <div className="h-screen flex bg-slate-950 text-slate-100 overflow-hidden">
      <Sidebar onUpload={() => setUploadOpen(true)} mobileOpen={mobileSidebar} onCloseMobile={() => setMobileSidebar(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar onMenuClick={() => setMobileSidebar(true)} />
        <main className="flex-1 overflow-y-auto page-transition">
          <Outlet context={{ refreshLibrary, libraryVersion, openUpload: () => setUploadOpen(true) }} />
        </main>
        <PlayerBar onToggleQueue={() => setQueueOpen((o) => !o)} queueOpen={queueOpen} />
      </div>
      <QueueDrawer open={queueOpen} onClose={() => setQueueOpen(false)} />
      <UploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onComplete={refreshLibrary}
      />
    </div>
  );
}
