import { loadNutrition, saveNutrition } from "./store";

export interface DailyNutritionTotals {
  calories: number;
  protein: number;
  carbs: number;
}

export async function loadTodayNutrition(
  uid: string,
): Promise<DailyNutritionTotals | null> {
  return loadNutrition(uid);
}

export async function saveTodayNutrition(
  uid: string,
  totals: DailyNutritionTotals,
): Promise<void> {
  return saveNutrition(uid, totals);
}
