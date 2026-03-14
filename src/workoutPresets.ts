import { EXERCISES } from './exercises';

export interface WorkoutPreset {
  id: string;
  name: string;
  description: string;
  exercises: string[]; // Array of exercise keys from EXERCISES
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

// Pre-defined workout presets
export const WORKOUT_PRESETS: WorkoutPreset[] = [
  {
    id: 'upper-day',
    name: 'Upper Body Day',
    description: 'Chest, back, shoulders, and arms',
    exercises: [
      'pushups',
      'diamondPushups',
      'widePushups',
      'pikePushups',
      'dips',
      'plank',
    ],
    difficulty: 'intermediate',
  },
  {
    id: 'lower-day',
    name: 'Lower Body Day',
    description: 'Quads, hamstrings, glutes, and calves',
    exercises: [
      'squats',
      'lunges',
      'stepUps',
      'gluteBridge',
      'calfRaises',
      'wallSit',
    ],
    difficulty: 'intermediate',
  },
  {
    id: 'full-day',
    name: 'Full Body Day',
    description: 'Complete body workout',
    exercises: [
      'squats',
      'pushups',
      'lunges',
      'plank',
      'mountainClimbers',
      'burpees',
    ],
    difficulty: 'advanced',
  },
  {
    id: 'core-day',
    name: 'Core Day',
    description: 'Abs and core strength',
    exercises: [
      'situps',
      'plank',
      'mountainClimbers',
      'deadBug',
      'legRaises',
      'sidePlank',
    ],
    difficulty: 'intermediate',
  },
  {
    id: 'push-day',
    name: 'Push Day',
    description: 'Chest, shoulders, triceps',
    exercises: [
      'pushups',
      'widePushups',
      'diamondPushups',
      'pikePushups',
      'dips',
      'wallPushup',
    ],
    difficulty: 'beginner',
  },
  {
    id: 'pull-day',
    name: 'Pull Day',
    description: 'Back and biceps',
    exercises: [
      'pullups',
      'plank',
      'deadBug',
      'gluteBridge',
    ],
    difficulty: 'intermediate',
  },
  {
    id: 'leg-day',
    name: 'Leg Day',
    description: 'Lower body focus',
    exercises: [
      'squats',
      'lunges',
      'stepUps',
      'gluteBridge',
      'wallSit',
      'calfRaises',
    ],
    difficulty: 'intermediate',
  },
  {
    id: 'quick-cardio',
    name: 'Quick Cardio',
    description: 'Fast-paced cardio workout',
    exercises: [
      'jumpingJacks',
      'highKnees',
      'mountainClimbers',
      'burpees',
    ],
    difficulty: 'advanced',
  },
  {
    id: 'beginner-full',
    name: 'Beginner Full Body',
    description: 'Perfect for beginners',
    exercises: [
      'wallPushup',
      'squats',
      'gluteBridge',
      'plank',
    ],
    difficulty: 'beginner',
  },
  {
    id: 'hiit-20',
    name: '20min HIIT',
    description: 'High intensity interval training',
    exercises: [
      'jumpingJacks',
      'squats',
      'highKnees',
      'mountainClimbers',
      'burpees',
      'plank',
    ],
    difficulty: 'advanced',
  },
];

// Helper function to get exercise config by key
export const getExerciseByKey = (key: string) => EXERCISES[key];

// Helper function to get all exercises in a preset
export const getPresetExercises = (preset: WorkoutPreset) => {
  return preset.exercises.map(key => getExerciseByKey(key)).filter(Boolean);
};
