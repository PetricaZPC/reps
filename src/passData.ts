import { create } from "zustand";

interface CalorieStore {
  calories: number;
  protein: number;
  carbs: number;
  addCalories: (val: number) => void;
  addProtein: (val: number) => void;
  addCarbs: (val: number) => void;
}

export const passData = create<CalorieStore>((set) => ({
  calories: 0,
  protein: 0,
  carbs: 0,
  addCalories: (val) => set((state) => ({ calories: state.calories + val })),
  addProtein: (val) => set((state) => ({ protein: state.protein + val })),
  addCarbs: (val) => set((state) => ({ carbs: state.carbs + val })),
}));
