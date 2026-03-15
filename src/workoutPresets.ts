import { EXERCISES, ExerciseConfig } from "./exercises";

export interface WorkoutPreset {
  id: string;
  name: string;
  description: string;
  exercises: string[];
  difficulty: "beginner" | "intermediate" | "advanced";
  // Target-uri custom per exercițiu (reps sau secunde)
  // Dacă lipsește pentru un exercițiu, se folosește default-ul din difficulty
  customTargets?: Record<string, number>;
  // Număr de seturi custom (suprascrie getSets din difficulty)
  customSets?: number;
}

export const WORKOUT_PRESETS: WorkoutPreset[] = [
  // ─── BEGINNER ──────────────────────────────────────────────
  {
    id: "beginner-full",
    name: "Full Body Start",
    description: "Antrenament de bază pentru tot corpul. Ideal pentru început.",
    exercises: ["squats", "pushups", "lunges", "gluteBridge", "plank"],
    difficulty: "beginner",
    customSets: 2, // 2 runde sunt perfecte pentru a evita febra musculară extremă
    customTargets: {
      pushups: 8,       // Mai puține flotări la început
      squats: 12,
      plank: 30,        // 30 de secunde de planșă
    },
  },
  {
    id: "beginner-core",
    name: "Core Foundations",
    description: "Întărește abdomenul și zona lombară fără să forțezi spatele.",
    exercises: ["deadBug", "gluteBridge", "situps", "plank"],
    difficulty: "beginner",
    customSets: 2,
    customTargets: {
      deadBug: 12,
      situps: 10,
      plank: 30,
    },
  },

  // ─── INTERMEDIATE ──────────────────────────────────────────
  {
    id: "upper-body-build",
    name: "Upper Body Build",
    description: "Piept, umeri și triceps. Construiește forță.",
    exercises: ["pushups", "widePushups", "pikePushups", "dips", "plank"],
    difficulty: "intermediate",
    customSets: 3,
    customTargets: {
      pushups: 15,
      widePushups: 12,
      pikePushups: 10,  // Mai grele pentru umeri
      dips: 15,
      plank: 45,        // 45 secunde
    },
  },
  {
    id: "lower-body-power",
    name: "Lower Body Power",
    description: "Picioare puternice: cvadricepși, femurali și gambe.",
    exercises: ["squats", "lunges", "stepUps", "calfRaises", "wallSit"],
    difficulty: "intermediate",
    customSets: 3,
    customTargets: {
      squats: 20,
      calfRaises: 25,   // Gambele duc volum mai mare
      wallSit: 45,      // 45 secunde de izometrie
    },
  },
  {
    id: "core-shred",
    name: "Core Shred",
    description: "Circuit intens pentru definirea abdomenului.",
    exercises: ["situps", "legRaises", "mountainClimbers", "sidePlank"],
    difficulty: "intermediate",
    customSets: 3,
    customTargets: {
      situps: 20,
      legRaises: 15,
      mountainClimbers: 30, // Cardio core
      sidePlank: 30,        // 30 secunde pe o parte
    },
  },
  {
    id: "hiit-fat-burner",
    name: "HIIT Fat Burner",
    description: "Transpiră intens! Sărituri și mișcări dinamice.",
    exercises: ["jumpingJacks", "highKnees", "mountainClimbers", "squats", "burpees"],
    difficulty: "intermediate",
    customSets: 4, // 4 runde pentru un efect cardio veritabil
    customTargets: {
      jumpingJacks: 40,
      highKnees: 30,
      burpees: 10,
    },
  },
  {
    id: "pull-day",
    name: "Pull Day & Core",
    description: "Concentrează-te pe spate, bicepși și un core stabil.",
    exercises: ["pullups", "deadBug", "gluteBridge", "plank"],
    difficulty: "intermediate",
    customSets: 3,
    customTargets: {
      pullups: 8,       // Tracțiunile sunt grele
      plank: 60,
    },
  },

  // ─── ADVANCED ──────────────────────────────────────────────
  {
    id: "push-day-pro",
    name: "Push Day Pro",
    description: "Distruge-ți pieptul și tricepsul cu volum mare.",
    exercises: ["diamondPushups", "widePushups", "pikePushups", "pushups", "dips"],
    difficulty: "advanced",
    customSets: 4,
    customTargets: {
      diamondPushups: 15,
      widePushups: 20,
      pikePushups: 15,
      pushups: 20,      // Burnout
      dips: 20,
    },
  },
  {
    id: "spartan-full",
    name: "Spartan Full Body",
    description: "Cel mai greu antrenament. Testează-ți limitele absolut.",
    exercises: ["pullups", "burpees", "diamondPushups", "lunges", "legRaises"],
    difficulty: "advanced",
    customSets: 4, // Spartan = Volum uriaș
    customTargets: {
      pullups: 12,
      burpees: 15,
      diamondPushups: 20,
      lunges: 24,       // 12 pe picior
    },
  },
  {
    id: "leg-day-pro",
    name: "Leg Day Pro",
    description: "Volum maxim pentru picioare. Vei merge greu mâine.",
    exercises: ["squats", "lunges", "stepUps", "gluteBridge", "calfRaises", "wallSit"],
    difficulty: "advanced",
    customSets: 4,
    customTargets: {
      squats: 25,
      lunges: 20,
      calfRaises: 30,
      wallSit: 60,      // Un minut întreg
    },
  },
];

export const getExerciseByKey = (key: string): ExerciseConfig => {
  const ex = EXERCISES[key];
  if (ex) return ex;
  return {
    name: `Exercițiu: ${key}`,
    landmarks: ["leftShoulder", "leftElbow", "leftWrist"],
    minAngle: 80,
    maxAngle: 150,
    side: "both" as const,
    countOn: "up" as const,
    type: "reps" as const,
    description: "Config lipsă — verifică datele presetului.",
    cameraPosition: "Așază telefonul lateral, la nivelul umerilor.",
    muscleGroup: "fullbody" as const,
    formRules: [],
  };
};

export const getPresetExercises = (preset: WorkoutPreset) =>
  preset.exercises.map((key) => getExerciseByKey(key)).filter(Boolean);