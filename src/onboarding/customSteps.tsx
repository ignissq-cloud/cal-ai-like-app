import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowRight, Check, ChevronLeft, Footprints, Heart, Layers, Lightbulb, Plus, Sun, Target, Utensils, UtensilsCrossed, Zap, type LucideIcon } from 'lucide-react';
import type { CustomStepProps, OnboardingProfile } from './types';
import { buildPrinciples, buildReflection, buildReflectionClosing } from './summary';
import { askCoach, type CoachMessage } from '../services/coach';
import { LabeledInput, QuestionTitle, inputCls, primaryBtn } from './ui';

// --- Screen transitions ------------------------------------------------------
// Screens 1 and 2 are bespoke designs, so they animate themselves: content
// rises in on mount (`onb-rise`, staggered with an inline animation-delay) and
// fades out (`onb-exit`) just before the shell swaps to the next step. The
// keyframes live in `index.css`; every class below is written with Tailwind's
// `motion-safe:` variant so reduced-motion users get static screens and no
// exit delay.

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Fades the current screen out, then advances. Reduced motion advances at once. */
function useStepAdvance(goToStep: (index: number) => void, stepIndex: number) {
  const [leaving, setLeaving] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  // Never leave a pending navigation behind if the screen unmounts.
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const advance = () => {
    if (timer.current !== undefined) return; // ignore repeat taps mid-exit
    if (prefersReducedMotion()) {
      goToStep(stepIndex + 1);
      return;
    }
    setLeaving(true);
    timer.current = window.setTimeout(() => goToStep(stepIndex + 1), 180);
  };

  return { leaving, advance };
}

// --- Screen 1: welcome ------------------------------------------------------
// Recreated from `onboarding screens/first onboarding screen.png`. The mockup
// uses its own brown palette, so those colours are scoped to this screen only
// and the rest of the app keeps the emerald primary.

const WELCOME_CARDS = [
  { icon: Heart, title: "What's stopping you", text: 'Tell us what holds you back' },
  { icon: Target, title: "What's your goal", text: 'Share what you want to achieve' },
  { icon: UtensilsCrossed, title: 'How you eat', text: 'Describe your current eating habits' },
];

function WelcomeStep({ stepIndex, goToStep }: CustomStepProps) {
  // Same navigation the shell's Continue button had: advance to the next screen.
  const { leaving, advance } = useStepAdvance(goToStep, stepIndex);

  return (
    // min-height fills the space the shell leaves (its p-5 top + pb-6 bottom
    // padding = 44px) so the CTA stays anchored at the bottom like the design.
    <div
      className={`flex flex-col min-h-[calc(100dvh_-_44px)] px-2 pb-[17px]${
        leaving ? ' motion-safe:animate-[onb-exit_180ms_ease-in_backwards]' : ''
      }`}
    >
      {/* No negative offset: the shell's 20px top padding is the breathing room
          (the mockup's 14px gap read as too tight against the top edge). */}
      <div className="flex justify-end motion-safe:animate-[onb-rise_400ms_ease-out_backwards]">
        <button
          type="button"
          onClick={advance}
          className="inline-flex items-center h-7 px-[17px] mr-[27px] rounded-full bg-surface text-sm font-medium text-[#1a1a1a] hover:bg-slate-50 transition motion-safe:active:scale-95"
        >
          Skip
        </button>
      </div>

      <ul className="mt-6 space-y-5">
        {WELCOME_CARDS.map(({ icon: Icon, title, text }, i) => (
          <li
            key={title}
            style={{ animationDelay: `${60 + i * 55}ms` }}
            className="bg-surface rounded-[20px] p-5 motion-safe:animate-[onb-rise_400ms_ease-out_backwards]"
          >
            <Icon size={26} className="text-[#1a1a1a]" aria-hidden="true" />
            <p className="mt-2 text-base font-semibold text-[#5e2700]">{title}</p>
            <p className="mt-2 text-sm text-[#8a8a8c]">{text}</p>
          </li>
        ))}
      </ul>

      <div
        style={{ animationDelay: '230ms' }}
        className="mt-14 text-center px-2 motion-safe:animate-[onb-rise_400ms_ease-out_backwards]"
      >
        <h1 className="text-2xl font-bold text-[#5e2700]">Build for you</h1>
        <p className="mt-3 text-sm text-[#8a8a8c]">lets build something especially for you.</p>
      </div>

      {/* Flexible spacer keeps the CTA and page dots pinned to the bottom. */}
      <div className="flex-1 min-h-6" />

      <button
        type="button"
        onClick={advance}
        style={{ animationDelay: '280ms' }}
        className="w-full rounded-full bg-[#5e2700] p-3.5 text-base font-medium text-white hover:bg-[#4a1f00] transition motion-safe:animate-[onb-rise_400ms_ease-out_backwards] motion-safe:active:scale-[0.98]"
      >
        Continue
      </button>

      <div
        style={{ animationDelay: '320ms' }}
        className="mt-6 flex justify-center gap-1 motion-safe:animate-[onb-rise_400ms_ease-out_backwards]"
        aria-hidden="true"
      >
        <span className="w-2 h-2 rounded-full bg-[#5e2700]" />
        <span className="w-2 h-2 rounded-full bg-[#c0c0c0]" />
        <span className="w-2 h-2 rounded-full bg-[#c0c0c0]" />
      </div>
    </div>
  );
}

// --- Screen 2: what brings you here ------------------------------------------
// Recreated from `onboarding screens/second onboarding screen.png`. The step's
// question, options and validation stay in `steps.ts` — this component owns the
// design, its animations and the screen's own chrome (back button, Skip, dots).

/** The config option that reveals the free-form answer field. */
const FREE_FORM_OPTION = 'Something else';

function GoalStep({ profile, update, goToStep, stepIndex, step }: CustomStepProps) {
  const key = step.key ?? 'primaryGoal';
  const options = step.options ?? [];
  const raw = profile[key];
  const selected = typeof raw === 'string' ? raw : '';

  // Same state handling the old question view had: one typed answer, cleared
  // as soon as a listed option is picked.
  const [custom, setCustom] = useState(
    step.allowCustom && typeof raw === 'string' && raw && !options.includes(raw) ? raw : '',
  );
  const [fieldOpen, setFieldOpen] = useState(false);
  const { leaving, advance: runExit } = useStepAdvance(goToStep, stepIndex);
  const inputRef = useRef<HTMLInputElement>(null);

  const showField = fieldOpen || custom.length > 0;
  const answered = selected.trim().length > 0;
  const advance = () => {
    if (answered) runExit();
  };

  const pick = (option: string) => {
    const isSame = selected === option;
    setCustom('');
    setFieldOpen(false);
    update({ [key]: isSame ? undefined : option } as Partial<OnboardingProfile>);
  };

  const typeCustom = (text: string) => {
    setCustom(text);
    update({ [key]: text.trim() ? text : undefined } as Partial<OnboardingProfile>);
  };

  const toggleField = () => {
    if (showField && !custom) {
      // Collapsing a field that was never typed in drops its placeholder answer.
      setFieldOpen(false);
      if (selected === FREE_FORM_OPTION) update({ [key]: undefined } as Partial<OnboardingProfile>);
      return;
    }
    if (!showField) {
      setFieldOpen(true);
      if (!selected) update({ [key]: FREE_FORM_OPTION } as Partial<OnboardingProfile>);
    }
    window.requestAnimationFrame(() => inputRef.current?.focus());
  };

  const cards = options.filter((option) => option !== FREE_FORM_OPTION);

  return (
    <div
      className={`flex flex-col min-h-[calc(100dvh_-_44px)] px-2 pb-[33px]${
        leaving ? ' motion-safe:animate-[onb-exit_180ms_ease-in_backwards]' : ''
      }`}
    >
      {/* Top row: the mockup's Skip pill plus the flow's back navigation. The
          shell's 20px top padding is left intact for breathing room. */}
      <div className="flex items-center justify-between motion-safe:animate-[onb-rise_400ms_ease-out_backwards]">
        <button
          type="button"
          onClick={() => goToStep(stepIndex - 1)}
          aria-label="Go back"
          className="-ml-1 p-1 rounded-full text-[#5e2700]/60 hover:text-[#5e2700] hover:bg-white transition motion-safe:active:scale-90"
        >
          <ChevronLeft size={22} />
        </button>
        <button
          type="button"
          onClick={advance}
          disabled={!answered}
          className="h-9 -mr-1 px-4 rounded-full bg-surface text-sm font-medium text-[#5e2700] shadow-[0_2px_6px_rgba(94,39,0,0.14)] transition disabled:opacity-40 disabled:cursor-not-allowed motion-safe:active:scale-95"
        >
          Skip
        </button>
      </div>

      <h2
        style={{ animationDelay: '50ms' }}
        className="mt-2 text-center text-[25px] leading-[34px] font-bold text-[#5e2700] motion-safe:animate-[onb-rise_400ms_ease-out_backwards]"
      >
        {step.question}
      </h2>

      {step.hint && (
        <p
          style={{ animationDelay: '90ms' }}
          className="mt-2.5 mx-auto max-w-[220px] text-center text-sm leading-[21px] text-[#8a8a8c] motion-safe:animate-[onb-rise_400ms_ease-out_backwards]"
        >
          {step.hint}
        </p>
      )}

      <div className="mt-1.5 space-y-2.5">
        {cards.map((option, i) => (
          <button
            key={option}
            type="button"
            onClick={() => pick(option)}
            aria-pressed={selected === option}
            style={{ animationDelay: `${120 + i * 40}ms` }}
            className="w-full text-left flex items-center justify-between gap-3 px-4 py-[13px] rounded-2xl bg-surface text-[15px] leading-5 text-[#3d2000] shadow-[0_2px_6px_rgba(94,39,0,0.10)] transition motion-safe:animate-[onb-rise_400ms_ease-out_backwards] motion-safe:hover:-translate-y-px motion-safe:hover:shadow-[0_5px_12px_rgba(94,39,0,0.16)] motion-safe:active:scale-[0.99]"
          >
            <span>{option}</span>
            <span
              key={selected === option ? 'selected' : 'idle'}
              aria-hidden="true"
              className={`shrink-0 w-6 h-6 rounded-full motion-safe:animate-[onb-pop_260ms_ease-out_backwards] ${
                selected === option ? 'bg-[#5e2700]' : 'bg-[#d6c9bf]'
              }`}
            />
          </button>
        ))}
      </div>

      <div
        style={{ animationDelay: '350ms' }}
        className="mt-6 flex items-center gap-3 motion-safe:animate-[onb-rise_400ms_ease-out_backwards]"
      >
        <span className="flex-1 h-px bg-[#ebe7e5]" />
        <span className="text-xs leading-4 text-[#c0b0a8]">or</span>
        <span className="flex-1 h-px bg-[#ebe7e5]" />
      </div>

      <div
        style={{ animationDelay: '385ms' }}
        className="mt-2 motion-safe:animate-[onb-rise_400ms_ease-out_backwards]"
      >
        <button
          type="button"
          onClick={toggleField}
          aria-expanded={showField}
          className="w-full flex items-center justify-between gap-3 px-4 py-[14px] rounded-2xl bg-[#5e2700] text-left text-[15px] leading-5 font-medium text-white transition hover:bg-[#6a2e00] motion-safe:active:scale-[0.99]"
        >
          <span>{FREE_FORM_OPTION}</span>
          <span
            aria-hidden="true"
            className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition motion-safe:duration-200 ${
              showField ? 'bg-white/25 motion-safe:rotate-45' : 'bg-white/15'
            }`}
          >
            <Plus size={16} strokeWidth={2.25} />
          </span>
        </button>

        {showField && (
          <input
            ref={inputRef}
            type="text"
            value={custom}
            onChange={(e) => typeCustom(e.target.value)}
            placeholder={step.customPlaceholder ?? 'Your own answer…'}
            aria-label="Your own answer"
            className="mt-2 w-full bg-surface rounded-2xl px-4 py-3.5 text-[15px] leading-5 text-[#3d2000] placeholder:text-[#b0a8a0] border border-[#e8e0db] focus:outline-none focus:border-[#5e2700] transition-colors motion-safe:animate-[onb-rise_300ms_ease-out_backwards]"
          />
        )}
      </div>

      <p
        style={{ animationDelay: '415ms' }}
        className="mt-1 text-center text-sm leading-5 text-[#b0a8a0] motion-safe:animate-[onb-rise_400ms_ease-out_backwards]"
      >
        You can always change this later
      </p>

      {/* Flexible spacer keeps the CTA and page dots pinned to the bottom. */}
      <div className="flex-1 min-h-6" />

      <button
        type="button"
        onClick={advance}
        disabled={!answered}
        style={{ animationDelay: '200ms' }}
        className="w-full h-14 rounded-full bg-[#5e2700] text-base font-semibold text-white shadow-[0_8px_20px_rgba(94,39,0,0.22)] transition hover:bg-[#4a1f00] disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none motion-safe:animate-[onb-rise_400ms_ease-out_backwards] motion-safe:active:scale-[0.98]"
      >
        Continue
      </button>

      <div
        style={{ animationDelay: '240ms' }}
        className="mt-6 flex items-center justify-center gap-1.5 motion-safe:animate-[onb-rise_400ms_ease-out_backwards]"
        aria-hidden="true"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-[#c0c0c0]" />
        <span className="w-2 h-2 rounded-full bg-[#5e2700]" />
        <span className="w-1.5 h-1.5 rounded-full bg-[#c0c0c0]" />
      </div>
    </div>
  );
}

// --- Screen 3: progress isn't a straight line --------------------------------
// Recreated from `onboarding screens/third onboarding screen.png`. Like screens
// 1 and 2, this screen owns its design (progress dashes, Skip, cards, CTA and
// page dots); the heading and body copy stay in `steps.ts`. The mockup sits
// behind an iOS status bar, so everything is placed relative to the top row the
// same way screens 1 and 2 were — the shell's 20px top padding replaces it.

/** The mockup's card treatments, top to bottom (body line index → card style). */
const REASSURANCE_CARDS: {
  bg: string;
  chip: string;
  Icon: LucideIcon | null;
  iconSize: number;
  iconCls: string;
  text: string;
}[] = [
  {
    bg: 'bg-[#FFFCF7]',
    chip: 'bg-[#FAF6EE]',
    Icon: Sun,
    iconSize: 20,
    iconCls: 'text-[#5e2700]',
    text: 'text-[#4d301f]',
  },
  {
    bg: 'bg-[#F1E8DB]',
    chip: 'bg-[#FAF6EE]',
    Icon: Footprints,
    iconSize: 20,
    iconCls: 'text-[#5e2700]',
    text: 'text-[#4d301f]',
  },
  // Third card of the reference: dark card, darker chip and a heart drawn in
  // near-black (#1E1E1E — dark-on-dark, easy to miss), sitting 2px below the
  // chip's centre exactly as exported.
  {
    bg: 'bg-[#5e2700]',
    chip: 'bg-[#6e3d1a]',
    Icon: Heart,
    iconSize: 18,
    iconCls: 'text-[#1e1e1e] translate-y-[2px]',
    text: 'text-[#FFFCF7]',
  },
];

function ReassuranceStep({ step, goToStep, stepIndex }: CustomStepProps) {
  const { leaving, advance } = useStepAdvance(goToStep, stepIndex);
  const body = step.body ?? [];

  return (
    <div
      className={`flex flex-col min-h-[calc(100dvh_-_44px)] px-2 pb-[26px]${
        leaving ? ' motion-safe:animate-[onb-exit_180ms_ease-in_backwards]' : ''
      }`}
    >
      {/* Top row: the flow's back navigation, the mockup's three-segment
          progress (third segment active) and its Skip pill. */}
      <div className="flex items-center gap-2 motion-safe:animate-[onb-rise_400ms_ease-out_backwards]">
        <button
          type="button"
          onClick={() => goToStep(stepIndex - 1)}
          aria-label="Go back"
          className="-ml-1 p-1 rounded-full text-[#5e2700]/60 hover:text-[#5e2700] hover:bg-white transition motion-safe:active:scale-90"
        >
          <ChevronLeft size={22} />
        </button>
        <span className="flex items-center gap-[5px]" aria-hidden="true">
          <span className="w-[15px] h-1 rounded-full bg-[#e9dccd]" />
          <span className="w-[15px] h-1 rounded-full bg-[#e9dccd]" />
          <span className="w-7 h-1 rounded-full bg-[#5e2700]" />
        </span>
        <span className="flex-1" />
        <button
          type="button"
          onClick={advance}
          className="h-9 px-4 rounded-full bg-[#FFFCF7] text-sm font-semibold text-[#5e2700] transition motion-safe:active:scale-95"
        >
          Skip
        </button>
      </div>

      <h2
        style={{ animationDelay: '50ms' }}
        className="mt-10 text-[34px] leading-[38px] font-bold text-[#5e2700] motion-safe:animate-[onb-rise_400ms_ease-out_backwards]"
      >
        {step.heading}
      </h2>

      <div className="mt-7 space-y-3">
        {body.map((text, i) => {
          const { bg, chip, Icon, iconSize, iconCls, text: textCls } =
            REASSURANCE_CARDS[i] ?? REASSURANCE_CARDS[0];
          return (
            <div
              key={text}
              style={{ animationDelay: `${110 + i * 50}ms` }}
              className={`flex items-center gap-4 rounded-3xl px-5 py-5 motion-safe:animate-[onb-rise_400ms_ease-out_backwards] ${bg}`}
            >
              <span
                className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${chip}`}
              >
                {Icon && (
                  <Icon size={iconSize} className={iconCls} aria-hidden="true" />
                )}
              </span>
              <p className={`text-[15px] leading-[22px] ${textCls}`}>{text}</p>
            </div>
          );
        })}
      </div>

      {/* Flexible spacer keeps the CTA and page dots pinned to the bottom. */}
      <div className="flex-1 min-h-6" />

      <button
        type="button"
        onClick={advance}
        style={{ animationDelay: '280ms' }}
        className="w-full h-14 rounded-full bg-[#5e2700] text-base font-semibold text-[#FFFCF7] transition hover:bg-[#4a1f00] motion-safe:animate-[onb-rise_400ms_ease-out_backwards] motion-safe:active:scale-[0.98]"
      >
        Continue
      </button>

      <div
        style={{ animationDelay: '320ms' }}
        className="mt-[18px] flex items-center justify-center gap-1.5 motion-safe:animate-[onb-rise_400ms_ease-out_backwards]"
        aria-hidden="true"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-[#e9dccd]" />
        <span className="w-1.5 h-1.5 rounded-full bg-[#e9dccd]" />
        <span className="w-2 h-2 rounded-full bg-[#5e2700]" />
      </div>
    </div>
  );
}

// --- Screen 8: basics -------------------------------------------------------

function BasicsStep({ profile, update }: CustomStepProps) {
  const num = (raw: string, min: number, max: number): number | undefined => {
    if (raw.trim() === '') return undefined;
    const n = Number(raw);
    return Number.isFinite(n) && n >= min && n <= max ? n : undefined;
  };

  const [age, setAge] = useState(profile.age != null ? String(profile.age) : '');
  const [height, setHeight] = useState(profile.height != null ? String(profile.height) : '');
  const [weight, setWeight] = useState(profile.weight != null ? String(profile.weight) : '');

  const change = (field: 'age' | 'height' | 'weight', raw: string) => {
    if (field === 'age') setAge(raw);
    else if (field === 'height') setHeight(raw);
    else setWeight(raw);

    const nextAge = field === 'age' ? raw : age;
    const nextHeight = field === 'height' ? raw : height;
    const nextWeight = field === 'weight' ? raw : weight;
    update({
      age: num(nextAge, 3, 120),
      height: num(nextHeight, 50, 260),
      weight: num(nextWeight, 20, 300),
    });
  };

  return (
    <div className="space-y-4">
      <QuestionTitle
        title="A few basics about you"
        hint="Only share what you're comfortable with. Weight is optional — we're here for healthy, sustainable habits, never crash dieting."
      />
      <div className="grid grid-cols-2 gap-4">
        <LabeledInput id="ob-age" label="Age (years)">
          <input
            id="ob-age"
            type="number"
            inputMode="numeric"
            min={3}
            max={120}
            value={age}
            onChange={(e) => change('age', e.target.value)}
            className={inputCls}
          />
        </LabeledInput>
        <LabeledInput id="ob-height" label="Height (cm)">
          <input
            id="ob-height"
            type="number"
            inputMode="numeric"
            min={50}
            max={260}
            value={height}
            onChange={(e) => change('height', e.target.value)}
            className={inputCls}
          />
        </LabeledInput>
      </div>
      <LabeledInput id="ob-weight" label="Weight (kg) — optional">
        <input
          id="ob-weight"
          type="number"
          inputMode="numeric"
          min={20}
          max={300}
          value={weight}
          onChange={(e) => change('weight', e.target.value)}
          className={inputCls}
          placeholder="Skip this if you'd rather not"
        />
      </LabeledInput>
      <p className="text-xs text-text-light">
        Younger users get guidance focused on healthy growth, regular meals and activity — not
        calorie restriction.
      </p>
    </div>
  );
}

// --- Why we're different: Food → Context → Understanding → Action ------------

const FLOW_STAGES = [
  {
    icon: Utensils,
    label: 'Food',
    title: 'What you ate',
    text: "A photo or a quick description of the meal — that's all you have to do.",
  },
  {
    icon: Layers,
    label: 'Context',
    title: 'Everything around it',
    text: 'Your goal, preferences, routine, habits and recent patterns.',
  },
  {
    icon: Lightbulb,
    label: 'Understanding',
    title: 'What it means for you',
    text: "Not a generic score — what it means for your day and what you're working toward.",
  },
  {
    icon: Zap,
    label: 'Action',
    title: 'What to do next',
    text: 'One clear step that fits your real life, your next meal and your goal.',
  },
];

function WhyDifferentStep() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold leading-snug">Most apps stop at the food.</h1>
        <p className="text-sm text-text-light leading-relaxed mt-2">
          We look at everything around it, because the same meal means different things on
          different days. Here's how one photo turns into advice that fits you:
        </p>
      </div>

      <ol className="relative">
        {/* The thread tying the four stages together */}
        <span
          className="absolute left-[22px] top-6 bottom-6 w-px bg-slate-200"
          aria-hidden="true"
        />
        {FLOW_STAGES.map(({ icon: Icon, label, title, text }, i) => {
          const isLast = i === FLOW_STAGES.length - 1;
          return (
            <li key={label} className="relative flex gap-4">
              <div className="relative shrink-0 w-11">
                <span className="relative z-10 flex w-11 h-11 items-center justify-center rounded-full border border-slate-200 bg-surface">
                  <Icon size={18} className="text-primary" aria-hidden="true" />
                </span>
                {!isLast && (
                  <ArrowDown
                    size={13}
                    className="absolute left-1/2 -translate-x-1/2 -bottom-2 z-10 text-slate-400 bg-background"
                    aria-hidden="true"
                  />
                )}
              </div>
              <div className={`min-w-0 flex-1 ${isLast ? 'pb-0' : 'pb-5'}`}>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-primary">
                  {label}
                </p>
                <p className="text-sm font-semibold mt-0.5">{title}</p>
                <p className="text-xs text-text-light leading-relaxed mt-1">{text}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// --- Screen 10: food preferences --------------------------------------------

const LIKE_PRESETS = ['Rice', 'Pasta', 'Eggs', 'Chicken', 'Meat', 'Fish', 'Fruits', 'Vegetables', 'Dairy', 'Bread', 'Snacks', 'Fast food'];
const DISLIKE_PRESETS = ['Fast food', 'Seafood', 'Spicy food', 'Vegetables', 'Mushrooms', 'Eggs', 'Dairy', 'Red meat'];

function FoodPicker({
  title,
  items,
  presets,
  placeholder,
  onToggle,
  onAdd,
  onRemove,
}: {
  title: string;
  items: string[];
  presets: string[];
  placeholder: string;
  onToggle: (value: string) => void;
  onAdd: (value: string) => void;
  onRemove: (value: string) => void;
}) {
  const [text, setText] = useState('');

  const add = () => {
    const value = text.trim();
    if (!value) return;
    onAdd(value);
    setText('');
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{title}</p>
      {items.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {items.map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-primary bg-primary/5 text-sm font-medium"
            >
              {item}
              <button
                type="button"
                onClick={() => onRemove(item)}
                aria-label={`Remove ${item}`}
                className="text-text-light hover:text-red-500"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {presets
          .filter((p) => !items.includes(p))
          .map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => onToggle(preset)}
              className="px-3 py-1.5 rounded-full border border-slate-200 bg-surface text-sm hover:bg-slate-50"
            >
              + {preset}
            </button>
          ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          className={inputCls}
        />
        <button
          type="button"
          onClick={add}
          disabled={!text.trim()}
          className="px-4 rounded-lg bg-background border border-slate-200 text-sm font-medium hover:bg-slate-50 disabled:opacity-40"
        >
          Add
        </button>
      </div>
    </div>
  );
}

function FoodPrefsStep({ profile, update }: CustomStepProps) {
  const likes = profile.foodLikes ?? [];
  const dislikes = profile.foodDislikes ?? [];

  const toggle = (field: 'foodLikes' | 'foodDislikes', value: string) => {
    const current = field === 'foodLikes' ? likes : dislikes;
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    update(field === 'foodLikes' ? { foodLikes: next } : { foodDislikes: next });
  };

  const add = (field: 'foodLikes' | 'foodDislikes', value: string) => {
    const current = field === 'foodLikes' ? likes : dislikes;
    if (current.includes(value)) return;
    update(field === 'foodLikes' ? { foodLikes: [...current, value] } : { foodDislikes: [...current, value] });
  };

  return (
    <div className="space-y-5">
      <QuestionTitle title="Let's talk about food. What do you actually enjoy eating?" />
      <FoodPicker
        title="I enjoy eating"
        items={likes}
        presets={LIKE_PRESETS}
        placeholder="Add your own food…"
        onToggle={(v) => toggle('foodLikes', v)}
        onAdd={(v) => add('foodLikes', v)}
        onRemove={(v) => toggle('foodLikes', v)}
      />
      <div className="h-px bg-slate-100" />
      <FoodPicker
        title="Anything you definitely don't like?"
        items={dislikes}
        presets={DISLIKE_PRESETS}
        placeholder="Add something you dislike…"
        onToggle={(v) => toggle('foodDislikes', v)}
        onAdd={(v) => add('foodDislikes', v)}
        onRemove={(v) => toggle('foodDislikes', v)}
      />
    </div>
  );
}

// --- Screen 16: reflection --------------------------------------------------

const ANSWER_ROWS: { id: string; label: string; get: (p: OnboardingProfile) => string }[] = [
  { id: 'why-here', label: 'Your goal', get: (p) => p.primaryGoal ?? '' },
  {
    id: 'why-matters',
    label: 'Why it matters',
    get: (p) => [p.motivation, p.motivationNote].filter(Boolean).join(' — '),
  },
  { id: 'name', label: 'What we call you', get: (p) => p.displayName ?? '' },
  {
    id: 'basics',
    label: 'Basics',
    get: (p) =>
      [p.age && `${p.age} yrs`, p.height && `${p.height} cm`, p.weight && `${p.weight} kg`]
        .filter(Boolean)
        .join(', '),
  },
  {
    id: 'lifestyle',
    label: 'Your day',
    get: (p) => [p.activityLevel, p.schedule].filter(Boolean).join(' — '),
  },
  {
    id: 'food-prefs',
    label: 'Food preferences',
    get: (p) =>
      [...(p.foodLikes ?? []).map((x) => `+ ${x}`), ...(p.foodDislikes ?? []).map((x) => `− ${x}`)].join(', '),
  },
  {
    id: 'diet',
    label: 'Dietary needs',
    get: (p) =>
      [...(p.dietaryRestrictions ?? []), p.allergies ? `Allergies: ${p.allergies}` : '']
        .filter(Boolean)
        .join(', '),
  },
  { id: 'environment', label: 'Food environment', get: (p) => p.foodEnvironment ?? '' },
  {
    id: 'obstacle',
    label: 'Biggest obstacle',
    get: (p) => [p.biggestObstacle, p.obstacleNote].filter(Boolean).join(' — '),
  },
  {
    id: 'attempts',
    label: 'Previous attempts',
    get: (p) => [p.previousAttempts, p.attemptsNote].filter(Boolean).join(' — '),
  },
  {
    id: 'existing-diet',
    label: 'Current plan',
    get: (p) => [p.existingDiet, p.existingDietNote].filter(Boolean).join(' — '),
  },
  { id: 'coach-prefs', label: 'Coaching style', get: (p) => (p.coachPreferences ?? []).join(', ') },
  { id: 'commitment', label: 'Commitment', get: (p) => p.commitmentLevel ?? '' },
];

function ReflectionStep({ profile, goToStepById }: CustomStepProps) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    const rows = ANSWER_ROWS.map((row) => ({ ...row, value: row.get(profile).trim() })).filter(
      (row) => row.value,
    );
    return (
      <div className="space-y-4">
        <QuestionTitle title="Your answers" hint="Fix anything that's off — your progress is saved either way." />
        <div className="space-y-2">
          {rows.map((row) => (
            <div key={row.id} className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-surface">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-text-light">{row.label}</p>
                <p className="text-sm break-words">{row.value}</p>
              </div>
              <button
                type="button"
                onClick={() => goToStepById(row.id)}
                className="text-sm text-primary font-medium hover:underline shrink-0"
              >
                Edit
              </button>
            </div>
          ))}
        </div>
        <button type="button" onClick={() => setEditing(false)} className={primaryBtn}>
          Back to summary
        </button>
      </div>
    );
  }

  const sentences = buildReflection(profile);
  const closing = buildReflectionClosing(profile);
  const name = profile.displayName?.trim();

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">
        {name ? `Okay, ${name}. I think I've got you.` : "Okay. I think I've got you."}
      </h2>
      <p className="text-sm text-text-light leading-relaxed">Here's what you've told me so far:</p>
      <div className="space-y-3">
        {sentences.map((line) => (
          <p key={line} className="text-sm leading-relaxed">
            {line}
          </p>
        ))}
        <p className="text-sm leading-relaxed font-medium">{closing}</p>
      </div>
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-2">
        <p className="text-sm font-semibold leading-relaxed">
          You have more potential here than you probably realize.
        </p>
        <p className="text-sm leading-relaxed text-text-light">
          You've already got a foundation here — more of one than you might think. Now we build
          on it.
        </p>
      </div>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="text-sm text-primary font-medium hover:underline"
      >
        Edit answers
      </button>
    </div>
  );
}

// --- Screen 18: try the AI coach -------------------------------------------

const SUGGESTED_PROMPTS = [
  'What should I eat for breakfast?',
  "I don't have chicken today. What can I have instead?",
  'How can I get more protein into my meals?',
];

function CoachStep({ profile }: CustomStepProps) {
  const [messages, setMessages] = useState<CoachMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  const send = async (text: string) => {
    const prompt = text.trim();
    if (!prompt || loading) return;
    setError('');
    setInput('');
    const history = messages;
    setMessages((m) => [...m, { role: 'user', content: prompt }]);
    setLoading(true);
    try {
      const reply = await askCoach(prompt, profile, history);
      setMessages((m) => [...m, { role: 'assistant', content: reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The coach is unavailable right now.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <QuestionTitle
        title="You've told me about yourself. Now let's put that information to work."
        hint="Ask your coach anything — the answers are based on what you just shared."
      />

      <div
        ref={logRef}
        className="space-y-3 max-h-72 overflow-y-auto p-3 rounded-xl bg-background border border-slate-100"
      >
        {messages.length === 0 && !loading && (
          <p className="text-sm text-text-light p-2">
            Try one of these, or type your own question:
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={`${m.role}-${i}`}
            className={`max-w-[85%] p-3 rounded-2xl text-sm ${
              m.role === 'user'
                ? 'ml-auto bg-primary text-white'
                : 'bg-surface border border-slate-200 whitespace-pre-wrap'
            }`}
          >
            {m.content}
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-sm text-text-light p-2">
            <span className="w-4 h-4 border-2 border-slate-300 border-t-primary rounded-full animate-spin" />
            Thinking…
          </div>
        )}
        {error && (
          <div role="alert" className="bg-red-50 text-red-600 text-sm p-3 rounded-xl">
            {error}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {SUGGESTED_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            disabled={loading}
            onClick={() => void send(prompt)}
            className="px-3 py-1.5 rounded-full border border-slate-200 bg-surface text-xs hover:bg-slate-50 disabled:opacity-40 text-left"
          >
            {prompt}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void send(input);
            }
          }}
          placeholder="Type a message…"
          className={inputCls}
        />
        <button
          type="button"
          onClick={() => void send(input)}
          disabled={loading || !input.trim()}
          className="px-4 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark disabled:opacity-40"
        >
          Send
        </button>
      </div>
    </div>
  );
}

// --- Screen 19: personalized approach --------------------------------------

function ApproachStep({ profile }: CustomStepProps) {
  const principles = buildPrinciples(profile);
  return (
    <div className="space-y-4">
      <QuestionTitle title="Here's how your coach will work with you." hint="Built from what you told me." />
      <ol className="space-y-3">
        {principles.map((text, i) => (
          <li key={text} className="flex gap-3 items-start">
            <span className="w-6 h-6 mt-0.5 shrink-0 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
              {i + 1}
            </span>
            <span className="text-sm leading-relaxed">{text}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

// --- Screen 22: completion --------------------------------------------------

function CompletionStep({ profile, complete }: CustomStepProps) {
  const items = ['Profile complete', 'Preferences understood', 'Personal approach created'];
  return (
    <div className="flex flex-col items-center text-center pt-8 pb-4">
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
        <Check size={32} className="text-primary" />
      </div>
      <h2 className="text-2xl font-bold">Your coach is ready.</h2>
      <p className="text-sm text-text-light mt-2">
        {profile.displayName ? `Nice to meet you, ${profile.displayName}. ` : ''}
        Everything you told me is saved to your account.
      </p>

      <ul className="w-full mt-6 space-y-2 text-left">
        {items.map((item) => (
          <li
            key={item}
            className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-surface text-sm"
          >
            <Check size={16} className="text-primary shrink-0" />
            {item}
          </li>
        ))}
      </ul>

      <button type="button" onClick={complete} className={`${primaryBtn} mt-6 flex items-center justify-center gap-2`}>
        Start Day 1
        <ArrowRight size={18} />
      </button>
    </div>
  );
}

export {
  BasicsStep,
  WhyDifferentStep,
  FoodPrefsStep,
  ReflectionStep,
  CoachStep,
  ApproachStep,
  CompletionStep,
  GoalStep,
  ReassuranceStep,
  WelcomeStep,
};
