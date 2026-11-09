import { useEffect, useState } from 'react';
import { Palette, Volume2, Gauge, Clock, Play, Keyboard, HardDrive, Moon, Sun, Check, LogOut, RefreshCw } from 'lucide-react';
import { useSettings } from '@/context/SettingsContext';
import { useToast } from '@/context/ToastContext';
import { useAuth } from '@/context/AuthContext';
import { usePlayer } from '@/context/PlayerContext';
import { fetchSongs, fetchStorageUsage } from '@/lib/songs';
import { ACCENT_COLORS } from '@/lib/constants';
import Button from '@/components/ui/Button';
import { formatBytes } from '@/lib/utils';

const SHORTCUTS = [
  { keys: 'Space', action: 'Play / Pause' },
  { keys: '←', action: 'Previous track' },
  { keys: '→', action: 'Next track' },
  { keys: '↑', action: 'Volume up' },
  { keys: '↓', action: 'Volume down' },
  { keys: 'M', action: 'Mute / Unmute' },
  { keys: 'S', action: 'Toggle shuffle' },
  { keys: 'R', action: 'Toggle repeat' },
];

export default function SettingsPage() {
  const { settings, updateSettings } = useSettings();
  const { showToast } = useToast();
  const { session, signOut } = useAuth();
  const { setVolume, setSpeed } = usePlayer();
  const [storage, setStorage] = useState<{ audioBytes: number; artworkBytes: number; songCount: number } | null>(null);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [storageRefresh, setStorageRefresh] = useState(0);

  useEffect(() => {
    let active = true;
    setStorage(null);
    setStorageError(null);
    (async () => {
      try {
        const [songs, usage] = await Promise.all([fetchSongs(), fetchStorageUsage()]);
        if (active) setStorage({ ...usage, songCount: songs.length });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Could not load cloud storage usage';
        if (active) {
          setStorageError(message);
          showToast(message, 'error');
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [showToast, storageRefresh]);

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-100 mb-6">Settings</h1>

      <div className="space-y-6">
        {/* Appearance */}
        <section className="rounded-xl bg-slate-900/60 border border-slate-800 p-5">
          <h2 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2"><Palette className="w-4 h-4 accent-text" /> Appearance</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-2">Theme</label>
              <div className="flex gap-2">
                <button
                  onClick={() => updateSettings({ theme: 'dark' })}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-all ${settings.theme === 'dark' ? 'accent-border bg-slate-800' : 'border-slate-700 hover:border-slate-600'}`}
                >
                  <Moon className="w-4 h-4 text-slate-300" /> Dark
                  {settings.theme === 'dark' && <Check className="w-4 h-4 accent-text" />}
                </button>
                <button
                  onClick={() => updateSettings({ theme: 'light' })}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-all ${settings.theme === 'light' ? 'accent-border bg-slate-800' : 'border-slate-700 hover:border-slate-600'}`}
                >
                  <Sun className="w-4 h-4 text-slate-300" /> Light
                  {settings.theme === 'light' && <Check className="w-4 h-4 accent-text" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2">Accent Color</label>
              <div className="flex gap-2 flex-wrap">
                {ACCENT_COLORS.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => updateSettings({ accentColor: c.value })}
                    className={`w-9 h-9 rounded-full transition-all ${settings.accentColor === c.value ? 'ring-2 ring-offset-2 ring-offset-slate-900 ring-white scale-110' : 'hover:scale-110'}`}
                    style={{ backgroundColor: c.value }}
                    title={c.name}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Playback */}
        <section className="rounded-xl bg-slate-900/60 border border-slate-800 p-5">
          <h2 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2"><Play className="w-4 h-4 accent-text" /> Playback</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-2 flex items-center gap-2"><Volume2 className="w-4 h-4" /> Default Volume: {settings.defaultVolume}%</label>
              <input
                type="range"
                min={0}
                max={100}
                value={settings.defaultVolume}
                onChange={(e) => updateSettings({ defaultVolume: parseInt(e.target.value, 10) })}
                onInput={(e) => setVolume(parseInt((e.target as HTMLInputElement).value, 10) / 100)}
                className="w-full h-2 accent-bg rounded-full appearance-none cursor-pointer"
                style={{ background: `linear-gradient(to right, var(--accent) ${settings.defaultVolume}%, var(--track) ${settings.defaultVolume}%)` }}
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm text-slate-400 flex items-center gap-2">
                <Play className="w-4 h-4" /> Autoplay similar songs when the queue ends
              </label>
              <button
                onClick={() => updateSettings({ autoPlay: !settings.autoPlay })}
                className={`relative w-11 h-6 rounded-full transition-all ${settings.autoPlay ? 'accent-bg' : 'bg-slate-700'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${settings.autoPlay ? 'translate-x-5' : ''}`} />
              </button>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2 flex items-center gap-2"><Clock className="w-4 h-4" /> Crossfade Duration: {settings.crossfadeDuration}s</label>
              <input
                type="range"
                min={0}
                max={12}
                value={settings.crossfadeDuration}
                onChange={(e) => updateSettings({ crossfadeDuration: parseInt(e.target.value, 10) })}
                className="w-full h-2 accent-bg rounded-full appearance-none cursor-pointer"
                style={{ background: `linear-gradient(to right, var(--accent) ${(settings.crossfadeDuration / 12) * 100}%, var(--track) ${(settings.crossfadeDuration / 12) * 100}%)` }}
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-2 flex items-center gap-2"><Gauge className="w-4 h-4" /> Default Playback Speed: {settings.defaultPlaybackSpeed}x</label>
              <div className="flex gap-2 flex-wrap">
                {[0.5, 0.75, 1, 1.25, 1.5, 2].map((s) => (
                  <button
                    key={s}
                    onClick={() => { updateSettings({ defaultPlaybackSpeed: s }); setSpeed(s); }}
                    className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${settings.defaultPlaybackSpeed === s ? 'accent-border accent-text bg-slate-800' : 'border-slate-700 text-slate-300 hover:border-slate-600'}`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Keyboard Shortcuts */}
        <section className="rounded-xl bg-slate-900/60 border border-slate-800 p-5">
          <h2 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2"><Keyboard className="w-4 h-4 accent-text" /> Keyboard Shortcuts</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {SHORTCUTS.map((s) => (
              <div key={s.keys} className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-800/40">
                <span className="text-sm text-slate-300">{s.action}</span>
                <kbd className="px-2 py-1 rounded-md bg-slate-700 border border-slate-600 text-xs font-mono text-slate-200">{s.keys}</kbd>
              </div>
            ))}
          </div>
        </section>

        {/* Storage */}
        <section className="rounded-xl bg-slate-900/60 border border-slate-800 p-5">
          <h2 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2"><HardDrive className="w-4 h-4 accent-text" /> Storage Usage</h2>
          {storage ? (
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Audio files</span>
                <span className="text-slate-200 font-medium">{formatBytes(storage.audioBytes)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Artwork files</span>
                <span className="text-slate-200 font-medium">{formatBytes(storage.artworkBytes)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Total files</span>
                <span className="text-slate-200 font-medium">{formatBytes(storage.audioBytes + storage.artworkBytes)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Total songs</span>
                <span className="text-slate-200 font-medium">{storage.songCount}</span>
              </div>
              <div className="flex justify-end">
                <Button size="sm" variant="ghost" onClick={() => setStorageRefresh((value) => value + 1)}>
                  <RefreshCw className="w-4 h-4" /> Refresh
                </Button>
              </div>
            </div>
          ) : storageError ? (
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-rose-400">{storageError}</p>
              <Button size="sm" variant="secondary" onClick={() => setStorageRefresh((value) => value + 1)}>Retry</Button>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Calculating storage...</p>
          )}
        </section>

        <section className="rounded-xl bg-slate-900/60 border border-slate-800 p-5">
          <h2 className="text-sm font-semibold text-slate-200 mb-3">Account</h2>
          <div className="flex items-center justify-between gap-4">
            <p className="truncate text-sm text-slate-400">{session?.user.email}</p>
            <Button
              variant="secondary"
              onClick={() => {
                void signOut().catch((error: unknown) => {
                  showToast(error instanceof Error ? error.message : 'Could not sign out', 'error');
                });
              }}
            >
              <LogOut className="w-4 h-4" /> Sign out
            </Button>
          </div>
        </section>

        <p className="text-right text-xs text-slate-500">Settings save automatically to your account.</p>
      </div>
    </div>
  );
}
