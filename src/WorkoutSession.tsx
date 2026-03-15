import { Ionicons } from "@expo/vector-icons";
import { Accelerometer } from "expo-sensors";
import { useEffect, useRef, useState } from "react";
import {
    Animated,
    Dimensions,
    Easing,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Camera from "./Camera";
import { EXERCISES, ExerciseConfig } from "./exercises";
import { WorkoutPreset } from "./workoutPresets";

// ─── Tokens ──────────────────────────────────────────────────
const C = {
  bg: "#F7F8FA",
  glass: "rgba(255,255,255,0.72)",
  glassBorder: "rgba(255,255,255,0.9)",
  accent: "#4F6EF7",
  accentLight: "#EEF1FF",
  warning: "#F97316",
  warningLight: "#FFF0E8",
  danger: "#EF4444",
  text: "#0F0F10",
  textMuted: "#8A8FA8",
  border: "rgba(0,0,0,0.07)",
  blob1: "#E8EDFF",
  blob2: "#F0E8FF",
};

// ─── Helpers ──────────────────────────────────────────────────
const getRestBetweenSets = (
  muscleGroup: string,
  exerciseKey: string,
): number => {
  if (exerciseKey === "calfRaises") return 90;
  switch (muscleGroup) {
    case "chest":
    case "back":
    case "legs":
      return 120;
    case "arms":
    case "shoulders":
    case "fullbody":
    case "cardio":
      return 90;
    case "core":
      return 60;
    default:
      return 90;
  }
};

const getSets = (difficulty: string): number => {
  switch (difficulty) {
    case "beginner":
      return 2;
    case "intermediate":
      return 3;
    case "advanced":
      return 4;
    default:
      return 3;
  }
};

const getTarget = (
  exercise: ExerciseConfig,
  difficulty: string,
  customTarget?: number,
): number => {
  // Dacă există un target custom setat de utilizator, îl folosim
  if (customTarget !== undefined && customTarget > 0) return customTarget;
  if (exercise.type === "timed") {
    switch (difficulty) {
      case "beginner": return 20;
      case "intermediate": return 30;
      case "advanced": return 45;
      default: return 30;
    }
  } else {
    switch (difficulty) {
      case "beginner": return 8;
      case "intermediate": return 12;
      case "advanced": return 15;
      default: return 10;
    }
  }
};

const fallbackExercise = (key: string): ExerciseConfig => ({
  name: key,
  landmarks: ["leftShoulder", "leftElbow", "leftWrist"],
  minAngle: 80,
  maxAngle: 150,
  side: "both",
  countOn: "up",
  type: "reps",
  description: "Config missing.",
  cameraPosition: "Place phone on the side.",
  muscleGroup: "fullbody",
  formRules: [],
});

// ─── Orientation hook ─────────────────────────────────────────
type DeviceOrientation = "portrait" | "landscape-left" | "landscape-right";

function useDeviceRotation() {
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const [orientation, setOrientation] = useState<DeviceOrientation>("portrait");
  const currentOrientRef = useRef<DeviceOrientation>("portrait");

  useEffect(() => {
    Accelerometer.setUpdateInterval(300);
    const sub = Accelerometer.addListener(({ x, y }) => {
      let next: DeviceOrientation = "portrait";
      if (Math.abs(y) > 0.7) {
        next = "portrait";
      } else if (x > 0.6) {
        next = "landscape-left";
      } else if (x < -0.6) {
        next = "landscape-right";
      } else {
        return;
      }

      if (next !== currentOrientRef.current) {
        currentOrientRef.current = next;
        setOrientation(next);

        const toValue =
          next === "portrait" ? 0 : next === "landscape-left" ? 90 : -90;
        Animated.timing(rotateAnim, {
          toValue,
          duration: 280,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start();
      }
    });

    return () => sub.remove();
  }, []);

  const isLandscape = orientation !== "portrait";

  const rotate = rotateAnim.interpolate({
    inputRange: [-90, 0, 90],
    outputRange: ["-90deg", "0deg", "90deg"],
  });

  return { rotate, isLandscape, orientation };
}

// ─── RotatedView ──────────────────────────────────────────────
// FIX: pointerEvents="box-none" on both container views so touches
// pass through to children and buttons work correctly
function RotatedView({
  rotate,
  isLandscape,
  children,
}: {
  rotate: Animated.AnimatedInterpolation<string>;
  isLandscape: boolean;
  children: React.ReactNode;
}) {
  const screen = Dimensions.get("screen");
  const W = Math.min(screen.width, screen.height);
  const H = Math.max(screen.width, screen.height);

  const innerW = isLandscape ? H : W;
  const innerH = isLandscape ? W : H;
  const topOffset = isLandscape ? (H - W) / 2 : 0;
  const leftOffset = isLandscape ? (W - H) / 2 : 0;

  return (
    <View
      pointerEvents="box-none"
      style={{ position: "absolute", top: 0, left: 0, width: W, height: H }}
    >
      <Animated.View
        pointerEvents="box-none"
        style={{
          position: "absolute",
          width: innerW,
          height: innerH,
          top: topOffset,
          left: leftOffset,
          transform: [{ rotate }],
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {children}
      </Animated.View>
    </View>
  );
}

// ─── Types ────────────────────────────────────────────────────
export interface WorkoutResult {
  exerciseKey: string;
  exerciseName: string;
  sets: { repsOrSeconds: number; target: number }[];
}

interface Props {
  preset: WorkoutPreset;
  customRestTime?: number;
  onFinish: (results: WorkoutResult[]) => void;
  onExit: () => void;
}

type Phase =
  | "exercise_intro"
  | "exercise"
  | "rest_between_sets"
  | "rest_between_exercises";

// ─── Main ─────────────────────────────────────────────────────
export default function WorkoutSession({
  preset,
  customRestTime,
  onFinish,
  onExit,
}: Props) {
  const insets = useSafeAreaInsets();
  const { rotate, isLandscape } = useDeviceRotation();
  const { width, height } = Dimensions.get("window");

  const totalSets = preset.customSets ?? getSets(preset.difficulty);
  const exerciseKeys = preset.exercises;

  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [setIndex, setSetIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>("exercise_intro");
  const [restCountdown, setRestCountdown] = useState(0);
  const [results, setResults] = useState<WorkoutResult[]>([]);
  const [currentSetReps, setCurrentSetReps] = useState(0);
  const [currentSetSeconds, setCurrentSetSeconds] = useState(0);

  const restIntervalRef = useRef<any>(null);
  const resultsRef = useRef<WorkoutResult[]>([]);
  const restWarningRef = useRef<any>(null);

  const currentKey = exerciseKeys[exerciseIndex];
  const currentExercise = EXERCISES[currentKey] ?? fallbackExercise(currentKey);
  const target = getTarget(
    currentExercise,
    preset.difficulty,
    preset.customTargets?.[currentKey],
  );
  const isLastSet = setIndex === totalSets - 1;
  const isLastExercise = exerciseIndex === exerciseKeys.length - 1;
  const progressPct =
    ((exerciseIndex * totalSets + setIndex) /
      (exerciseKeys.length * totalSets)) *
    100;

  useEffect(() => {
    return () => {
      if (restIntervalRef.current) clearInterval(restIntervalRef.current);
      if (restWarningRef.current) clearTimeout(restWarningRef.current);
    };
  }, []);

  const startRest = (seconds: number, next: () => void) => {
    setRestCountdown(seconds);
    restIntervalRef.current = setInterval(() => {
      setRestCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(restIntervalRef.current);
          next();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const saveSetResult = (value: number) => {
    const setResult = { repsOrSeconds: value, target };
    const existing = resultsRef.current.find(
      (r) => r.exerciseKey === currentKey,
    );
    if (existing) existing.sets.push(setResult);
    else
      resultsRef.current.push({
        exerciseKey: currentKey,
        exerciseName: currentExercise.name,
        sets: [setResult],
      });
    setResults([...resultsRef.current]);
  };

  const handleRepsUpdate = (reps: number) => {
    setCurrentSetReps(reps);
    if (currentExercise.type === "reps" && reps >= target) completeSet(reps);
  };

  const handleSecondsUpdate = (seconds: number) => {
    setCurrentSetSeconds(seconds);
    if (currentExercise.type === "timed" && seconds >= target)
      completeSet(seconds);
  };

  const completeSet = (value: number) => {
    saveSetResult(value);
    if (restWarningRef.current) clearTimeout(restWarningRef.current);

    if (isLastSet) {
      if (isLastExercise) {
        onFinish(resultsRef.current);
      } else {
        setPhase("rest_between_exercises");
        startRest(customRestTime ?? 120, () => {
          setExerciseIndex((p) => p + 1);
          setSetIndex(0);
          setCurrentSetReps(0);
          setCurrentSetSeconds(0);
          setPhase("exercise_intro");
        });
      }
    } else {
      const restTime = getRestBetweenSets(
        currentExercise.muscleGroup,
        currentKey,
      );
      setPhase("rest_between_sets");
      startRest(restTime, () => {
        setSetIndex((p) => p + 1);
        setCurrentSetReps(0);
        setCurrentSetSeconds(0);
        setPhase("exercise");
      });
    }
  };

  const skipCurrentSet = () =>
    completeSet(
      currentExercise.type === "reps" ? currentSetReps : currentSetSeconds,
    );

  const skipRest = () => {
    if (restIntervalRef.current) clearInterval(restIntervalRef.current);
    if (restWarningRef.current) clearTimeout(restWarningRef.current);
    if (phase === "rest_between_sets") {
      setSetIndex((p) => p + 1);
      setCurrentSetReps(0);
      setCurrentSetSeconds(0);
      setPhase("exercise");
    } else {
      setExerciseIndex((p) => p + 1);
      setSetIndex(0);
      setCurrentSetReps(0);
      setCurrentSetSeconds(0);
      setPhase("exercise_intro");
    }
  };

  const fmt = (s: number) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  // Bara de progres — rămâne fix pe ecran, nu se rotește
  const ProgressBar = () => (
    <View style={s.progressTrack}>
      <View style={[s.progressFill, { width: `${progressPct}%` as any }]} />
    </View>
  );

  // ── Exercise intro ─────────────────────────────────────────
  if (phase === "exercise_intro") {
    const content = isLandscape ? (
      <View style={s.twoCol}>
        <View style={s.col}>
          <View style={s.stepChip}>
            <Text style={s.stepText}>
              {exerciseIndex + 1} / {exerciseKeys.length}
              {setIndex > 0 ? ` · Set ${setIndex + 1}` : ""}
            </Text>
          </View>
          <View style={s.exerciseIconWrapSm}>
            <Ionicons name="barbell" size={24} color={C.accent} />
          </View>
          <Text style={s.introNameSm}>{currentExercise.name}</Text>
          <Text style={s.introDescSm}>{currentExercise.description}</Text>
        </View>
        <View style={s.col}>
          <View style={s.targetChip}>
            <Ionicons name="layers-outline" size={13} color={C.accent} />
            <Text style={s.targetText}>
              {totalSets} sets × {target}{" "}
              {currentExercise.type === "timed" ? "sec" : "reps"}
            </Text>
          </View>
          <View style={s.cameraHint}>
            <Ionicons
              name="phone-portrait-outline"
              size={13}
              color={C.warning}
            />
            <Text style={s.cameraHintText}>
              {currentExercise.cameraPosition}
            </Text>
          </View>
          <TouchableOpacity
            style={s.startBtnSm}
            onPress={() => setPhase("exercise")}
            activeOpacity={0.88}
          >
            <Ionicons name="play" size={16} color="#fff" />
            <Text style={s.startBtnTextSm}>Hai să mergem</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.dangerBtn} onPress={onExit}>
            <Text style={s.dangerBtnText}>Oprește</Text>
          </TouchableOpacity>
        </View>
      </View>
    ) : (
      <View style={s.centered}>
        <View style={s.stepChip}>
          <Text style={s.stepText}>
            {exerciseIndex + 1} / {exerciseKeys.length}
            {setIndex > 0 ? ` · Set ${setIndex + 1}` : ""}
          </Text>
        </View>
        <View style={s.exerciseIconWrap}>
          <Ionicons name="barbell" size={32} color={C.accent} />
        </View>
        <Text style={s.introName}>{currentExercise.name}</Text>
        <Text style={s.introDesc}>{currentExercise.description}</Text>
        <View style={s.targetChip}>
          <Ionicons name="layers-outline" size={14} color={C.accent} />
          <Text style={s.targetText}>
            {totalSets} seturi × {target}{" "}
            {currentExercise.type === "timed" ? "secunde" : "repetări"}
          </Text>
        </View>
        <View style={s.cameraHint}>
          <Ionicons name="phone-portrait-outline" size={14} color={C.warning} />
          <Text style={s.cameraHintText}>{currentExercise.cameraPosition}</Text>
        </View>
        <TouchableOpacity
          style={s.startBtn}
          onPress={() => setPhase("exercise")}
          activeOpacity={0.88}
        >
          <Ionicons name="play" size={18} color="#fff" />
          <Text style={s.startBtnText}>Hai să mergem</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.dangerBtn} onPress={onExit}>
          <Text style={s.dangerBtnText}>Oprește antrenamentul</Text>
        </TouchableOpacity>
      </View>
    );

    return (
      <View style={s.root}>
        <View
          style={[s.blob, { top: -60, right: -80, backgroundColor: C.blob1 }]}
        />
        <View
          style={[s.blob, { bottom: 100, left: -80, backgroundColor: C.blob2 }]}
        />
        <ProgressBar />
        <RotatedView rotate={rotate} isLandscape={isLandscape}>
          <View pointerEvents="box-none" style={{ flex: 1, width: "100%", justifyContent: "center", alignItems: "center" }}>
            {content}
          </View>
        </RotatedView>
      </View>
    );
  }

  // ── Rest ───────────────────────────────────────────────────
  if (phase === "rest_between_sets" || phase === "rest_between_exercises") {
    const isBetweenEx = phase === "rest_between_exercises";
    const nextExercise = isBetweenEx
      ? (EXERCISES[exerciseKeys[exerciseIndex + 1]] ??
        fallbackExercise(exerciseKeys[exerciseIndex + 1]))
      : currentExercise;

    const content = isLandscape ? (
      <View style={s.twoCol}>
        <View style={s.col}>
          <Text style={s.restLabel}>
            {isBetweenEx ? "Pauză între exerciții" : "Pauză între seturi"}
          </Text>
          <View style={s.timerCardSm}>
            <Text style={s.timerValueSm}>{fmt(restCountdown)}</Text>
            <Text style={s.timerSub}>secunde rămase</Text>
          </View>
        </View>
        <View style={s.col}>
          <View style={s.nextCard}>
            <Text style={s.nextLabel}>Urmează</Text>
            <Text style={s.nextName}>{nextExercise?.name}</Text>
            <Text style={s.nextDetail}>
              {isBetweenEx
                ? `${totalSets} seturi × ${target} ${nextExercise?.type === "timed" ? "sec" : "rep"}`
                : `Set ${setIndex + 2} din ${totalSets}`}
            </Text>
          </View>
          <TouchableOpacity
            style={s.skipBtn}
            onPress={skipRest}
            activeOpacity={0.85}
          >
            <Text style={s.skipBtnText}>Sari pauza</Text>
            <Ionicons name="arrow-forward" size={16} color={C.accent} />
          </TouchableOpacity>
          <TouchableOpacity style={s.dangerBtn} onPress={onExit}>
            <Text style={s.dangerBtnText}>Oprește</Text>
          </TouchableOpacity>
        </View>
      </View>
    ) : (
      <View style={s.centered}>
        <Text style={s.restLabel}>
          {isBetweenEx ? "Pauză între exerciții" : "Pauză între seturi"}
        </Text>
        <View style={s.timerCard}>
          <Text style={s.timerValue}>{fmt(restCountdown)}</Text>
          <Text style={s.timerSub}>secunde rămase</Text>
        </View>
        <View style={s.nextCard}>
          <Text style={s.nextLabel}>Urmează</Text>
          <Text style={s.nextName}>{nextExercise?.name}</Text>
          <Text style={s.nextDetail}>
            {isBetweenEx
              ? `${totalSets} seturi × ${target} ${nextExercise?.type === "timed" ? "sec" : "rep"}`
              : `Set ${setIndex + 2} din ${totalSets}`}
          </Text>
        </View>
        <TouchableOpacity
          style={s.skipBtn}
          onPress={skipRest}
          activeOpacity={0.85}
        >
          <Text style={s.skipBtnText}>Sari pauza</Text>
          <Ionicons name="arrow-forward" size={16} color={C.accent} />
        </TouchableOpacity>
        <TouchableOpacity style={s.dangerBtn} onPress={onExit}>
          <Text style={s.dangerBtnText}>Oprește antrenamentul</Text>
        </TouchableOpacity>
      </View>
    );

    return (
      <View style={s.root}>
        <View
          style={[s.blob, { top: -60, right: -80, backgroundColor: C.blob1 }]}
        />
        <ProgressBar />
        <RotatedView rotate={rotate} isLandscape={isLandscape}>
          <View pointerEvents="box-none" style={{ flex: 1, width: "100%", justifyContent: "center", alignItems: "center" }}>
            {content}
          </View>
        </RotatedView>
      </View>
    );
  }

  // ── Camera (exercițiu activ) ───────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <Camera
        exercise={currentExercise}
        onExit={onExit}
        onRepsUpdate={handleRepsUpdate}
        onSecondsUpdate={handleSecondsUpdate}
        onSecondaryAction={skipCurrentSet}
        secondaryLabel="Sari setul"
        workoutMode
        targetReps={target}
        setNumber={setIndex + 1}
        totalSets={totalSets}
        uiRotate={rotate}
        isLandscape={isLandscape}
      />

      {/* Bara progres — fix, nu se rotește */}
      <View style={s.cameraProgress}>
        <View
          style={[s.cameraProgressFill, { width: `${progressPct}%` as any }]}
        />
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  blob: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    opacity: 0.5,
  },
  progressTrack: { height: 4, backgroundColor: C.border },
  progressFill: { height: 4, backgroundColor: C.accent },

  centered: {
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 28,
  },

  twoCol: {
    flexDirection: "row",
    gap: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  col: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    maxWidth: 280,
  },

  stepChip: {
    backgroundColor: C.accentLight,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  stepText: { fontSize: 12, fontWeight: "700", color: C.accent },

  exerciseIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: C.accentLight,
    alignItems: "center",
    justifyContent: "center",
  },
  exerciseIconWrapSm: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: C.accentLight,
    alignItems: "center",
    justifyContent: "center",
  },

  introName: {
    fontSize: 26,
    fontWeight: "700",
    color: C.text,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  introNameSm: {
    fontSize: 18,
    fontWeight: "700",
    color: C.text,
    textAlign: "center",
    letterSpacing: -0.4,
  },
  introDesc: {
    fontSize: 14,
    color: C.textMuted,
    textAlign: "center",
    lineHeight: 20,
  },
  introDescSm: {
    fontSize: 12,
    color: C.textMuted,
    textAlign: "center",
    lineHeight: 17,
  },

  targetChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: C.accentLight,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  targetText: { fontSize: 13, color: C.accent, fontWeight: "600" },

  cameraHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: C.warningLight,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  cameraHintText: { fontSize: 12, color: C.warning, fontWeight: "500" },

  startBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: C.accent,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 48,
    marginTop: 4,
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 6,
  },
  startBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  startBtnSm: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: C.accent,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 28,
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  startBtnTextSm: { color: "#fff", fontSize: 14, fontWeight: "700" },

  dangerBtn: { paddingVertical: 10, paddingHorizontal: 24 },
  dangerBtnText: { color: C.danger, fontSize: 14, fontWeight: "500" },

  restLabel: { fontSize: 15, color: C.textMuted, fontWeight: "600" },
  timerCard: {
    // Android: elevation + rgba background = patrat alb; folosim transparent
    backgroundColor: Platform.OS === "android" ? "transparent" : C.glass,
    borderRadius: 24,
    borderWidth: Platform.OS === "android" ? 0 : 1,
    borderColor: C.glassBorder,
    paddingHorizontal: 48,
    paddingVertical: 24,
    alignItems: "center" as const,
  },
  timerValue: {
    fontSize: 72,
    fontWeight: "700" as const,
    color: C.warning,
    letterSpacing: -2,
  },
  timerCardSm: {
    backgroundColor: Platform.OS === "android" ? "transparent" : C.glass,
    borderRadius: 20,
    borderWidth: Platform.OS === "android" ? 0 : 1,
    borderColor: C.glassBorder,
    paddingHorizontal: 32,
    paddingVertical: 18,
    alignItems: "center" as const,
  },
  timerValueSm: {
    fontSize: 48,
    fontWeight: "700" as const,
    color: C.warning,
    letterSpacing: -1,
  },
  timerSub: { fontSize: 13, color: C.textMuted, marginTop: 4 },

  nextCard: {
    backgroundColor: Platform.OS === "android" ? "#FFFFFF" : C.glass,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Platform.OS === "android" ? "rgba(0,0,0,0.07)" : C.glassBorder,
    padding: 18,
    alignItems: "center" as const,
    width: "100%" as const,
    elevation: Platform.OS === "android" ? 2 : 0,
  },
  nextLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: C.accent,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  nextName: {
    fontSize: 18,
    fontWeight: "700",
    color: C.text,
    textAlign: "center",
    letterSpacing: -0.3,
  },
  nextDetail: { fontSize: 13, color: C.textMuted, marginTop: 4 },

  skipBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: C.accent,
    paddingHorizontal: 24,
    paddingVertical: 13,
  },
  skipBtnText: { color: C.accent, fontSize: 15, fontWeight: "700" },

  cameraProgress: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: "rgba(0,0,0,0.3)",
    zIndex: 50,
  },
  cameraProgressFill: { height: 3, backgroundColor: C.accent },

  hudWrapper: {
    position: "absolute",
    flexDirection: "row",
    gap: 8,
    zIndex: 40,
  },
  hudInfo: {
    backgroundColor: "rgba(247,248,250,0.88)",
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.9)",
    maxWidth: 160,
  },
  hudStep: { fontSize: 10, color: C.textMuted },
  hudName: { fontSize: 13, fontWeight: "700", color: C.text, marginTop: 1 },
  hudCounter: {
    backgroundColor: "rgba(247,248,250,0.88)",
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
    minWidth: 68,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.9)",
  },
  hudCountValue: {
    fontSize: 22,
    fontWeight: "700",
    color: C.warning,
    letterSpacing: -0.5,
  },
  hudCountTarget: { fontSize: 10, color: C.textMuted, marginTop: 1 },

  hudBottom: {
    position: "absolute",
    left: 16,
    right: 16,
    flexDirection: "row",
    gap: 10,
    zIndex: 40,
  },
  hudEndBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(239,68,68,0.85)",
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 13,
  },
  hudEndBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  hudSkipBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "rgba(247,248,250,0.88)",
    borderRadius: 12,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.9)",
  },
  hudSkipBtnText: { color: C.text, fontWeight: "700", fontSize: 14 },
});