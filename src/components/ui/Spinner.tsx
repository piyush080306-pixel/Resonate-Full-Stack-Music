import { type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

interface SpinnerProps {
  size?: number;
  className?: string;
  label?: string;
}

export default function Spinner({ size = 24, className = '', label }: SpinnerProps) {
  return (
    <div className={`flex items-center justify-center gap-2 ${className}`}>
      <Loader2 className="animate-spin accent-text" style={{ width: size, height: size }} />
      {label && <span className="text-sm text-slate-400">{label}</span>}
    </div>
  );
}

export function FullPageSpinner({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
      <Spinner size={40} />
      <p className="text-slate-400 text-sm">{label}</p>
    </div>
  );
}

export function InlineSpinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center py-12 gap-2">
      <Spinner size={20} />
      {label && <span className="text-slate-400 text-sm">{label}</span>}
    </div>
  );
}

export function CenteredMessage({ icon, title, subtitle, action }: { icon?: ReactNode; title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
      {icon && <div className="mb-4 text-slate-600">{icon}</div>}
      <h3 className="text-lg font-semibold text-slate-200">{title}</h3>
      {subtitle && <p className="mt-1.5 text-sm text-slate-500 max-w-sm">{subtitle}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
