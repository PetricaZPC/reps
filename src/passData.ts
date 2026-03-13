import { create } from 'zustand';

interface CalorieStore {
  calories: number;
  addCalories: (val: number) => void;
}

export const passData = create<CalorieStore>((set) => ({
  calories: 0,
  addCalories: (val) => set((state) => ({ calories: state.calories + val })),
}));