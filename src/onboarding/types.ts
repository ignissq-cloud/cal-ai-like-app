import type { ComponentType } from 'react';

/**
 * Everything onboarding learns about the user. Every field is optional —
 * users can skip anything — and the shape mirrors what a Firestore profile
 * document would look like later (`userId` + `version` live on the record).
 */
export interface OnboardingProfile {
  displayName?: string;
  age?: number;
  height?: number; // cm
  weight?: number; // kg — optional, never used for aggressive targets
  activityLevel?: string;
  primaryGoal?: string;
  motivation?: string;
  motivationNote?: string;
  foodLikes?: string[];
  foodDislikes?: string[];
  dietaryRestrictions?: string[];
  dietaryNotes?: string;
  allergies?: string;
  foodEnvironment?: string;
  schedule?: string;
  biggestObstacle?: string;
  obstacleNote?: string;
  previousAttempts?: string;
  attemptsNote?: string;
  existingDiet?: string;
  existingDietNote?: string;
  coachPreferences?: string[];
  commitmentLevel?: string;
  onboardingCompleted?: boolean;
}

/** Persisted onboarding state, keyed by Firebase uid in localStorage. */
export interface OnboardingRecord {
  version: 1;
  userId: string;
  /** 0-based index of the step the user is currently on. */
  step: number;
  profile: OnboardingProfile;
  updatedAt: string; // ISO timestamp
}

export interface CustomStepProps {
  profile: OnboardingProfile;
  update: (patch: Partial<OnboardingProfile>) => void;
  goToStep: (index: number) => void;
  /** Jump to a step by its config id (used by "Edit answers"). */
  goToStepById: (id: string) => void;
  stepIndex: number;
  totalSteps: number;
  /** Finishes onboarding: marks it complete, syncs, navigates to the dashboard. */
  complete: () => void;
  /** The definition of the step being rendered, so a bespoke screen can read its own config. */
  step: CustomStep;
}

export interface StepNote {
  key: keyof OnboardingProfile;
  label: string;
  placeholder?: string;
  when?: (p: OnboardingProfile) => boolean;
}

export interface InfoStep {
  kind: 'info';
  id: string;
  heading: string;
  /** Lines starting with "- " render as bullets. */
  body: string[];
  cta: string;
}

export interface TextStep {
  kind: 'text';
  id: string;
  question: string;
  hint?: string;
  key: keyof OnboardingProfile;
  placeholder?: string;
  skippable?: boolean;
}

export interface ChoiceStep {
  kind: 'question';
  id: string;
  question: string;
  hint?: string;
  key: keyof OnboardingProfile;
  options: string[];
  multiple?: boolean;
  allowCustom?: boolean;
  customPlaceholder?: string;
  notes?: StepNote[];
  skippable?: boolean;
}

export interface CustomStep {
  kind: 'custom';
  id: string;
  component: ComponentType<CustomStepProps>;
  canContinue?: (p: OnboardingProfile) => boolean;
  continueLabel?: string;
  skippable?: boolean;
  hideFooter?: boolean;
  hideProgress?: boolean;
  /** Renders no shell header at all — the screen draws its own top row. */
  hideHeader?: boolean;
  /** Optional screen-specific background class (design mockups may differ). */
  bgClass?: string;
  /**
   * Question payload. A bespoke question screen keeps its copy and options here
   * so they stay in the config, then renders them with its own design.
   */
  question?: string;
  hint?: string;
  key?: keyof OnboardingProfile;
  options?: string[];
  allowCustom?: boolean;
  customPlaceholder?: string;
  /**
   * Info-style copy for a bespoke screen that renders its own heading and body
   * (mirrors `InfoStep`, so the wording still lives in the config).
   */
  heading?: string;
  body?: string[];
}

export type StepDef = InfoStep | TextStep | ChoiceStep | CustomStep;
