import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Image as ImageIcon, ChevronLeft, Loader2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import { analyzeFoodImage } from '../services/ai';
import { useAppStore } from '../store';
import type { AIAnalysisResult, MealType } from '../types';

export default function CameraFlow() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { profile, addLog } = useAppStore();
  
  const [step, setStep] = useState<'capture' | 'analyzing' | 'clarification' | 'confirm'>('capture');
  const [image, setImage] = useState<string | null>(null);
  const [error, setError] = useState('');
  
  const [analysisResult, setAnalysisResult] = useState<AIAnalysisResult | null>(null);
  const [clarificationAnswer, setClarificationAnswer] = useState('');
  
  // Confirmation state
  const [confirmData, setConfirmData] = useState<AIAnalysisResult | null>(null);
  const [selectedMeal, setSelectedMeal] = useState<MealType | null>(null);

  const handleImageCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset so the same file can be re-selected after a failed attempt
    e.target.value = '';

    const reader = new FileReader();
    reader.onloadend = () => {
      setImage(reader.result as string);
      setClarificationAnswer('');
      // Explicitly clear any answer left over from a previous clarification round
      runAnalysis(reader.result as string, undefined, '');
    };
    reader.readAsDataURL(file);
  };

  const runAnalysis = async (base64Img: string, prevContext?: string, answer?: string) => {
    setStep('analyzing');
    setError('');
    setAnalysisResult(null);
    try {
      const result = await analyzeFoodImage(base64Img, profile, answer ?? clarificationAnswer, prevContext);
      
      if (result.needsClarification) {
        setAnalysisResult(result);
        setStep('clarification');
      } else {
        setConfirmData(result);
        setStep('confirm');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed.');
      setStep('capture');
    }
  };

  const handleClarificationSubmit = () => {
    if (!image) return;
    const answer = clarificationAnswer;
    // Re-run analysis with the answer, then clear it so a follow-up
    // clarification can't silently reuse the previous answer.
    runAnalysis(image, analysisResult?.clarificationQuestion, answer);
    setClarificationAnswer('');
  };

  const handleSave = () => {
    if (!confirmData) return;
    
    addLog({
      id: uuidv4(),
      name: confirmData.name,
      portion: confirmData.portion,
      ingredients: confirmData.ingredients || [],
      calories: confirmData.calories || 0,
      protein: confirmData.protein || 0,
      carbs: confirmData.carbs || 0,
      fat: confirmData.fat || 0,
      fiber: confirmData.fiber || 0,
      sugar: confirmData.sugar || 0,
      imageUrl: image || undefined,
      mealType: selectedMeal,
      date: format(new Date(), 'yyyy-MM-dd'),
      timestamp: Date.now()
    });
    
    navigate('/');
  };

  return (
    <div className="fixed inset-0 bg-background z-50 overflow-y-auto pb-24">
      {/* Header */}
      <div className="flex items-center justify-between p-4 pt-safe bg-surface border-b border-slate-100">
        <button onClick={() => step === 'capture' ? navigate(-1) : setStep('capture')} className="p-2 text-text-light">
          <ChevronLeft size={24} />
        </button>
        <h1 className="font-semibold">{step === 'capture' ? 'Log Food' : step === 'analyzing' ? 'Analyzing...' : step === 'clarification' ? 'Clarification' : 'Confirm'}</h1>
        <div className="w-10"></div>
      </div>

      <div className="p-4 max-w-md mx-auto">
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm mb-4">
            {error}
          </div>
        )}

        {step === 'capture' && (
          <div className="space-y-4 mt-8">
            <input 
              type="file" 
              accept="image/*" 
              capture="environment" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleImageCapture}
            />
            
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="w-full aspect-square bg-slate-100 rounded-3xl flex flex-col items-center justify-center text-slate-500 hover:bg-slate-200 transition border-2 border-dashed border-slate-300"
            >
              <Camera size={48} className="mb-4" />
              <span className="font-medium">Take a Photo</span>
            </button>
            
            <div className="relative flex py-5 items-center">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="flex-shrink-0 mx-4 text-text-light text-sm">or</span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>

            <label className="w-full flex items-center justify-center gap-2 p-4 bg-surface border border-slate-200 rounded-xl font-medium hover:bg-slate-50 transition cursor-pointer">
              <ImageIcon size={20} />
              Upload from Gallery
              <input type="file" accept="image/*" className="hidden" onChange={handleImageCapture} />
            </label>
          </div>
        )}

        {step === 'analyzing' && (
          <div className="flex flex-col items-center justify-center py-20">
            {image && <img src={image} className="w-32 h-32 rounded-2xl object-cover mb-8 opacity-50" />}
            <Loader2 size={40} className="text-primary animate-spin mb-4" />
            <p className="font-medium text-lg">AI is analyzing your food...</p>
            <p className="text-text-light text-sm mt-2">Estimating macros and portion sizes</p>
          </div>
        )}

        {step === 'clarification' && analysisResult && (
          <div className="py-6 space-y-6">
            <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100">
              <p className="text-blue-800 font-medium">{analysisResult.clarificationQuestion}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-text-light mb-2">Your Answer</label>
              <input 
                type="text"
                autoFocus
                value={clarificationAnswer}
                onChange={(e) => setClarificationAnswer(e.target.value)}
                className="w-full border border-slate-200 rounded-xl p-4 text-base focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary bg-surface"
                placeholder="e.g. It's Caesar dressing, about 2 tbsp"
              />
            </div>
            
            <button 
              onClick={handleClarificationSubmit}
              disabled={!clarificationAnswer.trim()}
              className="w-full bg-primary text-white font-medium p-4 rounded-xl hover:bg-primary-dark transition disabled:opacity-50"
            >
              Submit & Re-analyze
            </button>
          </div>
        )}

        {step === 'confirm' && confirmData && (
          <div className="space-y-6 pb-10">
            {image && <img src={image} className="w-full h-48 rounded-2xl object-cover shadow-sm" />}
            
            <div className="bg-surface rounded-2xl p-5 shadow-sm border border-slate-100 space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-light mb-1">Food Name</label>
                <input 
                  type="text" 
                  value={confirmData.name} 
                  onChange={(e) => setConfirmData({...confirmData, name: e.target.value})}
                  className="w-full font-semibold text-lg border-b border-transparent focus:border-primary focus:outline-none bg-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-light mb-1">Estimated Portion</label>
                <input 
                  type="text" 
                  value={confirmData.portion} 
                  onChange={(e) => setConfirmData({...confirmData, portion: e.target.value})}
                  className="w-full text-sm border-b border-transparent focus:border-primary focus:outline-none bg-transparent"
                />
              </div>
            </div>

            <div className="bg-surface rounded-2xl p-5 shadow-sm border border-slate-100">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">Nutritional Estimates</h3>
                {confirmData.confidence && (
                  <span className={`text-xs px-2 py-1 rounded-full ${confirmData.confidence === 'High' ? 'bg-green-100 text-green-700' : confirmData.confidence === 'Medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                    {confirmData.confidence} Confidence
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-text-light mb-1">Calories (kcal)</label>
                  <input type="number" value={confirmData.calories || 0} onChange={(e) => setConfirmData({...confirmData, calories: Number(e.target.value)})} className="w-full bg-background border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="block text-xs text-text-light mb-1">Protein (g)</label>
                  <input type="number" value={confirmData.protein || 0} onChange={(e) => setConfirmData({...confirmData, protein: Number(e.target.value)})} className="w-full bg-background border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="block text-xs text-text-light mb-1">Carbs (g)</label>
                  <input type="number" value={confirmData.carbs || 0} onChange={(e) => setConfirmData({...confirmData, carbs: Number(e.target.value)})} className="w-full bg-background border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="block text-xs text-text-light mb-1">Fat (g)</label>
                  <input type="number" value={confirmData.fat || 0} onChange={(e) => setConfirmData({...confirmData, fat: Number(e.target.value)})} className="w-full bg-background border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-primary" />
                </div>
              </div>
            </div>

            <div className="bg-surface rounded-2xl p-5 shadow-sm border border-slate-100">
              <h3 className="font-semibold mb-3">Meal Type (Optional)</h3>
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
        )}
      </div>
    </div>
  );
}
