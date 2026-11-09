import { Link } from 'react-router-dom';
import { Music, Home } from 'lucide-react';
import Button from '@/components/ui/Button';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-center px-4">
      <div className="inline-flex w-16 h-16 rounded-2xl accent-gradient items-center justify-center mb-6 shadow-2xl">
        <Music className="w-8 h-8 text-white" />
      </div>
      <h1 className="text-6xl font-bold text-slate-100 mb-2">404</h1>
      <p className="text-lg text-slate-400 mb-6">This page is out of tune.</p>
      <Link to="/library">
        <Button variant="primary"><Home className="w-4 h-4" /> Back to Library</Button>
      </Link>
    </div>
  );
}
