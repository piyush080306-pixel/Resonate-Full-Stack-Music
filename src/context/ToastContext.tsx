import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import type { ToastMessage } from '@/types';
import { uniqueId } from '@/lib/utils';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';

interface ToastContextValue {
  toasts: ToastMessage[];
  showToast: (message: string, type?: ToastMessage['type']) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastMessage['type'] = 'info') => {
    const id = uniqueId();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => dismissToast(id), 4000);
  }, [dismissToast]);

  return (
    <ToastContext.Provider value={{ toasts, showToast, dismissToast }}>
      {children}
      <div className="fixed bottom-24 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex items-center gap-3 rounded-xl bg-slate-800 border border-slate-700 px-4 py-3 shadow-2xl shadow-black/40 animate-toast-in max-w-sm"
          >
            {t.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
            {t.type === 'error' && <XCircle className="w-5 h-5 text-rose-400 shrink-0" />}
            {t.type === 'info' && <Info className="w-5 h-5 text-sky-400 shrink-0" />}
            <span className="text-sm text-slate-100 flex-1">{t.message}</span>
            <button onClick={() => dismissToast(t.id)} className="text-slate-400 hover:text-slate-200 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
