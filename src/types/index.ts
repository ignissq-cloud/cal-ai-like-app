export type MealType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack' | 'Uncategorized';

export interface NutritionData {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
}

export interface FoodItem extends NutritionData {
  id: string;
  name: string;
  portion: string;
  ingredients: string[];
  imageUrl?: string;
  mealType: MealType | null;
  date: string; // ISO format date 'YYYY-MM-DD'
  timestamp: number;
}

export interface AIAnalysisResult extends NutritionData {
  name: string;
  portion: string;
  ingredients: string[];
  clarificationQuestion?: string;
  needsClarification?: boolean;
  confidence?: string;
}

export interface Profile {
  age?: string;
  height?: string;
  weight?: string;
  activityLevel?: string;
  dietaryPreferences?: string;
}

export interface DaySummary extends NutritionData {
  date: string;
  waterIntake: number; // in ml
}
