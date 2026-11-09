import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { DEFAULT_SETTINGS } from '@/lib/constants';
import type { UserSettings } from '@/types';
import { useAuth } from './AuthContext';
import { supabase } from '@/lib/supabase';
import { useToast } from './ToastContext';

interface SettingsContextValue {
  settings: UserSettings;
  updateSettings: (updates: Partial<UserSettings>) => void;
  loading: boolean;
}

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

function loadSettings(userId: string): UserSettings {
  try {
    const raw = localStorage.getItem(`music-settings:${userId}`);
    return raw ? { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<UserSettings>) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const { showToast } = useToast();
  const userId = session?.user.id;
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [readyUserId, setReadyUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      setReadyUserId(null);
      return;
    }

    let active = true;
    setLoading(true);
    setSettings(DEFAULT_SETTINGS);
    setReadyUserId(null);
    void (async () => {
      try {
        const { data, error } = await supabase
          .from('user_settings')
          .select('settings')
          .eq('user_id', userId)
          .maybeSingle();
        if (error) throw error;
        const initialSettings = data?.settings
          ? { ...DEFAULT_SETTINGS, ...(data.settings as Partial<UserSettings>) }
          : loadSettings(userId);
        if (active) setSettings(initialSettings);
        if (!data) {
          const { error: insertError } = await supabase
            .from('user_settings')
            .upsert({ user_id: userId, settings: initialSettings });
          if (insertError) throw insertError;
        }
        if (active) setReadyUserId(userId);
      } catch (error) {
        console.error('Could not load Supabase settings:', error);
        showToast(error instanceof Error ? error.message : 'Could not load account settings', 'error');
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [userId, showToast]);

  const updateSettings = (updates: Partial<UserSettings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
  };

  useEffect(() => {
    if (!userId || readyUserId !== userId) return;

    const storageKey = `music-settings:${userId}`;
    localStorage.setItem(storageKey, JSON.stringify(settings));
    const timeout = setTimeout(() => {
      void supabase
        .from('user_settings')
        .upsert({ user_id: userId, settings })
        .then(({ error }) => {
          if (error) {
            console.error('Could not save Supabase settings:', error.message);
            showToast(error.message, 'error');
          }
        });
    }, 400);
    return () => clearTimeout(timeout);
  }, [settings, userId, readyUserId, showToast]);

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, loading }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
