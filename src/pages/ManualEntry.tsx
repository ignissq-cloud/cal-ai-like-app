import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import { useAppStore } from '../store';
import type { MealType } from '../types';

export default function ManualEntry() {
  const navigate = useNavigate();
  const { addLog } = useAppStore();
  
  const [name, setName] = useState('');
  const [portion, setPortion] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [selectedMeal, setSelectedMeal] = useState<MealType | null>(null);

  const handleSave = () => {
    if (!name) return alert('Name is required');
    
    addLog({
      id: uuidv4(),
      name,
      portion,
      ingredients: [],
      calories: Number(calories) || 0,
      protein: Number(protein) || 0,
      carbs: Number(carbs) || 0,
      fat: Number(fat) || 0,
      fiber: 0,
      sugar: 0,
      mealType: selectedMeal,
      date: format(new Date(), 'yyyy-MM-dd'),
      timestamp: Date.now()
    });
    
    navigate('/');
  };

  return (
    <div className="fixed inset-0 bg-background z-50 overflow-y-auto pb-24">
      <div className="flex items-center justify-between p-4 pt-safe bg-surface border-b border-slate-100">
        <button onClick={() => navigate(-1)} className="p-2 text-text-light">
          <ChevronLeft size={24} />
        </button>
        <h1 className="font-semibold">Manual Entry</h1>
        <div className="w-10"></div>
      </div>

      <div className="p-4 max-w-md mx-auto space-y-6 mt-4">
        <div className="bg-surface rounded-2xl p-5 shadow-sm border border-slate-100 space-y-4">
          <div>
            <label className="block text-xs font-medium text-text-light mb-1">Food Name *</label>
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-background border border-slate-200 rounded-lg p-3 text-sm focus:outline-none focus:border-primary"
              placeholder="e.g. Banana"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-light mb-1">Portion</label>
            <input 
              type="text" 
              value={portion} 
              onChange={(e) => setPortion(e.target.value)}
              className="w-full bg-background border border-slate-200 rounded-lg p-3 text-sm focus:outline-none focus:border-primary"
              placeholder="e.g. 1 medium"
            />
          </div>
        </div>

        <div className="bg-surface rounded-2xl p-5 shadow-sm border border-slate-100">
          <h3 className="font-semibold mb-4">Macros</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-text-light mb-1">Calories (kcal)</label>
              <input type="number" value={calories} onChange={(e) => setCalories(e.target.value)} className="w-full bg-background border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-xs text-text-light mb-1">Protein (g)</label>
              <input type="number" value={protein} onChange={(e) => setProtein(e.target.value)} className="w-full bg-background border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-xs text-text-light mb-1">Carbs (g)</label>
              <input type="number" value={carbs} onChange={(e) => setCarbs(e.target.value)} className="w-full bg-background border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="block text-xs text-text-light mb-1">Fat (g)</label>
              <input type="number" value={fat} onChange={(e) => setFat(e.target.value)} className="w-full bg-background border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-primary" />
            </div>
          </div>
        </div>

        <div className="bg-surface rounded-2xl p-5 shadow-sm border border-slate-100">
          <h3 className="font-semibold mb-3">Meal Type</h3>
          <div className="flex flex-wrap gap-2">
            {(['Breakfast', 'Lunch', 'Dinner', 'Snack'] as MealType[]).map(meal => (
              <button
                key={meal}
                onClick={() => setSelectedMeal(selectedMeal === meal ? null : meal)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition ${selectedMeal === meal ? 'bg-primary text-white shadow-md' : 'bg-background border border-slate-200 text-text hover:bg-slate-50'}`}
              >
                {meal}
              </button>
            ))}
          </div>
        </div>

        <button 
          onClick={handleSave}
          className="w-full bg-primary text-white font-bold text-lg p-4 rounded-xl shadow-lg hover:bg-primary-dark transition"
        >
          Save Log
        </button>
      </div>
    </div>
  );
}
