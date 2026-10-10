import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useAuth } from '../auth/context';
import { useAppStore } from '../store';
import { ONBOARDING_VERSION, saveOnboarding, useOnboardingRecord } from './storage';
import { STEPS, TOTAL_STEPS } from './steps';
import type { ChoiceStep, InfoStep, OnboardingProfile, TextStep } from './types';
import { OptionButton, QuestionTitle, inputCls, primaryBtn } from './ui';

/** Mirror onboarding answers into the app profile so analysis/dashboard can use them. */
function syncToAppProfile(p: OnboardingProfile): void {
  const { profile: existing, updateProfile } = useAppStore.getState();
  const dietary = [
    (p.dietaryRestrictions ?? [])
      .filter((r) => r !== 'None' && r !== "I'm not sure")
      .join(', '),
    p.allergies ? `Allergies: ${p.allergies}` : '',
    p.dietaryNotes ?? '',
  ]
    .filter(Boolean)
    .join(' · ');

  updateProfile({
    ...existing,
    displayName: p.displayName ?? existing.displayName,
    age: p.age != null ? String(p.age) : existing.age,
    height: p.height != null ? String(p.height) : existing.height,
    weight: p.weight != null ? String(p.weight) : existing.weight,
    activityLevel: p.activityLevel ?? existing.activityLevel,
    dietaryPreferences: dietary || existing.dietaryPreferences,
  });
}

function hasAnswer(step: TextStep | ChoiceStep, profile: OnboardingProfile): boolean {
  const value = profile[step.key];
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value === 'string') return value.trim().length > 0;
  return false;
}

// --- Step renderers ---------------------------------------------------------

function InfoView({ step }: { step: InfoStep }) {
  const segments: { type: 'p' | 'ul'; lines: string[] }[] = [];
  for (const line of step.body) {
    if (line.startsWith('- ')) {
      const last = segments[segments.length - 1];
      if (last?.type === 'ul') last.lines.push(line.slice(2));
      else segments.push({ type: 'ul', lines: [line.slice(2)] });
    } else {
      segments.push({ type: 'p', lines: [line] });
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold leading-snug">{step.heading}</h1>
      {segments.map((seg, i) =>
        seg.type === 'p' ? (
          <p key={i} className="text-sm text-text-light leading-relaxed">
            {seg.lines.join(' ')}
          </p>
        ) : (
          <ul key={i} className="space-y-2">
            {seg.lines.map((item) => (
              <li key={item} className="flex gap-2 text-sm text-text">
                <span className="text-primary font-bold">•</span>
                {item}
              </li>
            ))}
          </ul>
        ),
      )}
    </div>
  );
}

function TextView({
  step,
  profile,
  update,
}: {
  step: TextStep;
  profile: OnboardingProfile;
  update: (patch: Partial<OnboardingProfile>) => void;
}) {
  const value = typeof profile[step.key] === 'string' ? (profile[step.key] as string) : '';
  return (
    <div>
      <QuestionTitle title={step.question} hint={step.hint} />
      <input
        type="text"
        value={value}
        onChange={(e) => update({ [step.key]: e.target.value } as Partial<OnboardingProfile>)}
        placeholder={step.placeholder}
        className={inputCls}
        autoFocus
      />
    </div>
  );
}

function QuestionView({
  step,
  profile,
  update,
}: {
  step: ChoiceStep;
  profile: OnboardingProfile;
  update: (patch: Partial<OnboardingProfile>) => void;
}) {
  const raw = profile[step.key];
  const selected = Array.isArray(raw)
    ? (raw as string[])
    : typeof raw === 'string' && raw
      ? [raw]
      : [];
  const [custom, setCustom] = useState(
    step.allowCustom && !step.multiple && typeof raw === 'string' && raw && !step.options.includes(raw)
      ? raw
      : '',
  );

  const pick = (option: string) => {
    if (step.multiple) {
      const current = Array.isArray(raw) ? (raw as string[]) : [];
      let next: string[];
      if (current.includes(option)) {
        next = current.filter((v) => v !== option);
      } else if (option === 'None') {
        next = ['None'];
      } else {
        next = [...current.filter((v) => v !== 'None'), option];
      }
      update({ [step.key]: next } as Partial<OnboardingProfile>);
    } else {
      const isSame = selected[0] === option;
      setCustom('');
      update({ [step.key]: isSame ? undefined : option } as Partial<OnboardingProfile>);
    }
  };

  const typeCustom = (text: string) => {
    setCustom(text);
    update({ [step.key]: text.trim() ? text : undefined } as Partial<OnboardingProfile>);
  };

  const activeNotes = (step.notes ?? []).filter((note) => !note.when || note.when(profile));

  return (
    <div className="space-y-4">
      <QuestionTitle title={step.question} hint={step.hint} />

      <div className="space-y-2">
        {step.options.map((option) => (
          <OptionButton
            key={option}
            label={option}
            multiple={step.multiple}
            selected={selected.includes(option)}
            onClick={() => pick(option)}
          />
        ))}
      </div>

      {step.allowCustom && !step.multiple && (
        <div>
          <input
            type="text"
            value={custom}
            onChange={(e) => typeCustom(e.target.value)}
            placeholder={step.customPlaceholder ?? 'Your own answer…'}
            className={inputCls}
          />
        </div>
      )}

      {activeNotes.map((note) => {
        const value = typeof profile[note.key] === 'string' ? (profile[note.key] as string) : '';
        return (
          <div key={String(note.key)}>
            <label htmlFor={`note-${String(note.key)}`} className="block text-xs font-medium text-text-light mb-1">
              {note.label}
            </label>
            <input
              id={`note-${String(note.key)}`}
              type="text"
              value={value}
              onChange={(e) => update({ [note.key]: e.target.value } as Partial<OnboardingProfile>)}
              placeholder={note.placeholder}
              className={inputCls}
            />
          </div>
        );
      })}
    </div>
  );
}

// --- Shell ------------------------------------------------------------------

export default function OnboardingFlow() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const record = useOnboardingRecord(user?.uid);

  const [stepIndex, setStepIndex] = useState(() =>
    Math.min(Math.max(record?.step ?? 0, 0), STEPS.length - 1),
  );
  const [profile, setProfile] = useState<OnboardingProfile>(() => record?.profile ?? {});

  // Persist after every change so a refresh/reload never loses progress.
  useEffect(() => {
    if (!user?.uid) return;
    saveOnboarding({
      version: ONBOARDING_VERSION,
      userId: user.uid,
      step: stepIndex,
      profile,
      updatedAt: new Date().toISOString(),
    });
  }, [user?.uid, stepIndex, profile]);

  // Each question starts at the top.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [stepIndex]);

  if (!user) return null;

  const step = STEPS[stepIndex] ?? STEPS[0];

  const update = (patch: Partial<OnboardingProfile>) =>
    setProfile((prev) => ({ ...prev, ...patch }));
  const goToStep = (index: number) => setStepIndex(Math.min(Math.max(index, 0), STEPS.length - 1));
  const goToStepById = (id: string) => {
    const index = STEPS.findIndex((s) => s.id === id);
    if (index >= 0) setStepIndex(index);
  };
  const next = () => setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));

  const complete = () => {
    const finalProfile: OnboardingProfile = { ...profile, onboardingCompleted: true };
    saveOnboarding({
      version: ONBOARDING_VERSION,
      userId: user.uid,
      step: STEPS.length - 1,
      profile: finalProfile,
      updatedAt: new Date().toISOString(),
    });
    syncToAppProfile(finalProfile);
    navigate('/', { replace: true });
  };

  const canContinue =
    step.kind === 'info'
      ? true
      : step.kind === 'custom'
        ? (step.canContinue?.(profile) ?? true)
        : hasAnswer(step, profile);
  const skippable = step.kind !== 'info' && !!step.skippable;
  const continueLabel = step.kind === 'custom' ? (step.continueLabel ?? 'Continue') : 'Continue';
  const hideFooter = step.kind === 'custom' && !!step.hideFooter;
  const hideHeader = step.kind === 'custom' && !!step.hideHeader;
  const showProgress = step.kind !== 'info' && !(step.kind === 'custom' && step.hideProgress);
  // Skip rendering an empty header row (no back button, no progress bar).
  const showHeader = !hideHeader && (stepIndex > 0 || showProgress);
  const shellBg = step.kind === 'custom' && step.bgClass ? ` ${step.bgClass}` : '';

  return (
    <div
      className={`min-h-screen max-w-md mx-auto flex flex-col p-5 pb-6 font-sans text-text${shellBg}`}
    >
      {showHeader && (
        <header className="flex items-center gap-3 mb-5">
          {stepIndex > 0 && (
            <button
              type="button"
              onClick={() => goToStep(stepIndex - 1)}
              aria-label="Go back"
              className="p-1 -ml-1 text-text-light hover:text-text"
            >
              <ChevronLeft size={22} />
            </button>
          )}
          {showProgress && (
            <div className="flex items-center gap-3 flex-1">
              <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${((stepIndex + 1) / TOTAL_STEPS) * 100}%` }}
                />
              </div>
              <span className="text-xs text-text-light whitespace-nowrap">
                {stepIndex + 1} of {TOTAL_STEPS}
              </span>
            </div>
          )}
        </header>
      )}

      <main className="flex-1">
        {step.kind === 'info' && <InfoView step={step} />}
        {step.kind === 'text' && <TextView step={step} profile={profile} update={update} />}
        {step.kind === 'question' && <QuestionView step={step} profile={profile} update={update} />}
        {step.kind === 'custom' && (
          <step.component
            step={step}
            profile={profile}
            update={update}
            goToStep={goToStep}
            goToStepById={goToStepById}
            stepIndex={stepIndex}
            totalSteps={TOTAL_STEPS}
            complete={complete}
          />
        )}
      </main>

      {!hideFooter && (
        <footer className="sticky bottom-0 bg-background/95 backdrop-blur border-t border-slate-100 mt-6 pt-4">
          {step.kind === 'info' ? (
            <button type="button" onClick={next} className={primaryBtn}>
              {step.cta}
            </button>
          ) : (
            <>
              <button type="button" onClick={next} disabled={!canContinue} className={primaryBtn}>
                {continueLabel}
              </button>
              {skippable && (
                <div className="text-center mt-3">
                  <button
                    type="button"
                    onClick={next}
                    className="text-sm text-text-light hover:text-primary"
                  >
                    Skip for now
                  </button>
                </div>
              )}
            </>
          )}
        </footer>
      )}
    </div>
  );
}
