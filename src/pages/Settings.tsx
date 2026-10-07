import { useState } from 'react';
import { useAppStore } from '../store';
import type { FoodItem, Profile } from '../types';

const isFoodItem = (v: unknown): v is FoodItem => {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.id === 'string' &&
    typeof o.name === 'string' &&
    typeof o.calories === 'number' &&
    // History renders/log-groups by date; reject anything that would crash it
    typeof o.date === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(o.date) &&
    !Number.isNaN(Date.parse(o.date))
  );
};

const isWaterMap = (v: unknown): v is Record<string, number> =>
  !!v && typeof v === 'object' && !Array.isArray(v) &&
  Object.values(v as Record<string, unknown>).every((n) => typeof n === 'number');

const isProfileObject = (v: unknown): v is Profile =>
  !!v && typeof v === 'object' && !Array.isArray(v);

export default function Settings() {
  const { profile, updateProfile, clearAllData, logs, waterLogs, importData } = useAppStore();
  const [formData, setFormData] = useState(profile);
  const [prevProfile, setPrevProfile] = useState(profile);

  // Re-sync the draft when the persisted profile hydrates (or is cleared/imported).
  // Render-phase adjustment instead of an effect: no stale first-paint, no extra commit.
  if (profile !== prevProfile) {
    setPrevProfile(profile);
    setFormData(profile);
  }

  const handleSaveProfile = () => {
    updateProfile(formData);
    alert('Settings saved!');
  };

  const handleClear = () => {
    if (window.confirm('Are you sure you want to clear all data? This cannot be undone.')) {
      clearAllData();
    }
  };

  const handleExport = () => {
    const data = JSON.stringify(
      { version: 1, exportedAt: new Date().toISOString(), logs, waterLogs, profile },
      null,
      2
    );
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nutrisnap_export.json';
    a.click();
    URL.revokeObjectURL(url);
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
        alert('Data imported successfully.');
      } catch (err) {
        alert(`Import failed: ${err instanceof Error ? err.message : 'invalid file'}`);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="p-4 max-w-md mx-auto pt-safe pb-24">
      <header className="mb-6 mt-4">
        <h1 className="text-2xl font-bold">Settings</h1>
      </header>



      <section className="bg-surface rounded-2xl p-5 shadow-sm border border-slate-100 mb-6 space-y-4">
        <h2 className="font-semibold text-lg mb-2">Profile Details</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-text-light mb-1">Age</label>
            <input type="text" value={formData.age || ''} onChange={e => setFormData({...formData, age: e.target.value})} className="w-full bg-background border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-primary" />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-light mb-1">Weight</label>
            <input type="text" value={formData.weight || ''} onChange={e => setFormData({...formData, weight: e.target.value})} className="w-full bg-background border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-primary" />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-light mb-1">Height</label>
            <input type="text" value={formData.height || ''} onChange={e => setFormData({...formData, height: e.target.value})} className="w-full bg-background border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-primary" />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-light mb-1">Activity</label>
            <input type="text" value={formData.activityLevel || ''} onChange={e => setFormData({...formData, activityLevel: e.target.value})} className="w-full bg-background border border-slate-200 rounded-lg p-2.5 text-sm focus:outline-none focus:border-primary" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-text-light mb-1">Dietary Preferences / Context</label>
          <textarea value={formData.dietaryPreferences || ''} onChange={e => setFormData({...formData, dietaryPreferences: e.target.value})} className="w-full bg-background border border-slate-200 rounded-lg p-3 text-sm focus:outline-none focus:border-primary h-20" placeholder="E.g., Vegan, Keto, allergic to peanuts..." />
        </div>
        
        <button onClick={handleSaveProfile} className="w-full bg-primary text-white font-medium p-3 rounded-xl mt-2 hover:bg-primary-dark transition">Save Settings</button>
      </section>

      <section className="bg-surface rounded-2xl p-5 shadow-sm border border-slate-100 space-y-4">
        <h2 className="font-semibold text-lg mb-2">Data Management</h2>
        <div className="flex gap-3">
          <button onClick={handleExport} className="flex-1 bg-background border border-slate-200 text-text font-medium p-3 rounded-xl text-sm hover:bg-slate-50 transition">Export Data</button>
          <label className="flex-1 bg-background border border-slate-200 text-text font-medium p-3 rounded-xl text-sm hover:bg-slate-50 transition text-center cursor-pointer">
            Import Data
            <input type="file" accept="application/json,.json" className="hidden" onChange={handleImportFile} />
          </label>
        </div>
        <button onClick={handleClear} className="w-full bg-red-50 text-red-600 font-medium p-3 rounded-xl text-sm hover:bg-red-100 transition">Clear All Data</button>
      </section>
    </div>
  );
}
