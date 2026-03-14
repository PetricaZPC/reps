import { addDoc, collection, getDocs, query } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Alert, Pressable, SafeAreaView, ScrollView, StatusBar, Text, View, useWindowDimensions } from 'react-native';
import { auth, db } from '../firebase/firebaseConfig';
import Camera from '../src/Camera';
import { EXERCISES, ExerciseConfig, MuscleGroup } from '../src/exercises';
import { WORKOUT_PRESETS, WorkoutPreset, getPresetExercises } from '../src/workoutPresets';

type Screen = 'menu' | 'presets' | 'single' | 'custom' | 'customSelect' | 'customList' | 'workout';

interface CustomWorkout {
  id?: string;
  name: string;
  exercises: string[];
}

// Design System
const COLORS = {
  primary: '#10b981',
  primaryLight: '#d1fae5',
  secondary: '#3b82f6',
  secondaryLight: '#dbeafe',
  accent: '#8b5cf6',
  accentLight: '#ede9fe',
  background: '#f8fafc',
  surface: '#ffffff',
  text: '#1e293b',
  textLight: '#64748b',
  border: '#e2e8f0',
  shadow: 'rgba(0,0,0,0.08)',
};

const SHADOWS = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
};

export default function Workout() {
  const { width } = useWindowDimensions();
  const padding = width > 600 ? 40 : 20;
  
  const [screen, setScreen] = useState<Screen>('menu');
  const [selectedExercise, setSelectedExercise] = useState<ExerciseConfig | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<WorkoutPreset | null>(null);
  const [customWorkoutName, setCustomWorkoutName] = useState('');
  const [selectedExercises, setSelectedExercises] = useState<string[]>([]);
  const [savedWorkouts, setSavedWorkouts] = useState<CustomWorkout[]>([]);

  useEffect(() => {
    const loadCustomWorkouts = async () => {
      if (!auth.currentUser) return;
      try {
        const q = query(collection(db, `users/${auth.currentUser.uid}/customWorkouts`));
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
    } catch (error: any) {
      Alert.alert('Error', `Failed to save: ${error?.message || 'Unknown'}`);
    }
  };

  const toggleExercise = (key: string) => {
    setSelectedExercises(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const deleteWorkout = (workoutId: string) => {
    Alert.alert('Delete Workout', 'Delete this workout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => setSavedWorkouts(prev => prev.filter(w => w.id !== workoutId)) }
    ]);
  };

  const startWorkoutFromList = (exerciseKeys: string[], index: number = 0) => {
    if (index >= exerciseKeys.length) {
      setSelectedPreset(null);
      setScreen('menu');
      return;
    }
    const exercise = EXERCISES[exerciseKeys[index]];
    if (exercise) setSelectedExercise(exercise);
  };

  // ==================== SINGLE EXERCISE ====================
  if (screen === 'single') {
    if (selectedExercise == null) {
      return (
        <View style={{ flex: 1, backgroundColor: COLORS.background }}>
          <SafeAreaView style={{ backgroundColor: COLORS.surface }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
              <Pressable onPress={() => setScreen('menu')} style={{ marginRight: 12 }}>
                <Text style={{ fontSize: 24, color: COLORS.primary }}>{'<'}</Text>
              </Pressable>
              <Text style={{ fontSize: 22, fontWeight: '700', color: COLORS.text }}>Exercises</Text>
            </View>
          </SafeAreaView>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: padding }}>
            {(['chest', 'back', 'shoulders', 'arms', 'core', 'legs', 'fullbody', 'cardio', 'stretch'] as MuscleGroup[]).map((group) => {
              const exercisesInGroup = Object.keys(EXERCISES).filter(key => EXERCISES[key].muscleGroup === group);
              if (exercisesInGroup.length === 0) return null;
              return (
                <View key={group} style={{ marginBottom: 24 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.textLight, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
                    {group === 'fullbody' ? 'Full Body' : group === 'cardio' ? 'Cardio' : group === 'stretch' ? 'Stretching' : group}
                  </Text>
                  {exercisesInGroup.map((key) => (
                    <Pressable
                      key={key}
                      onPress={() => setSelectedExercise(EXERCISES[key])}
                      style={({ pressed }) => ({
                        backgroundColor: pressed ? COLORS.background : COLORS.surface,
                        padding: 16, borderRadius: 16, marginBottom: 8,
                        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                        ...SHADOWS.small,
                      })}
                    >
                      <Text style={{ color: COLORS.text, fontSize: 16, fontWeight: '500' }}>{EXERCISES[key].name}</Text>
                      <Text style={{ color: COLORS.primary, fontSize: 18 }}>{'>'}</Text>
                    </Pressable>
                  ))}
                </View>
              );
            })}
          </ScrollView>
        </View>
      );
    }
    return <Camera exercise={selectedExercise} onExit={() => setSelectedExercise(null)} />;
  }

  // ==================== PRESETS ====================
  if (screen === 'presets') {
    if (selectedPreset) {
      const exercises = getPresetExercises(selectedPreset);
      return (
        <View style={{ flex: 1, backgroundColor: COLORS.background }}>
          <SafeAreaView style={{ backgroundColor: COLORS.surface }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
              <Pressable onPress={() => setSelectedPreset(null)} style={{ marginRight: 12 }}>
                <Text style={{ fontSize: 24, color: COLORS.primary }}>{'<'}</Text>
              </Pressable>
              <Text style={{ fontSize: 22, fontWeight: '700', color: COLORS.text }}>{selectedPreset.name}</Text>
            </View>
          </SafeAreaView>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: padding }}>
            <View style={{ backgroundColor: COLORS.surface, borderRadius: 20, padding: 20, marginBottom: 20, ...SHADOWS.small }}>
              <Text style={{ fontSize: 14, color: COLORS.textLight, marginBottom: 8 }}>{selectedPreset.description}</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ backgroundColor: COLORS.primaryLight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}>
                  <Text style={{ color: COLORS.primary, fontWeight: '600', fontSize: 12 }}>{exercises.length} exercises</Text>
                </View>
                <View style={{ backgroundColor: COLORS.secondaryLight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}>
                  <Text style={{ color: COLORS.secondary, fontWeight: '600', fontSize: 12 }}>{selectedPreset.difficulty}</Text>
                </View>
              </View>
            </View>
            <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.text, marginBottom: 16 }}>Exercises</Text>
            {exercises.map((ex, idx) => (
              <Pressable
                key={idx}
                onPress={() => setSelectedExercise(ex)}
                style={({ pressed }) => ({
                  backgroundColor: pressed ? COLORS.background : COLORS.surface,
                  padding: 16, borderRadius: 16, marginBottom: 10,
                  flexDirection: 'row', alignItems: 'center',
                  ...SHADOWS.small,
                })}
              >
                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  <Text style={{ color: COLORS.primary, fontWeight: '700', fontSize: 14 }}>{idx + 1}</Text>
                </View>
                <Text style={{ color: COLORS.text, fontSize: 16, fontWeight: '500', flex: 1 }}>{ex?.name}</Text>
                <Text style={{ color: COLORS.primary, fontSize: 18 }}>{'>'}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      );
    }
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background }}>
        <SafeAreaView style={{ backgroundColor: COLORS.surface }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
            <Pressable onPress={() => setScreen('menu')} style={{ marginRight: 12 }}>
              <Text style={{ fontSize: 24, color: COLORS.primary }}>{'<'}</Text>
            </Pressable>
            <Text style={{ fontSize: 22, fontWeight: '700', color: COLORS.text }}>Workout Presets</Text>
          </View>
        </SafeAreaView>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: padding }}>
          {WORKOUT_PRESETS.map((preset) => (
            <Pressable
              key={preset.id}
              onPress={() => setSelectedPreset(preset)}
              style={({ pressed }) => ({
                backgroundColor: pressed ? COLORS.background : COLORS.surface,
                padding: 20, borderRadius: 20, marginBottom: 12,
                ...SHADOWS.medium,
              })}
            >
              <Text style={{ color: COLORS.text, fontSize: 18, fontWeight: '600', marginBottom: 4 }}>{preset.name}</Text>
              <Text style={{ color: COLORS.textLight, fontSize: 14, marginBottom: 8 }}>{preset.description}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ color: COLORS.textLight, fontSize: 12 }}>{preset.exercises.length} exercises</Text>
                <Text style={{ color: COLORS.textLight, fontSize: 12, marginHorizontal: 8 }}>|</Text>
                <Text style={{ color: COLORS.primary, fontSize: 12, fontWeight: '600' }}>{preset.difficulty}</Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    );
  }

  // ==================== CUSTOM SELECT ====================
  if (screen === 'customSelect') {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background }}>
        <SafeAreaView style={{ backgroundColor: COLORS.surface }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
            <Pressable onPress={() => setScreen('custom')} style={{ marginRight: 12 }}>
              <Text style={{ fontSize: 24, color: COLORS.primary }}>{'<'}</Text>
            </Pressable>
            <Text style={{ fontSize: 22, fontWeight: '700', color: COLORS.text }}>Select Exercises</Text>
          </View>
        </SafeAreaView>
        <View style={{ paddingHorizontal: padding, paddingBottom: 8 }}>
          <View style={{ backgroundColor: COLORS.primaryLight, padding: 12, borderRadius: 12 }}>
            <Text style={{ color: COLORS.primary, fontWeight: '600' }}>{selectedExercises.length} exercises selected</Text>
          </View>
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: padding }}>
          {(['chest', 'back', 'shoulders', 'arms', 'core', 'legs', 'fullbody', 'cardio', 'stretch'] as MuscleGroup[]).map((group) => {
            const exercisesInGroup = Object.keys(EXERCISES).filter(key => EXERCISES[key].muscleGroup === group);
            if (exercisesInGroup.length === 0) return null;
            return (
              <View key={group} style={{ marginBottom: 20 }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.textLight, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
                  {group === 'fullbody' ? 'Full Body' : group === 'cardio' ? 'Cardio' : group === 'stretch' ? 'Stretching' : group}
                </Text>
                {exercisesInGroup.map((key) => {
                  const isSelected = selectedExercises.includes(key);
                  return (
                    <Pressable
                      key={key}
                      onPress={() => toggleExercise(key)}
                      style={{
                        backgroundColor: isSelected ? COLORS.primary : COLORS.surface,
                        padding: 14, borderRadius: 12, marginBottom: 8,
                        flexDirection: 'row', alignItems: 'center',
                        borderWidth: 2, borderColor: isSelected ? COLORS.primary : COLORS.border,
                      }}
                    >
                      <View style={{ width: 22, height: 22, borderRadius: 6, backgroundColor: isSelected ? '#fff' : 'transparent', borderWidth: 2, borderColor: isSelected ? COLORS.primary : COLORS.border, marginRight: 10, alignItems: 'center', justifyContent: 'center' }}>
                        {isSelected && <Text style={{ color: COLORS.primary, fontSize: 12 }}>{'✓'}</Text>}
                      </View>
                      <Text style={{ color: isSelected ? '#fff' : COLORS.text, fontSize: 15, fontWeight: '500' }}>{EXERCISES[key].name}</Text>
                    </Pressable>
                  );
                })}
              </View>
            );
          })}
        </ScrollView>
        <View style={{ padding: padding, backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border }}>
          <Pressable onPress={saveCustomWorkout} style={{ backgroundColor: COLORS.primary, padding: 18, borderRadius: 16, alignItems: 'center' }}>
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700' }}>Save Workout</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ==================== CUSTOM MAIN ====================
  if (screen === 'custom') {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background }}>
        <SafeAreaView style={{ backgroundColor: COLORS.surface }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
            <Pressable onPress={() => setScreen('menu')} style={{ marginRight: 12 }}>
              <Text style={{ fontSize: 24, color: COLORS.primary }}>{'<'}</Text>
            </Pressable>
            <Text style={{ fontSize: 22, fontWeight: '700', color: COLORS.text }}>My Workouts</Text>
          </View>
        </SafeAreaView>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: padding }}>
          {/* Create New */}
          <Pressable
            onPress={() => { setCustomWorkoutName(''); setSelectedExercises([]); setScreen('customSelect'); }}
            style={({ pressed }) => ({
              backgroundColor: pressed ? COLORS.background : COLORS.surface,
              borderRadius: 24, padding: 24, marginBottom: 24,
              borderWidth: 2, borderColor: COLORS.primary, borderStyle: 'dashed',
              ...SHADOWS.medium,
            })}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
                <Text style={{ fontSize: 28, color: COLORS.primary }}>+</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: COLORS.text, fontSize: 18, fontWeight: '600', marginBottom: 4 }}>Create New</Text>
                <Text style={{ color: COLORS.textLight, fontSize: 14 }}>Build your routine</Text>
              </View>
            </View>
          </Pressable>

          {/* Saved */}
          {savedWorkouts.length > 0 ? (
            <View>
              <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.textLight, marginBottom: 12 }}>Your Workouts ({savedWorkouts.length})</Text>
              {savedWorkouts.map((workout) => (
                <Pressable
                  key={workout.id}
                  onPress={() => startWorkoutFromList(workout.exercises)}
                  onLongPress={() => deleteWorkout(workout.id || '')}
                  style={({ pressed }) => ({
                    backgroundColor: pressed ? COLORS.background : COLORS.surface,
                    borderRadius: 20, padding: 20, marginBottom: 12,
                    ...SHADOWS.medium,
                  })}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <View>
                      <Text style={{ color: COLORS.text, fontSize: 17, fontWeight: '600', marginBottom: 4 }}>{workout.name}</Text>
                      <Text style={{ color: COLORS.textLight, fontSize: 14 }}>{workout.exercises.length} exercises</Text>
                    </View>
                    <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 20, color: COLORS.primary }}>{'>'}</Text>
                    </View>
                  </View>
                </Pressable>
              ))}
            </View>
          ) : (
            <View style={{ backgroundColor: COLORS.surface, borderRadius: 20, padding: 32, alignItems: 'center' }}>
              <Text style={{ fontSize: 48, marginBottom: 16 }}>{'[]'}</Text>
              <Text style={{ color: COLORS.textLight, fontSize: 16, textAlign: 'center' }}>No workouts yet.{'\n'}Create your first one!</Text>
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  // ==================== MAIN MENU ====================
  const cardWidth = Math.min(width - padding * 2, 380);
  
  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <SafeAreaView style={{ flex: 1 }}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
        
        {/* Header */}
        <View style={{ alignItems: 'center', paddingTop: 40, paddingBottom: 24 }}>
          <Text style={{ fontSize: 32, fontWeight: '700', color: COLORS.text }}>Workouts</Text>
          <View style={{ width: 40, height: 3, backgroundColor: COLORS.primary, borderRadius: 2, marginTop: 12 }} />
        </View>

        <View style={{ flex: 1, alignItems: 'center', paddingBottom: 40 }}>
          <View style={{ width: cardWidth }}>
            
            {/* Preset Workouts */}
            <Pressable
              onPress={() => setScreen('presets')}
              style={({ pressed }) => ({
                backgroundColor: pressed ? COLORS.background : COLORS.surface,
                borderRadius: 24, padding: 24, marginBottom: 16,
                ...SHADOWS.medium,
              })}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 56, height: 56, borderRadius: 20, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
                  <Text style={{ fontSize: 24, color: COLORS.primary }}>{'[=]'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: COLORS.text, fontSize: 18, fontWeight: '600', marginBottom: 4 }}>Preset Workouts</Text>
                  <Text style={{ color: COLORS.textLight, fontSize: 14 }}>Upper, Lower, Full Body</Text>
                </View>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 16, color: COLORS.textLight }}>{'>'}</Text>
                </View>
              </View>
            </Pressable>

            {/* My Workouts */}
            <Pressable
              onPress={() => setScreen('custom')}
              style={({ pressed }) => ({
                backgroundColor: pressed ? COLORS.background : COLORS.surface,
                borderRadius: 24, padding: 24, marginBottom: 16,
                ...SHADOWS.medium,
              })}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 56, height: 56, borderRadius: 20, backgroundColor: COLORS.secondaryLight, alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
                  <Text style={{ fontSize: 24, color: COLORS.secondary }}>{'[+]'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: COLORS.text, fontSize: 18, fontWeight: '600', marginBottom: 4 }}>My Workouts</Text>
                  <Text style={{ color: COLORS.textLight, fontSize: 14 }}>{savedWorkouts.length} saved routines</Text>
                </View>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 16, color: COLORS.textLight }}>{'>'}</Text>
                </View>
              </View>
            </Pressable>

            {/* Single Exercise */}
            <Pressable
              onPress={() => setScreen('single')}
              style={({ pressed }) => ({
                backgroundColor: pressed ? COLORS.background : COLORS.surface,
                borderRadius: 24, padding: 24, marginBottom: 16,
                ...SHADOWS.medium,
              })}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 56, height: 56, borderRadius: 20, backgroundColor: COLORS.accentLight, alignItems: 'center', justifyContent: 'center', marginRight: 16 }}>
                  <Text style={{ fontSize: 24, color: COLORS.accent }}>{'[·]'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: COLORS.text, fontSize: 18, fontWeight: '600', marginBottom: 4 }}>Single Exercise</Text>
                  <Text style={{ color: COLORS.textLight, fontSize: 14 }}>Practice one movement</Text>
                </View>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 16, color: COLORS.textLight }}>{'>'}</Text>
                </View>
              </View>
            </Pressable>

          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}
