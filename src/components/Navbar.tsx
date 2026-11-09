import { useState } from 'react';
import { Menu, Search as SearchIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface NavbarProps {
  onMenuClick: () => void;
}

export default function Navbar({ onMenuClick }: NavbarProps) {
  const navigate = useNavigate();
  const [q, setQ] = useState('');

  return (
    <header className="sticky top-0 z-20 h-16 bg-slate-950/80 glass border-b border-slate-800 flex items-center gap-4 px-4 lg:px-6">
      <button onClick={onMenuClick} className="lg:hidden p-2 text-slate-300 hover:text-slate-100">
        <Menu className="w-5 h-5" />
      </button>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (q.trim()) navigate(`/search?q=${encodeURIComponent(q)}`);
        }}
        className="flex-1 max-w-xl"
      >
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search songs, artists, albums..."
            className="w-full pl-10 pr-4 py-2 rounded-full bg-slate-800/60 border border-slate-700 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 accent-ring focus:border-transparent transition-all"
          />
        </div>
      </form>
    </header>
  );
}
