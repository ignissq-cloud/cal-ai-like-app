import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { firebaseApp } from '../services/firebase';
import { AuthContext, type AuthContextValue } from './context';

const auth = getAuth(firebaseApp);
const googleProvider = new GoogleAuthProvider();

// Map Firebase error codes to plain-language messages so raw codes/JSON
// never reach the UI.
const FRIENDLY_ERRORS: Record<string, string> = {
  'auth/email-already-in-use': 'That email is already registered. Sign in instead.',
  'auth/invalid-email': 'That email address does not look valid.',
  'auth/missing-email': 'Please enter your email address.',
  'auth/missing-password': 'Please enter your password.',
  'auth/weak-password': 'Password should be at least 6 characters.',
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/user-not-found': 'Incorrect email or password.',
  'auth/wrong-password': 'Incorrect email or password.',
  'auth/too-many-requests': 'Too many attempts. Wait a moment and try again.',
  'auth/popup-closed-by-user': 'Google sign-in was cancelled before it finished.',
  'auth/popup-blocked': 'Your browser blocked the Google sign-in window. Allow popups and try again.',
  'auth/network-request-failed': 'Could not reach the sign-in service. Check your connection and try again.',
};

// Runs an auth action, logging the real error for debugging and rethrowing a
// user-friendly Error for the UI.
async function run(action: () => Promise<unknown>): Promise<void> {
  try {
    await action();
  } catch (err) {
    const code = (err as { code?: string } | null)?.code;
    console.warn('Auth action failed:', typeof code === 'string' ? code : err);
    throw new Error(
      (typeof code === 'string' && FRIENDLY_ERRORS[code]) ||
        'Authentication failed. Please try again.',
    );
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthContextValue['user']>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fires immediately with the restored session (Firebase persists it in
    // localStorage by default) and on every sign-in/sign-out.
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      signUp: (email, password) =>
        run(() => createUserWithEmailAndPassword(auth, email, password)),
      signIn: (email, password) =>
        run(() => signInWithEmailAndPassword(auth, email, password)),
      signInWithGoogle: () => run(() => signInWithPopup(auth, googleProvider)),
      signOut: () => run(() => firebaseSignOut(auth)),
    }),
    [user, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** Full-screen spinner shown while the auth session is being restored. */
export function AuthLoading() {
  return (
    <div
      className="min-h-screen bg-background flex items-center justify-center"
      role="status"
      aria-label="Loading"
    >
      <div className="w-10 h-10 border-4 border-slate-200 border-t-primary rounded-full animate-spin" />
    </div>
  );
}
