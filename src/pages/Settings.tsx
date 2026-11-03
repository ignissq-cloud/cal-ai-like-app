import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  User,
  LogOut,
  LogIn,
  ChevronRight,
  Pencil,
  Download,
  Upload,
  Trash2,
  Check,
  X,
} from 'lucide-react';
import { useAppStore } from '../store';
import { useAuth } from '../auth/context';
import type { FoodItem, Profile } from '../types';

const isFoodItem = (v: unknown): v is FoodItem => {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.id === 'string' &&
    typeof o.name === 'string' &&
    typeof o.calories === 'number' &&
    typeof o.date === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(o.date) &&
    !Number.isNaN(Date.parse(o.date))
  );
};

const isWaterMap = (v: unknown): v is Record<string, number> =>
  !!v &&
  typeof v === 'object' &&
  !Array.isArray(v) &&
  Object.values(v as Record<string, unknown>).every((n) => typeof n === 'number');

const isProfileObject = (v: unknown): v is Profile =>
  !!v && typeof v === 'object' && !Array.isArray(v);

type ModalType = 'age' | 'gender' | 'weight' | 'height' | 'activity' | 'dietary' | null;

export default function Settings() {
  const { profile, updateProfile, clearAllData, logs, waterLogs, importData } = useAppStore();
  const { user, signOut } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<Profile>(profile);
  const [prevProfile, setPrevProfile] = useState<Profile>(profile);
  const [signingOut, setSigningOut] = useState(false);
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [tempValue, setTempValue] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  if (profile !== prevProfile) {
    setPrevProfile(profile);
    setFormData(profile);
  }

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSaveProfile = () => {
    updateProfile(formData);
    showToast('Settings saved successfully!');
  };

  const handleSignOut = async () => {
    if (!window.confirm('Are you sure you want to sign out?')) return;
    setSigningOut(true);
    try {
      await signOut();
      showToast('Signed out successfully.');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Sign out failed. Please try again.');
    } finally {
      setSigningOut(false);
    }
  };

  const handleClear = () => {
    if (
      window.confirm(
        'Are you sure you want to clear all data? This will reset all food logs, water logs, and profile settings. This cannot be undone.',
      )
    ) {
      clearAllData();
      showToast('All data has been cleared.');
    }
  };

  const handleExport = () => {
    const data = JSON.stringify(
      { version: 1, exportedAt: new Date().toISOString(), logs, waterLogs, profile: formData },
      null,
      2,
    );
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nutrisnap_export_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Data exported successfully.');
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const reader = new FileReader();
    reader.onerror = () => alert('Import failed: could not read the file.');
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as Record<string, unknown>;
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          throw new Error('This file is not a NutriSnap export');
        }

        const next: { logs?: FoodItem[]; waterLogs?: Record<string, number>; profile?: Profile } = {};

        if ('logs' in parsed) {
          if (!Array.isArray(parsed.logs) || !parsed.logs.every(isFoodItem)) {
            throw new Error('The "logs" section is not valid');
          }
          next.logs = parsed.logs as FoodItem[];
        }
        if ('waterLogs' in parsed) {
          if (!isWaterMap(parsed.waterLogs)) throw new Error('The "waterLogs" section is not valid');
          next.waterLogs = parsed.waterLogs;
        }
        if ('profile' in parsed) {
          if (!isProfileObject(parsed.profile)) throw new Error('The "profile" section is not valid');
          next.profile = parsed.profile;
        }
        if (next.logs === undefined && next.waterLogs === undefined && next.profile === undefined) {
          throw new Error('This file is not a NutriSnap export');
        }

        if (!window.confirm('Replace your current data with the contents of this file?')) return;
        importData(next);
        showToast('Data imported successfully.');
      } catch (err) {
        alert(`Import failed: ${err instanceof Error ? err.message : 'invalid file'}`);
      }
    };
    reader.readAsText(file);
  };

  const openModal = (type: ModalType) => {
    setActiveModal(type);
    if (type === 'age') setTempValue(formData.age || '');
    if (type === 'gender') setTempValue(formData.gender || '');
    if (type === 'weight') setTempValue(formData.weight || '');
    if (type === 'height') setTempValue(formData.height || '');
    if (type === 'activity') setTempValue(formData.activityLevel || '');
    if (type === 'dietary') setTempValue(formData.dietaryPreferences || '');
  };

  const closeModal = () => {
    setActiveModal(null);
    setTempValue('');
  };

  const saveModalValue = () => {
    if (activeModal === 'age') {
      setFormData((prev) => ({ ...prev, age: tempValue.trim() }));
    } else if (activeModal === 'gender') {
      setFormData((prev) => ({ ...prev, gender: tempValue.trim() }));
    } else if (activeModal === 'weight') {
      setFormData((prev) => ({ ...prev, weight: tempValue.trim() }));
    } else if (activeModal === 'height') {
      setFormData((prev) => ({ ...prev, height: tempValue.trim() }));
    } else if (activeModal === 'activity') {
      setFormData((prev) => ({ ...prev, activityLevel: tempValue.trim() }));
    } else if (activeModal === 'dietary') {
      setFormData((prev) => ({ ...prev, dietaryPreferences: tempValue.trim() }));
    }
    closeModal();
  };

  const activityOptions = [
    'Sedentary (desk job, little exercise)',
    'Lightly Active (1-3 days/week)',
    'Moderately Active (3-5 days/week)',
    'Very Active (6-7 days/week)',
  ];

  return (
    <div className="min-h-screen bg-[#F8F9FA] max-w-md mx-auto pt-6 px-5 pb-32">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-[#212121] text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2 animate-fade-in">
          <Check size={14} className="text-green-400 stroke-[3]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Screen Title (Centered) */}
      <header className="mb-6">
        <h1 className="text-xl font-bold text-gray-900 text-center tracking-tight">Profile</h1>
      </header>

      {/* 1. Account Section */}
      <section className="mb-6">
        <h2 className="text-xs font-semibold text-gray-400 mb-2 px-1 tracking-wide">Account</h2>
        <div className="bg-white rounded-3xl shadow-[0_2px_8px_rgba(0,0,0,0.03)] border border-gray-100 overflow-hidden">
          {/* User Email Row */}
          <div className="p-4 flex items-center">
            <div className="w-9 h-9 rounded-full bg-[#212121] flex items-center justify-center text-white shrink-0">
              <User size={18} className="stroke-[2.2]" />
            </div>
            <p className="text-sm font-medium text-gray-800 ml-3 truncate">
              {user?.email || 'ahmadwahab03006008805@gmail.com'}
            </p>
          </div>

          <div className="border-t border-gray-100" />

          {/* Sign Out or Sign In Row */}
          {user ? (
            <button
              type="button"
              onClick={handleSignOut}
              disabled={signingOut}
              className="w-full p-4 flex items-center justify-between hover:bg-gray-50 active:bg-gray-100 transition-colors text-left cursor-pointer"
            >
              <div className="flex items-center">
                <LogOut size={18} className="text-gray-600 stroke-[2]" />
                <span className="text-sm font-medium text-gray-800 ml-3">
                  {signingOut ? 'Signing Out...' : 'Sign Out'}
                </span>
              </div>
              <ChevronRight size={18} className="text-gray-400" />
            </button>
          ) : (
            <Link
              to="/login"
              className="w-full p-4 flex items-center justify-between hover:bg-gray-50 active:bg-gray-100 transition-colors text-left cursor-pointer"
            >
              <div className="flex items-center">
                <LogIn size={18} className="text-gray-600 stroke-[2]" />
                <span className="text-sm font-medium text-gray-800 ml-3">Sign In / Switch Account</span>
              </div>
              <ChevronRight size={18} className="text-gray-400" />
            </Link>
          )}
        </div>
      </section>

      {/* 2. Profile Details Section */}
      <section className="mb-6">
        <h2 className="text-xs font-semibold text-gray-400 mb-2 px-1 tracking-wide">
          Profile Details
        </h2>
        <div className="bg-white rounded-3xl shadow-[0_2px_8px_rgba(0,0,0,0.03)] border border-gray-100 overflow-hidden">
          {/* Gender */}
          <button
            type="button"
            onClick={() => openModal('gender')}
            className="w-full p-4 flex items-center justify-between hover:bg-gray-50 active:bg-gray-100 transition-colors text-left cursor-pointer"
          >
            <span className="text-sm font-medium text-gray-900">Gender</span>
            <div className="flex items-center gap-1 text-sm text-gray-400">
              <span className={formData.gender ? 'text-gray-700' : 'text-gray-400'}>
                {formData.gender ? `${formData.gender}` : 'Add gender'}
              </span>
              <ChevronRight size={16} className="text-gray-400" />
            </div>
          </button>

          <div className="border-t border-gray-100" />

          {/* Age */}
          <button
            type="button"
            onClick={() => openModal('age')}
            className="w-full p-4 flex items-center justify-between hover:bg-gray-50 active:bg-gray-100 transition-colors text-left cursor-pointer"
          >
            <span className="text-sm font-medium text-gray-900">Age</span>
            <div className="flex items-center gap-1 text-sm text-gray-400">
              <span className={formData.age ? 'text-gray-700' : 'text-gray-400'}>
                {formData.age ? `${formData.age}` : 'Add age'}
              </span>
              <ChevronRight size={16} className="text-gray-400" />
            </div>
          </button>

          <div className="border-t border-gray-100" />

          {/* Weight */}
          <button
            type="button"
            onClick={() => openModal('weight')}
            className="w-full p-4 flex items-center justify-between hover:bg-gray-50 active:bg-gray-100 transition-colors text-left cursor-pointer"
          >
            <span className="text-sm font-medium text-gray-900">Weight</span>
            <div className="flex items-center gap-1 text-sm text-gray-400">
              <span className={formData.weight ? 'text-gray-700' : 'text-gray-400'}>
                {formData.weight ? `${formData.weight}` : 'Add weight'}
              </span>
              <ChevronRight size={16} className="text-gray-400" />
            </div>
          </button>

          <div className="border-t border-gray-100" />

          {/* Height */}
          <button
            type="button"
            onClick={() => openModal('height')}
            className="w-full p-4 flex items-center justify-between hover:bg-gray-50 active:bg-gray-100 transition-colors text-left cursor-pointer"
          >
            <span className="text-sm font-medium text-gray-900">Height</span>
            <div className="flex items-center gap-1 text-sm text-gray-400">
              <span className={formData.height ? 'text-gray-700' : 'text-gray-400'}>
                {formData.height ? `${formData.height}` : 'Add height'}
              </span>
              <ChevronRight size={16} className="text-gray-400" />
            </div>
          </button>

          <div className="border-t border-gray-100" />

          {/* Activity */}
          <button
            type="button"
            onClick={() => openModal('activity')}
            className="w-full p-4 flex items-center justify-between hover:bg-gray-50 active:bg-gray-100 transition-colors text-left cursor-pointer"
          >
            <span className="text-sm font-medium text-gray-900">Activity</span>
            <div className="flex items-center gap-1 text-sm text-gray-400 max-w-[200px]">
              <span className={`truncate ${formData.activityLevel ? 'text-gray-700' : 'text-gray-400'}`}>
                {formData.activityLevel ? `${formData.activityLevel}` : 'Add activity'}
              </span>
              <ChevronRight size={16} className="text-gray-400 shrink-0" />
            </div>
          </button>

          <div className="border-t border-gray-100" />

          {/* Dietary Preferences / Context */}
          <div
            onClick={() => openModal('dietary')}
            className="p-4 hover:bg-gray-50 active:bg-gray-100 transition-colors cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900">
                Dietary Preferences / Context
              </span>
              <Pencil size={16} className="text-gray-400" />
            </div>
            <p className="text-xs text-gray-400 mt-1.5 leading-relaxed line-clamp-2">
              {formData.dietaryPreferences || 'E.g., Vegan, Keto, allergic to peanuts...'}
            </p>
          </div>
        </div>

        {/* Save Settings Button */}
        <button
          type="button"
          onClick={handleSaveProfile}
          className="w-full py-4 px-4 rounded-2xl bg-[#212121] hover:bg-black active:scale-[0.98] transition-all text-white font-bold text-sm shadow-sm mt-4 text-center cursor-pointer"
        >
          Save Settings
        </button>
      </section>

      {/* 3. Data Management Section */}
      <section className="mb-6">
        <h2 className="text-xs font-semibold text-gray-400 mb-2 px-1 tracking-wide">
          Data Management
        </h2>
        <div className="bg-white rounded-3xl shadow-[0_2px_8px_rgba(0,0,0,0.03)] border border-gray-100 overflow-hidden">
          {/* Export Data */}
          <button
            type="button"
            onClick={handleExport}
            className="w-full p-4 flex items-center justify-between hover:bg-gray-50 active:bg-gray-100 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center">
              <Download size={18} className="text-gray-600 stroke-[2]" />
              <span className="text-sm font-medium text-gray-800 ml-3">Export Data</span>
            </div>
            <ChevronRight size={18} className="text-gray-400" />
          </button>

          <div className="border-t border-gray-100" />

          {/* Import Data */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full p-4 flex items-center justify-between hover:bg-gray-50 active:bg-gray-100 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center">
              <Upload size={18} className="text-gray-600 stroke-[2]" />
              <span className="text-sm font-medium text-gray-800 ml-3">Import Data</span>
            </div>
            <ChevronRight size={18} className="text-gray-400" />
            <input
              type="file"
              accept="application/json,.json"
              className="hidden"
              ref={fileInputRef}
              onChange={handleImportFile}
            />
          </button>

          <div className="border-t border-gray-100" />

          {/* Clear All Data */}
          <button
            type="button"
            onClick={handleClear}
            className="w-full p-4 flex items-center justify-between hover:bg-red-50 active:bg-red-100 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center">
              <Trash2 size={18} className="text-red-500 stroke-[2]" />
              <span className="text-sm font-medium text-red-500 ml-3">Clear All Data</span>
            </div>
            <ChevronRight size={18} className="text-red-400" />
          </button>
        </div>
      </section>

      {/* Edit Modal / Popup Dialog */}
      {activeModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-gray-100 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg text-gray-900">
                {activeModal === 'age'
                  ? 'Age'
                  : activeModal === 'gender'
                    ? 'Gender'
                    : activeModal === 'weight'
                      ? 'Weight'
                      : activeModal === 'height'
                        ? 'Height'
                        : activeModal === 'activity'
                          ? 'Activity Level'
                          : 'Dietary Preferences'}
              </h3>
              <button
                type="button"
                onClick={closeModal}
                aria-label="Close"
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {activeModal === 'gender' ? (
              <div className="space-y-2 mb-5">
                {['Woman', 'Man', 'Non-binary', 'Prefer not to say'].map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setTempValue(opt)}
                    className={`w-full text-left p-3 rounded-2xl text-xs font-semibold transition-all border ${
                      tempValue === opt
                        ? 'bg-[#212121] text-white border-black'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            ) : activeModal === 'activity' ? (
              <div className="space-y-2 mb-5">
                {activityOptions.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setTempValue(opt)}
                    className={`w-full text-left p-3 rounded-2xl text-xs font-semibold transition-all border ${
                      tempValue === opt
                        ? 'bg-[#212121] text-white border-black'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            ) : activeModal === 'dietary' ? (
              <textarea
                value={tempValue}
                onChange={(e) => setTempValue(e.target.value)}
                placeholder="E.g., Vegan, Keto, allergic to peanuts..."
                rows={4}
                className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-3 text-sm text-gray-800 focus:outline-none focus:border-black mb-5 resize-none"
              />
            ) : (
              <div className="mb-5">
                <input
                  type="text"
                  autoFocus
                  value={tempValue}
                  onChange={(e) => setTempValue(e.target.value)}
                  placeholder={
                    activeModal === 'age'
                      ? 'e.g. 25'
                      : activeModal === 'weight'
                        ? 'e.g. 70 kg or 150 lbs'
                        : 'e.g. 175 cm or 5\'10"'
                  }
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-3.5 text-base text-gray-800 focus:outline-none focus:border-black"
                />
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={closeModal}
                className="flex-1 py-3.5 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveModalValue}
                className="flex-1 py-3.5 rounded-xl bg-[#212121] hover:bg-black text-white font-semibold text-sm shadow-sm"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}