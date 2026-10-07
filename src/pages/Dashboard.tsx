import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Plus, Droplets } from 'lucide-react';
import { useAppStore, useHydrated } from '../store';


export default function Dashboard() {
  const { logs, waterLogs, addWater } = useAppStore();
  const hydrated = useHydrated();
  const now = new Date();
  const today = format(now, 'yyyy-MM-dd');
  const longDate = format(now, 'EEEE, MMMM d');
  
  const todaysLogs = useMemo(() => logs.filter(log => log.date === today), [logs, today]);
  
  const summary = useMemo(() => {
    return todaysLogs.reduce((acc, log) => ({
      calories: acc.calories + log.calories,
      protein: acc.protein + log.protein,
      carbs: acc.carbs + log.carbs,
      fat: acc.fat + log.fat,
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
  }, [todaysLogs]);

  const todaysWater = waterLogs[today] || 0;

  const handleAddWater = (amount: number) => {
    addWater(today, amount);
  };

  if (!hydrated) {
    return (
      <div className="p-4 max-w-md mx-auto pt-safe" aria-busy="true">
        <div className="h-8 w-36 bg-slate-200 rounded-lg animate-pulse mb-8 mt-4" />
        <div className="h-36 bg-slate-100 rounded-2xl animate-pulse mb-6" />
        <div className="h-24 bg-slate-100 rounded-2xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-4 max-w-md mx-auto pt-safe">
      <header className="mb-6 mt-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Today</h1>
          <p className="text-text-light text-sm">{longDate}</p>
        </div>
      </header>

      {/* Macros Summary */}
      <section className="bg-surface rounded-2xl p-5 shadow-sm border border-slate-100 mb-6">
        <div className="flex justify-between items-end mb-4">
          <div>
            <p className="text-sm text-text-light font-medium uppercase tracking-wider mb-1">Calories</p>
            <p className="text-3xl font-bold">{Math.round(summary.calories)} <span className="text-sm text-text-light font-normal">kcal</span></p>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-4 border-t border-slate-100 pt-4">
          <div>
            <p className="text-xs text-text-light mb-1">Protein</p>
            <p className="font-semibold text-sm">{Math.round(summary.protein)}g</p>
            <div className="h-1.5 w-full bg-slate-100 rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min((summary.protein / 150) * 100, 100)}%` }} />
            </div>
          </div>
          <div>
            <p className="text-xs text-text-light mb-1">Carbs</p>
            <p className="font-semibold text-sm">{Math.round(summary.carbs)}g</p>
            <div className="h-1.5 w-full bg-slate-100 rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-orange-500 rounded-full" style={{ width: `${Math.min((summary.carbs / 250) * 100, 100)}%` }} />
            </div>
          </div>
          <div>
            <p className="text-xs text-text-light mb-1">Fat</p>
            <p className="font-semibold text-sm">{Math.round(summary.fat)}g</p>
            <div className="h-1.5 w-full bg-slate-100 rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-purple-500 rounded-full" style={{ width: `${Math.min((summary.fat / 80) * 100, 100)}%` }} />
            </div>
          </div>
        </div>
      </section>

      {/* Water Tracker */}
      <section className="bg-surface rounded-2xl p-5 shadow-sm border border-slate-100 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-500">
            <Droplets size={20} />
          </div>
          <div>
            <h3 className="font-semibold">Water</h3>
            <p className="text-sm text-text-light">{todaysWater} ml</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => handleAddWater(250)} className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition">+250</button>
          <button onClick={() => handleAddWater(500)} className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition">+500</button>
        </div>
      </section>

      {/* Meals */}
      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">Meals</h2>
          <Link to="/manual" className="text-primary text-sm font-medium flex items-center">
            <Plus size={16} className="mr-1" /> Manual
          </Link>
        </div>

        {todaysLogs.length === 0 ? (
          <div className="text-center py-10 bg-surface rounded-2xl border border-slate-100 border-dashed">
            <p className="text-text-light">No meals logged yet today.</p>
            <Link to="/camera" className="mt-3 inline-block px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium shadow-sm">
              Snap a meal
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {todaysLogs.map((log) => (
              <div key={log.id} className="bg-surface rounded-2xl p-4 shadow-sm border border-slate-100 flex gap-4">
                {log.imageUrl && (
                  <img src={log.imageUrl} alt={log.name} className="w-16 h-16 rounded-xl object-cover" />
                )}
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h3 className="font-semibold line-clamp-1">{log.name}</h3>
                    <span className="text-sm font-bold ml-2">{Math.round(log.calories)}</span>
                  </div>
                  <p className="text-xs text-text-light mt-1">{log.portion} • {log.mealType || 'Uncategorized'}</p>
                  <p className="text-xs text-text-light mt-1">P: {Math.round(log.protein)}g • C: {Math.round(log.carbs)}g • F: {Math.round(log.fat)}g</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
