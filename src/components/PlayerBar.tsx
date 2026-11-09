import { useState, useEffect } from 'react';
import {
  Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Repeat1,
  Volume2, VolumeX, Volume1, Heart, ListMusic, Music, Gauge, Timer,
} from 'lucide-react';
import { usePlayer } from '@/context/PlayerContext';
import { useFavorites } from '@/hooks/useFavorites';
import { useToast } from '@/context/ToastContext';
import { formatDuration } from '@/lib/utils';
import { getArtworkUrl } from '@/lib/songs';
import Visualizer from './Visualizer';

interface PlayerBarProps {
  onToggleQueue: () => void;
  queueOpen: boolean;
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const SLEEP_OPTIONS = [null, 5, 15, 30, 60];

export default function PlayerBar({ onToggleQueue, queueOpen }: PlayerBarProps) {
  const {
    currentSong, isPlaying, currentTime, duration, volume, muted, speed, repeat, shuffle, sleepTimer,
    togglePlay, next, previous, seek, setVolume, toggleMute, setSpeed, toggleRepeat, toggleShuffle, setSleepTimer,
  } = usePlayer();
  const { isFavorite, toggle } = useFavorites();
  const { showToast } = useToast();
  const [seeking, setSeeking] = useState(false);
  const [seekVal, setSeekVal] = useState(0);
  const [speedOpen, setSpeedOpen] = useState(false);
  const [sleepOpen, setSleepOpen] = useState(false);
  const [bgColor, setBgColor] = useState('#0f172a');

  useEffect(() => {
    if (currentSong?.dominant_color) {
      setBgColor(currentSong.dominant_color);
    }
  }, [currentSong]);

  if (!currentSong) {
    return (
      <div className="h-20 bg-slate-900 border-t border-slate-800 flex items-center justify-center text-sm text-slate-500">
        <Music className="w-4 h-4 mr-2" /> No song playing — select a track to begin
      </div>
    );
  }

  const fav = isFavorite(currentSong.id);
  const progress = duration > 0 ? (seeking ? seekVal : currentTime) / duration * 100 : 0;

  const commitSeek = (value: number) => {
    seek(value);
    setSeeking(false);
  };

  const repeatIcon = repeat === 'one' ? <Repeat1 className="w-5 h-5" /> : <Repeat className="w-5 h-5" />;
  const volIcon = muted || volume === 0 ? <VolumeX className="w-5 h-5" /> : volume < 0.5 ? <Volume1 className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />;

  return (
    <div
      className="relative h-20 bg-slate-900/95 glass border-t border-slate-800 transition-colors duration-700"
      style={{ background: `linear-gradient(90deg, ${bgColor}22, rgba(15,23,42,0.95) 40%)` }}
    >
      <div className="h-full flex items-center px-4 gap-4">
        {/* Left: current song info */}
        <div className="flex items-center gap-3 w-1/4 min-w-0">
          <div className="relative w-12 h-12 rounded-md overflow-hidden shrink-0 bg-slate-800 group">
            {getArtworkUrl(currentSong) ? (
              <img src={getArtworkUrl(currentSong)!} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: currentSong.dominant_color }}>
                <Music className="w-5 h-5 text-white/70" />
              </div>
            )}
            {isPlaying && (
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                <div className="flex items-end gap-0.5 h-5">
                  <span className="eq-bar w-0.5 bg-white h-full" style={{ animationDelay: '0s' }} />
                  <span className="eq-bar w-0.5 bg-white h-full" style={{ animationDelay: '0.15s' }} />
                  <span className="eq-bar w-0.5 bg-white h-full" style={{ animationDelay: '0.3s' }} />
                </div>
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-100">{currentSong.title}</p>
            <p className="truncate text-xs text-slate-400">{currentSong.artist}</p>
          </div>
          <button
            onClick={() => {
              void toggle(currentSong.id).catch((error: unknown) => {
                showToast(error instanceof Error ? error.message : 'Could not update favorite', 'error');
              });
            }}
            className={`p-2 rounded-md transition-all ${fav ? 'accent-text' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <Heart className={`w-4 h-4 ${fav ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* Center: controls + seek */}
        <div className="flex-1 flex flex-col items-center gap-1.5 max-w-2xl">
          <div className="flex items-center gap-4">
            <button
              onClick={toggleShuffle}
              className={`p-1.5 rounded-md transition-all ${shuffle ? 'accent-text' : 'text-slate-500 hover:text-slate-300'}`}
              title="Shuffle"
            >
              <Shuffle className="w-4 h-4" />
            </button>
            <button onClick={previous} className="p-1.5 text-slate-300 hover:text-slate-100 transition-colors" title="Previous">
              <SkipBack className="w-5 h-5 fill-current" />
            </button>
            <button
              onClick={togglePlay}
              className="w-10 h-10 rounded-full accent-bg text-white flex items-center justify-center hover:scale-105 transition-transform shadow-lg"
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
            </button>
            <button onClick={next} className="p-1.5 text-slate-300 hover:text-slate-100 transition-colors" title="Next">
              <SkipForward className="w-5 h-5 fill-current" />
            </button>
            <button
              onClick={toggleRepeat}
              className={`p-1.5 rounded-md transition-all ${repeat !== 'off' ? 'accent-text' : 'text-slate-500 hover:text-slate-300'}`}
              title={`Repeat: ${repeat}`}
            >
              {repeatIcon}
            </button>
          </div>
          <div className="w-full flex items-center gap-2">
            <span className="text-xs text-slate-500 w-10 text-right tabular-nums">{formatDuration(seeking ? seekVal : currentTime)}</span>
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={seeking ? seekVal : currentTime}
              onChange={(e) => { setSeeking(true); setSeekVal(parseFloat(e.target.value)); }}
              onPointerUp={(e) => commitSeek(parseFloat(e.currentTarget.value))}
              onTouchEnd={(e) => commitSeek(parseFloat(e.currentTarget.value))}
              onKeyUp={(e) => {
                if (['ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown'].includes(e.key)) {
                  commitSeek(parseFloat(e.currentTarget.value));
                }
              }}
              onBlur={(e) => { if (seeking) commitSeek(parseFloat(e.currentTarget.value)); }}
              className="flex-1 h-1 accent-bg rounded-full appearance-none cursor-pointer accent-slider"
              style={{ background: `linear-gradient(to right, var(--accent) ${progress}%, var(--track) ${progress}%)` }}
            />
            <span className="text-xs text-slate-500 w-10 tabular-nums">{formatDuration(duration)}</span>
          </div>
        </div>

        {/* Right: volume, extras */}
        <div className="w-1/4 flex items-center justify-end gap-2">
          <Visualizer className="hidden xl:block w-24 h-10 opacity-70" barCount={20} />

          {/* Speed */}
          <div className="relative">
            <button
              onClick={() => { setSpeedOpen((o) => !o); setSleepOpen(false); }}
              className="p-2 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all flex items-center gap-1"
              title="Playback speed"
            >
              <Gauge className="w-4 h-4" />
              <span className="text-xs tabular-nums">{speed}x</span>
            </button>
            {speedOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setSpeedOpen(false)} />
                <div className="absolute right-0 bottom-full mb-2 z-20 w-28 rounded-lg bg-slate-800 border border-slate-700 shadow-xl py-1 animate-scale-in origin-bottom-right">
                  {SPEEDS.map((s) => (
                    <button
                      key={s}
                      onClick={() => { setSpeed(s); setSpeedOpen(false); }}
                      className={`w-full px-3 py-1.5 text-sm text-left hover:bg-slate-700/60 transition-colors ${s === speed ? 'accent-text font-medium' : 'text-slate-200'}`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Sleep timer */}
          <div className="relative">
            <button
              onClick={() => { setSleepOpen((o) => !o); setSpeedOpen(false); }}
              className={`p-2 rounded-md transition-all ${sleepTimer !== null ? 'accent-text' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
              title="Sleep timer"
            >
              <Timer className="w-4 h-4" />
            </button>
            {sleepOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setSleepOpen(false)} />
                <div className="absolute right-0 bottom-full mb-2 z-20 w-36 rounded-lg bg-slate-800 border border-slate-700 shadow-xl py-1 animate-scale-in origin-bottom-right">
                  {SLEEP_OPTIONS.map((mins) => (
                    <button
                      key={String(mins)}
                      onClick={() => { setSleepTimer(mins); setSleepOpen(false); }}
                      className={`w-full px-3 py-1.5 text-sm text-left hover:bg-slate-700/60 transition-colors ${sleepTimer === mins ? 'accent-text font-medium' : 'text-slate-200'}`}
                    >
                      {mins === null ? 'Off' : `${mins} min`}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <button onClick={toggleMute} className="p-2 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all">
            {volIcon}
          </button>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={muted ? 0 : volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-20 h-1 accent-bg rounded-full appearance-none cursor-pointer hidden sm:block accent-slider"
            style={{ background: `linear-gradient(to right, var(--accent) ${(muted ? 0 : volume) * 100}%, var(--track) ${(muted ? 0 : volume) * 100}%)` }}
          />

          <button
            onClick={onToggleQueue}
            className={`p-2 rounded-md transition-all ${queueOpen ? 'accent-text bg-slate-800' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
            title="Queue"
          >
            <ListMusic className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
