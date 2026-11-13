import { signInAnonymously } from "firebase/auth";
import { addDoc, collection, doc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase/firebaseConfig";
import { saveTodayNutrition } from "./nutritionPersistence";
import { passData } from "./passData";

/**
 * Demo mode: signs the visitor in with a Firebase *anonymous* account (no email or password needed)
 * and fills it with sample profile data, a week of weights, a few workouts and today's meals,
 * using the same Firestore documents the app already reads.
 */

const dayOffset = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
};
const dateKey = (days: number) => dayOffset(days).toISOString().split("T")[0];

export interface PersonalData {
  age: string;
  weight: string;
  height: string;
  sex: string;
  targetWeight: string;
  activityLevel: string;
  goal: string;
}

/** Local nutrition plan (Mifflin-St Jeor), used when the AI plan cannot be generated. */
export function fallbackPlan(data: PersonalData) {
  const weight = Number(data.weight) || 70;
  const height = Number(data.height) || 170;
  const age = Number(data.age) || 25;
  const male = data.sex.trim().toLowerCase().startsWith("m");
  const bmr = 10 * weight + 6.25 * height - 5 * age + (male ? 5 : -161);

  const activity = data.activityLevel.toLowerCase();
  const factor = activity.includes("activ") && !activity.includes("sed") ? 1.725 : activity.includes("moderat") ? 1.55 : 1.2;

  const goal = data.goal.toLowerCase();
  const adjust = goal.includes("sl") ? -400 : goal.includes("mas") ? 300 : 0;

  const dailyCalories = Math.round(bmr * factor + adjust);
  const dailyProtein = Math.round(weight * 1.8);
  const dailyFat = Math.round((dailyCalories * 0.25) / 9);
  const dailyCarbs = Math.max(0, Math.round((dailyCalories - dailyProtein * 4 - dailyFat * 9) / 4));
  const dailyWater = Math.round(weight * 0.035 * 10) / 10;

  return { dailyCalories, dailyProtein, dailyCarbs, dailyFat, dailyWater };
}

async function seedDemoData(uid: string) {
  const profile: PersonalData = {
    age: "24",
    weight: "74",
    height: "178",
    sex: "M",
    targetWeight: "70",
    activityLevel: "moderat",
    goal: "slăbire",
  };

  const weights = [74.6, 74.4, 74.3, 74.0, 73.9, 73.6, 73.5];
  const plan = fallbackPlan(profile);
  const progress = weights.map((weight, i) => ({
    date: dateKey(weights.length - i),
    weight,
    protein: Math.round(plan.dailyProtein * 0.95),
    metDiet: i >= 4,
  }));

  await setDoc(
    doc(db, "users", uid),
    {
      ...profile,
      hasHealthCondition: false,
      healthConditionName: "",
      plan,
      progress,
      streak: 3,
      lastLogDate: dateKey(1),
      isDemo: true,
      createdAt: new Date(),
    },
    { merge: true },
  );

  const logs = [
    { presetId: "upper-day", presetName: "Upper Body Day", difficulty: "intermediate", totalSets: 12, completedSets: 11, totalVolume: 118, days: 1 },
    { presetId: "core-day", presetName: "Core Day", difficulty: "intermediate", totalSets: 9, completedSets: 9, totalVolume: 96, days: 3 },
    { presetId: "leg-day", presetName: "Leg Day", difficulty: "intermediate", totalSets: 12, completedSets: 10, totalVolume: 104, days: 5 },
    { presetId: "beginner-full", presetName: "Beginner Full Body", difficulty: "beginner", totalSets: 9, completedSets: 9, totalVolume: 90, days: 6 },
  ];
  for (const { days, ...log } of logs) {
    await addDoc(collection(db, `users/${uid}/workoutLogs`), {
      ...log,
      isCustom: false,
      completedAt: dayOffset(days).toISOString(),
    });
  }

  const meals = { calories: 820, protein: 52, carbs: 96 };
  await saveTodayNutrition(uid, meals);
  // The auth listener already ran before the data existed, so refresh the in-memory totals.
  passData.getState().setTotals(meals);
}

function friendlyAuthError(error: any): string {
  const code = String(error?.code ?? "");
  if (code.includes("admin-restricted-operation") || code.includes("operation-not-allowed")) {
    return "Contul demo nu este disponibil: autentificarea anonimă nu este activată în proiectul Firebase (sau proiectul gratuit a expirat).";
  }
  if (code.includes("network")) return "Fără conexiune la internet.";
  return `Nu am putut porni contul demo. ${error?.message ?? ""}`.trim();
}

/** Starts the demo session. Resolves to an error message, or null on success. */
export async function startDemo(): Promise<string | null> {
  let uid: string;
  try {
    const cred = await signInAnonymously(auth);
    uid = cred.user.uid;
  } catch (error: any) {
    return friendlyAuthError(error);
  }

  try {
    await seedDemoData(uid);
  } catch (error: any) {
    // Signed in, but the sample data could not be written (e.g. Firestore rules or an expired project).
    console.log("Demo seed failed", error);
    return "Contul demo a fost creat, dar datele de exemplu nu au putut fi salvate (regulile Firestore sau proiectul gratuit Firebase pot fi expirate).";
  }
  return null;
}
