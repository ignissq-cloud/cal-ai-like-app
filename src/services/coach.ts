export interface OnboardingProfile {
  displayName?: string;
  primaryGoal?: string;
  userGoals?: string[];
  dietaryRestrictions?: string[];
  allergies?: string;
  activityLevel?: string;
  [key: string]: unknown;
}

export interface CoachMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Separate from the food-analysis service (/api/analyze): this is the
 * personalized onboarding coach chat. The profile travels with every request
 * so replies are grounded in the user's own onboarding answers.
 */
export async function askCoach(
  prompt: string,
  profile: OnboardingProfile,
  history: CoachMessage[] = [],
): Promise<string> {
  let response: Response;
  try {
    response = await fetch('/api/coach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, profile, history: history.slice(-6) }),
    });
  } catch {
    throw new Error('Could not reach the coach. Check your connection and try again.');
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data && typeof data.error === 'string' ? data.error.trim() : '';
    if (!message) console.warn('Coach request failed:', response.status, data);
    throw new Error(message || 'The coach hit a problem. Please try again.');
  }

  const reply = data && typeof data.reply === 'string' ? data.reply.trim() : '';
  if (!reply) throw new Error('The coach sent an empty response. Please try again.');
  return reply;
}
