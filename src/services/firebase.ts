import { initializeApp, type FirebaseApp } from 'firebase/app';

// Firebase web configuration from Vite env vars (.env — gitignored, never committed).
// Only Authentication is initialized here: no Analytics, Firestore, or Storage.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Fail fast with a clear message instead of an obscure auth error at runtime.
const missingEnv = (
  [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_STORAGE_BUCKET',
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    'VITE_FIREBASE_APP_ID',
  ] as const
).filter((name) => !import.meta.env[name]);

if (missingEnv.length > 0) {
  throw new Error(`Missing Firebase configuration in .env: ${missingEnv.join(', ')}`);
}

export const firebaseApp: FirebaseApp = initializeApp(firebaseConfig);
