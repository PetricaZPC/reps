import { addDoc, collection, getDocs, query } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
    Alert,
    Pressable,
    SafeAreaView,
    ScrollView,
    StatusBar,
    Text,
    TextInput,
    View,
    useWindowDimensions,
} from "react-native";
import { auth, db } from "../firebase/firebaseConfig";
import Camera from "../src/Camera";
import { EXERCISES, ExerciseConfig, MuscleGroup } from "../src/exercises";
import {
    WORKOUT_PRESETS,
    WorkoutPreset,
    getPresetExercises,
} from "../src/workoutPresets";

type Screen =
  | "menu"
  | "presets"
  | "single"
  | "custom"
  | "customSelect"
  | "customList"
  | "workout";

interface CustomWorkout {
  id?: string;
  name: string;
  exercises: string[];
}

const COLORS = {
  background: "#ffffff",
  surface: "#ffffff",
  text: "#111111",
  textMedium: "#444444",
  textLight: "#666666",
  border: "#dddddd",
  divider: "#e5e5e5",
  primary: "#111111",
};

function MenuCard({
  title,
  subtitle,
  onPress,
}: {
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: COLORS.surface,
        borderRadius: 10,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        opacity: pressed ? 0.75 : 1,
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: COLORS.text,
              fontSize: 18,
              fontWeight: "700",
              marginBottom: 3,
            }}
          >
            {title}
          </Text>
          <Text style={{ color: COLORS.textMedium, fontSize: 14 }}>
            {subtitle}
          </Text>
        </View>
        <Text style={{ color: COLORS.textLight, fontSize: 16 }}>{">"}</Text>
      </View>
    </Pressable>
  );
}

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
        backgroundColor: COLORS.surface,
        borderRadius: 8,
        paddingVertical: 12,
        paddingHorizontal: 12,
        marginBottom: 8,
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: COLORS.border,
        opacity: pressed ? 0.75 : 1,
      })}
    >
      {index !== undefined && (
        <View
          style={{
            width: 26,
            height: 26,
            borderRadius: 4,
            backgroundColor: "#f3f3f3",
            alignItems: "center",
            justifyContent: "center",
            marginRight: 10,
          }}
        >
          <Text style={{ color: COLORS.text, fontWeight: "700", fontSize: 12 }}>
            {index}
          </Text>
        </View>
      )}

      <View style={{ flex: 1 }}>
        <Text style={{ color: COLORS.text, fontSize: 15, fontWeight: "600" }}>
          {title}
        </Text>
        {subtitle && (
          <Text style={{ color: COLORS.textLight, fontSize: 13, marginTop: 2 }}>
            {subtitle}
          </Text>
        )}
      </View>

      {showArrow && (
        <Text style={{ color: COLORS.textLight, fontSize: 15 }}>{">"}</Text>
      )}
    </Pressable>
  );
}

function Header({ title, onBack }: { title: string; onBack?: () => void }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.divider,
      }}
    >
      {onBack && (
        <Pressable
          onPress={onBack}
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: COLORS.border,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 10,
          }}
        >
          <Text style={{ color: COLORS.text, fontSize: 14 }}>{"<"}</Text>
        </Pressable>
      )}
      <Text style={{ color: COLORS.text, fontSize: 21, fontWeight: "700" }}>
        {title}
      </Text>
    </View>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <Text
      style={{
        color: COLORS.textMedium,
        fontSize: 13,
        fontWeight: "600",
        marginBottom: 8,
      }}
    >
      {title}
    </Text>
  );
}

function GroupBox({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View
      style={{
        backgroundColor: COLORS.surface,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: 12,
        marginBottom: 12,
      }}
    >
      <SectionTitle title={title} />
      {children}
    </View>
  );
}

function InfoCard({ children }: { children: React.ReactNode }) {
  return (
    <View
      style={{
        backgroundColor: COLORS.surface,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: 12,
        marginBottom: 12,
      }}
    >
      {children}
    </View>
  );
}

function Tag({ text }: { text: string }) {
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 4,
        marginRight: 8,
      }}
    >
      <Text style={{ color: COLORS.textMedium, fontSize: 12 }}>{text}</Text>
    </View>
  );
}

function CheckboxItem({
  title,
  checked,
  onPress,
}: {
  title: string;
  checked: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: COLORS.surface,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: 12,
        marginBottom: 8,
        flexDirection: "row",
        alignItems: "center",
        opacity: pressed ? 0.75 : 1,
      })}
    >
      <View
        style={{
          width: 18,
          height: 18,
          borderRadius: 3,
          borderWidth: 1,
          borderColor: COLORS.textMedium,
          backgroundColor: checked ? COLORS.text : "transparent",
          marginRight: 10,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {checked && <Text style={{ color: "#fff", fontSize: 10 }}>✓</Text>}
      </View>
      <Text style={{ color: COLORS.text, fontSize: 14, flex: 1 }}>{title}</Text>
    </Pressable>
  );
}

function PrimaryButton({
  title,
  onPress,
  disabled,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        backgroundColor: pressed ? "#222" : "#111",
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: "center",
        opacity: disabled ? 0.5 : 1,
      })}
    >
      <Text style={{ color: "#fff", fontSize: 15, fontWeight: "600" }}>
        {title}
      </Text>
    </Pressable>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <View
      style={{
        backgroundColor: COLORS.surface,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: 18,
      }}
    >
      <Text
        style={{ color: COLORS.textMedium, fontSize: 14, textAlign: "center" }}
      >
        {message}
      </Text>
    </View>
  );
}

function SelectionCounter({ count }: { count: number }) {
  return (
    <View
      style={{
        borderRadius: 8,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: 10,
        marginBottom: 10,
      }}
    >
      <Text style={{ color: COLORS.text, fontSize: 14 }}>
        Selected: {count} exercise{count !== 1 ? "s" : ""}
      </Text>
    </View>
  );
}

function ScreenHint({ text }: { text: string }) {
  return (
    <View
      style={{
        borderRadius: 8,
        borderWidth: 1,
        borderColor: COLORS.border,
        paddingHorizontal: 10,
        paddingVertical: 8,
        marginBottom: 10,
      }}
    >
      <Text style={{ color: COLORS.textMedium, fontSize: 13 }}>{text}</Text>
    </View>
  );
}

export default function Workout() {
  const { width } = useWindowDimensions();
  const padding = width > 600 ? 40 : 16;

  const [screen, setScreen] = useState<Screen>("menu");
  const [selectedExercise, setSelectedExercise] =
    useState<ExerciseConfig | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<WorkoutPreset | null>(
    null,
  );
  const [customWorkoutName, setCustomWorkoutName] = useState("");
  const [selectedExercises, setSelectedExercises] = useState<string[]>([]);
  const [savedWorkouts, setSavedWorkouts] = useState<CustomWorkout[]>([]);

  useEffect(() => {
    const loadCustomWorkouts = async () => {
      if (!auth.currentUser) return;
      try {
        const q = query(
          collection(db, `users/${auth.currentUser.uid}/customWorkouts`),
        );
        const snapshot = await getDocs(q);
        const workouts: CustomWorkout[] = [];
        snapshot.forEach((doc) => {
          workouts.push({ id: doc.id, ...doc.data() } as CustomWorkout);
        });
        setSavedWorkouts(workouts);
      } catch (error) {
        console.log("Error loading custom workouts:", error);
      }
    };
    loadCustomWorkouts();
  }, [screen]);

  const saveCustomWorkout = async () => {
    if (!auth.currentUser) {
      Alert.alert("Error", "Please login first");
      return;
    }
    if (!customWorkoutName.trim()) {
      Alert.alert("Error", "Please enter a workout name");
      return;
    }
    if (selectedExercises.length === 0) {
      Alert.alert("Error", "Please select at least one exercise");
      return;
    }
    try {
      await addDoc(
        collection(db, `users/${auth.currentUser.uid}/customWorkouts`),
        {
          name: customWorkoutName,
          exercises: selectedExercises,
          createdAt: new Date().toISOString(),
        },
      );
      Alert.alert("Success", "Workout saved!");
      setCustomWorkoutName("");
      setSelectedExercises([]);
      setScreen("menu");
    } catch (error: any) {
      Alert.alert("Error", `Failed to save: ${error?.message || "Unknown"}`);
    }
  };

  const toggleExercise = (key: string) => {
    setSelectedExercises((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const deleteWorkout = (workoutId: string) => {
    Alert.alert("Delete Workout", "Delete this workout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () =>
          setSavedWorkouts((prev) => prev.filter((w) => w.id !== workoutId)),
      },
    ]);
  };

  const startWorkoutFromList = (exerciseKeys: string[], index: number = 0) => {
    if (index >= exerciseKeys.length) {
      setSelectedPreset(null);
      setScreen("menu");
      return;
    }
    const exercise = EXERCISES[exerciseKeys[index]];
    if (exercise) setSelectedExercise(exercise);
  };

  if (screen === "single") {
    if (selectedExercise == null) {
      return (
        <View style={{ flex: 1, backgroundColor: COLORS.background }}>
          <SafeAreaView style={{ backgroundColor: COLORS.surface }}>
            <Header title="Exercises" onBack={() => setScreen("menu")} />
          </SafeAreaView>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{
              padding: padding,
              paddingTop: 12,
              paddingBottom: 24,
            }}
            showsVerticalScrollIndicator={false}
          >
            <ScreenHint text="Select one exercise to start camera mode" />
            {(
              [
                "chest",
                "back",
                "shoulders",
                "arms",
                "core",
                "legs",
                "fullbody",
                "cardio",
                "stretch",
              ] as MuscleGroup[]
            ).map((group) => {
              const exercisesInGroup = Object.keys(EXERCISES).filter(
                (key) => EXERCISES[key].muscleGroup === group,
              );
              if (exercisesInGroup.length === 0) return null;
              return (
                <GroupBox
                  key={group}
                  title={
                    group === "fullbody"
                      ? "Full Body"
                      : group === "cardio"
                        ? "Cardio"
                        : group === "stretch"
                          ? "Stretching"
                          : group
                  }
                >
                  {exercisesInGroup.map((key) => (
                    <ListItem
                      key={key}
                      title={EXERCISES[key].name}
                      onPress={() => setSelectedExercise(EXERCISES[key])}
                    />
                  ))}
                </GroupBox>
              );
            })}
          </ScrollView>
        </View>
      );
    }
    return (
      <Camera
        exercise={selectedExercise}
        onExit={() => setSelectedExercise(null)}
      />
    );
  }

  if (screen === "presets") {
    if (selectedPreset) {
      const exercises = getPresetExercises(selectedPreset);
      return (
        <View style={{ flex: 1, backgroundColor: COLORS.background }}>
          <SafeAreaView style={{ backgroundColor: COLORS.surface }}>
            <Header
              title={selectedPreset.name}
              onBack={() => setSelectedPreset(null)}
            />
          </SafeAreaView>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{
              padding: padding,
              paddingTop: 12,
              paddingBottom: 24,
            }}
            showsVerticalScrollIndicator={false}
          >
            <InfoCard>
              <View style={{ flexDirection: "row" }}>
                <Tag text={`${exercises.length} exercises`} />
                <Tag text={selectedPreset.difficulty} />
              </View>
            </InfoCard>

            <ScreenHint text="Tap any exercise from this preset" />
            <GroupBox title="Exercises">
              {exercises.map((ex, idx) => (
                <ListItem
                  key={idx}
                  title={ex?.name}
                  index={idx + 1}
                  onPress={() => setSelectedExercise(ex)}
                />
              ))}
            </GroupBox>
          </ScrollView>
        </View>
      );
    }

    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background }}>
        <SafeAreaView style={{ backgroundColor: COLORS.surface }}>
          <Header title="Workout Presets" onBack={() => setScreen("menu")} />
        </SafeAreaView>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            padding: padding,
            paddingTop: 12,
            paddingBottom: 24,
          }}
          showsVerticalScrollIndicator={false}
        >
          <ScreenHint text="Choose a preset and start training" />
          {WORKOUT_PRESETS.map((preset) => {
            const exerciseCount = preset.exercises.length;
            return (
              <Pressable
                key={preset.id}
                onPress={() => setSelectedPreset(preset)}
                style={({ pressed }) => ({
                  backgroundColor: COLORS.surface,
                  borderRadius: 10,
                  padding: 14,
                  marginBottom: 10,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  opacity: pressed ? 0.75 : 1,
                })}
              >
                <Text
                  style={{
                    color: COLORS.text,
                    fontSize: 17,
                    fontWeight: "700",
                    marginBottom: 8,
                  }}
                >
                  {preset.name}
                </Text>
                <View style={{ flexDirection: "row", marginBottom: 8 }}>
                  <Tag text={`${exerciseCount} exercises`} />
                  <Tag text={preset.difficulty} />
                </View>
                <Text style={{ color: COLORS.textLight, fontSize: 13 }}>
                  View exercises
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    );
  }

  if (screen === "customSelect") {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background }}>
        <SafeAreaView style={{ backgroundColor: COLORS.surface }}>
          <Header title="Select Exercises" onBack={() => setScreen("custom")} />
        </SafeAreaView>

        <View style={{ paddingHorizontal: padding, paddingTop: 12 }}>
          <ScreenHint text="Add a name, then pick exercises" />
          <View
            style={{
              borderWidth: 1,
              borderColor: COLORS.border,
              borderRadius: 8,
              paddingHorizontal: 10,
              paddingVertical: 8,
              marginBottom: 10,
            }}
          >
            <Text
              style={{ color: COLORS.textLight, fontSize: 12, marginBottom: 4 }}
            >
              Workout Name
            </Text>
            <TextInput
              value={customWorkoutName}
              onChangeText={setCustomWorkoutName}
              placeholder="Ex: Push day"
              placeholderTextColor={COLORS.textLight}
              style={{ color: COLORS.text, fontSize: 15, paddingVertical: 2 }}
            />
          </View>
          <SelectionCounter count={selectedExercises.length} />
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            padding: padding,
            paddingTop: 0,
            paddingBottom: 20,
          }}
          showsVerticalScrollIndicator={false}
        >
          {(
            [
              "chest",
              "back",
              "shoulders",
              "arms",
              "core",
              "legs",
              "fullbody",
              "cardio",
              "stretch",
            ] as MuscleGroup[]
          ).map((group) => {
            const exercisesInGroup = Object.keys(EXERCISES).filter(
              (key) => EXERCISES[key].muscleGroup === group,
            );
            if (exercisesInGroup.length === 0) return null;
            return (
              <GroupBox
                key={group}
                title={
                  group === "fullbody"
                    ? "Full Body"
                    : group === "cardio"
                      ? "Cardio"
                      : group === "stretch"
                        ? "Stretching"
                        : group
                }
              >
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
              </GroupBox>
            );
          })}
        </ScrollView>

        <View
          style={{
            padding: padding,
            borderTopWidth: 1,
            borderTopColor: COLORS.divider,
          }}
        >
          <PrimaryButton
            title="Save Workout"
            onPress={saveCustomWorkout}
            disabled={selectedExercises.length === 0}
          />
        </View>
      </View>
    );
  }

  if (screen === "custom") {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background }}>
        <SafeAreaView style={{ backgroundColor: COLORS.surface }}>
          <Header title="My Workouts" onBack={() => setScreen("menu")} />
        </SafeAreaView>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            padding: padding,
            paddingTop: 12,
            paddingBottom: 24,
          }}
          showsVerticalScrollIndicator={false}
        >
          <ScreenHint text="Tap to start • Long press to delete" />

          <Pressable
            onPress={() => {
              setCustomWorkoutName("");
              setSelectedExercises([]);
              setScreen("customSelect");
            }}
            style={({ pressed }) => ({
              borderWidth: 1,
              borderColor: COLORS.border,
              borderRadius: 10,
              padding: 14,
              marginBottom: 12,
              opacity: pressed ? 0.75 : 1,
            })}
          >
            <Text
              style={{
                color: COLORS.text,
                fontSize: 16,
                fontWeight: "700",
                marginBottom: 3,
              }}
            >
              Create New
            </Text>
            <Text style={{ color: COLORS.textMedium, fontSize: 13 }}>
              Add a new workout
            </Text>
          </Pressable>

          {savedWorkouts.length > 0 ? (
            <GroupBox title={`Your Workouts (${savedWorkouts.length})`}>
              {savedWorkouts.map((workout) => (
                <Pressable
                  key={workout.id}
                  onPress={() => startWorkoutFromList(workout.exercises)}
                  onLongPress={() => deleteWorkout(workout.id || "")}
                  style={({ pressed }) => ({
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    borderRadius: 8,
                    padding: 12,
                    marginBottom: 8,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    opacity: pressed ? 0.75 : 1,
                  })}
                >
                  <View>
                    <Text
                      style={{
                        color: COLORS.text,
                        fontSize: 15,
                        fontWeight: "600",
                        marginBottom: 2,
                      }}
                    >
                      {workout.name}
                    </Text>
                    <Text style={{ color: COLORS.textLight, fontSize: 13 }}>
                      {workout.exercises.length} exercises
                    </Text>
                  </View>
                  <Text style={{ color: COLORS.textLight }}>{">"}</Text>
                </Pressable>
              ))}
            </GroupBox>
          ) : (
            <EmptyState message="No workouts yet. Create your first one!" />
          )}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <SafeAreaView style={{ flex: 1 }}>
        <StatusBar
          barStyle="dark-content"
          backgroundColor={COLORS.background}
        />

        <View
          style={{
            alignItems: "center",
            paddingTop: 24,
            paddingBottom: 14,
            paddingHorizontal: padding,
          }}
        >
          <Text style={{ fontSize: 30, fontWeight: "700", color: COLORS.text }}>
            Workouts
          </Text>
        </View>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: padding,
            paddingBottom: 20,
          }}
          showsVerticalScrollIndicator={false}
        >
          <MenuCard
            title="Workout Presets"
            subtitle="Ready-made plans"
            onPress={() => setScreen("presets")}
          />

          <MenuCard
            title="My Workouts"
            subtitle="Saved and custom workouts"
            onPress={() => setScreen("custom")}
          />

          <MenuCard
            title="Single Exercise"
            subtitle="Train one movement"
            onPress={() => setScreen("single")}
          />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
