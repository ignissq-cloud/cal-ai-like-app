import type { OnboardingProfile } from './types';

/**
 * Turns the user's actual answers into the reflection (screen 14) and the
 * personalized principles (screen 16). Everything is derived only from what
 * the user really told us — never invented claims.
 */

const truncate = (s: string, max = 140) =>
  s.trim().length > max ? `${s.trim().slice(0, max - 1).trimEnd()}…` : s.trim();

const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

/**
 * First-person -> second-person so answers read naturally when echoed back:
 * "I want to improve my nutrition" -> "you want to improve your nutrition".
 */
const asSecondPerson = (s: string): string => {
  const t = s
    .trim()
    .replace(/\bI['’]m\b/g, "you're")
    .replace(/\bI['’]ve\b/g, "you've")
    .replace(/\bI['’]ll\b/g, "you'll")
    .replace(/\bI['’]d\b/g, "you'd")
    .replace(/\bI\b/g, 'you')
    .replace(/\bmy\b/gi, 'your')
    .replace(/\bme\b/gi, 'you');
  return lower(t);
};

/** Same as asSecondPerson but safe to start a sentence with. */
const sentence = (s: string): string => {
  const t = asSecondPerson(s);
  return t.charAt(0).toUpperCase() + t.slice(1);
};

/** "apples, bananas and dates" */
const list = (items: string[]) =>
  items.length <= 1
    ? items.join('')
    : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;

const ACTIVITY_SENTENCES: Record<string, string> = {
  'Mostly sitting': 'Your days are mostly spent sitting.',
  'Some walking/activity': 'You get some walking or activity in.',
  'Regular exercise': 'You exercise regularly.',
  'Very active': 'You stay very active.',
  'It varies a lot': 'Your activity level varies a lot day to day.',
};

/** Reflection screen: plain sentences about the user, built only from real answers. */
export function buildReflection(p: OnboardingProfile): string[] {
  const out: string[] = [];
  const goal = p.primaryGoal?.trim();
  const obstacle = p.biggestObstacle?.trim();
  const motivation = p.motivation?.trim();

  if (goal && obstacle && /^I\b/.test(goal)) {
    // A first-person goal joins cleanly with the obstacle into one line.
    out.push(`${sentence(goal)}, but your biggest challenge is ${asSecondPerson(obstacle)}.`);
  } else {
    if (goal) out.push(`${sentence(goal)}.`);
    if (obstacle) out.push(`Your biggest challenge is ${asSecondPerson(obstacle)}.`);
  }

  if (motivation) {
    out.push(
      /^I\b/.test(motivation)
        ? `It matters to you because ${asSecondPerson(motivation)}.`
        : `You told me it matters: \u201C${truncate(motivation)}\u201D`,
    );
  }
  if (p.motivationNote?.trim()) out.push(`You added: \u201C${truncate(p.motivationNote)}\u201D`);

  const likes = (p.foodLikes ?? []).filter(Boolean);
  const dislikes = (p.foodDislikes ?? []).filter(Boolean);
  if (likes.length || dislikes.length) {
    let line = likes.length ? `You enjoy ${list(likes)}` : 'You know what you like';
    if (dislikes.length) line += `, and you\u2019d rather skip ${list(dislikes)}`;
    out.push(`${line}.`);
  }

  if (p.activityLevel) {
    out.push(ACTIVITY_SENTENCES[p.activityLevel] ?? `${sentence(p.activityLevel)}.`);
  }
  if (p.schedule?.trim()) out.push(`You described your days like this: \u201C${truncate(p.schedule)}\u201D`);
  if (p.foodEnvironment) out.push(`${sentence(p.foodEnvironment)}.`);

  const restrictions = (p.dietaryRestrictions ?? []).filter(Boolean);
  if (restrictions.length || p.allergies?.trim()) {
    let line = 'We\u2019ll always keep in mind';
    if (restrictions.length) line += ` ${list(restrictions)}`;
    if (p.allergies?.trim()) {
      line += `${restrictions.length ? ' \u2014 including' : ''} the allergy to ${truncate(p.allergies)}`;
    }
    out.push(`${line}.`);
  }

  if (p.existingDiet) {
    if (/^no\b/i.test(p.existingDiet)) {
      out.push("You\u2019re not following a specific plan right now, so we can build one around you.");
    } else if (p.existingDietNote?.trim()) {
      out.push(`You\u2019re already following a plan: \u201C${truncate(p.existingDietNote)}\u201D`);
    } else {
      out.push('You\u2019re already following a plan of your own.');
    }
  }

  if (p.previousAttempts) out.push(`${sentence(p.previousAttempts)}.`);
  if (p.attemptsNote?.trim()) out.push(`You said: \u201C${truncate(p.attemptsNote)}\u201D`);

  if (p.commitmentLevel) out.push(`${sentence(p.commitmentLevel)}.`);

  if (out.length === 0) {
    out.push('You haven\u2019t told me much yet \u2014 and that\u2019s fine. I\u2019ll learn as we go.');
  }
  return out.slice(0, 7);
}

/** The honest closing line of the reflection, based on what they actually said. */
export function buildReflectionClosing(p: OnboardingProfile): string {
  if (p.previousAttempts === "Yes, but I couldn't stick with it") {
    return "You\u2019ve tried before and it didn\u2019t stick, so we\u2019re not going to hand you something complicated. We\u2019ll build around your actual life.";
  }
  return "That\u2019s what I\u2019ll work with. We\u2019ll build around your actual life.";
}

/** 3–5 personalized coaching principles for screen 16. */
export function buildPrinciples(p: OnboardingProfile): string[] {
  const personalized: string[] = [];
  const likes = (p.foodLikes ?? []).filter(Boolean);
  const dislikes = (p.foodDislikes ?? []).filter(Boolean);
  const restrictions = (p.dietaryRestrictions ?? []).filter(Boolean);
  const env = p.foodEnvironment ?? '';

  // Safety-relevant facts first, then personalization.
  if (p.allergies?.trim() || restrictions.length) {
    const parts: string[] = [];
    if (restrictions.length) parts.push(list(restrictions.slice(0, 3)));
    if (p.allergies?.trim()) parts.push(`your allergy to ${truncate(p.allergies)}`);
    personalized.push(`Always respect ${parts.join(' and ')}.`);
  }
  if (likes.length) {
    personalized.push(`Start from foods you already enjoy — ${list(likes.slice(0, 3))}.`);
  }
  if (p.existingDiet && !/^no\b/i.test(p.existingDiet)) {
    personalized.push('Help you follow the plan you already have instead of replacing it.');
  }
  if (/family|someone else prepares/i.test(env)) {
    personalized.push('Work with the food you actually have — including what your family cooks.');
  } else if (/cook for myself/i.test(env)) {
    personalized.push('Keep suggestions realistic for the way you cook and eat now.');
  } else if (/school\/work|order food/i.test(env)) {
    personalized.push('Take your real setup into account — meals at school, work or ordered in.');
  } else if (env) {
    personalized.push(`Fit around how food actually works for you: ${lower(env)}.`);
  }
  if (p.schedule?.trim() || /sitting|active|exercise|walking/i.test(p.activityLevel ?? '')) {
    personalized.push('Fit recommendations around your schedule and your day.');
  }
  if (dislikes.length) {
    personalized.push(`Leave out what you don\u2019t like — ${list(dislikes.slice(0, 3))} won\u2019t be pushed on you.`);
  }
  if (p.biggestObstacle) {
    personalized.push(`Designed around your biggest hurdle: ${asSecondPerson(p.biggestObstacle)}.`);
  }
  if (/explor|one day/i.test(p.commitmentLevel ?? '')) {
    personalized.push('No pressure — we go at your own pace.');
  }

  // At most 4 personalized lines, so the non-negotiable promise always fits.
  const chosen = personalized.slice(0, 4);
  const fallbacks = [
    'Keep suggestions simple and something you can act on today.',
    'Learn from what works and adjust as we go.',
  ];
  let i = 0;
  while (chosen.length < 2 && i < fallbacks.length) chosen.push(fallbacks[i++]);
  chosen.push('Coach you without guilt or shame.');
  return chosen.slice(0, 5);
}
