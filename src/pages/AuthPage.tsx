import { useState, type FormEvent } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { Mail, Lock, User, Eye, EyeOff, ArrowRight, Check } from 'lucide-react';
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';
import { AuthLoading } from '../auth/AuthContext';
import { useAuth } from '../auth/context';
import { useAppStore } from '../store';
import { firebaseApp } from '../services/firebase';

type Mode = 'signin' | 'signup';

export default function AuthPage() {
  const { user, loading, signIn, signUp, signInWithGoogle } = useAuth();
  const { profile, updateProfile } = useAppStore();

  const [mode, setMode] = useState<Mode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [busy, setBusy] = useState(false);

  // Session still restoring: keep the spinner instead of flashing the form.
  if (loading) return <AuthLoading />;
  // Signed in: continue to onboarding (name/gender/measurements) if not yet setup, else home.
  if (user) {
    const hasMeasurements = profile.height && profile.weight;
    return <Navigate to={hasMeasurements ? '/' : '/onboarding/about'} replace />;
  }

  const showError = (err: unknown) => {
    setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    setSuccessMessage('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setBusy(true);
    try {
      if (mode === 'signin') {
        await signIn(email.trim(), password);
      } else {
        await signUp(email.trim(), password);
        if (name.trim()) {
          updateProfile({ ...profile, displayName: name.trim() });
        }
      }
    } catch (err) {
      showError(err);
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    setSuccessMessage('');
    setBusy(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      showError(err);
    } finally {
      setBusy(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setError('Please enter your email address in the field above first.');
      setSuccessMessage('');
      return;
    }
    setError('');
    try {
      const auth = getAuth(firebaseApp);
      await sendPasswordResetEmail(auth, email.trim());
      setSuccessMessage(`Password reset link sent to ${email.trim()}. Check your inbox.`);
    } catch (err) {
      showError(err);
    }
  };

  const switchMode = (newMode: Mode) => {
    setMode(newMode);
    setError('');
    setSuccessMessage('');
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col justify-between p-5 pt-8 pb-8 font-sans text-gray-900 max-w-md mx-auto">
      <div>
        {/* Brand Logo Header */}
        <div className="flex items-center justify-center gap-2.5 mb-6">
          <div className="w-11 h-11 rounded-2xl bg-[#00A86B] flex items-center justify-center shadow-xs">
            <div className="w-5 h-5 rounded-full border-[3.5px] border-white" />
          </div>
          <div className="flex items-center text-2xl font-bold tracking-tight">
            <span className="text-gray-900">NutriSnap</span>
            <span className="text-[#00A86B] ml-1">AI</span>
          </div>
        </div>

        {/* Title & Subtitle */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            {mode === 'signin' ? 'Welcome back' : 'Eat well. Feel better.'}
          </h1>
          <p className="text-sm text-gray-400 font-normal leading-relaxed mt-2 max-w-xs mx-auto">
            {mode === 'signin' ? (
              <>
                A little progress, every day.
                <br />
                Sign in to continue your nutrition journey.
              </>
            ) : (
              <>
                Create an account to track your meals,
                <br />
                build habits and see your progress.
              </>
            )}
          </p>
        </div>

        {/* Toggle Segmented Control */}
        <div className="bg-[#ECEFF3] p-1.5 rounded-2xl flex max-w-sm w-full mx-auto mb-6">
          <button
            type="button"
            onClick={() => switchMode('signin')}
            className={`py-3 px-4 rounded-xl flex-1 text-center text-sm font-bold transition-all cursor-pointer ${
              mode === 'signin'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-400 hover:text-gray-700'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => switchMode('signup')}
            className={`py-3 px-4 rounded-xl flex-1 text-center text-sm font-bold transition-all cursor-pointer ${
              mode === 'signup'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-400 hover:text-gray-700'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Feedback Messages */}
        {error && (
          <div
            role="alert"
            className="bg-red-50 text-red-600 text-xs font-medium p-3.5 rounded-2xl mb-4 border border-red-100"
          >
            {error}
          </div>
        )}

        {successMessage && (
          <div
            role="status"
            className="bg-green-50 text-green-700 text-xs font-medium p-3.5 rounded-2xl mb-4 border border-green-100 flex items-center gap-2"
          >
            <Check size={14} className="stroke-[2.5]" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="bg-white rounded-3xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-gray-100 mb-2">
            {/* Field: Name (Only in Sign Up) */}
            {mode === 'signup' && (
              <>
                <div className="flex items-start gap-3">
                  <User size={18} className="text-gray-400 shrink-0 mt-2" />
                  <div className="flex-1 min-w-0">
                    <label
                      htmlFor="auth-name"
                      className="block text-xs font-medium text-gray-400 leading-tight"
                    >
                      Your name
                    </label>
                    <input
                      id="auth-name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="What should we call you?"
                      className="w-full text-sm font-medium text-gray-900 placeholder:text-gray-400 bg-transparent outline-none mt-1"
                    />
                  </div>
                </div>
                <div className="border-t border-gray-100 my-3.5 ml-7" />
              </>
            )}

            {/* Field: Email */}
            <div className="flex items-start gap-3">
              <Mail size={18} className="text-gray-400 shrink-0 mt-2" />
              <div className="flex-1 min-w-0">
                <label
                  htmlFor="auth-email"
                  className="block text-xs font-medium text-gray-400 leading-tight"
                >
                  Email address
                </label>
                <input
                  id="auth-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full text-sm font-medium text-gray-900 placeholder:text-gray-400 bg-transparent outline-none mt-1"
                />
              </div>
            </div>

            <div className="border-t border-gray-100 my-3.5 ml-7" />

            {/* Field: Password */}
            <div className="flex items-start gap-3">
              <Lock size={18} className="text-gray-400 shrink-0 mt-2" />
              <div className="flex-1 min-w-0">
                <label
                  htmlFor="auth-password"
                  className="block text-xs font-medium text-gray-400 leading-tight"
                >
                  Password
                </label>
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={mode === 'signup' ? 8 : 6}
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'signin' ? 'Enter your password' : 'Create a password'}
                  className="w-full text-sm font-medium text-gray-900 placeholder:text-gray-400 bg-transparent outline-none mt-1"
                />
              </div>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 cursor-pointer mt-1"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Helper / Forgot Password */}
          {mode === 'signup' ? (
            <p className="text-xs text-gray-400 font-normal px-1 mb-5">
              Use at least 8 characters, including a number.
            </p>
          ) : (
            <div className="text-right mb-5 mt-2">
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-xs font-semibold text-gray-800 hover:text-black transition-colors cursor-pointer"
              >
                Forgot password?
              </button>
            </div>
          )}

          {/* Primary CTA Button */}
          <button
            type="submit"
            disabled={busy}
            className="w-full py-4 rounded-2xl bg-[#212121] hover:bg-black active:scale-[0.98] transition-all text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm mb-6 cursor-pointer disabled:opacity-50"
          >
            <span>{busy ? 'Please wait...' : mode === 'signin' ? 'Sign In' : 'Create Account'}</span>
            {!busy && <ArrowRight size={16} className="stroke-[2.5]" />}
          </button>
        </form>

        {/* Divider */}
        <div className="relative flex py-2 items-center mb-5">
          <div className="flex-grow border-t border-gray-200/80" />
          <span className="flex-shrink-0 mx-3 text-gray-400 text-xs font-medium">
            or continue with
          </span>
          <div className="flex-grow border-t border-gray-200/80" />
        </div>

        {/* Google Sign In Button */}
        <button
          type="button"
          onClick={handleGoogle}
          disabled={busy}
          className="w-full py-3.5 px-4 rounded-2xl bg-white border border-gray-200/90 hover:bg-gray-50 active:scale-[0.98] transition-all text-gray-800 font-bold text-sm flex items-center justify-center gap-2.5 shadow-xs mb-6 cursor-pointer disabled:opacity-50"
        >
          <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>

        {/* Continue as Guest */}
        <Link
          to="/onboarding/about"
          className="text-xs font-bold text-gray-800 hover:text-black flex items-center justify-center gap-1.5 mb-8 transition-colors"
        >
          <span>Continue as Guest</span>
          <ArrowRight size={14} className="stroke-[2.5]" />
        </Link>
      </div>

      {/* Footer Terms */}
      <p className="text-[11px] text-gray-400 text-center leading-relaxed max-w-xs mx-auto">
        {mode === 'signin' ? (
          <>
            By continuing, you agree to our{' '}
            <span className="text-gray-600 font-medium">Terms of Service</span> and{' '}
            <span className="text-gray-600 font-medium">Privacy Policy</span>.
          </>
        ) : (
          <>
            By creating an account, you agree to our{' '}
            <span className="text-gray-600 font-medium">Terms of Service</span> and{' '}
            <span className="text-gray-600 font-medium">Privacy Policy</span>.
          </>
        )}
      </p>
    </div>
  );
}