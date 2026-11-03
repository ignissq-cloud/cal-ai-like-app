import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Plus, Droplet, Flame, Camera, Utensils, Trash2 } from 'lucide-react';
import { useAppStore, useHydrated } from '../store';

export default function Dashboard() {
  const { logs, waterLogs, addWater, removeLog } = useAppStore();
  const hydrated = useHydrated();
  const now = useMemo(() => new Date(), []);
  const today = useMemo(() => format(now, 'yyyy-MM-dd'), [now]);
  const longDate = useMemo(() => format(now, 'EEEE, MMMM d'), [now]);

  const todaysLogs = useMemo(() => logs.filter((log) => log.date === today), [logs, today]);

  const summary = useMemo(() => {
    return todaysLogs.reduce(
      (acc, log) => ({
        calories: acc.calories + log.calories,
        protein: acc.protein + log.protein,
        carbs: acc.carbs + log.carbs,
        fat: acc.fat + log.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 },
    );
  }, [todaysLogs]);

  const todaysWater = waterLogs[today] || 0;

  const handleAddWater = (amount: number) => {
    addWater(today, amount);
  };

  if (!hydrated) {
    return (
      <div className="p-5 max-w-md mx-auto pt-8" aria-busy="true">
        <div className="h-9 w-40 bg-gray-200 rounded-lg animate-pulse mb-2" />
        <div className="h-5 w-32 bg-gray-100 rounded-lg animate-pulse mb-6" />
        <div className="h-44 bg-white rounded-3xl p-5 shadow-sm border border-gray-100 animate-pulse mb-3" />
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div className="h-28 bg-white rounded-2xl p-4 shadow-sm border border-gray-100 animate-pulse" />
          <div className="h-28 bg-white rounded-2xl p-4 shadow-sm border border-gray-100 animate-pulse" />
          <div className="h-28 bg-white rounded-2xl p-4 shadow-sm border border-gray-100 animate-pulse" />
        </div>
      </div>
    );
  }

  // Target values for progress bars (standard baseline)
  const proteinTarget = 150;
  const carbsTarget = 250;
  const fatTarget = 80;

  return (
    <div className="p-5 max-w-md mx-auto pt-6">
      {/* Header */}
      <header className="mb-5">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Today</h1>
        <p className="text-sm font-medium text-gray-400 mt-0.5">{longDate}</p>
      </header>

      {/* Calories Card */}
      <section className="bg-white rounded-3xl p-6 shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-gray-100/90 mb-3">
        <div className="flex justify-between items-center mb-3">
          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
            CALORIES
          </span>
          <Flame size={22} className="text-gray-900 stroke-[1.75]" />
        </div>

        <div className="flex items-baseline">
          <span className="text-6xl font-black text-gray-900 tracking-tight leading-none">
            {Math.round(summary.calories)}
          </span>
          <span className="text-xl font-medium text-gray-500 ml-2">kcal</span>
        </div>

        <p className="text-xs font-medium text-gray-400 mt-3.5">Logged today</p>
      </section>

      {/* Macros Grid */}
      <div className="grid grid-cols-3 gap-3 mb-3">
        {/* Protein */}
        <div className="bg-white rounded-[22px] p-3.5 shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-gray-100/90 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 mb-2">
            <span className="w-1.5 h-3.5 rounded-full bg-[#E06D6D]" />
            <span className="text-xs font-medium text-gray-500">Protein</span>
          </div>
          <div className="flex items-baseline my-1">
            <span className="text-3xl font-bold text-gray-900 leading-none">
              {Math.round(summary.protein)}
            </span>
            <span className="text-sm font-medium text-gray-400 ml-0.5">g</span>
          </div>
          <div className="h-1.5 w-full bg-[#FCE8E8] rounded-full mt-3 overflow-hidden">
            <div
              className="h-full bg-[#E06D6D] rounded-full transition-all duration-300"
              style={{ width: `${Math.min((summary.protein / proteinTarget) * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Carbs */}
        <div className="bg-white rounded-[22px] p-3.5 shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-gray-100/90 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 mb-2">
            <span className="w-1.5 h-3.5 rounded-full bg-[#EAA135]" />
            <span className="text-xs font-medium text-gray-500">Carbs</span>
          </div>
          <div className="flex items-baseline my-1">
            <span className="text-3xl font-bold text-gray-900 leading-none">
              {Math.round(summary.carbs)}
            </span>
            <span className="text-sm font-medium text-gray-400 ml-0.5">g</span>
          </div>
          <div className="h-1.5 w-full bg-[#FEF4E6] rounded-full mt-3 overflow-hidden">
            <div
              className="h-full bg-[#EAA135] rounded-full transition-all duration-300"
              style={{ width: `${Math.min((summary.carbs / carbsTarget) * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Fat */}
        <div className="bg-white rounded-[22px] p-3.5 shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-gray-100/90 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 mb-2">
            <span className="w-1.5 h-3.5 rounded-full bg-[#9B87F5]" />
            <span className="text-xs font-medium text-gray-500">Fat</span>
          </div>
          <div className="flex items-baseline my-1">
            <span className="text-3xl font-bold text-gray-900 leading-none">
              {Math.round(summary.fat)}
            </span>
            <span className="text-sm font-medium text-gray-400 ml-0.5">g</span>
          </div>
          <div className="h-1.5 w-full bg-[#F3F0FE] rounded-full mt-3 overflow-hidden">
            <div
              className="h-full bg-[#9B87F5] rounded-full transition-all duration-300"
              style={{ width: `${Math.min((summary.fat / fatTarget) * 100, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Water Card */}
      <section className="bg-white rounded-3xl p-4 shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-gray-100/90 flex items-center justify-between mb-6">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#EFF6FF] flex items-center justify-center text-[#3B82F6] shrink-0">
            <Droplet size={22} className="stroke-[2.2]" />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 leading-tight">Water</p>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-2xl font-bold text-gray-900 leading-none">{todaysWater}</span>
              <span className="text-sm font-medium text-gray-400">ml</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleAddWater(250)}
            className="px-4 py-2.5 rounded-xl bg-[#E8F2FC] text-[#2563EB] font-semibold text-sm hover:bg-[#D9EAFE] active:scale-95 transition-all cursor-pointer"
          >
            +250
          </button>
          <button
            type="button"
            onClick={() => handleAddWater(500)}
            className="px-4 py-2.5 rounded-xl bg-[#E8F2FC] text-[#2563EB] font-semibold text-sm hover:bg-[#D9EAFE] active:scale-95 transition-all cursor-pointer"
          >
            +500
          </button>
        </div>
      </section>

      {/* Meals Section */}
      <section className="mb-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-2xl font-bold text-gray-900">Meals</h2>
          <Link
            to="/manual"
            className="flex items-center gap-1 text-sm font-semibold text-gray-900 hover:text-gray-700 py-1 px-1 cursor-pointer transition-colors"
          >
            <Plus size={18} className="stroke-[2.5]" />
            <span>Manual</span>
          </Link>
        </div>

        {todaysLogs.length === 0 ? (
          /* Empty State exactly matching reference design */
          <div className="bg-white rounded-3xl p-8 shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-gray-100/90 flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#F4F4F5] flex items-center justify-center text-gray-400 mb-4">
              <Utensils size={24} className="stroke-[1.75]" />
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-1">No meals logged yet today.</h3>
            <p className="text-xs text-gray-400 font-normal mb-6">
              A quick snap is all it takes to start.
            </p>
            <Link
              to="/camera"
              className="w-full py-4 px-6 rounded-2xl bg-[#212121] hover:bg-black active:scale-[0.98] transition-all text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-sm"
            >
              <Camera size={18} className="stroke-[2]" />
              <span>Snap a meal</span>
            </Link>
          </div>
        ) : (
          /* Logged Meals List */
          <div className="space-y-3">
            {todaysLogs.map((log) => (
              <div
                key={log.id}
                className="bg-white rounded-2xl p-4 shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-gray-100/90 flex gap-3.5 items-center justify-between"
              >
                <div className="flex items-center gap-3.5 flex-1 min-w-0">
                  {log.imageUrl ? (
                    <img
                      src={log.imageUrl}
                      alt={log.name}
                      className="w-14 h-14 rounded-xl object-cover shrink-0 border border-gray-100"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 shrink-0 border border-gray-100">
                      <Utensils size={20} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-sm text-gray-900 truncate">{log.name}</h4>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {log.portion} • {log.mealType || 'Meal'}
                    </p>
                    <div className="flex gap-2 text-[11px] font-medium text-gray-500 mt-1">
                      <span>P: {Math.round(log.protein)}g</span>
                      <span>•</span>
                      <span>C: {Math.round(log.carbs)}g</span>
                      <span>•</span>
                      <span>F: {Math.round(log.fat)}g</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2 ml-2 shrink-0">
                  <span className="text-sm font-bold text-gray-900">
                    {Math.round(log.calories)} <span className="text-xs text-gray-400 font-normal">kcal</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => removeLog(log.id)}
                    aria-label="Delete meal"
                    className="p-1 text-gray-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}

            <Link
              to="/camera"
              className="w-full mt-2 py-3.5 px-4 rounded-2xl bg-white border border-gray-200/80 hover:bg-gray-50 active:scale-[0.98] transition-all text-gray-800 font-semibold text-sm flex items-center justify-center gap-2 shadow-xs"
            >
              <Camera size={18} className="stroke-[2]" />
              <span>Snap another meal</span>
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
