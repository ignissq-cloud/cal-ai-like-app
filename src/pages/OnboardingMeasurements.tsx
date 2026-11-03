import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ArrowRight, Ruler, Scale, Check } from 'lucide-react';
import { useAppStore } from '../store';

export default function OnboardingMeasurements() {
  const navigate = useNavigate();
  const { profile, updateProfile } = useAppStore();

  const [unit, setUnit] = useState<'metric' | 'imperial'>('metric');
  // Internal state stored in metric numbers (cm and kg)
  const [heightCm, setHeightCm] = useState(170);
  const [weightKg, setWeightKg] = useState(65);

  const handleNext = () => {
    const formattedHeight =
      unit === 'metric'
        ? `${heightCm} cm`
        : `${Math.floor(heightCm / 30.48)}'${Math.round((heightCm % 30.48) / 2.54)}"`;

    const formattedWeight =
      unit === 'metric' ? `${weightKg} kg` : `${Math.round(weightKg * 2.20462)} lbs`;

    updateProfile({
      ...profile,
      height: formattedHeight,
      weight: formattedWeight,
    });

    navigate('/onboarding/reminders');
  };

  const handleBack = () => {
    navigate('/onboarding/about');
  };

  // Convert to display values
  const displayWeight = unit === 'metric' ? weightKg : Math.round(weightKg * 2.20462);
  const weightUnit = unit === 'metric' ? 'kg' : 'lbs';

  const displayHeight = unit === 'metric' ? heightCm : Math.round(heightCm / 2.54);
  const heightUnit = unit === 'metric' ? 'cm' : 'in';

  const adjustHeight = (delta: number) => {
    setHeightCm((prev) => Math.min(Math.max(prev + delta, 120), 230));
  };

  const adjustWeight = (delta: number) => {
    setWeightKg((prev) => Math.min(Math.max(prev + delta, 30), 200));
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col justify-between p-5 pt-8 pb-8 font-sans text-gray-900 max-w-md mx-auto">
      <div>
        {/* Top Header with Progress */}
        <div className="flex items-center justify-between mb-6">
          <button
            type="button"
            onClick={handleBack}
            aria-label="Go back"
            className="w-10 h-10 rounded-full bg-white shadow-sm border border-gray-100 flex items-center justify-center text-gray-800 hover:bg-gray-50 active:scale-95 transition-all cursor-pointer"
          >
            <ChevronLeft size={22} className="stroke-[2.2]" />
          </button>

          <div className="flex items-center gap-1.5 flex-1 max-w-[200px] mx-4">
            {/* 6 progress dashes: 1st and 2nd are dark */}
            <div className="h-1 flex-1 rounded-full bg-[#212121]" />
            <div className="h-1 flex-1 rounded-full bg-[#212121]" />
            <div className="h-1 flex-1 rounded-full bg-[#E5E7EB]" />
            <div className="h-1 flex-1 rounded-full bg-[#E5E7EB]" />
            <div className="h-1 flex-1 rounded-full bg-[#E5E7EB]" />
            <div className="h-1 flex-1 rounded-full bg-[#E5E7EB]" />
          </div>

          <span className="text-xs text-gray-400 font-medium">2 of 6</span>
        </div>

        {/* Title & Subtitle */}
        <div className="mb-6">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight leading-tight">
            Height & weight
          </h1>
          <p className="text-sm text-gray-400 font-normal leading-relaxed mt-2">
            Let’s tailor your daily calorie and macro goals to your body.
          </p>
        </div>

        {/* Unit Segmented Control */}
        <div className="bg-[#ECEFF3] p-1.5 rounded-2xl flex max-w-sm w-full mx-auto mb-6">
          <button
            type="button"
            onClick={() => setUnit('imperial')}
            className={`py-3 px-4 rounded-xl flex-1 text-center text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              unit === 'imperial'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-400 hover:text-gray-700'
            }`}
          >
            <span>Imperial</span>
            {unit === 'imperial' && <Check size={14} className="stroke-[3]" />}
          </button>

          <button
            type="button"
            onClick={() => setUnit('metric')}
            className={`py-3 px-4 rounded-xl flex-1 text-center text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              unit === 'metric'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-400 hover:text-gray-700'
            }`}
          >
            <span>Metric</span>
            {unit === 'metric' && <Check size={14} className="stroke-[3]" />}
          </button>
        </div>

        {/* Measurement Cards (Height & Weight) */}
        <div className="grid grid-cols-2 gap-4 mb-3">
          {/* Height Card */}
          <div
            className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 flex flex-col items-center py-6 select-none"
            onWheel={(e) => {
              if (e.deltaY < 0) adjustHeight(1);
              else if (e.deltaY > 0) adjustHeight(-1);
            }}
          >
            <div className="flex items-center gap-1.5 mb-4">
              <Ruler size={16} className="text-gray-600 stroke-[2]" />
              <span className="text-sm font-semibold text-gray-700">Height</span>
            </div>

            {/* Wheel Stack */}
            <div className="flex flex-col items-center w-full">
              <button
                type="button"
                onClick={() => adjustHeight(-2)}
                className="text-lg font-medium text-gray-300 py-1 hover:text-gray-400 transition-colors cursor-pointer"
              >
                {displayHeight - 2}
              </button>
              <button
                type="button"
                onClick={() => adjustHeight(-1)}
                className="text-xl font-medium text-gray-400 py-1 hover:text-gray-500 transition-colors cursor-pointer"
              >
                {displayHeight - 1}
              </button>

              {/* Selected Highlight */}
              <div className="bg-[#F1F3F5] rounded-2xl py-3 px-3 w-full flex items-baseline justify-center gap-1.5 my-1.5 shadow-2xs">
                <span className="text-3xl font-black text-gray-900 leading-none">
                  {displayHeight}
                </span>
                <span className="text-xs font-semibold text-gray-500">{heightUnit}</span>
              </div>

              <button
                type="button"
                onClick={() => adjustHeight(1)}
                className="text-xl font-medium text-gray-400 py-1 hover:text-gray-500 transition-colors cursor-pointer"
              >
                {displayHeight + 1}
              </button>
              <button
                type="button"
                onClick={() => adjustHeight(2)}
                className="text-lg font-medium text-gray-300 py-1 hover:text-gray-400 transition-colors cursor-pointer"
              >
                {displayHeight + 2}
              </button>
            </div>
          </div>

          {/* Weight Card */}
          <div
            className="bg-white rounded-3xl p-4 shadow-sm border border-gray-100 flex flex-col items-center py-6 select-none"
            onWheel={(e) => {
              if (e.deltaY < 0) adjustWeight(1);
              else if (e.deltaY > 0) adjustWeight(-1);
            }}
          >
            <div className="flex items-center gap-1.5 mb-4">
              <Scale size={16} className="text-gray-600 stroke-[2]" />
              <span className="text-sm font-semibold text-gray-700">Weight</span>
            </div>

            {/* Wheel Stack */}
            <div className="flex flex-col items-center w-full">
              <button
                type="button"
                onClick={() => adjustWeight(-2)}
                className="text-lg font-medium text-gray-300 py-1 hover:text-gray-400 transition-colors cursor-pointer"
              >
                {displayWeight - 2}
              </button>
              <button
                type="button"
                onClick={() => adjustWeight(-1)}
                className="text-xl font-medium text-gray-400 py-1 hover:text-gray-500 transition-colors cursor-pointer"
              >
                {displayWeight - 1}
              </button>

              {/* Selected Highlight */}
              <div className="bg-[#F1F3F5] rounded-2xl py-3 px-3 w-full flex items-baseline justify-center gap-1.5 my-1.5 shadow-2xs">
                <span className="text-3xl font-black text-gray-900 leading-none">
                  {displayWeight}
                </span>
                <span className="text-xs font-semibold text-gray-500">{weightUnit}</span>
              </div>

              <button
                type="button"
                onClick={() => adjustWeight(1)}
                className="text-xl font-medium text-gray-400 py-1 hover:text-gray-500 transition-colors cursor-pointer"
              >
                {displayWeight + 1}
              </button>
              <button
                type="button"
                onClick={() => adjustWeight(2)}
                className="text-lg font-medium text-gray-300 py-1 hover:text-gray-400 transition-colors cursor-pointer"
              >
                {displayWeight + 2}
              </button>
            </div>
          </div>
        </div>

        {/* Scroll Helper */}
        <p className="text-xs text-gray-400 text-center mb-6">Scroll to select your measurements</p>
      </div>

      {/* Footer & Next Button */}
      <div className="pt-4">
        <p className="text-xs text-gray-400 text-center mb-4">
          You can update these anytime in your profile.
        </p>

        <button
          type="button"
          onClick={handleNext}
          className="w-full py-4 rounded-2xl bg-[#212121] hover:bg-black active:scale-[0.98] transition-all text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm cursor-pointer"
        >
          <span>Next</span>
          <ArrowRight size={16} className="stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
}