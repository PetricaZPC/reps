import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { addDoc, collection, deleteDoc, doc, getDocs, query } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  Alert,
  BackHandler,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
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
import WorkoutSession, { WorkoutResult } from "../src/WorkoutSession";
import WorkoutSummary from "../src/WorkoutSummary";

// ─── Tokens ──────────────────────────────────────────────────
const C = {
  bg: "#F7F8FA",
  glass: "rgba(255,255,255,0.72)",
  glassBorder: "rgba(255,255,255,0.9)",
  surface: "#FFFFFF",
  accent: "#4F6EF7",
  accentLight: "#EEF1FF",
  success: "#22C55E",
  successLight: "#DCFCE7",
  warning: "#F97316",
  warningLight: "#FFF0E8",
  danger: "#EF4444",
  dangerLight: "#FEE2E2",
  text: "#0F0F10",
  textMuted: "#8A8FA8",
  textLight: "#B8BCCD",
  border: "rgba(0,0,0,0.07)",
  blob1: "#E8EDFF",
  blob2: "#F0E8FF",
};

const isAndroid = Platform.OS === "android";
const topInset = Platform.OS === "android" ? (StatusBar.currentHeight ?? 24) : 0;
const safeTop = Platform.OS === "android" ? topInset + 12 : 12;

const DIFFICULTY_COLOR: Record<string, string> = {
  beginner: C.success,
  intermediate: C.warning,
  advanced: C.danger,
};
const DIFFICULTY_BG: Record<string, string> = {
  beginner: C.successLight,
  intermediate: C.warningLight,
  advanced: C.dangerLight,
};

type Screen =
  | "menu"
  | "presets"
  | "preset_overview"
  | "preset_session"
  | "preset_summary"
  | "single"
  | "custom"
  | "customSelect"
  | "custom_overview"   // NOU: preview workout custom înainte de start
  | "custom_session"    // NOU: sesiune workout custom (folosește WorkoutSession)
  | "custom_summary";   // NOU: summary după workout custom

interface CustomWorkout {
  id?: string;
  name: string;
  exercises: string[];
  customTargets?: Record<string, number>;
  customSets?: number;
}

// ─── Helpers ─────────────────────────────────────────────────
// Convertește un CustomWorkout într-un WorkoutPreset ca să îl putem
// da direct la WorkoutSession (care știe deja să facă seturi, pauze, skip, log etc.)
function customToPreset(w: CustomWorkout, targets?: Record<string, number>, sets?: number): WorkoutPreset {
  return {
    id: w.id ?? "custom",
    name: w.name,
    description: `Antrenament personalizat · ${w.exercises.length} exerciții`,
    exercises: w.exercises,
    difficulty: "intermediate",
    customTargets: targets,
    customSets: sets,
  };
}

// ─── Sub-components ───────────────────────────────────────────
function SectionLabel({ label }: { label: string }) {
  return <Text style={s.sectionLabel}>{label}</Text>;
}

function PageHeader({ title, onBack }: { title: string; onBack?: () => void }) {
  return (
    <View style={s.pageHeader}>
      {onBack && (
        <TouchableOpacity style={s.backBtn} onPress={onBack} activeOpacity={0.75}>
          <Ionicons name="arrow-back" size={18} color={C.text} />
        </TouchableOpacity>
      )}
      <Text style={s.pageTitle}>{title}</Text>
    </View>
  );
}

function DifficultyBadge({ difficulty }: { difficulty: string }) {
  return (
    <View style={[s.badge, { backgroundColor: DIFFICULTY_BG[difficulty] }]}>
      <Text style={[s.badgeText, { color: DIFFICULTY_COLOR[difficulty] }]}>
        {difficulty}
      </Text>
    </View>
  );
}

function ExerciseRow({
  name, subtitle, index, onPress,
}: {
  name: string; subtitle?: string; index?: number; onPress?: () => void;
}) {
  return (
    <TouchableOpacity style={s.exerciseRow} onPress={onPress} activeOpacity={0.75}>
      {index !== undefined && (
        <View style={s.exerciseIndex}>
          <Text style={s.exerciseIndexText}>{index}</Text>
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={s.exerciseName}>{name}</Text>
        {subtitle && <Text style={s.exerciseSub}>{subtitle}</Text>}
      </View>
      {onPress && <Ionicons name="chevron-forward" size={16} color={C.textLight} />}
    </TouchableOpacity>
  );
}

function CheckboxRow({
  title, checked, onPress, target, onTargetChange, isTimed,
}: {
  title: string;
  checked: boolean;
  onPress: () => void;
  target?: number;
  onTargetChange?: (val: number) => void;
  isTimed?: boolean;
}) {
  const REPS_OPTIONS = isTimed
    ? [15, 20, 30, 45, 60, 90, 120]
    : [5, 8, 10, 12, 15, 20, 25, 30];

  return (
    <View style={s.checkboxRow}>
      <TouchableOpacity
        style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}
        onPress={onPress}
        activeOpacity={0.75}
      >
        <View style={[s.checkbox, checked && s.checkboxChecked]}>
          {checked && <Ionicons name="checkmark" size={12} color="#fff" />}
        </View>
        <Text style={s.checkboxLabel}>{title}</Text>
      </TouchableOpacity>
      {checked && onTargetChange && (
        <View style={s.repsPicker}>
          <TouchableOpacity
            onPress={() => {
              const idx = REPS_OPTIONS.indexOf(target ?? REPS_OPTIONS[2]);
              if (idx > 0) onTargetChange(REPS_OPTIONS[idx - 1]);
            }}
            style={s.repsBtn}
            activeOpacity={0.7}
          >
            <Text style={s.repsBtnText}>−</Text>
          </TouchableOpacity>
          <Text style={s.repsValue}>
            {target ?? REPS_OPTIONS[2]}{isTimed ? "s" : ""}
          </Text>
          <TouchableOpacity
            onPress={() => {
              const idx = REPS_OPTIONS.indexOf(target ?? REPS_OPTIONS[2]);
              if (idx < REPS_OPTIONS.length - 1) onTargetChange(REPS_OPTIONS[idx + 1]);
            }}
            style={s.repsBtn}
            activeOpacity={0.7}
          >
            <Text style={s.repsBtnText}>+</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function PrimaryBtn({
  title, onPress, disabled, icon,
}: {
  title: string; onPress: () => void; disabled?: boolean; icon?: any;
}) {
  return (
    <TouchableOpacity
      style={[s.primaryBtn, disabled && s.primaryBtnDisabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
    >
      {icon && (
        <Ionicons name={icon} size={18} color={disabled ? C.textLight : "#fff"} />
      )}
      <Text style={[s.primaryBtnText, disabled && { color: C.textLight }]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}

function GroupCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={s.groupCard}>
      <SectionLabel label={title} />
      {children}
    </View>
  );
}

// ─── Main ─────────────────────────────────────────────────────
export default function Workout() {
  const { width } = useWindowDimensions();
  const navigation = useNavigation();

  const [screen, setScreen] = useState<Screen>("menu");
  const [selectedExercise, setSelectedExercise] = useState<ExerciseConfig | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<WorkoutPreset | null>(null);
  // NOU: workout custom selectat (pentru sesiune)
  const [selectedCustomWorkout, setSelectedCustomWorkout] = useState<CustomWorkout | null>(null);
  const [workoutResults, setWorkoutResults] = useState<WorkoutResult[]>([]);
  const [customWorkoutName, setCustomWorkoutName] = useState("");
  const [selectedExercises, setSelectedExercises] = useState<string[]>([]);
  const [savedWorkouts, setSavedWorkouts] = useState<CustomWorkout[]>([]);
  const [nameInputFocused, setNameInputFocused] = useState(false);
  // Target-uri custom per exercițiu la crearea unui workout nou
  const [customTargets, setCustomTargets] = useState<Record<string, number>>({});
  const [customSets, setCustomSets] = useState<number>(3); // default 3 seturi

  // Ascunde tab bar în ecranele de antrenament activ
  useEffect(() => {
    const inWorkout =
      screen === "preset_session" ||
      screen === "custom_session" ||
      (screen === "single" && selectedExercise);
    navigation.setOptions({
      tabBarStyle: inWorkout ? { display: "none" } : { display: "flex" },
    });
  }, [screen, selectedExercise, navigation]);

  useEffect(() => {
    loadCustomWorkouts();
  }, [screen]);

  // Back handler
  useEffect(() => {
    const onBackPress = () => {
      if (screen === "preset_session") { setScreen("preset_overview"); return true; }
      if (screen === "preset_overview") { setSelectedPreset(null); setScreen("presets"); return true; }
      if (screen === "preset_summary") {
        saveWorkoutLog(selectedPreset, workoutResults);
        setWorkoutResults([]); setSelectedPreset(null); setScreen("presets"); return true;
      }
      if (screen === "presets") { setSelectedPreset(null); setScreen("menu"); return true; }
      if (screen === "custom_session") { setScreen("custom_overview"); return true; }
      if (screen === "custom_overview") { setSelectedCustomWorkout(null); setScreen("custom"); return true; }
      if (screen === "custom_summary") {
        saveCustomWorkoutLog(selectedCustomWorkout, workoutResults);
        setWorkoutResults([]); setSelectedCustomWorkout(null); setScreen("custom"); return true;
      }
      if (screen === "single") {
        if (selectedExercise) { setSelectedExercise(null); return true; }
        setScreen("menu"); return true;
      }
      if (screen === "customSelect") { setScreen("custom"); return true; }
      if (screen === "custom") { setScreen("menu"); return true; }
      return false;
    };
    const sub = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => sub.remove();
  }, [screen, selectedExercise, selectedPreset, selectedCustomWorkout, workoutResults]);

  // ── Salvare log preset ──
  const saveWorkoutLog = async (
    preset: WorkoutPreset | null,
    results: WorkoutResult[],
  ) => {
    if (!auth.currentUser || !preset || results.length === 0) return;
    try {
      const totalSets = results.reduce((acc, r) => acc + r.sets.length, 0);
      const completedSets = results.reduce(
        (acc, r) => acc + r.sets.filter((s) => s.repsOrSeconds >= s.target).length, 0,
      );
      const totalVolume = results.reduce(
        (acc, r) => acc + r.sets.reduce((s, set) => s + set.repsOrSeconds, 0), 0,
      );
      await addDoc(collection(db, `users/${auth.currentUser.uid}/workoutLogs`), {
        presetId: preset.id,
        presetName: preset.name,
        difficulty: preset.difficulty,
        totalSets,
        completedSets,
        totalVolume,
        isCustom: false,
        completedAt: new Date().toISOString(),
      });
    } catch (e) {
      console.log("Failed to save workout log", e);
    }
  };

  // ── Salvare log custom ── (același format, cu isCustom: true)
  const saveCustomWorkoutLog = async (
    customWorkout: CustomWorkout | null,
    results: WorkoutResult[],
  ) => {
    if (!auth.currentUser || !customWorkout || results.length === 0) return;
    try {
      const totalSets = results.reduce((acc, r) => acc + r.sets.length, 0);
      const completedSets = results.reduce(
        (acc, r) => acc + r.sets.filter((s) => s.repsOrSeconds >= s.target).length, 0,
      );
      const totalVolume = results.reduce(
        (acc, r) => acc + r.sets.reduce((s, set) => s + set.repsOrSeconds, 0), 0,
      );
      await addDoc(collection(db, `users/${auth.currentUser.uid}/workoutLogs`), {
        presetId: customWorkout.id ?? "custom",
        presetName: customWorkout.name,
        difficulty: "intermediate",
        totalSets,
        completedSets,
        totalVolume,
        isCustom: true,
        completedAt: new Date().toISOString(),
      });
    } catch (e) {
      console.log("Failed to save custom workout log", e);
    }
  };

  const loadCustomWorkouts = async () => {
    if (!auth.currentUser) return;
    try {
      const q = query(collection(db, `users/${auth.currentUser.uid}/customWorkouts`));
      const snapshot = await getDocs(q);
      const workouts: CustomWorkout[] = [];
      snapshot.forEach((doc) => workouts.push({ id: doc.id, ...doc.data() } as CustomWorkout));
      setSavedWorkouts(workouts);
    } catch {}
  };

  const saveCustomWorkout = async () => {
    if (!auth.currentUser) { Alert.alert("Eroare", "Trebuie să fii autentificat."); return; }
    if (!customWorkoutName.trim()) { Alert.alert("Eroare", "Introduceți un nume pentru antrenament."); return; }
    if (selectedExercises.length === 0) { Alert.alert("Eroare", "Selectați cel puțin un exercițiu."); return; }
    try {
      await addDoc(collection(db, `users/${auth.currentUser.uid}/customWorkouts`), {
        name: customWorkoutName,
        exercises: selectedExercises,
        customTargets,
        customSets,
        createdAt: new Date().toISOString(),
      });
      Alert.alert("Salvat!", "Antrenamentul tău a fost salvat.");
      setCustomWorkoutName("");
      setSelectedExercises([]);
      setScreen("custom");
    } catch (error: any) {
      Alert.alert("Eroare", error?.message ?? "Nu s-a putut salva.");
    }
  };

  const toggleExercise = (key: string) =>
    setSelectedExercises((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );

  const deleteWorkout = (id: string) =>
    Alert.alert("Șterge antrenamentul?", "Această acțiune nu poate fi anulată.", [
      { text: "Anulează", style: "cancel" },
      {
        text: "Șterge",
        style: "destructive",
        onPress: async () => {
          // Șterge și din Firestore
          if (auth.currentUser) {
            try {
              await deleteDoc(doc(db, `users/${auth.currentUser.uid}/customWorkouts`, id));
            } catch (e) {
              console.log("Failed to delete workout", e);
            }
          }
          setSavedWorkouts((prev) => prev.filter((w) => w.id !== id));
        },
      },
    ]);

  const muscleGroups: MuscleGroup[] = [
    "chest", "back", "shoulders", "arms", "core", "legs", "fullbody", "cardio", "stretch",
  ];
  const muscleLabel: Record<string, string> = {
    chest: "Piept", back: "Spate", shoulders: "Umeri", arms: "Brațe",
    core: "Core", legs: "Picioare", fullbody: "Full Body", cardio: "Cardio", stretch: "Stretching",
  };

  // ════════════════════════════════════════════════════════════
  // ECRANE
  // ════════════════════════════════════════════════════════════

  // ── Preset session ──
  if (screen === "preset_session" && selectedPreset) {
    return (
      <WorkoutSession
        preset={selectedPreset}
        onFinish={(results) => {
          setWorkoutResults(results);
          setScreen("preset_summary");
        }}
        onExit={() => setScreen("preset_overview")}
      />
    );
  }

  // ── Preset summary ──
  if (screen === "preset_summary" && selectedPreset) {
    return (
      <WorkoutSummary
        preset={selectedPreset}
        results={workoutResults}
        onClose={() => {
          saveWorkoutLog(selectedPreset, workoutResults);
          setWorkoutResults([]);
          setScreen("presets");
          setSelectedPreset(null);
        }}
      />
    );
  }

  // ── Custom session ── (NOU: folosește WorkoutSession exact ca preset-urile)
  if (screen === "custom_session" && selectedCustomWorkout) {
    const preset = customToPreset(selectedCustomWorkout, selectedCustomWorkout.customTargets, selectedCustomWorkout.customSets);
    return (
      <WorkoutSession
        preset={preset}
        onFinish={(results) => {
          setWorkoutResults(results);
          setScreen("custom_summary");
        }}
        onExit={() => setScreen("custom_overview")}
      />
    );
  }

  // ── Custom summary ── (NOU: același WorkoutSummary)
  if (screen === "custom_summary" && selectedCustomWorkout) {
    const preset = customToPreset(selectedCustomWorkout, selectedCustomWorkout.customTargets, selectedCustomWorkout.customSets);
    return (
      <WorkoutSummary
        preset={preset}
        results={workoutResults}
        onClose={() => {
          saveCustomWorkoutLog(selectedCustomWorkout, workoutResults);
          setWorkoutResults([]);
          setScreen("custom");
          setSelectedCustomWorkout(null);
        }}
      />
    );
  }

  // ── Custom overview ── (NOU: preview înainte de start, identic cu preset_overview)
  if (screen === "custom_overview" && selectedCustomWorkout) {
    const preset = customToPreset(selectedCustomWorkout, selectedCustomWorkout.customTargets, selectedCustomWorkout.customSets);
    const exercises = getPresetExercises(preset);
    const totalSets = selectedCustomWorkout.customSets ?? 3;
    return (
      <View style={s.root}>
        <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
        <View style={[s.blob, { top: -60, right: -80, backgroundColor: C.blob1 }]} />
        <SafeAreaView style={s.safeAreaHeader}>
          <PageHeader
            title={selectedCustomWorkout.name}
            onBack={() => { setSelectedCustomWorkout(null); setScreen("custom"); }}
          />
        </SafeAreaView>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          <View style={[s.groupCard, { flexDirection: "row", flexWrap: "wrap", gap: 8 }]}>
            <DifficultyBadge difficulty="intermediate" />
            <View style={[s.badge, { backgroundColor: C.accentLight }]}>
              <Text style={[s.badgeText, { color: C.accent }]}>{exercises.length} exerciții</Text>
            </View>
            <View style={[s.badge, { backgroundColor: C.accentLight }]}>
              <Text style={[s.badgeText, { color: C.accent }]}>{totalSets} seturi fiecare</Text>
            </View>
          </View>
          <Text style={s.presetDesc}>Antrenament personalizat creat de tine.</Text>
          <GroupCard title="Exerciții">
            {exercises.map((ex, idx) => (
              <ExerciseRow key={idx} name={ex?.name} subtitle={ex?.muscleGroup} index={idx + 1} />
            ))}
          </GroupCard>
          <View style={{ height: 100 }} />
        </ScrollView>
        <View style={s.stickyBottom}>
          <PrimaryBtn
            title="Începe antrenamentul"
            onPress={() => setScreen("custom_session")}
            icon="play"
          />
        </View>
      </View>
    );
  }

  // ── Preset overview ──
  if (screen === "preset_overview" && selectedPreset) {
    const exercises = getPresetExercises(selectedPreset);
    const totalSets =
      selectedPreset.difficulty === "beginner" ? 2
      : selectedPreset.difficulty === "intermediate" ? 3 : 4;
    return (
      <View style={s.root}>
        <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
        <View style={[s.blob, { top: -60, right: -80, backgroundColor: C.blob1 }]} />
        <SafeAreaView style={s.safeAreaHeader}>
          <PageHeader
            title={selectedPreset.name}
            onBack={() => { setSelectedPreset(null); setScreen("presets"); }}
          />
        </SafeAreaView>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          <View style={[s.groupCard, { flexDirection: "row", flexWrap: "wrap", gap: 8 }]}>
            <DifficultyBadge difficulty={selectedPreset.difficulty} />
            <View style={[s.badge, { backgroundColor: C.accentLight }]}>
              <Text style={[s.badgeText, { color: C.accent }]}>{exercises.length} exerciții</Text>
            </View>
            <View style={[s.badge, { backgroundColor: C.accentLight }]}>
              <Text style={[s.badgeText, { color: C.accent }]}>{totalSets} seturi fiecare</Text>
            </View>
          </View>
          <Text style={s.presetDesc}>{selectedPreset.description}</Text>
          <GroupCard title="Exerciții">
            {exercises.map((ex, idx) => (
              <ExerciseRow
                key={idx}
                name={ex?.name}
                subtitle={ex?.muscleGroup}
                index={idx + 1}
                onPress={() => {
                  if (!ex) return;
                  setSelectedExercise(ex);
                  setScreen("single");
                }}
              />
            ))}
          </GroupCard>
          <View style={{ height: 100 }} />
        </ScrollView>
        <View style={s.stickyBottom}>
          <PrimaryBtn
            title="Începe antrenamentul"
            onPress={() => setScreen("preset_session")}
            icon="play"
          />
        </View>
      </View>
    );
  }

  // ── Single exercise ──
  if (screen === "single") {
    if (selectedExercise)
      return <Camera exercise={selectedExercise} onExit={() => setSelectedExercise(null)} />;
    return (
      <View style={s.root}>
        <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
        <View style={[s.blob, { top: -60, right: -80, backgroundColor: C.blob1 }]} />
        <SafeAreaView style={s.safeAreaHeader}>
          <PageHeader title="Exerciții" onBack={() => setScreen("menu")} />
        </SafeAreaView>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          <View style={s.hint}>
            <Ionicons name="information-circle-outline" size={15} color={C.accent} />
            <Text style={s.hintText}>Selectează un exercițiu pentru a activa camera</Text>
          </View>
          {muscleGroups.map((group) => {
            const list = Object.keys(EXERCISES).filter((k) => EXERCISES[k].muscleGroup === group);
            if (!list.length) return null;
            return (
              <GroupCard key={group} title={muscleLabel[group]}>
                {list.map((key) => (
                  <ExerciseRow key={key} name={EXERCISES[key].name} onPress={() => setSelectedExercise(EXERCISES[key])} />
                ))}
              </GroupCard>
            );
          })}
        </ScrollView>
      </View>
    );
  }

  // ── Presets list ──
  if (screen === "presets") {
    return (
      <View style={s.root}>
        <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
        <View style={[s.blob, { top: -60, right: -80, backgroundColor: C.blob1 }]} />
        <SafeAreaView style={s.safeAreaHeader}>
          <PageHeader title="Antrenamente Preset" onBack={() => setScreen("menu")} />
        </SafeAreaView>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          <View style={s.hint}>
            <Ionicons name="barbell-outline" size={15} color={C.accent} />
            <Text style={s.hintText}>Alege un plan complet cu seturi și pauze</Text>
          </View>
          {WORKOUT_PRESETS.map((preset) => (
            <TouchableOpacity
              key={preset.id}
              style={s.presetCard}
              onPress={() => { setSelectedPreset(preset); setScreen("preset_overview"); }}
              activeOpacity={0.82}
            >
              <View style={s.presetCardTop}>
                <Text style={s.presetCardName}>{preset.name}</Text>
                <DifficultyBadge difficulty={preset.difficulty} />
              </View>
              <Text style={s.presetCardDesc}>{preset.description}</Text>
              <View style={s.presetCardFooter}>
                <View style={s.presetStat}>
                  <Ionicons name="layers-outline" size={13} color={C.textMuted} />
                  <Text style={s.presetStatText}>{preset.exercises.length} exerciții</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  }

  // ── Custom select (creare workout nou) ──
  if (screen === "customSelect") {
    return (
      <View style={s.root}>
        <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
        <SafeAreaView style={s.safeAreaHeader}>
          <PageHeader title="Exerciții selectate" onBack={() => setScreen("custom")} />
        </SafeAreaView>
        <View style={s.customTopBar}>
          <View style={s.nameInputWrap}>
            <Text style={s.fieldLabel}>Nume antrenament</Text>
            <TextInput
              style={[s.nameInput, nameInputFocused && s.nameInputFocused]}
              value={customWorkoutName}
              onChangeText={setCustomWorkoutName}
              placeholder="ex: Push Day"
              placeholderTextColor={C.textLight}
              onFocus={() => setNameInputFocused(true)}
              onBlur={() => setNameInputFocused(false)}
            />
          </View>
          <View style={[s.badge, { backgroundColor: C.accentLight, alignSelf: "flex-end", marginBottom: 2 }]}>
            <Text style={[s.badgeText, { color: C.accent }]}>{selectedExercises.length} selectate</Text>
          </View>
        </View>
        {/* ── Picker seturi ── */}
        <View style={s.setsPickerBar}>
          <Text style={s.setsPickerLabel}>Seturi per exercițiu</Text>
          <View style={s.repsPicker}>
            {[2, 3, 4, 5].map((n) => (
              <TouchableOpacity
                key={n}
                onPress={() => setCustomSets(n)}
                style={[s.setsOption, customSets === n && s.setsOptionActive]}
                activeOpacity={0.75}
              >
                <Text style={[s.setsOptionText, customSets === n && s.setsOptionTextActive]}>
                  {n}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          {muscleGroups.map((group) => {
            const list = Object.keys(EXERCISES).filter((k) => EXERCISES[k].muscleGroup === group);
            if (!list.length) return null;
            return (
              <GroupCard key={group} title={muscleLabel[group]}>
                {list.map((key) => {
                  const ex = EXERCISES[key];
                  const defaultTarget = ex.type === "timed" ? 30 : 12;
                  return (
                    <CheckboxRow
                      key={key}
                      title={ex.name}
                      checked={selectedExercises.includes(key)}
                      onPress={() => toggleExercise(key)}
                      isTimed={ex.type === "timed"}
                      target={customTargets[key] ?? defaultTarget}
                      onTargetChange={(val) =>
                        setCustomTargets((prev) => ({ ...prev, [key]: val }))
                      }
                    />
                  );
                })}
              </GroupCard>
            );
          })}
          <View style={{ height: 100 }} />
        </ScrollView>
        <View style={s.stickyBottom}>
          <PrimaryBtn
            title="Salvează antrenamentul"
            onPress={saveCustomWorkout}
            disabled={selectedExercises.length === 0}
            icon="save-outline"
          />
        </View>
      </View>
    );
  }

  // ── Custom workouts list ──
  if (screen === "custom") {
    return (
      <View style={s.root}>
        <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
        <View style={[s.blob, { top: -60, right: -80, backgroundColor: C.blob1 }]} />
        <SafeAreaView style={s.safeAreaHeader}>
          <PageHeader title="Antrenamentele Mele" onBack={() => setScreen("menu")} />
        </SafeAreaView>
        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
          <TouchableOpacity
            style={s.createCard}
            onPress={() => { setCustomWorkoutName(""); setSelectedExercises([]); setCustomTargets({}); setCustomSets(3); setScreen("customSelect"); }}
            activeOpacity={0.82}
          >
            <View style={s.createCardIcon}>
              <Ionicons name="add" size={22} color={C.accent} />
            </View>
            <View>
              <Text style={s.createCardTitle}>Antrenament nou</Text>
              <Text style={s.createCardSub}>Creează un plan personalizat</Text>
            </View>
          </TouchableOpacity>

          {savedWorkouts.length > 0 ? (
            <GroupCard title={`Salvate (${savedWorkouts.length})`}>
              {savedWorkouts.map((w) => (
                <TouchableOpacity
                  key={w.id}
                  style={s.savedWorkoutRow}
                  onPress={() => {
                    // NOU: deschidem preview + sesiune completă, nu single mode
                    setSelectedCustomWorkout(w);
                    setScreen("custom_overview");
                  }}
                  onLongPress={() => deleteWorkout(w.id ?? "")}
                  activeOpacity={0.75}
                >
                  <View style={s.savedWorkoutIcon}>
                    <Ionicons name="barbell-outline" size={16} color={C.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.savedWorkoutName}>{w.name}</Text>
                    <Text style={s.savedWorkoutSub}>{w.exercises.length} exerciții · apasă lung pentru ștergere</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={C.textLight} />
                </TouchableOpacity>
              ))}
            </GroupCard>
          ) : (
            <View style={s.emptyState}>
              <Text style={{ fontSize: 32, marginBottom: 10 }}>💪</Text>
              <Text style={s.emptyTitle}>Niciun antrenament salvat</Text>
              <Text style={s.emptySub}>Creează primul tău plan personalizat</Text>
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  // ── Menu ──
  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
      <View style={[s.blob, { top: -80, left: -60, backgroundColor: C.blob1 }]} />
      <View style={[s.blob, { top: 140, right: -100, width: 260, height: 260, backgroundColor: C.blob2 }]} />
      <SafeAreaView style={[s.safeArea, { paddingTop: safeTop }]}>
        <ScrollView
          contentContainerStyle={[s.scroll, { paddingTop: safeTop + (Platform.OS === "ios" ? 8 : 12) }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={s.menuHeader}>
            <View style={s.menuIconWrap}>
              <Ionicons name="barbell" size={24} color={C.accent} />
            </View>
            <Text style={s.menuTitle}>Workout</Text>
            <Text style={s.menuSub}>Ce facem azi?</Text>
          </View>
          {[
            { title: "Antrenamente Preset", sub: "Planuri complete cu seturi & pauze", icon: "library-outline", screen: "presets" as Screen },
            { title: "Antrenamentele Mele", sub: "Planuri salvate și personalizate", icon: "bookmark-outline", screen: "custom" as Screen },
            { title: "Exercițiu Single", sub: "Antrenează o singură mișcare", icon: "body-outline", screen: "single" as Screen },
          ].map((item) => (
            <TouchableOpacity
              key={item.screen}
              style={s.menuCard}
              onPress={() => setScreen(item.screen)}
              activeOpacity={0.82}
            >
              <View style={s.menuCardIcon}>
                <Ionicons name={item.icon as any} size={22} color={C.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.menuCardTitle}>{item.title}</Text>
                <Text style={s.menuCardSub}>{item.sub}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={C.textLight} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  safeArea: { flex: 1 },
  safeAreaHeader: { paddingTop: safeTop },
  blob: { position: "absolute", width: 280, height: 280, borderRadius: 140, opacity: 0.5 },
  scroll: { paddingHorizontal: 20, paddingBottom: 24, gap: 12 },

  pageHeader: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: C.border,
    backgroundColor: isAndroid ? C.surface : C.glass, marginBottom: 12,
  },
  backBtn: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: C.bg, borderWidth: 1, borderColor: C.border,
    alignItems: "center", justifyContent: "center",
  },
  pageTitle: { fontSize: 19, fontWeight: "700", color: C.text, letterSpacing: -0.4 },

  sectionLabel: {
    fontSize: 11, fontWeight: "700", color: C.accent,
    letterSpacing: 1.4, textTransform: "uppercase", marginBottom: 12,
  },

  badge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 12, fontWeight: "700", textTransform: "capitalize" },

  groupCard: {
    backgroundColor: isAndroid ? C.surface : C.glass,
    borderRadius: 20, borderWidth: 1,
    borderColor: isAndroid ? C.border : C.glassBorder,
    padding: 18,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isAndroid ? 0.08 : 0.05,
    shadowRadius: isAndroid ? 12 : 16, elevation: isAndroid ? 4 : 2,
  },

  exerciseRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  exerciseIndex: {
    width: 26, height: 26, borderRadius: 8,
    backgroundColor: C.accentLight, alignItems: "center", justifyContent: "center",
  },
  exerciseIndexText: { fontSize: 11, fontWeight: "700", color: C.accent },
  exerciseName: { fontSize: 14, fontWeight: "600", color: C.text },
  exerciseSub: { fontSize: 12, color: C.textMuted, marginTop: 1 },

  checkboxRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  checkbox: {
    width: 20, height: 20, borderRadius: 5, borderWidth: 1.5,
    borderColor: C.textLight, alignItems: "center", justifyContent: "center",
  },
  checkboxChecked: { backgroundColor: C.accent, borderColor: C.accent },
  checkboxLabel: { fontSize: 14, color: C.text, flex: 1 },

  primaryBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, backgroundColor: C.accent, borderRadius: 16, paddingVertical: 16,
    shadowColor: C.accent, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28, shadowRadius: 14, elevation: 6,
  },
  primaryBtnDisabled: {
    backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border,
    shadowOpacity: 0, elevation: 0,
  },
  primaryBtnText: { color: "#fff", fontSize: 16, fontWeight: "700", letterSpacing: 0.2 },

  stickyBottom: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    padding: 20, paddingBottom: Platform.OS === "ios" ? 36 : 20,
    backgroundColor: isAndroid ? C.surface : C.glass,
    borderTopWidth: 1, borderTopColor: C.border,
  },

  hint: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: C.accentLight, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  hintText: { fontSize: 13, color: C.accent, fontWeight: "500", flex: 1 },

  presetCard: {
    backgroundColor: isAndroid ? C.surface : C.glass,
    borderRadius: 20, borderWidth: 1,
    borderColor: isAndroid ? C.border : C.glassBorder, padding: 18,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isAndroid ? 0.08 : 0.05,
    shadowRadius: isAndroid ? 12 : 16, elevation: isAndroid ? 4 : 2,
  },
  presetCardTop: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "flex-start", marginBottom: 6,
  },
  presetCardName: {
    fontSize: 16, fontWeight: "700", color: C.text,
    letterSpacing: -0.3, flex: 1, marginRight: 8,
  },
  presetCardDesc: { fontSize: 13, color: C.textMuted, lineHeight: 18, marginBottom: 10 },
  presetCardFooter: { flexDirection: "row", gap: 12 },
  presetStat: { flexDirection: "row", alignItems: "center", gap: 4 },
  presetStatText: { fontSize: 12, color: C.textMuted },
  presetDesc: { fontSize: 14, color: C.textMuted, marginTop: -4 },

  customTopBar: {
    flexDirection: "row", gap: 12, paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: isAndroid ? C.surface : C.glass,
    borderBottomWidth: 1, borderBottomColor: C.border, alignItems: "flex-end",
  },
  nameInputWrap: { flex: 1 },
  fieldLabel: { fontSize: 11, fontWeight: "600", color: C.textMuted, letterSpacing: 0.5, marginBottom: 5 },
  nameInput: {
    backgroundColor: C.bg, borderRadius: 12, borderWidth: 1.5,
    borderColor: C.border, paddingHorizontal: 14, paddingVertical: 11,
    fontSize: 15, color: C.text,
  },
  nameInputFocused: { borderColor: C.accent, backgroundColor: C.accentLight },

  createCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: isAndroid ? C.surface : C.glass,
    borderRadius: 20, borderWidth: 1,
    borderColor: isAndroid ? C.border : C.glassBorder, padding: 18,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isAndroid ? 0.08 : 0.05,
    shadowRadius: isAndroid ? 12 : 16, elevation: isAndroid ? 4 : 2,
  },
  createCardIcon: {
    width: 44, height: 44, borderRadius: 13,
    backgroundColor: C.accentLight, alignItems: "center", justifyContent: "center",
  },
  createCardTitle: { fontSize: 15, fontWeight: "700", color: C.text },
  createCardSub: { fontSize: 12, color: C.textMuted, marginTop: 2 },

  savedWorkoutRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  savedWorkoutIcon: {
    width: 32, height: 32, borderRadius: 9,
    backgroundColor: C.accentLight, alignItems: "center", justifyContent: "center",
  },
  savedWorkoutName: { fontSize: 14, fontWeight: "600", color: C.text },
  savedWorkoutSub: { fontSize: 12, color: C.textMuted, marginTop: 1 },

  emptyState: {
    backgroundColor: isAndroid ? C.surface : C.glass,
    borderRadius: 20, borderWidth: 1,
    borderColor: isAndroid ? C.border : C.glassBorder,
    padding: 32, alignItems: "center",
  },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: C.text, marginBottom: 4 },
  emptySub: { fontSize: 13, color: C.textMuted, textAlign: "center" },

  menuHeader: { alignItems: "center", paddingTop: 16, paddingBottom: 24, gap: 8 },
  menuIconWrap: {
    width: 60, height: 60, borderRadius: 18,
    backgroundColor: C.accentLight, alignItems: "center", justifyContent: "center", marginBottom: 4,
  },
  menuTitle: { fontSize: 28, fontWeight: "700", color: C.text, letterSpacing: -0.6 },
  menuSub: { fontSize: 15, color: C.textMuted },
  menuCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: isAndroid ? C.surface : C.glass,
    borderRadius: 20, borderWidth: 1,
    borderColor: isAndroid ? C.border : C.glassBorder, padding: 20,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isAndroid ? 0.08 : 0.05,
    shadowRadius: isAndroid ? 12 : 16, elevation: isAndroid ? 4 : 2,
  },
  menuCardIcon: {
    width: 48, height: 48, borderRadius: 14,
    backgroundColor: C.accentLight, alignItems: "center", justifyContent: "center",
  },
  menuCardTitle: { fontSize: 16, fontWeight: "700", color: C.text, letterSpacing: -0.3 },
  menuCardSub: { fontSize: 13, color: C.textMuted, marginTop: 2 },
  surface: { backgroundColor: C.surface },

  // Reps picker în customSelect
  repsPicker: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: C.accentLight,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  repsBtn: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: C.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  repsBtnText: { color: "#fff", fontSize: 16, fontWeight: "700", lineHeight: 20 },
  repsValue: { fontSize: 13, fontWeight: "700", color: C.accent, minWidth: 32, textAlign: "center" },

  setsPickerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: isAndroid ? C.surface : C.glass,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  setsPickerLabel: { fontSize: 14, fontWeight: "600", color: C.text },
  setsOption: {
    width: 40,
    height: 36,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.bg,
  },
  setsOptionActive: {
    backgroundColor: C.accent,
    borderColor: C.accent,
  },
  setsOptionText: { fontSize: 15, fontWeight: "700", color: C.textMuted },
  setsOptionTextActive: { color: "#fff" },
});