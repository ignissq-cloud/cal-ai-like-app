import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ArrowRight } from 'lucide-react';
import { useAppStore } from '../store';

const GENDER_OPTIONS = ['Woman', 'Man', 'Non-binary', 'Prefer not to say'];

export default function OnboardingAbout() {
  const navigate = useNavigate();
  const { profile, updateProfile } = useAppStore();

  const [name, setName] = useState(profile.displayName || '');
  const [gender, setGender] = useState(profile.gender || '');

  const handleNext = () => {
    updateProfile({
      ...profile,
      displayName: name.trim() || profile.displayName || '',
      gender: gender || profile.gender || '',
    });
    navigate('/onboarding/measurements');
  };

  const handleBack = () => {
    navigate('/login');
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
            {/* 6 progress dashes: 1st is dark */}
            <div className="h-1 flex-1 rounded-full bg-[#212121]" />
            <div className="h-1 flex-1 rounded-full bg-[#E5E7EB]" />
            <div className="h-1 flex-1 rounded-full bg-[#E5E7EB]" />
            <div className="h-1 flex-1 rounded-full bg-[#E5E7EB]" />
            <div className="h-1 flex-1 rounded-full bg-[#E5E7EB]" />
            <div className="h-1 flex-1 rounded-full bg-[#E5E7EB]" />
          </div>

          <span className="text-xs text-gray-400 font-medium">1 of 6</span>
        </div>

        {/* Title & Subtitle */}
        <div className="mb-6">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight leading-tight">
            A little about you
          </h1>
          <p className="text-sm text-gray-400 font-normal leading-relaxed mt-2">
            Welcome! Let’s start with what to call you.
          </p>
        </div>

        {/* Field 1: Your name */}
        <div className="mb-6">
          <label htmlFor="onboarding-name" className="block text-xs font-semibold text-gray-700 mb-2">
            Your name
          </label>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 focus-within:border-gray-300 transition-all">
            <input
              id="onboarding-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your first name"
              className="w-full text-sm font-medium text-gray-900 placeholder:text-gray-400 bg-transparent outline-none"
            />
          </div>
        </div>

        {/* Field 2: Gender */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-700">Gender</span>
            <span className="text-xs text-gray-400 font-normal">Optional</span>
          </div>

          <div className="space-y-2.5">
            {GENDER_OPTIONS.map((opt) => {
              const isSelected = gender === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setGender(isSelected ? '' : opt)}
                  className="w-full bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center justify-between cursor-pointer hover:bg-gray-50/80 active:scale-[0.99] transition-all text-left"
                >
                  <span className="text-sm font-semibold text-gray-800">{opt}</span>
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      isSelected ? 'border-[#212121]' : 'border-gray-300'
                    }`}
                  >
                    {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-[#212121]" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer & Next Button */}
      <div className="pt-6">
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