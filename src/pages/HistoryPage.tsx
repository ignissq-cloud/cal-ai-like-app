import { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { Trash2 } from 'lucide-react';
import { useAppStore, useHydrated } from '../store';
import type { FoodItem } from '../types';

export default function HistoryPage() {
  const { logs, removeLog } = useAppStore();
  const hydrated = useHydrated();

  const handleDelete = (log: FoodItem) => {
    if (window.confirm(`Delete "${log.name}"?`)) {
      removeLog(log.id);
    }
  };

  const groupedLogs = useMemo(() => {
    const groups: Record<string, FoodItem[]> = {};
    logs.forEach(log => {
      if (!groups[log.date]) groups[log.date] = [];
      groups[log.date].push(log);
    });
    
    // Sort dates descending
    return Object.keys(groups).sort((a, b) => b.localeCompare(a)).map(date => ({
      date,
      logs: groups[date],
      totalCalories: groups[date].reduce((sum, log) => sum + log.calories, 0)
    }));
  }, [logs]);

  return (
    <div className="p-4 max-w-md mx-auto pt-safe">
      <header className="mb-6 mt-4">
        <h1 className="text-2xl font-bold">History</h1>
      </header>

      {!hydrated ? (
        <div className="space-y-6" aria-busy="true">
          <div className="h-6 w-28 bg-slate-200 rounded-lg animate-pulse" />
          <div className="h-20 bg-slate-100 rounded-xl animate-pulse" />
          <div className="h-20 bg-slate-100 rounded-xl animate-pulse" />
        </div>
      ) : groupedLogs.length === 0 ? (
        <div className="text-center py-10 text-text-light">
          No history available yet.
        </div>
      ) : (
        <div className="space-y-6">
          {groupedLogs.map(group => (
            <div key={group.date}>
              <div className="flex justify-between items-end mb-3 px-1">
                <h2 className="font-semibold">{format(parseISO(group.date), 'MMM d, yyyy')}</h2>
                <span className="text-sm font-medium text-text-light">{Math.round(group.totalCalories)} kcal</span>
              </div>
              <div className="space-y-2">
                {group.logs.map(log => (
                  <div key={log.id} className="bg-surface rounded-xl p-3 shadow-sm border border-slate-100 flex justify-between items-center">
                    <div>
                      <p className="font-medium text-sm">{log.name}</p>
                      <p className="text-xs text-text-light">{log.mealType || 'Uncategorized'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{Math.round(log.calories)} kcal</span>
                      <button
                        onClick={() => handleDelete(log)}
                        aria-label={`Delete ${log.name}`}
                        className="p-2 text-slate-300 hover:text-red-500 transition"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
