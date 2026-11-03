import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Bell, Utensils, Droplet } from 'lucide-react';
import { useAppStore } from '../store';

export default function OnboardingReminders() {
  const navigate = useNavigate();
  const { profile, updateProfile } = useAppStore();
  const [enabling, setEnabling] = useState(false);

  const finish = (notificationsEnabled: boolean) => {
    updateProfile({
      ...profile,
      // Store reminder preference in profile if needed
      dietaryPreferences: profile.dietaryPreferences || '',
    });
    // Save flag in localStorage
    localStorage.setItem('nutrisnap_notifications_enabled', String(notificationsEnabled));
    navigate('/');
  };

  const handleEnable = async () => {
    setEnabling(true);
    try {
      if ('Notification' in window) {
        await Notification.requestPermission();
      }
    } catch {
      // Ignore errors if browser blocks permission dialog
    } finally {
      setEnabling(false);
      finish(true);
    }
  };

  const handleSkip = () => {
    finish(false);
  };

  const handleBack = () => {
    navigate('/onboarding/measurements');
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
            {/* 6 progress dashes: 1st, 2nd, and 3rd are dark */}
            <div className="h-1 flex-1 rounded-full bg-[#212121]" />
            <div className="h-1 flex-1 rounded-full bg-[#212121]" />
            <div className="h-1 flex-1 rounded-full bg-[#212121]" />
            <div className="h-1 flex-1 rounded-full bg-[#E5E7EB]" />
            <div className="h-1 flex-1 rounded-full bg-[#E5E7EB]" />
            <div className="h-1 flex-1 rounded-full bg-[#E5E7EB]" />
          </div>

          <span className="text-xs text-gray-400 font-medium">3 of 6</span>
        </div>

        {/* Title & Subtitle */}
        <div className="mb-6">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight leading-tight">
            Small reminders.
            <br />
            Healthier habits.
          </h1>
          <p className="text-sm text-gray-400 font-normal leading-relaxed mt-2.5">
            A gentle nudge to log your meals, drink more water, and keep showing up for you.
          </p>
        </div>

        {/* Lockscreen / Notification Preview Card */}
        <div className="bg-[#ECEFF3]/70 rounded-[32px] p-6 pb-7 flex flex-col items-center mb-6 border border-gray-100/60 shadow-xs">
          <p className="text-xs font-medium text-gray-400 mb-1">A little care, every day</p>
          <p className="text-5xl font-normal text-gray-500 mb-5 tracking-tight font-sans">9:41</p>

          <div className="w-full space-y-3">
            {/* Notification 1: Lunch */}
            <div className="w-full bg-white/95 backdrop-blur-sm rounded-2xl p-3.5 shadow-[0_2px_8px_rgba(0,0,0,0.03)] border border-white/70 flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-700 shrink-0 mt-0.5">
                <Utensils size={18} className="stroke-[1.8]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    NOURI
                  </span>
                  <span className="text-[10px] text-gray-400 font-medium">now</span>
                </div>
                <h4 className="text-xs font-bold text-gray-900 leading-snug mt-0.5 truncate">
                  Time to log your lunch
                </h4>
                <p className="text-[11px] text-gray-500 leading-snug mt-0.5 truncate">
                  A quick check-in for your food diary.
                </p>
              </div>
            </div>

            {/* Notification 2: Water */}
            <div className="w-full bg-white/95 backdrop-blur-sm rounded-2xl p-3.5 shadow-[0_2px_8px_rgba(0,0,0,0.03)] border border-white/70 flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-700 shrink-0 mt-0.5">
                <Droplet size={18} className="stroke-[1.8]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    NOURI
                  </span>
                  <span className="text-[10px] text-gray-400 font-medium">now</span>
                </div>
                <h4 className="text-xs font-bold text-gray-900 leading-snug mt-0.5 truncate">
                  Time for a sip of water
                </h4>
                <p className="text-[11px] text-gray-500 leading-snug mt-0.5 truncate">
                  A small sip. A step toward your daily goal.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer & Actions */}
      <div className="pt-2">
        <p className="text-xs text-gray-400 text-center mb-4">
          Your rhythm. Change reminders anytime.
        </p>

        <button
          type="button"
          onClick={handleEnable}
          disabled={enabling}
          className="w-full py-4 rounded-2xl bg-[#212121] hover:bg-black active:scale-[0.98] transition-all text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm cursor-pointer mb-3 disabled:opacity-50"
        >
          <Bell size={16} className="stroke-[2.2]" />
          <span>{enabling ? 'Enabling...' : 'Enable notifications'}</span>
        </button>

        <button
          type="button"
          onClick={handleSkip}
          className="w-full text-xs font-semibold text-gray-500 hover:text-gray-800 text-center py-2 cursor-pointer transition-colors"
        >
          Not now
        </button>
      </div>
    </div>
  );
}