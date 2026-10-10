import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthLoading } from '../auth/AuthContext';
import { useAuth } from '../auth/context';
import { useOnboardingRecord } from '../onboarding/storage';

type Mode = 'signin' | 'signup';

export default function AuthPage() {
  const { user, loading, signIn, signUp, signInWithGoogle } = useAuth();
  const record = useOnboardingRecord(user?.uid);
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Session still restoring: keep the spinner instead of flashing the form.
  if (loading) return <AuthLoading />;
  // Signed in: continue to onboarding, or straight into the app if already done.
  if (user) return <Navigate to={record?.profile.onboardingCompleted ? '/' : '/onboarding'} replace />;

  const showError = (err: unknown) =>
    setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'signin') await signIn(email.trim(), password);
      else await signUp(email.trim(), password);
    } catch (err) {
      showError(err);
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    setBusy(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      showError(err);
    } finally {
      setBusy(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === 'signin' ? 'signup' : 'signin');
    setError('');
  };

  const inputClass =
    'w-full bg-background border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-primary';

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 font-sans text-text">
      <img
        src="/pwa-192x192.png"
        alt="NutriSnap AI"
        className="w-16 h-16 rounded-2xl shadow-sm mb-4"
      />
      <h1 className="text-2xl font-bold">NutriSnap AI</h1>
      <p className="text-sm text-text-light mb-6">
        {mode === 'signin' ? 'Sign in to continue tracking' : 'Create your account'}
      </p>

      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-surface rounded-2xl p-5 shadow-sm border border-slate-100 space-y-4"
      >
        {error && (
          <div role="alert" className="bg-red-50 text-red-600 text-sm p-3 rounded-xl">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="auth-email" className="block text-xs font-medium text-text-light mb-1">
            Email
          </label>
          <input
            id="auth-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label htmlFor="auth-password" className="block text-xs font-medium text-text-light mb-1">
            Password
          </label>
          <input
            id="auth-password"
            type="password"
            required
            minLength={6}
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
            placeholder={mode === 'signin' ? 'Your password' : 'At least 6 characters'}
          />
        </div>

        <button
          type="submit"
          disabled={busy}
          className="w-full bg-primary text-white font-medium p-3 rounded-xl hover:bg-primary-dark transition disabled:opacity-50"
        >
          {busy ? 'Please wait…' : mode === 'signin' ? 'Sign In' : 'Create Account'}
        </button>

        <div className="flex items-center gap-3 text-xs text-text-light">
          <div className="h-px flex-1 bg-slate-200" />
          or
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={busy}
          className="w-full bg-background border border-slate-200 text-text font-medium p-3 rounded-xl text-sm hover:bg-slate-50 transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <span className="font-bold">G</span>
          Continue with Google
        </button>
      </form>

      <button
        type="button"
        onClick={toggleMode}
        className="mt-4 text-sm text-text-light hover:text-primary transition-colors"
      >
        {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
      </button>
    </div>
  );
}
