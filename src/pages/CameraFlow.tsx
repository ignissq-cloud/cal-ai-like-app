import { useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Camera,
  Image as ImageIcon,
  ChevronLeft,
  Loader2,
  Flame,
  Pencil,
  CheckCircle2,
  Check,
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import { analyzeFoodImage } from '../services/ai';
import { useAppStore } from '../store';
import type { AIAnalysisResult, MealType } from '../types';

export default function CameraFlow() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const requestIdRef = useRef(0);
  const { profile, addLog } = useAppStore();

  const [step, setStep] = useState<'capture' | 'analyzing' | 'clarification' | 'confirm'>('capture');
  const [image, setImage] = useState<string | null>(null);
  const [error, setError] = useState('');

  const [analysisResult, setAnalysisResult] = useState<AIAnalysisResult | null>(null);
  const [clarificationAnswer, setClarificationAnswer] = useState('');

  // Confirmation state
  const [confirmData, setConfirmData] = useState<AIAnalysisResult | null>(null);
  const [selectedMeal, setSelectedMeal] = useState<MealType | null>('Breakfast');
  const [isEditingName, setIsEditingName] = useState(false);

  const handleImageCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const reader = new FileReader();
    reader.onloadend = () => {
      setImage(reader.result as string);
      setClarificationAnswer('');
      runAnalysis(reader.result as string, undefined, '');
    };
    reader.readAsDataURL(file);
  };

  const runAnalysis = async (base64Img: string, prevContext?: string, answer?: string) => {
    const requestId = ++requestIdRef.current;
    setStep('analyzing');
    setError('');
    setAnalysisResult(null);
    try {
      const result = await analyzeFoodImage(base64Img, profile, answer ?? clarificationAnswer, prevContext);
      if (requestId !== requestIdRef.current) return;

      if (result.needsClarification) {
        setAnalysisResult(result);
        setStep('clarification');
      } else {
        setConfirmData(result);
        setStep('confirm');
      }
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setError(err instanceof Error ? err.message : 'Analysis failed.');
      setStep('capture');
    }
  };

  const handleBack = () => {
    if (step === 'capture') {
      navigate(-1);
      return;
    }
    requestIdRef.current++;
    setStep('capture');
  };

  const handleClarificationSubmit = () => {
    if (!image) return;
    const answer = clarificationAnswer;
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
      timestamp: Date.now(),
    });

    navigate('/');
  };

  // Derive callouts to render overlay badges over the food photo
  const callouts = useMemo(() => {
    if (!confirmData) return [];
    const ing = confirmData.ingredients || [];
    if (ing.length >= 2) {
      return [
        { name: ing[0], portion: confirmData.portion?.split(' and ')[0] || '1 serving' },
        { name: ing[1], portion: confirmData.portion?.split(' and ')[1] || '1 serving' },
      ];
    }
    if (ing.length === 1) {
      return [{ name: ing[0], portion: confirmData.portion || '1 serving' }];
    }
    // Fallback: split title by 'with', 'and', '&'
    const parts = confirmData.name.split(/\s+(?:with|and|&)\s+/i);
    if (parts.length >= 2) {
      return [
        { name: parts[0], portion: confirmData.portion?.split(' and ')[0] || '1 serving' },
        { name: parts[1], portion: confirmData.portion?.split(' and ')[1] || '1 serving' },
      ];
    }
    return [{ name: confirmData.name, portion: confirmData.portion || '1 serving' }];
  }, [confirmData]);

  const proteinTarget = 150;
  const carbsTarget = 250;
  const fatTarget = 80;

  return (
    <div className="min-h-screen bg-[#F8F9FA] max-w-md mx-auto pt-6 px-5 pb-32">
      {/* Top Header */}
      <div className="flex items-center mb-5">
        <button
          type="button"
          onClick={handleBack}
          aria-label="Go back"
          className="w-10 h-10 rounded-full bg-white shadow-sm border border-gray-100 flex items-center justify-center text-gray-800 hover:bg-gray-50 active:scale-95 transition-all cursor-pointer"
        >
          <ChevronLeft size={22} className="stroke-[2.2]" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900 ml-3.5">
          {step === 'capture'
            ? 'Snap a Meal'
            : step === 'analyzing'
              ? 'Analyzing...'
              : step === 'clarification'
                ? 'Clarification'
                : 'Confirm'}
        </h1>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-3.5 rounded-2xl text-sm mb-4 border border-red-100">
          {error}
        </div>
      )}

      {/* Step 1: Capture */}
      {step === 'capture' && (
        <div className="space-y-4 mt-4">
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImageCapture}
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full aspect-[4/3] bg-white rounded-3xl flex flex-col items-center justify-center text-gray-500 hover:bg-gray-50 active:scale-[0.99] transition-all border-2 border-dashed border-gray-200 shadow-sm cursor-pointer"
          >
            <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-700 mb-3 shadow-xs">
              <Camera size={32} className="stroke-[1.75]" />
            </div>
            <span className="font-semibold text-gray-800 text-base">Take a Photo</span>
            <span className="text-xs text-gray-400 mt-1">Use camera to capture your meal</span>
          </button>

          <div className="relative flex py-3 items-center">
            <div className="flex-grow border-t border-gray-200" />
            <span className="flex-shrink-0 mx-4 text-gray-400 text-xs font-medium uppercase tracking-wider">
              or
            </span>
            <div className="flex-grow border-t border-gray-200" />
          </div>

          <label className="w-full flex items-center justify-center gap-2.5 p-4 bg-white border border-gray-200/90 rounded-2xl font-semibold text-sm text-gray-800 hover:bg-gray-50 active:scale-[0.99] transition-all cursor-pointer shadow-xs">
            <ImageIcon size={20} className="text-gray-600" />
            <span>Upload from Gallery</span>
            <input type="file" accept="image/*" className="hidden" onChange={handleImageCapture} />
          </label>
        </div>
      )}

      {/* Step 2: Analyzing */}
      {step === 'analyzing' && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          {image && (
            <div className="relative w-40 h-40 rounded-3xl overflow-hidden mb-6 shadow-md border border-gray-100">
              <img src={image} alt="Analyzing food" className="w-full h-full object-cover opacity-60" />
              <div className="absolute inset-0 bg-black/10 backdrop-blur-[1px] flex items-center justify-center">
                <Loader2 size={36} className="text-white animate-spin" />
              </div>
            </div>
          )}
          <h2 className="font-bold text-xl text-gray-900">AI is analyzing your food...</h2>
          <p className="text-gray-400 text-xs mt-1.5">Estimating calories, macros and portion sizes</p>
        </div>
      )}

      {/* Step 3: Clarification */}
      {step === 'clarification' && analysisResult && (
        <div className="py-4 space-y-5">
          <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Quick Question
            </p>
            <p className="text-gray-800 font-semibold text-base leading-snug">
              {analysisResult.clarificationQuestion}
            </p>
          </div>

          <div>
            <label htmlFor="clarify-input" className="block text-xs font-medium text-gray-500 mb-2">
              Your Answer
            </label>
            <input
              id="clarify-input"
              type="text"
              autoFocus
              value={clarificationAnswer}
              onChange={(e) => setClarificationAnswer(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-2xl p-4 text-sm focus:outline-none focus:border-black shadow-xs"
              placeholder="e.g. 2 tablespoons of olive oil, poached eggs"
            />
          </div>

          <button
            type="button"
            onClick={handleClarificationSubmit}
            disabled={!clarificationAnswer.trim()}
            className="w-full bg-[#212121] text-white font-semibold p-4 rounded-2xl hover:bg-black active:scale-[0.98] transition-all disabled:opacity-40 shadow-sm cursor-pointer"
          >
            Submit & Re-analyze
          </button>
        </div>
      )}

      {/* Step 4: Confirm (Matches Reference Exactly) */}
      {step === 'confirm' && confirmData && (
        <div className="space-y-4">
          {/* Food Image with Callout Badges & Lines */}
          <div className="relative w-full aspect-[4/3] rounded-[28px] overflow-hidden shadow-sm border border-gray-100 bg-gray-100">
            {image && (
              <img
                src={image}
                alt={confirmData.name}
                className="w-full h-full object-cover"
              />
            )}

            {/* SVG Connector Lines */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              {callouts.length >= 1 && (
                <>
                  <polyline
                    points="30,20 40,20 48,27"
                    fill="none"
                    stroke="white"
                    strokeWidth="0.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle
                    cx="48"
                    cy="27"
                    r="1.4"
                    fill="white"
                    stroke="white"
                    strokeWidth="0.5"
                  />
                </>
              )}
              {callouts.length >= 2 && (
                <>
                  <polyline
                    points="77,75 77,55"
                    fill="none"
                    stroke="white"
                    strokeWidth="0.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle
                    cx="77"
                    cy="55"
                    r="1.4"
                    fill="white"
                    stroke="white"
                    strokeWidth="0.5"
                  />
                </>
              )}
            </svg>

            {/* Callout Badge 1 (Top Left) */}
            {callouts[0] && (
              <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-md rounded-2xl px-3.5 py-2 shadow-md border border-white/60 pointer-events-none max-w-[150px]">
                <p className="font-bold text-xs text-gray-900 leading-tight truncate">
                  {callouts[0].name}
                </p>
                <p className="text-[10px] text-gray-500 font-medium leading-tight mt-0.5 truncate">
                  {callouts[0].portion}
                </p>
              </div>
            )}

            {/* Callout Badge 2 (Bottom Right) */}
            {callouts[1] && (
              <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-md rounded-2xl px-3.5 py-2 shadow-md border border-white/60 pointer-events-none max-w-[150px]">
                <p className="font-bold text-xs text-gray-900 leading-tight truncate">
                  {callouts[1].name}
                </p>
                <p className="text-[10px] text-gray-500 font-medium leading-tight mt-0.5 truncate">
                  {callouts[1].portion}
                </p>
              </div>
            )}
          </div>

          {/* Meal Title & Portion */}
          <div className="pt-1">
            <div className="flex items-start justify-between gap-3">
              {isEditingName ? (
                <input
                  type="text"
                  autoFocus
                  value={confirmData.name}
                  onChange={(e) => setConfirmData({ ...confirmData, name: e.target.value })}
                  onBlur={() => setIsEditingName(false)}
                  onKeyDown={(e) => e.key === 'Enter' && setIsEditingName(false)}
                  className="w-full text-2xl font-extrabold text-gray-900 tracking-tight leading-tight bg-white border border-gray-200 rounded-xl px-2 py-1"
                />
              ) : (
                <h2
                  onClick={() => setIsEditingName(true)}
                  className="text-2xl font-black text-gray-900 tracking-tight leading-tight cursor-pointer"
                >
                  {confirmData.name}
                </h2>
              )}
              <button
                type="button"
                onClick={() => setIsEditingName(!isEditingName)}
                aria-label="Edit title"
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer shrink-0 mt-1"
              >
                <Pencil size={18} className="stroke-[2]" />
              </button>
            </div>

            <p className="text-[10px] font-bold tracking-wider text-gray-400 uppercase mt-2">
              ESTIMATED PORTION
            </p>
            <p className="text-sm font-medium text-gray-500 mt-0.5">{confirmData.portion}</p>
          </div>

          {/* Nutritional Estimates Header & Confidence */}
          <div className="flex items-center justify-between pt-2">
            <h3 className="font-bold text-base text-gray-900">Nutritional Estimates</h3>
            <div className="bg-[#E8F8F0] text-[#16A34A] border border-[#D1F2DF] px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
              <CheckCircle2 size={13} className="stroke-[2.5]" />
              <span>{confirmData.confidence || 'High'} Confidence</span>
            </div>
          </div>

          {/* Calories Card */}
          <div className="bg-white rounded-3xl p-6 shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-gray-100/90">
            <div className="flex justify-between items-center mb-3">
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                CALORIES
              </span>
              <Flame size={22} className="text-gray-900 stroke-[1.75]" />
            </div>

            <div className="flex items-baseline">
              <span className="text-6xl font-black text-gray-900 tracking-tight leading-none">
                {Math.round(confirmData.calories || 0)}
              </span>
              <span className="text-xl font-medium text-gray-500 ml-2">kcal</span>
            </div>
          </div>

          {/* Macros Grid (Protein, Carbs, Fat) */}
          <div className="grid grid-cols-3 gap-3">
            {/* Protein */}
            <div className="bg-white rounded-[22px] p-3.5 shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-gray-100/90 flex flex-col justify-between">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="w-1.5 h-3.5 rounded-full bg-[#E06D6D]" />
                <span className="text-xs font-medium text-gray-500">Protein</span>
              </div>
              <div className="flex items-baseline my-1">
                <span className="text-3xl font-bold text-gray-900 leading-none">
                  {Math.round(confirmData.protein || 0)}
                </span>
                <span className="text-sm font-medium text-gray-400 ml-0.5">g</span>
              </div>
              <div className="h-1.5 w-full bg-[#FCE8E8] rounded-full mt-3 overflow-hidden">
                <div
                  className="h-full bg-[#E06D6D] rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(((confirmData.protein || 0) / proteinTarget) * 100, 100)}%`,
                  }}
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
                  {Math.round(confirmData.carbs || 0)}
                </span>
                <span className="text-sm font-medium text-gray-400 ml-0.5">g</span>
              </div>
              <div className="h-1.5 w-full bg-[#FEF4E6] rounded-full mt-3 overflow-hidden">
                <div
                  className="h-full bg-[#EAA135] rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(((confirmData.carbs || 0) / carbsTarget) * 100, 100)}%`,
                  }}
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
                  {Math.round(confirmData.fat || 0)}
                </span>
                <span className="text-sm font-medium text-gray-400 ml-0.5">g</span>
              </div>
              <div className="h-1.5 w-full bg-[#F3F0FE] rounded-full mt-3 overflow-hidden">
                <div
                  className="h-full bg-[#9B87F5] rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(((confirmData.fat || 0) / fatTarget) * 100, 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Meal Type Selection */}
          <div className="pt-2">
            <div className="flex items-baseline gap-1 mb-2.5">
              <span className="font-bold text-sm text-gray-900">Meal Type</span>
              <span className="text-xs text-gray-400 font-normal">· Optional</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              {(['Breakfast', 'Lunch', 'Dinner', 'Snack'] as MealType[]).map((meal) => {
                const isSelected = selectedMeal === meal;
                return (
                  <button
                    key={meal}
                    type="button"
                    onClick={() => setSelectedMeal(isSelected ? null : meal)}
                    className={`flex-1 py-2.5 px-2 rounded-full text-xs font-semibold transition-all cursor-pointer text-center ${
                      isSelected
                        ? 'bg-[#212121] text-white shadow-sm'
                        : 'bg-white text-gray-600 border border-gray-200/90 hover:bg-gray-50'
                    }`}
                  >
                    {meal}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Save Button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleSave}
              className="w-full py-4 rounded-2xl bg-[#212121] hover:bg-black active:scale-[0.98] transition-all text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              <Check size={18} className="stroke-[2.5]" />
              <span>Save Log</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}