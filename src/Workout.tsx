import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Camera from '../src/Camera';
import { EXERCISES, ExerciseConfig } from '../src/exercises';
import { WORKOUT_PRESETS, WorkoutPreset } from '../src/workoutPresets';
import WorkoutSession, { WorkoutResult } from '../src/WorkoutSession';
import WorkoutSummary from '../src/WorkoutSummary';

type Screen = 'home' | 'single_exercise' | 'workout_overview' | 'workout_session' | 'workout_summary';

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: '#22c55e',
  intermediate: '#f59e0b',
  advanced: '#ef4444',
};

export default function Workout() {
  const [screen, setScreen] = useState<Screen>('home');
  const [selectedExercise, setSelectedExercise] = useState<ExerciseConfig | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<WorkoutPreset | null>(null);
  const [workoutResults, setWorkoutResults] = useState<WorkoutResult[]>([]);

  if (screen === 'single_exercise' && selectedExercise) {
    return (
      <Camera
        exercise={selectedExercise}
        onExit={() => {
          setSelectedExercise(null);
          setScreen('home');
        }}
      />
    );
  }

  if (screen === 'workout_session' && selectedPreset) {
    return (
      <WorkoutSession
        preset={selectedPreset}
        onFinish={(results) => {
          setWorkoutResults(results);
          setScreen('workout_summary');
        }}
        onExit={() => {
          setSelectedPreset(null);
          setScreen('home');
        }}
      />
    );
  }

  if (screen === 'workout_summary' && selectedPreset) {
    return (
      <WorkoutSummary
        preset={selectedPreset}
        results={workoutResults}
        onClose={() => {
          setSelectedPreset(null);
          setWorkoutResults([]);
          setScreen('home');
        }}
      />
    );
  }

  if (screen === 'workout_overview' && selectedPreset) {
    const totalSets = selectedPreset.difficulty === 'beginner' ? 2
      : selectedPreset.difficulty === 'intermediate' ? 3 : 4;

    return (
      <ScrollView style={{ flex: 1, backgroundColor: '#111' }} contentContainerStyle={{ padding: 24, paddingBottom: 40 }}>
        <Pressable onPress={() => setScreen('home')} style={{ marginTop: 20, marginBottom: 24 }}>
          <Text style={{ color: '#9ca3af', fontSize: 15 }}>← Back</Text>
        </Pressable>

        <Text style={{ color: '#fff', fontSize: 26, fontWeight: 'bold', marginBottom: 4 }}>
          {selectedPreset.name}
        </Text>
        <Text style={{ color: '#6b7280', fontSize: 14, marginBottom: 24 }}>
          {selectedPreset.description}
        </Text>

        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
          <View style={{ flex: 1, backgroundColor: '#1f2937', borderRadius: 12, padding: 14, alignItems: 'center' }}>
            <Text style={{ color: '#facc15', fontSize: 22, fontWeight: 'bold' }}>
              {selectedPreset.exercises.length}
            </Text>
            <Text style={{ color: '#9ca3af', fontSize: 12 }}>Exercises</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: '#1f2937', borderRadius: 12, padding: 14, alignItems: 'center' }}>
            <Text style={{ color: '#facc15', fontSize: 22, fontWeight: 'bold' }}>{totalSets}</Text>
            <Text style={{ color: '#9ca3af', fontSize: 12 }}>Sets each</Text>
          </View>
          <View style={{ flex: 1, backgroundColor: '#1f2937', borderRadius: 12, padding: 14, alignItems: 'center' }}>
            <Text style={{ color: DIFFICULTY_COLORS[selectedPreset.difficulty], fontSize: 14, fontWeight: 'bold', textTransform: 'capitalize' }}>
              {selectedPreset.difficulty}
            </Text>
            <Text style={{ color: '#9ca3af', fontSize: 12 }}>Level</Text>
          </View>
        </View>

        <Text style={{ color: '#9ca3af', fontSize: 13, fontWeight: '600', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
          Exercises
        </Text>

        {selectedPreset.exercises.map((key, idx) => {
          const ex = EXERCISES[key];
          if (!ex) return null;
          return (
            <View key={key} style={{ backgroundColor: '#1f2937', borderRadius: 12, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#374151', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                <Text style={{ color: '#9ca3af', fontSize: 13, fontWeight: 'bold' }}>{idx + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#fff', fontWeight: '600', fontSize: 15 }}>{ex.name}</Text>
                <Text style={{ color: '#6b7280', fontSize: 12, marginTop: 2 }}>{ex.muscleGroup}</Text>
              </View>
              <Text style={{ color: '#4b5563', fontSize: 16 }}>
                {ex.type === 'timed' ? '⏱' : '🔄'}
              </Text>
            </View>
          );
        })}

        <Pressable
          onPress={() => setScreen('workout_session')}
          style={{ backgroundColor: '#16a34a', paddingVertical: 18, borderRadius: 14, alignItems: 'center', marginTop: 24 }}
        >
          <Text style={{ color: '#fff', fontSize: 20, fontWeight: 'bold' }}>Start Workout</Text>
        </Pressable>
      </ScrollView>
    );
  }

  // HOME SCREEN
  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#111' }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text style={{ color: '#fff', fontSize: 26, fontWeight: 'bold', marginBottom: 4, marginTop: 20 }}>
        Workout
      </Text>
      <Text style={{ color: '#6b7280', fontSize: 14, marginBottom: 24 }}>
        Choose a workout or a single exercise
      </Text>

      <Text style={{ color: '#9ca3af', fontSize: 13, fontWeight: '600', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
        Workouts
      </Text>

      {WORKOUT_PRESETS.map((preset) => (
        <Pressable
          key={preset.id}
          onPress={() => {
            setSelectedPreset(preset);
            setScreen('workout_overview');
          }}
          style={{ backgroundColor: '#1f2937', borderRadius: 14, padding: 16, marginBottom: 12 }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 17 }}>{preset.name}</Text>
              <Text style={{ color: '#6b7280', fontSize: 13, marginTop: 2 }}>{preset.description}</Text>
              <Text style={{ color: '#6b7280', fontSize: 12, marginTop: 6 }}>
                {preset.exercises.length} exercises
              </Text>
            </View>
            <View style={{
              backgroundColor: DIFFICULTY_COLORS[preset.difficulty] + '22',
              borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
            }}>
              <Text style={{ color: DIFFICULTY_COLORS[preset.difficulty], fontSize: 12, fontWeight: '600', textTransform: 'capitalize' }}>
                {preset.difficulty}
              </Text>
            </View>
          </View>
        </Pressable>
      ))}

      <Text style={{ color: '#9ca3af', fontSize: 13, fontWeight: '600', marginTop: 16, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
        Single Exercise
      </Text>

      {Object.entries(EXERCISES).map(([key, ex]) => (
        <Pressable
          key={key}
          onPress={() => {
            setSelectedExercise(ex);
            setScreen('single_exercise');
          }}
          style={{ backgroundColor: '#1f2937', borderRadius: 12, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center' }}
        >
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 15 }}>{ex.name}</Text>
            <Text style={{ color: '#6b7280', fontSize: 12, marginTop: 2 }}>{ex.muscleGroup}</Text>
          </View>
          <Text style={{ color: '#4b5563', fontSize: 18 }}>›</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}