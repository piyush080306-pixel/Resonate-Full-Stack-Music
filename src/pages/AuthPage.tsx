import { useState, type FormEvent } from 'react';
import { Music } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import Button from '@/components/ui/Button';

export default function AuthPage() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setSubmitting(true);
    try {
      if (mode === 'sign-in') {
        await signIn(email, password);
      } else {
        const signedIn = await signUp(email, password);
        if (!signedIn) {
          setMessage('Check your email to confirm your account, then sign in.');
        }
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Authentication failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <section className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
        <div className="mb-7 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl accent-bg">
            <Music className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100">Resonate</h1>
          <p className="mt-2 text-sm text-slate-400">
            {mode === 'sign-in' ? 'Sign in to your music library' : 'Create your music library account'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm text-slate-300">
            Email
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-slate-100 outline-none focus:border-sky-500"
            />
          </label>
          <label className="block text-sm text-slate-300">
            Password
            <input
              type="password"
              autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
              minLength={6}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-slate-100 outline-none focus:border-sky-500"
            />
            {mode === 'sign-up' && <span className="mt-1 block text-xs text-slate-500">At least 6 characters</span>}
          </label>

          {error && <p role="alert" className="text-sm text-rose-400">{error}</p>}
          {message && <p role="status" className="text-sm text-emerald-400">{message}</p>}

          <Button type="submit" variant="primary" disabled={submitting} className="w-full">
            {submitting ? 'Please wait...' : mode === 'sign-in' ? 'Sign in' : 'Create account'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          {mode === 'sign-in' ? 'New to Resonate?' : 'Already have an account?'}{' '}
          <button
            type="button"
            onClick={() => {
              setMode((current) => current === 'sign-in' ? 'sign-up' : 'sign-in');
              setError('');
              setMessage('');
            }}
            className="font-medium accent-text hover:brightness-125"
          >
            {mode === 'sign-in' ? 'Create account' : 'Sign in'}
          </button>
        </p>
      </section>
    </main>
  );
}
