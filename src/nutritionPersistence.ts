import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase/firebaseConfig";

export interface DailyNutritionTotals {
  calories: number;
  protein: number;
  carbs: number;
}

const todayKey = () => new Date().toISOString().split("T")[0];

const nutritionDocId = (uid: string) => `${uid}_${todayKey()}`;

export async function loadTodayNutrition(
  uid: string,
): Promise<DailyNutritionTotals | null> {
  const ref = doc(db, "nutrition", nutritionDocId(uid));
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;

  const data = snap.data() as any;
  return {
    calories: Number(data?.calories) || 0,
    protein: Number(data?.protein) || 0,
    carbs: Number(data?.carbs) || 0,
  };
}

export async function saveTodayNutrition(
  uid: string,
  totals: DailyNutritionTotals,
): Promise<void> {
  const ref = doc(db, "nutrition", nutritionDocId(uid));
  await setDoc(
    ref,
    {
      uid,
      date: todayKey(),
      calories: totals.calories,
      protein: totals.protein,
      carbs: totals.carbs,
      updatedAt: new Date().toISOString(),
    },
    { merge: true },
  );
}
