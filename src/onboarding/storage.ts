import type { OnboardingProfile, OnboardingRecord } from './types';

/**
 * Onboarding persistence.
 *
 * Keyed per Firebase uid so each account keeps its own progress, and versioned
 * so we can migrate the same shape to Firestore for cross-device sync later.
 * Existing app data (logs, water, settings profile) keeps its own storage —
 * this does not touch it.
 */
const KEY_PREFIX = 'nutrisnap:onboarding:v1:';
export const ONBOARDING_VERSION = 1 as const;

export const onboardingKey = (userId: string) => `${KEY_PREFIX}${userId}`;

export function loadOnboarding(userId: string | null | undefined): OnboardingRecord | null {
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(onboardingKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<OnboardingRecord>;
    if (!parsed || typeof parsed !== 'object' || parsed.version !== ONBOARDING_VERSION) return null;
    if (parsed.userId !== userId) return null;

    const step =
      typeof parsed.step === 'number' && Number.isFinite(parsed.step)
        ? Math.max(0, Math.floor(parsed.step))
        : 0;
    const profile =
      parsed.profile && typeof parsed.profile === 'object' ? parsed.profile : {};

    return {
      version: ONBOARDING_VERSION,
      userId,
      step,
      profile: profile as OnboardingProfile,
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date(0).toISOString(),
    };
  } catch {
    // Corrupt JSON or unavailable storage — treat as "no progress yet".
    return null;
  }
}

export function saveOnboarding(record: OnboardingRecord): void {
  try {
    localStorage.setItem(onboardingKey(record.userId), JSON.stringify(record));
  } catch (err) {
    // Quota/private-mode failures must never break the flow.
    console.warn('Could not save onboarding progress', err);
  }
}

/** Read during render (localStorage is synchronous) so navigation always sees fresh state. */
export function useOnboardingRecord(userId: string | null | undefined): OnboardingRecord | null {
  return loadOnboarding(userId);
}

export const hasCompletedOnboarding = (record: OnboardingRecord | null): boolean =>
  !!record?.profile.onboardingCompleted;
