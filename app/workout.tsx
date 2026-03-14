import { addDoc, collection, getDocs, query } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { auth, db } from '../firebase/firebaseConfig';
import Camera from '../src/Camera';
import { EXERCISES, ExerciseConfig, MuscleGroup } from '../src/exercises';
import { WORKOUT_PRESETS, WorkoutPreset, getPresetExercises } from '../src/workoutPresets';

type Screen = 'menu' | 'presets' | 'single' | 'custom' | 'customSelect' | 'workout';

interface CustomWorkout {
  id?: string;
  name: string;
  exercises: string[];
}

export default function Workout() {
  const [screen, setScreen] = useState<Screen>('menu');
  const [selectedExercise, setSelectedExercise] = useState<ExerciseConfig | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<WorkoutPreset | null>(null);
  const [customWorkoutName, setCustomWorkoutName] = useState('');
  const [selectedExercises, setSelectedExercises] = useState<string[]>([]);
  const [savedWorkouts, setSavedWorkouts] = useState<CustomWorkout[]>([]);

  // Load custom workouts from Firebase
  useEffect(() => {
    const loadCustomWorkouts = async () => {
      if (!auth.currentUser) return;
      try {
        const q = query(
          collection(db, `users/${auth.currentUser.uid}/customWorkouts`)
        );
        const snapshot = await getDocs(q);
        const workouts: CustomWorkout[] = [];
        snapshot.forEach((doc) => {
          workouts.push({ id: doc.id, ...doc.data() } as CustomWorkout);
        });
        setSavedWorkouts(workouts);
      } catch (error) {
        console.log('Error loading custom workouts:', error);
      }
    };
    loadCustomWorkouts();
  }, [screen]);

  // Save custom workout to Firebase
  const saveCustomWorkout = async () => {
    if (!auth.currentUser) {
      Alert.alert('Error', 'Please login first');
      return;
    }
    if (!customWorkoutName.trim()) {
      Alert.alert('Error', 'Please enter a workout name');
      return;
    }
    if (selectedExercises.length === 0) {
      Alert.alert('Error', 'Please select at least one exercise');
      return;
    }
    try {
      await addDoc(collection(db, `users/${auth.currentUser.uid}/customWorkouts`), {
        name: customWorkoutName,
        exercises: selectedExercises,
        createdAt: new Date().toISOString(),
      });
      Alert.alert('Success', 'Workout saved!');
      setCustomWorkoutName('');
      setSelectedExercises([]);
      setScreen('menu');
    } catch (error) {
      Alert.alert('Error', 'Failed to save workout');
    }
  };

  // Toggle exercise selection
  const toggleExercise = (key: string) => {
    setSelectedExercises(prev => 
      prev.includes(key) 
        ? prev.filter(k => k !== key)
        : [...prev, key]
    );
  };

  // Start workout from preset or custom
  const startWorkoutFromList = (exerciseKeys: string[], index: number = 0) => {
    if (index >= exerciseKeys.length) {
      // Workout complete - go back to menu
      setSelectedPreset(null);
      setScreen('menu');
      return;
    }
    const exercise = EXERCISES[exerciseKeys[index]];
    if (exercise) {
      setSelectedExercise(exercise);
    }
  };

  // Render single exercise (original functionality)
  if (screen === 'single') {
    if (selectedExercise == null) {
      return (
        <View className="flex-1 bg-gray-100">
          <Pressable 
            onPress={() => setScreen('menu')}
            className="p-4"
          >
            <Text style={{ color: '#16a34a', fontSize: 16 }}>← Back</Text>
          </Pressable>
          <View className="flex-1 justify-center items-center">
            <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 32, color: '#111' }}>
              Single Exercise
            </Text>
            <ScrollView className="w-full px-4">
              {(['chest', 'back', 'shoulders', 'arms', 'core', 'legs', 'fullbody', 'cardio', 'stretch'] as MuscleGroup[]).map((group) => {
                const exercisesInGroup = Object.keys(EXERCISES).filter(
                  (key) => EXERCISES[key].muscleGroup === group
                );
                if (exercisesInGroup.length === 0) return null;
                
                return (
                  <View key={group} style={{ marginBottom: 20 }}>
                    <Text style={{ 
                      fontSize: 18, 
                      fontWeight: 'bold', 
                      marginBottom: 12, 
                      color: '#111',
                      textTransform: 'uppercase',
                      letterSpacing: 1,
                    }}>
                      {group === 'fullbody' ? 'Full Body' : 
                       group === 'cardio' ? 'Cardio' : 
                       group === 'stretch' ? 'Stretching' : group}
                    </Text>
                    {exercisesInGroup.map((key) => (
                      <Pressable
                        key={key}
                        onPress={() => setSelectedExercise(EXERCISES[key])}
                        style={{
                          backgroundColor: '#16a34a',
                          paddingHorizontal: 24, paddingVertical: 14,
                          borderRadius: 12, marginBottom: 10, width: '100%', alignItems: 'center',
                        }}
                      >
                        <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>
                          {EXERCISES[key].name}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      );
    }
    return (
      <View className="flex-1">
        <Camera
          exercise={selectedExercise}
          onExit={() => setSelectedExercise(null)}
        />
      </View>
    );
  }

  // Presets screen
  if (screen === 'presets') {
    if (selectedPreset) {
      const exercises = getPresetExercises(selectedPreset);
      return (
        <View className="flex-1 bg-gray-100">
          <Pressable 
            onPress={() => setSelectedPreset(null)}
            className="p-4"
          >
            <Text style={{ color: '#16a34a', fontSize: 16 }}>← Back</Text>
          </Pressable>
          <View className="flex-1 items-center px-4">
            <Text style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 8, color: '#111' }}>
              {selectedPreset.name}
            </Text>
            <Text style={{ fontSize: 14, color: '#666', marginBottom: 24 }}>
              {selectedPreset.description}
            </Text>
            <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 16 }}>
              Exercises ({exercises.length}):
            </Text>
            <ScrollView className="w-full">
              {exercises.map((ex, idx) => (
                <Pressable
                  key={idx}
                  onPress={() => setSelectedExercise(ex)}
                  style={{
                    backgroundColor: '#16a34a',
                    paddingHorizontal: 24, paddingVertical: 12,
                    borderRadius: 10, marginBottom: 10, width: '100%', alignItems: 'center',
                  }}
                >
                  <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>
                    {ex?.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      );
    }
    return (
      <View className="flex-1 bg-gray-100">
        <Pressable 
          onPress={() => setScreen('menu')}
          className="p-4"
        >
          <Text style={{ color: '#16a34a', fontSize: 16 }}>← Back</Text>
        </Pressable>
        <View className="flex-1 items-center px-4">
          <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 24, color: '#111' }}>
            Workout Presets
          </Text>
          <ScrollView className="w-full">
            {WORKOUT_PRESETS.map((preset) => (
              <Pressable
                key={preset.id}
                onPress={() => setSelectedPreset(preset)}
                style={{
                  backgroundColor: '#16a34a',
                  paddingHorizontal: 24, paddingVertical: 16,
                  borderRadius: 12, marginBottom: 12, width: '100%',
                }}
              >
                <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>
                  {preset.name}
                </Text>
                <Text style={{ color: '#ddd', fontSize: 14, marginTop: 4 }}>
                  {preset.description}
                </Text>
                <Text style={{ color: '#bbb', fontSize: 12, marginTop: 4 }}>
                  {preset.exercises.length} exercises • {preset.difficulty}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </View>
    );
  }

  // Custom workout creation - select exercises
  if (screen === 'customSelect') {
    return (
      <View className="flex-1 bg-gray-100">
        <Pressable 
          onPress={() => setScreen('custom')}
          className="p-4"
        >
          <Text style={{ color: '#16a34a', fontSize: 16 }}>← Back</Text>
        </Pressable>
        <View className="flex-1 px-4">
          <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 16, color: '#111', textAlign: 'center' }}>
            Select Exercises ({selectedExercises.length})
          </Text>
          <ScrollView className="flex-1">
            {Object.keys(EXERCISES).map((key) => {
              const isSelected = selectedExercises.includes(key);
              return (
                <Pressable
                  key={key}
                  onPress={() => toggleExercise(key)}
                  style={{
                    backgroundColor: isSelected ? '#16a34a' : '#fff',
                    paddingHorizontal: 20, paddingVertical: 14,
                    borderRadius: 10, marginBottom: 8, width: '100%',
                    borderWidth: 2,
                    borderColor: isSelected ? '#16a34a' : '#ddd',
                  }}
                >
                  <Text style={{ 
                    color: isSelected ? 'white' : '#111', 
                    fontSize: 16, fontWeight: 'bold' 
                  }}>
                    {EXERCISES[key].name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <Pressable
            onPress={saveCustomWorkout}
            style={{
              backgroundColor: '#16a34a',
              paddingVertical: 16,
              borderRadius: 12, marginTop: 16, marginBottom: 32,
            }}
          >
            <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold', textAlign: 'center' }}>
              Save Workout
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // Custom workout - enter name
  if (screen === 'custom') {
    return (
      <View className="flex-1 bg-gray-100">
        <Pressable 
          onPress={() => setScreen('menu')}
          className="p-4"
        >
          <Text style={{ color: '#16a34a', fontSize: 16 }}>← Back</Text>
        </Pressable>
        <View className="flex-1 px-4 justify-center">
          <Text style={{ fontSize: 22, fontWeight: 'bold', marginBottom: 24, color: '#111', textAlign: 'center' }}>
            Create Custom Workout
          </Text>
          
          {/* Saved workouts */}
          {savedWorkouts.length > 0 && (
            <View className="mb-6">
              <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 12, color: '#111' }}>
                Your Saved Workouts:
              </Text>
              {savedWorkouts.map((workout) => (
                <Pressable
                  key={workout.id}
                  onPress={() => {
                    setSelectedExercises(workout.exercises);
                    startWorkoutFromList(workout.exercises);
                  }}
                  style={{
                    backgroundColor: '#fff',
                    paddingHorizontal: 20, paddingVertical: 14,
                    borderRadius: 10, marginBottom: 8, width: '100%',
                    borderWidth: 1, borderColor: '#ddd',
                  }}
                >
                  <Text style={{ color: '#111', fontSize: 16, fontWeight: 'bold' }}>
                    {workout.name}
                  </Text>
                  <Text style={{ color: '#666', fontSize: 12, marginTop: 2 }}>
                    {workout.exercises.length} exercises
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          {/* Create new */}
          <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 12, color: '#111' }}>
            Create New Workout:
          </Text>
          <TextInput
            placeholder="Workout name..."
            value={customWorkoutName}
            onChangeText={setCustomWorkoutName}
            style={{
              backgroundColor: '#fff',
              paddingHorizontal: 16, paddingVertical: 14,
              borderRadius: 10, marginBottom: 16, fontSize: 16,
              borderWidth: 1, borderColor: '#ddd',
            }}
          />
          <Pressable
            onPress={() => {
              if (!customWorkoutName.trim()) {
                Alert.alert('Error', 'Please enter a workout name');
                return;
              }
              setScreen('customSelect');
            }}
            style={{
              backgroundColor: '#16a34a',
              paddingVertical: 16,
              borderRadius: 12,
            }}
          >
            <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold', textAlign: 'center' }}>
              Next: Select Exercises →
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // Main menu
  return (
    <View className="flex-1 bg-gray-100">
      <View className="flex-1 justify-center items-center px-4">
        <Text style={{ fontSize: 28, fontWeight: 'bold', marginBottom: 40, color: '#111' }}>
          Choose Workout Type
        </Text>
        
        <Pressable
          onPress={() => setScreen('presets')}
          style={{
            backgroundColor: '#16a34a',
            paddingHorizontal: 40, paddingVertical: 20,
            borderRadius: 16, marginBottom: 16, width: 280, alignItems: 'center',
          }}
        >
          <Text style={{ color: 'white', fontSize: 20, fontWeight: 'bold' }}>
            📋 Preset Workouts
          </Text>
          <Text style={{ color: '#ddd', fontSize: 14, marginTop: 4 }}>
            Upper, Lower, Full Body...
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setScreen('custom')}
          style={{
            backgroundColor: '#3b82f6',
            paddingHorizontal: 40, paddingVertical: 20,
            borderRadius: 16, marginBottom: 16, width: 280, alignItems: 'center',
          }}
        >
          <Text style={{ color: 'white', fontSize: 20, fontWeight: 'bold' }}>
            ➕ Create Custom
          </Text>
          <Text style={{ color: '#ddd', fontSize: 14, marginTop: 4 }}>
            Build your own workout
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setScreen('single')}
          style={{
            backgroundColor: '#8b5cf6',
            paddingHorizontal: 40, paddingVertical: 20,
            borderRadius: 16, width: 280, alignItems: 'center',
          }}
        >
          <Text style={{ color: 'white', fontSize: 20, fontWeight: 'bold' }}>
            🏋️ Single Exercise
          </Text>
          <Text style={{ color: '#ddd', fontSize: 14, marginTop: 4 }}>
            Practice one exercise
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
