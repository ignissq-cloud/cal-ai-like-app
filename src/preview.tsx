// TEMPORARY verification harness — NOT part of the app.
// Renders the real <OnboardingFlow /> with a mocked signed-in user so the
// onboarding screens can be screenshotted at the design viewport without
// Firebase credentials. Delete before hand-back.
//
// Query params:
//   step=N      seed the persisted step index
//   answered=1  seed a primaryGoal answer
//   phone=1     pin the body to the 390px design width
//   stats=1     overlay scrollHeight / innerHeight (fit check)
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import type { User } from 'firebase/auth';
import { AuthContext } from './auth/context';
import OnboardingFlow from './onboarding/OnboardingFlow';
import './index.css';

const params = new URLSearchParams(window.location.search);
const userId = 'preview-user';
const step = Number(params.get('step') ?? 0);
const answered = params.get('answered') === '1';

if (params.get('phone') === '1') {
  document.body.style.width = '390px';
}

localStorage.setItem(
  `nutrisnap:onboarding:v1:${userId}`,
  JSON.stringify({
    version: 1,
    userId,
    step: Number.isFinite(step) ? Math.max(0, Math.floor(step)) : 0,
    profile: answered ? { primaryGoal: 'I want to eat healthier' } : {},
    updatedAt: new Date().toISOString(),
  }),
);

if (params.get('stats') === '1') {
  window.setTimeout(() => {
    const box = document.createElement('div');
    box.style.cssText =
      'position:fixed;bottom:0;left:0;z-index:99;background:#fff;color:#000;font:12px monospace;padding:3px';
    box.textContent = `sh=${document.documentElement.scrollHeight} ih=${window.innerHeight}`;
    document.body.appendChild(box);
  }, 800);
}

const noop = async () => {};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthContext.Provider
      value={{
        user: { uid: userId } as unknown as User,
        loading: false,
        signUp: noop,
        signIn: noop,
        signInWithGoogle: noop,
        signOut: noop,
      }}
    >
      <MemoryRouter>
        <OnboardingFlow />
      </MemoryRouter>
    </AuthContext.Provider>
  </StrictMode>,
);
