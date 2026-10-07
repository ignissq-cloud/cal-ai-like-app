import { useSyncExternalStore } from 'react';
import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import { get, set, del } from 'idb-keyval';
import type { FoodItem, Profile } from '../types';

const idbStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    return (await get(name)) || null;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await set(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await del(name);
  },
};

interface AppState {
  logs: FoodItem[];
  waterLogs: Record<string, number>; // date (YYYY-MM-DD) -> ml
  profile: Profile;
  addLog: (log: FoodItem) => void;
  updateLog: (id: string, log: Partial<FoodItem>) => void;
  removeLog: (id: string) => void;
  addWater: (date: string, amount: number) => void;
  updateProfile: (profile: Profile) => void;
  importData: (data: { logs?: FoodItem[]; waterLogs?: Record<string, number>; profile?: Profile }) => void;
  clearAllData: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      logs: [],
      waterLogs: {},
      profile: {},
      addLog: (log) => set((state) => ({ logs: [log, ...state.logs] })),
      updateLog: (id, updated) => set((state) => ({
        logs: state.logs.map((log) => log.id === id ? { ...log, ...updated } : log)
      })),
      removeLog: (id) => set((state) => ({
        logs: state.logs.filter((log) => log.id !== id)
      })),
      addWater: (date, amount) => set((state) => ({
        waterLogs: { ...state.waterLogs, [date]: (state.waterLogs[date] || 0) + amount }
      })),
      updateProfile: (profile) => set({ profile }),
      importData: (data) => set((state) => ({
        logs: data.logs ?? state.logs,
        waterLogs: data.waterLogs ?? state.waterLogs,
        profile: data.profile ?? state.profile,
      })),
      clearAllData: () => set({ logs: [], waterLogs: {}, profile: {} }),
    }),
    {
      name: 'nutrisnap-storage',
      storage: createJSONStorage(() => idbStorage),
    }
  )
);

/**
 * True once the persisted state has been rehydrated from IndexedDB.
 * Until then, logs/waterLogs/profile are empty placeholders, so screens
 * should show a loading state rather than an empty state.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    (onStoreChange) => useAppStore.persist.onFinishHydration(onStoreChange),
    () => useAppStore.persist.hasHydrated(),
    () => false
  );
}
