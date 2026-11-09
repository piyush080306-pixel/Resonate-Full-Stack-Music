import { useEffect } from 'react';
import { usePlayer } from '@/context/PlayerContext';

const FORM_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

export function useKeyboardShortcuts() {
  const { togglePlay, next, previous, setVolume, volume, toggleMute, toggleShuffle, toggleRepeat } = usePlayer();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't steal browser/OS shortcuts (Ctrl+S, Cmd+R, Alt+Tab, …).
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const target = e.target as HTMLElement | null;
      if (
        target &&
        (FORM_TAGS.has(target.tagName) || target.isContentEditable)
      ) {
        return;
      }

      // Let dialogs handle their own keyboard interaction.
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;

      switch (e.code) {
        case 'Space':
          // Preserve normal activation of focused buttons/links.
          if (target && (target.tagName === 'BUTTON' || target.tagName === 'A')) return;
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          previous();
          break;
        case 'ArrowRight':
          e.preventDefault();
          next();
          break;
        case 'ArrowUp':
          e.preventDefault();
          setVolume(Math.min(1, volume + 0.05));
          break;
        case 'ArrowDown':
          e.preventDefault();
          setVolume(Math.max(0, volume - 0.05));
          break;
        case 'KeyM':
          toggleMute();
          break;
        case 'KeyS':
          toggleShuffle();
          break;
        case 'KeyR':
          toggleRepeat();
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [togglePlay, next, previous, setVolume, volume, toggleMute, toggleShuffle, toggleRepeat]);
}
