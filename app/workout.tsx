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

// ==================== MODERN DESIGN SYSTEM ====================
const COLORS = {
  primary: '#0ea5a0',
  primaryLight: '#ccfbf1',
  primaryDark: '#0d9488',
  secondary: '#6366f1',
  secondaryLight: '#e0e7ff',
  accent: '#8b5cf6',
  accentLight: '#ede9fe',
  background: '#f5f7fa',
  surface: '#ffffff',
  surfaceAlt: '#f8fafc',
  text: '#1e293b',
  textMedium: '#64748b',
  textLight: '#94a3b8',
  border: '#e2e8f0',
  divider: '#f1f5f9',
};

const SHADOWS = {
  soft: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  medium: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
};

const R = 24;

// ==================== REUSABLE COMPONENTS ====================

// Large Card for Menu
function MenuCard({ 
  title, 
  description, 
  info, 
  color, 
  bgColor, 
  onPress,
  borderColor,
}: { 
  title: string; 
  description: string; 
  info: string;
  color: string;
  bgColor: string;
  onPress: () => void;
  borderColor?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: pressed ? COLORS.surfaceAlt : COLORS.surface,
        borderRadius: R,
        padding: 24,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: borderColor || COLORS.border,
        ...SHADOWS.medium,
      })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        <View style={{ 
          width: 56, 
          height: 56, 
          borderRadius: 16, 
          backgroundColor: bgColor, 
          alignItems: 'center', 
          justifyContent: 'center',
          marginRight: 18,
        }}>
          <Text style={{ fontSize: 28, color: color }}>▶</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ 
            color: COLORS.text, 
            fontSize: 22, 
            fontWeight: '700',
            marginBottom: 6,
          }}>
            {title}
          </Text>
          <Text style={{ 
            color: COLORS.textMedium, 
            fontSize: 15,
            lineHeight: 22,
            marginBottom: 10,
          }}>
            {description}
          </Text>
          <Text style={{ 
            color: color, 
            fontSize: 14, 
            fontWeight: '600',
          }}>
            {info}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

// Exercise/Workout List Item
function ListItem({ 
  title, 
  subtitle, 
  onPress, 
  index,
  showArrow = true,
}: { 
  title: string; 
  subtitle?: string; 
  onPress?: () => void;
  index?: number;
  showArrow?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: pressed ? COLORS.surfaceAlt : COLORS.surface,
        borderRadius: 20,
        padding: 20,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: pressed ? colorVar('primaryLight') : COLORS.border,
        ...SHADOWS.soft,
      })}
    >
      {index !== undefined && (
        <View style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: COLORS.primaryLight,
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 16,
        }}>
          <Text style={{ color: COLORS.primary, fontWeight: '700', fontSize: 15 }}>{index}</Text>
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={{ color: COLORS.text, fontSize: 17, fontWeight: '600', marginBottom: 4 }}>{title}</Text>
        {subtitle && <Text style={{ color: COLORS.textLight, fontSize: 14 }}>{subtitle}</Text>}
      </View>
      {showArrow && <Text style={{ color: COLORS.primary, fontSize: 18, fontWeight: '300' }}>→</Text>}
    </Pressable>
  );
}

// Header with back button
function Header({ title, onBack }: { title: string; onBack?: () => void }) {
  return (
    <View style={{ 
      flexDirection: 'row', 
      alignItems: 'center', 
      paddingHorizontal: 20,
      paddingVertical: 16, 
      backgroundColor: COLORS.surface,
      borderBottomWidth: 1, 
      borderBottomColor: COLORS.border,
    }}>
      {onBack && (
        <Pressable 
          onPress={onBack}
          style={{ 
            width: 42, 
            height: 42, 
            borderRadius: 21, 
            backgroundColor: COLORS.surfaceAlt, 
            alignItems: 'center', 
            justifyContent: 'center',
            marginRight: 14,
          }}
        >
          <Text style={{ fontSize: 20, color: COLORS.primary }}>←</Text>
        </Pressable>
      )}
      <Text style={{ fontSize: 22, fontWeight: '700', color: COLORS.text }}>{title}</Text>
    </View>
  );
}

// Section Title
function SectionTitle({ title }: { title: string }) {
  return (
    <Text style={{
      fontSize: 13,
      fontWeight: '600',
      color: COLORS.textLight,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 16,
      marginTop: 8,
    }}>
      {title}
    </Text>
  );
}

// Info Card (for preset details)
function InfoCard({ children }: { children: React.ReactNode }) {
  return (
    <View style={{
      backgroundColor: COLORS.surface,
      borderRadius: R,
      padding: 22,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: COLORS.border,
      ...SHADOWS.soft,
    }}>
      {children}
    </View>
  );
}

// Tag
function Tag({ text, color, bgColor }: { text: string; color: string; bgColor: string }) {
  return (
    <View style={{
      backgroundColor: bgColor,
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 20,
      marginRight: 8,
    }}>
      <Text style={{ color: color, fontSize: 13, fontWeight: '600' }}>{text}</Text>
    </View>
  );
}

// Checkbox Item
function CheckboxItem({ title, checked, onPress }: { title: string; checked: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: checked ? COLORS.primary : pressed ? COLORS.surfaceAlt : COLORS.surface,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: checked ? COLORS.primary : COLORS.border,
        padding: 16,
        marginBottom: 10,
        flexDirection: 'row',
        alignItems: 'center',
      })}
    >
      <View style={{
        width: 24,
        height: 24,
        borderRadius: 6,
        backgroundColor: checked ? '#fff' : 'transparent',
        borderWidth: 2,
        borderColor: checked ? COLORS.primary : COLORS.border,
        marginRight: 14,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {checked && <Text style={{ color: COLORS.primary, fontSize: 12, fontWeight: '700' }}>✓</Text>}
      </View>
      <Text style={{ color: checked ? '#fff' : COLORS.text, fontSize: 16, fontWeight: '500', flex: 1 }}>{title}</Text>
    </Pressable>
  );
}

// Primary Button
function PrimaryButton({ title, onPress, disabled }: { title: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        backgroundColor: pressed ? COLORS.primaryDark : COLORS.primary,
        paddingVertical: 18,
        borderRadius: 18,
        alignItems: 'center',
        ...SHADOWS.medium,
        opacity: disabled ? 0.5 : 1,
      })}
    >
      <Text style={{ color: '#fff', fontSize: 18, fontWeight: '600' }}>{title}</Text>
    </Pressable>
  );
}

// Empty State
function EmptyState({ message }: { message: string }) {
  return (
    <View style={{
      backgroundColor: COLORS.surface,
      borderRadius: R,
      padding: 40,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: COLORS.border,
      ...SHADOWS.soft,
    }}>
      <Text style={{ fontSize: 48, marginBottom: 16 }}>📋</Text>
      <Text style={{ color: COLORS.textMedium, fontSize: 16, textAlign: 'center' }}>{message}</Text>
    </View>
  );
}

// Selection Counter
function SelectionCounter({ count }: { count: number }) {
  return (
    <View style={{
      backgroundColor: COLORS.surface,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: COLORS.border,
      ...SHADOWS.soft,
    }}>
      <Text style={{ color: COLORS.primary, fontWeight: '600', fontSize: 16 }}>
        {count} exercise{count !== 1 ? 's' : ''} selected
      </Text>
    </View>
  );
}

// Helper function
function colorVar(c: keyof typeof COLORS): string {
  return COLORS[c] || COLORS.border;
}

// ==================== MAIN SCREEN ====================
export default function Workout() {
  const { width } = useWindowDimensions();
  const padding = width > 600 ? 40 : 24;
  
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
            <Header title="Exercises" onBack={() => setScreen('menu')} />
          </SafeAreaView>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: padding }} showsVerticalScrollIndicator={false}>
            {(['chest', 'back', 'shoulders', 'arms', 'core', 'legs', 'fullbody', 'cardio', 'stretch'] as MuscleGroup[]).map((group) => {
              const exercisesInGroup = Object.keys(EXERCISES).filter(key => EXERCISES[key].muscleGroup === group);
              if (exercisesInGroup.length === 0) return null;
              return (
                <View key={group} style={{ marginBottom: 32 }}>
                  <SectionTitle title={group === 'fullbody' ? 'Full Body' : group === 'cardio' ? 'Cardio' : group === 'stretch' ? 'Stretching' : group} />
                  {exercisesInGroup.map((key) => (
                    <ListItem
                      key={key}
                      title={EXERCISES[key].name}
                      onPress={() => setSelectedExercise(EXERCISES[key])}
                    />
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
            <Header title={selectedPreset.name} onBack={() => setSelectedPreset(null)} />
          </SafeAreaView>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: padding }} showsVerticalScrollIndicator={false}>
            <InfoCard>
              <Text style={{ fontSize: 15, color: COLORS.textMedium, lineHeight: 24, marginBottom: 18 }}>
                {selectedPreset.description}
              </Text>
              <View style={{ flexDirection: 'row' }}>
                <Tag text={`${exercises.length} exercises`} color={COLORS.primary} bgColor={COLORS.primaryLight} />
                <Tag text={selectedPreset.difficulty} color={COLORS.secondary} bgColor={COLORS.secondaryLight} />
              </View>
            </InfoCard>
            
            <SectionTitle title="Exercises" />
            {exercises.map((ex, idx) => (
              <ListItem
                key={idx}
                title={ex?.name}
                index={idx + 1}
                onPress={() => setSelectedExercise(ex)}
              />
            ))}
          </ScrollView>
        </View>
      );
    }
    
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background }}>
        <SafeAreaView style={{ backgroundColor: COLORS.surface }}>
          <Header title="Workout Presets" onBack={() => setScreen('menu')} />
        </SafeAreaView>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: padding }} showsVerticalScrollIndicator={false}>
          {WORKOUT_PRESETS.map((preset) => {
            const exerciseCount = preset.exercises.length;
            return (
              <Pressable
                key={preset.id}
                onPress={() => setSelectedPreset(preset)}
                style={({ pressed }) => ({
                  backgroundColor: pressed ? COLORS.surfaceAlt : COLORS.surface,
                  borderRadius: R,
                  padding: 24,
                  marginBottom: 16,
                  borderWidth: 1,
                  borderColor: pressed ? COLORS.primaryLight : COLORS.border,
                  ...SHADOWS.medium,
                })}
              >
                <Text style={{ color: COLORS.text, fontSize: 21, fontWeight: '700', marginBottom: 8 }}>
                  {preset.name}
                </Text>
                <Text style={{ color: COLORS.textMedium, fontSize: 15, lineHeight: 22, marginBottom: 14 }}>
                  {preset.description}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ color: COLORS.textLight, fontSize: 14 }}>{exerciseCount} exercises</Text>
                  <Text style={{ color: COLORS.textLight, fontSize: 14, marginHorizontal: 10 }}>·</Text>
                  <Text style={{ color: COLORS.primary, fontSize: 14, fontWeight: '600' }}>{preset.difficulty}</Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    );
  }

  // ==================== CUSTOM SELECT ====================
  if (screen === 'customSelect') {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background }}>
        <SafeAreaView style={{ backgroundColor: COLORS.surface }}>
          <Header title="Select Exercises" onBack={() => setScreen('custom')} />
        </SafeAreaView>
        
        <View style={{ paddingHorizontal: padding, paddingTop: 20 }}>
          <SelectionCounter count={selectedExercises.length} />
        </View>
        
        <ScrollView 
          style={{ flex: 1 }} 
          contentContainerStyle={{ padding: padding, paddingTop: 0 }}
          showsVerticalScrollIndicator={false}
        >
          {(['chest', 'back', 'shoulders', 'arms', 'core', 'legs', 'fullbody', 'cardio', 'stretch'] as MuscleGroup[]).map((group) => {
            const exercisesInGroup = Object.keys(EXERCISES).filter(key => EXERCISES[key].muscleGroup === group);
            if (exercisesInGroup.length === 0) return null;
            return (
              <View key={group} style={{ marginBottom: 28 }}>
                <SectionTitle title={group === 'fullbody' ? 'Full Body' : group === 'cardio' ? 'Cardio' : group === 'stretch' ? 'Stretching' : group} />
                {exercisesInGroup.map((key) => {
                  const isSelected = selectedExercises.includes(key);
                  return (
                    <CheckboxItem
                      key={key}
                      title={EXERCISES[key].name}
                      checked={isSelected}
                      onPress={() => toggleExercise(key)}
                    />
                  );
                })}
              </View>
            );
          })}
        </ScrollView>
        
        <View style={{ padding: padding, backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border }}>
          <PrimaryButton title="Save Workout" onPress={saveCustomWorkout} disabled={selectedExercises.length === 0} />
        </View>
      </View>
    );
  }

  // ==================== CUSTOM ====================
  if (screen === 'custom') {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background }}>
        <SafeAreaView style={{ backgroundColor: COLORS.surface }}>
          <Header title="My Workouts" onBack={() => setScreen('menu')} />
        </SafeAreaView>
        
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: padding }} showsVerticalScrollIndicator={false}>
          {/* Create New */}
          <Pressable
            onPress={() => { setCustomWorkoutName(''); setSelectedExercises([]); setScreen('customSelect'); }}
            style={({ pressed }) => ({
              backgroundColor: pressed ? COLORS.surfaceAlt : COLORS.surface,
              borderRadius: R,
              padding: 28,
              marginBottom: 32,
              borderWidth: 2,
              borderColor: pressed ? COLORS.primary : COLORS.primary,
              borderStyle: 'dashed',
              ...SHADOWS.medium,
            })}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 64, height: 64, borderRadius: 20, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: 18 }}>
                <Text style={{ fontSize: 30, color: COLORS.primary }}>+</Text>
              </View>
              <View>
                <Text style={{ color: COLORS.text, fontSize: 20, fontWeight: '700', marginBottom: 4 }}>Create New</Text>
                <Text style={{ color: COLORS.textMedium, fontSize: 15 }}>Build your custom routine</Text>
              </View>
            </View>
          </Pressable>

          {/* Saved */}
          {savedWorkouts.length > 0 ? (
            <View>
              <SectionTitle title={`Your Workouts (${savedWorkouts.length})`} />
              {savedWorkouts.map((workout) => (
                <Pressable
                  key={workout.id}
                  onPress={() => startWorkoutFromList(workout.exercises)}
                  onLongPress={() => deleteWorkout(workout.id || '')}
                  style={({ pressed }) => ({
                    backgroundColor: pressed ? COLORS.surfaceAlt : COLORS.surface,
                    borderRadius: 20,
                    padding: 22,
                    marginBottom: 14,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderWidth: 1,
                    borderColor: pressed ? COLORS.primaryLight : COLORS.border,
                    ...SHADOWS.soft,
                  })}
                >
                  <View>
                    <Text style={{ color: COLORS.text, fontSize: 18, fontWeight: '600', marginBottom: 4 }}>{workout.name}</Text>
                    <Text style={{ color: COLORS.textLight, fontSize: 14 }}>{workout.exercises.length} exercises</Text>
                  </View>
                  <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 18, color: COLORS.primary, fontWeight: '300' }}>→</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          ) : (
            <EmptyState message="No workouts yet.\nCreate your first one!" />
          )}
        </ScrollView>
      </View>
    );
  }

  // ==================== MAIN MENU ====================
  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <SafeAreaView style={{ flex: 1 }}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
        
        {/* Header */}
        <View style={{ alignItems: 'center', paddingTop: 50, paddingBottom: 36 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.primary, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>
            Fitness
          </Text>
          <Text style={{ fontSize: 36, fontWeight: '700', color: COLORS.text, letterSpacing: -0.5 }}>Workouts</Text>
          <View style={{ width: 56, height: 4, backgroundColor: COLORS.primary, borderRadius: 2, marginTop: 14 }} />
        </View>

        <View style={{ flex: 1, paddingHorizontal: padding, paddingBottom: 40 }}>
          
          {/* Preset Workouts */}
          <MenuCard
            title="Preset Workouts"
            description="Choose from pre-made workout routines designed for different goals and fitness levels."
            info="Upper Body · Lower Body · Full Body"
            color={COLORS.primary}
            bgColor={COLORS.primaryLight}
            onPress={() => setScreen('presets')}
            borderColor={COLORS.primaryLight}
          />

          {/* My Workouts */}
          <MenuCard
            title="My Workouts"
            description="Your personal collection of custom workout routines that you've created."
            info={`${savedWorkouts.length} saved routine${savedWorkouts.length !== 1 ? 's' : ''}`}
            color={COLORS.secondary}
            bgColor={COLORS.secondaryLight}
            onPress={() => setScreen('custom')}
            borderColor={COLORS.secondaryLight}
          />

          {/* Single Exercise */}
          <MenuCard
            title="Single Exercise"
            description="Practice and focus on a single exercise. Perfect for learning new movements."
            info="All muscle groups available"
            color={COLORS.accent}
            bgColor={COLORS.accentLight}
            onPress={() => setScreen('single')}
            borderColor={COLORS.accentLight}
          />

        </View>
      </SafeAreaView>
    </View>
  );
}
