import type { ReactNode } from 'react';

/** Shared class names so onboarding matches the rest of the app. */
export const card = 'bg-surface rounded-2xl p-5 shadow-sm border border-slate-100';
export const inputCls =
  'w-full bg-background border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-primary';
export const primaryBtn =
  'w-full bg-primary text-white font-medium p-3.5 rounded-xl hover:bg-primary-dark transition disabled:opacity-40 disabled:cursor-not-allowed';
export const ghostBtn =
  'w-full bg-surface border border-slate-200 text-text font-medium p-3.5 rounded-xl text-sm hover:bg-slate-50 transition disabled:opacity-40';
export const labelCls = 'block text-xs font-medium text-text-light mb-1';

export function QuestionTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-xl font-bold leading-snug">{title}</h2>
      {hint && <p className="text-sm text-text-light mt-2">{hint}</p>}
    </div>
  );
}

export function OptionButton({
  label,
  selected,
  multiple,
  onClick,
}: {
  label: string;
  selected: boolean;
  multiple?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`w-full text-left flex items-center gap-3 p-3.5 rounded-xl border text-sm transition ${
        selected
          ? 'border-primary bg-primary/5 text-text font-medium'
          : 'border-slate-200 bg-surface hover:bg-slate-50 text-text'
      }`}
    >
      <span
        className={`w-5 h-5 shrink-0 flex items-center justify-center border-2 ${
          multiple ? 'rounded-md' : 'rounded-full'
        } ${selected ? 'border-primary bg-primary' : 'border-slate-300'}`}
      >
        {selected && (
          <svg viewBox="0 0 12 12" className="w-3 h-3" aria-hidden="true">
            <path
              d="M2 6.2 4.6 9 10 3.2"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </span>
      <span>{label}</span>
    </button>
  );
}

export function Chip({
  label,
  selected,
  onRemove,
  onClick,
}: {
  label: string;
  selected?: boolean;
  onRemove?: () => void;
  onClick?: () => void;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm transition ${
        selected ? 'border-primary bg-primary/5 text-text font-medium' : 'border-slate-200 bg-surface text-text'
      }`}
    >
      {onClick ? (
        <button type="button" onClick={onClick} className="text-left">
          {label}
        </button>
      ) : (
        <span>{label}</span>
      )}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${label}`}
          className="text-text-light hover:text-red-500"
        >
          ×
        </button>
      )}
    </span>
  );
}

export function LabeledInput({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className={labelCls}>
        {label}
      </label>
      {children}
    </div>
  );
}
