import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { create } from "zustand";
import { auth, db } from "../firebase/firebaseConfig";

/**
 * Data layer with two backends:
 *  - normal mode: Firebase Auth + Firestore (unchanged behaviour);
 *  - demo mode: everything is kept on the device (AsyncStorage), with no account and no network.
 * Screens call these helpers instead of talking to Firestore directly.
 */

let AsyncStorage: any = null;
try {
  const mod = require("@react-native-async-storage/async-storage");
  AsyncStorage = mod?.default ?? mod;
} catch {
  AsyncStorage = null;
}
const hasStorage =
  !!AsyncStorage &&
  typeof AsyncStorage.getItem === "function" &&
  typeof AsyncStorage.setItem === "function";

// ─── Tiny key/value store (device storage with in-memory fallback) ───
const memory: Record<string, string> = {};
const kvGet = async (key: string): Promise<any> => {
  try {
    const raw = hasStorage ? await AsyncStorage.getItem(key) : memory[key];
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};
const kvSet = async (key: string, value: any) => {
  const raw = JSON.stringify(value);
  memory[key] = raw;
  try {
    if (hasStorage) await AsyncStorage.setItem(key, raw);
  } catch {
    // storage unavailable: the demo keeps working until the app is closed
  }
};
const kvRemove = async (key: string) => {
  delete memory[key];
  try {
    if (hasStorage) await AsyncStorage.removeItem(key);
  } catch {
    // ignore
  }
};

// ─── Demo session state ───
const DEMO_FLAG = "reps_demo_flag";
const DEMO_DATA = "reps_demo_data";
export const DEMO_UID = "demo-user";

interface SessionState {
  demo: boolean;
  ready: boolean;
  setDemo: (demo: boolean) => void;
  setReady: () => void;
}

export const useSession = create<SessionState>((set) => ({
  demo: false,
  ready: false,
  setDemo: (demo) => set({ demo }),
  setReady: () => set({ ready: true }),
}));

export const isDemo = () => useSession.getState().demo;

/** Reads the saved demo flag once when the app starts. */
export async function restoreSession() {
  const flag = await kvGet(DEMO_FLAG);
  if (flag === true) useSession.getState().setDemo(true);
  useSession.getState().setReady();
}

export async function beginDemo(initialData: DemoData) {
  await kvSet(DEMO_DATA, initialData);
  await kvSet(DEMO_FLAG, true);
  useSession.getState().setDemo(true);
}

export async function endDemo() {
  await kvRemove(DEMO_DATA);
  await kvRemove(DEMO_FLAG);
  useSession.getState().setDemo(false);
}

/** Signs out of Firebase, or leaves the demo. */
export async function signOutAll() {
  if (isDemo()) {
    await endDemo();
    return;
  }
  await auth.signOut();
}

export interface AppUser {
  uid: string;
  email: string | null;
  isDemo: boolean;
}

/** The signed-in user (a Firebase user, or the local demo user). */
export function getCurrentUser(): AppUser | null {
  if (isDemo()) return { uid: DEMO_UID, email: null, isDemo: true };
  const u = auth.currentUser;
  return u ? { uid: u.uid, email: u.email, isDemo: false } : null;
}

// ─── Demo data ───
export interface DemoData {
  user: any;
  workoutLogs: any[];
  customWorkouts: any[];
  nutrition: Record<string, { calories: number; protein: number; carbs: number }>;
}

const loadDemo = async (): Promise<DemoData> =>
  (await kvGet(DEMO_DATA)) ?? { user: {}, workoutLogs: [], customWorkouts: [], nutrition: {} };
const saveDemo = (data: DemoData) => kvSet(DEMO_DATA, data);
const localId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

// ─── User document (profile, plan, progress) ───
export async function getUserDoc(uid: string): Promise<any | null> {
  if (isDemo()) {
    const { user } = await loadDemo();
    return user && Object.keys(user).length ? user : null;
  }
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : null;
}

/** Merge-writes fields into the user document (creates it when missing). */
export async function mergeUserDoc(uid: string, data: any): Promise<void> {
  if (isDemo()) {
    const demo = await loadDemo();
    demo.user = { ...demo.user, ...data };
    await saveDemo(demo);
    return;
  }
  await setDoc(doc(db, "users", uid), data, { merge: true });
}

/** Overwrites the user document (used by sign-up). */
export async function setUserDoc(uid: string, data: any): Promise<void> {
  if (isDemo()) {
    const demo = await loadDemo();
    demo.user = data;
    await saveDemo(demo);
    return;
  }
  await setDoc(doc(db, "users", uid), data);
}

export async function updateUserDoc(uid: string, patch: any): Promise<void> {
  if (isDemo()) return mergeUserDoc(uid, patch);
  await updateDoc(doc(db, "users", uid), patch);
}

// ─── Workout logs ───
export async function listWorkoutLogs(uid: string, max = 10): Promise<any[]> {
  if (isDemo()) {
    const { workoutLogs } = await loadDemo();
    return [...workoutLogs]
      .sort((a, b) => String(b.completedAt).localeCompare(String(a.completedAt)))
      .slice(0, max);
  }
  const q = query(collection(db, `users/${uid}/workoutLogs`), orderBy("completedAt", "desc"), limit(max));
  const snap = await getDocs(q);
  const logs: any[] = [];
  snap.forEach((d) => logs.push({ id: d.id, ...(d.data() as any) }));
  return logs;
}

export async function addWorkoutLog(uid: string, log: any): Promise<void> {
  if (isDemo()) {
    const demo = await loadDemo();
    demo.workoutLogs.push({ id: localId(), ...log });
    await saveDemo(demo);
    return;
  }
  await addDoc(collection(db, `users/${uid}/workoutLogs`), log);
}

// ─── Custom workouts ───
export async function listCustomWorkouts(uid: string): Promise<any[]> {
  if (isDemo()) return (await loadDemo()).customWorkouts;
  const snap = await getDocs(query(collection(db, `users/${uid}/customWorkouts`)));
  const items: any[] = [];
  snap.forEach((d) => items.push({ id: d.id, ...d.data() }));
  return items;
}

export async function addCustomWorkout(uid: string, workout: any): Promise<void> {
  if (isDemo()) {
    const demo = await loadDemo();
    demo.customWorkouts.push({ id: localId(), ...workout });
    await saveDemo(demo);
    return;
  }
  await addDoc(collection(db, `users/${uid}/customWorkouts`), workout);
}

export async function deleteCustomWorkout(uid: string, id: string): Promise<void> {
  if (isDemo()) {
    const demo = await loadDemo();
    demo.customWorkouts = demo.customWorkouts.filter((w) => w.id !== id);
    await saveDemo(demo);
    return;
  }
  await deleteDoc(doc(db, `users/${uid}/customWorkouts`, id));
}

// ─── Daily nutrition ───
const todayKey = () => new Date().toISOString().split("T")[0];

export async function loadNutrition(uid: string) {
  if (isDemo()) {
    const { nutrition } = await loadDemo();
    return nutrition?.[todayKey()] ?? null;
  }
  const snap = await getDoc(doc(db, "nutrition", `${uid}_${todayKey()}`));
  if (!snap.exists()) return null;
  const data = snap.data() as any;
  return {
    calories: Number(data?.calories) || 0,
    protein: Number(data?.protein) || 0,
    carbs: Number(data?.carbs) || 0,
  };
}

export async function saveNutrition(
  uid: string,
  totals: { calories: number; protein: number; carbs: number },
) {
  if (isDemo()) {
    const demo = await loadDemo();
    demo.nutrition = { ...(demo.nutrition ?? {}), [todayKey()]: totals };
    await saveDemo(demo);
    return;
  }
  await setDoc(
    doc(db, "nutrition", `${uid}_${todayKey()}`),
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
