import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Camera from "./Camera";
import { EXERCISES, ExerciseConfig } from "./exercises";
import { WorkoutPreset } from "./workoutPresets";

const C = {
  bg: "#F7F8FA",
  glass: "rgba(255,255,255,0.72)",
  glassBorder: "rgba(255,255,255,0.9)",
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

const getRestBetweenSets = (muscleGroup: string, exerciseKey: string): number => {
  if (exerciseKey === "calfRaises") return 90;
  switch (muscleGroup) {
    case "chest": case "back": case "legs": return 120;
    case "arms": case "shoulders": case "fullbody": case "cardio": return 90;
    case "core": return 60;
    default: return 90;
  }
};

const getSets = (difficulty: string): number => {
  switch (difficulty) {
    case "beginner": return 2;
    case "intermediate": return 3;
    case "advanced": return 4;
    default: return 3;
  }
};

const getTarget = (exercise: ExerciseConfig, difficulty: string): number => {
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
  description: "Config lipsă pentru acest exercițiu.",
  cameraPosition: "Așază telefonul lateral la nivelul umerilor.",
  muscleGroup: "fullbody",
  formRules: [],
});

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

type Phase = "exercise_intro" | "exercise" | "rest_between_sets" | "rest_between_exercises";

export default function WorkoutSession({ preset, customRestTime, onFinish, onExit }: Props) {
  // ── Safe area — fix pentru Android ────────────────────────
  const insets = useSafeAreaInsets();
  // Pe camera (fundal negru, full screen) adăugăm insets.top
  // ca HUD-ul să nu intre sub bara de status
  const hudTopOffset = insets.top + 10;
  // Pe ecranele light (intro/rest) care au SafeAreaView implicit
  // folosim insets.top ca padding pentru centered content
  const lightTopPadding = insets.top + 16;

  const totalSets = getSets(preset.difficulty);
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

  const currentKey = exerciseKeys[exerciseIndex];
  const currentExercise = EXERCISES[currentKey] ?? fallbackExercise(currentKey);
  const target = getTarget(currentExercise, preset.difficulty);
  const isLastSet = setIndex === totalSets - 1;
  const isLastExercise = exerciseIndex === exerciseKeys.length - 1;
  const progressPct = ((exerciseIndex * totalSets + setIndex) / (exerciseKeys.length * totalSets)) * 100;

  useEffect(() => {
    return () => { if (restIntervalRef.current) clearInterval(restIntervalRef.current); };
  }, []);

  const startRest = (seconds: number, next: () => void) => {
    setRestCountdown(seconds);
    restIntervalRef.current = setInterval(() => {
      setRestCountdown((prev) => {
        if (prev <= 1) { clearInterval(restIntervalRef.current); next(); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const saveSetResult = (value: number) => {
    const setResult = { repsOrSeconds: value, target };
    const existing = resultsRef.current.find((r) => r.exerciseKey === currentKey);
    if (existing) existing.sets.push(setResult);
    else resultsRef.current.push({ exerciseKey: currentKey, exerciseName: currentExercise.name, sets: [setResult] });
    setResults([...resultsRef.current]);
  };

  const handleRepsUpdate = (reps: number) => {
    setCurrentSetReps(reps);
    if (currentExercise.type === "reps" && reps >= target) completeSet(reps);
  };

  const handleSecondsUpdate = (seconds: number) => {
    setCurrentSetSeconds(seconds);
    if (currentExercise.type === "timed" && seconds >= target) completeSet(seconds);
  };

  const completeSet = (value: number) => {
    saveSetResult(value);
    if (isLastSet) {
      if (isLastExercise) {
        onFinish(resultsRef.current);
      } else {
        setPhase("rest_between_exercises");
        startRest(customRestTime ?? 120, () => {
          setExerciseIndex((p) => p + 1); setSetIndex(0);
          setCurrentSetReps(0); setCurrentSetSeconds(0);
          setPhase("exercise_intro");
        });
      }
    } else {
      const restTime = getRestBetweenSets(currentExercise.muscleGroup, currentKey);
      setPhase("rest_between_sets");
      startRest(restTime, () => {
        setSetIndex((p) => p + 1);
        setCurrentSetReps(0); setCurrentSetSeconds(0);
        setPhase("exercise");
      });
    }
  };

  const skipCurrentSet = () =>
    completeSet(currentExercise.type === "reps" ? currentSetReps : currentSetSeconds);

  const skipRest = () => {
    if (restIntervalRef.current) clearInterval(restIntervalRef.current);
    if (phase === "rest_between_sets") {
      setSetIndex((p) => p + 1); setCurrentSetReps(0); setCurrentSetSeconds(0); setPhase("exercise");
    } else {
      setExerciseIndex((p) => p + 1); setSetIndex(0); setCurrentSetReps(0); setCurrentSetSeconds(0); setPhase("exercise_intro");
    }
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  const ProgressBar = () => (
    <View style={s.progressTrack}>
      <View style={[s.progressFill, { width: `${progressPct}%` as any }]} />
    </View>
  );

  // ── Exercise intro ─────────────────────────────────────────
  if (phase === "exercise_intro") {
    return (
      <View style={s.root}>
        <View style={[s.blob, { top: -60, right: -80, backgroundColor: C.blob1 }]} />
        <View style={[s.blob, { bottom: 100, left: -80, backgroundColor: C.blob2 }]} />
        {/* Bara de progress e prima — nu acoperă nimic */}
        <ProgressBar />

        {/* paddingTop dinamic ca conținutul să nu intre sub status bar */}
        <View style={[s.centered, { paddingTop: lightTopPadding }]}>
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

          <TouchableOpacity style={s.startBtn} onPress={() => setPhase("exercise")} activeOpacity={0.88}>
            <Ionicons name="play" size={18} color="#fff" />
            <Text style={s.startBtnText}>Hai să mergem</Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.dangerBtn} onPress={onExit}>
            <Text style={s.dangerBtnText}>Oprește antrenamentul</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Rest ───────────────────────────────────────────────────
  if (phase === "rest_between_sets" || phase === "rest_between_exercises") {
    const isBetweenEx = phase === "rest_between_exercises";
    const nextExercise = isBetweenEx
      ? (EXERCISES[exerciseKeys[exerciseIndex + 1]] ?? fallbackExercise(exerciseKeys[exerciseIndex + 1]))
      : currentExercise;

    return (
      <View style={s.root}>
        <View style={[s.blob, { top: -60, right: -80, backgroundColor: C.blob1 }]} />
        <ProgressBar />

        <View style={[s.centered, { paddingTop: lightTopPadding }]}>
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

          <TouchableOpacity style={s.skipBtn} onPress={skipRest} activeOpacity={0.85}>
            <Text style={s.skipBtnText}>Sari pauza</Text>
            <Ionicons name="arrow-forward" size={16} color={C.accent} />
          </TouchableOpacity>

          <TouchableOpacity style={s.dangerBtn} onPress={onExit}>
            <Text style={s.dangerBtnText}>Oprește antrenamentul</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Camera exercise ────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <Camera
        exercise={currentExercise}
        onExit={onExit}
        onRepsUpdate={handleRepsUpdate}
        onSecondsUpdate={handleSecondsUpdate}
        workoutMode
      />

      {/* Progress bar — deasupra camerei, la top:0 e ok */}
      <View style={s.cameraProgress}>
        <View style={[s.cameraProgressFill, { width: `${progressPct}%` as any }]} />
      </View>

      {/* HUD top — folosim hudTopOffset în loc de 12 hardcodat */}
      <View style={[s.hudTop, { top: hudTopOffset }]}>
        <View style={s.hudInfo}>
          <Text style={s.hudStep}>
            {exerciseIndex + 1}/{exerciseKeys.length} · Set {setIndex + 1}/{totalSets}
          </Text>
          <Text style={s.hudName}>{currentExercise.name}</Text>
        </View>
        <View style={s.hudCounter}>
          <Text style={s.hudCountValue}>
            {currentExercise.type === "timed" ? fmt(currentSetSeconds) : currentSetReps}
          </Text>
          <Text style={s.hudCountTarget}>
            / {currentExercise.type === "timed" ? fmt(target) : target}
          </Text>
        </View>
      </View>

      {/* Bottom controls — insets.bottom pentru gesture navigation */}
      <View style={[s.hudBottom, { bottom: Math.max(insets.bottom + 16, 32) }]}>
        <TouchableOpacity style={s.hudEndBtn} onPress={onExit}>
          <Ionicons name="stop" size={15} color="#fff" />
          <Text style={s.hudEndBtnText}>Oprește</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.hudSkipBtn} onPress={skipCurrentSet}>
          <Text style={s.hudSkipBtnText}>Sari setul</Text>
          <Ionicons name="arrow-forward" size={15} color={C.text} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  blob: { position: "absolute", width: 280, height: 280, borderRadius: 140, opacity: 0.5 },

  progressTrack: { height: 4, backgroundColor: C.border },
  progressFill: { height: 4, backgroundColor: C.accent },

  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    gap: 12,
  },

  stepChip: {
    backgroundColor: C.accentLight,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  stepText: { fontSize: 12, fontWeight: "700", color: C.accent },

  exerciseIconWrap: {
    width: 72, height: 72, borderRadius: 22,
    backgroundColor: C.accentLight,
    alignItems: "center", justifyContent: "center",
    marginBottom: 4,
  },

  introName: { fontSize: 28, fontWeight: "700", color: C.text, textAlign: "center", letterSpacing: -0.6 },
  introDesc: { fontSize: 14, color: C.textMuted, textAlign: "center", lineHeight: 20 },

  targetChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: C.accentLight, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 9,
  },
  targetText: { fontSize: 13, color: C.accent, fontWeight: "600" },

  cameraHint: {
    flexDirection: "row", alignItems: "center", gap: 7,
    backgroundColor: C.warningLight, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 9,
  },
  cameraHintText: { fontSize: 13, color: C.warning, fontWeight: "500" },

  startBtn: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: C.accent, borderRadius: 16,
    paddingVertical: 16, paddingHorizontal: 48, marginTop: 8,
    shadowColor: C.accent, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28, shadowRadius: 14, elevation: 6,
  },
  startBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },

  dangerBtn: { paddingVertical: 10, paddingHorizontal: 24 },
  dangerBtnText: { color: C.danger, fontSize: 14, fontWeight: "500" },

  restLabel: { fontSize: 15, color: C.textMuted, fontWeight: "600" },

  timerCard: {
    backgroundColor: C.glass, borderRadius: 24,
    borderWidth: 1, borderColor: C.glassBorder,
    paddingHorizontal: 48, paddingVertical: 24, alignItems: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 16, elevation: 2,
  },
  timerValue: { fontSize: 72, fontWeight: "700", color: C.warning, letterSpacing: -2 },
  timerSub: { fontSize: 13, color: C.textMuted, marginTop: 4 },

  nextCard: {
    backgroundColor: C.glass, borderRadius: 20,
    borderWidth: 1, borderColor: C.glassBorder,
    padding: 20, alignItems: "center", width: "100%",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 16, elevation: 2,
  },
  nextLabel: {
    fontSize: 10, fontWeight: "700", color: C.accent,
    letterSpacing: 1.4, textTransform: "uppercase", marginBottom: 8,
  },
  nextName: { fontSize: 20, fontWeight: "700", color: C.text, textAlign: "center", letterSpacing: -0.3 },
  nextDetail: { fontSize: 13, color: C.textMuted, marginTop: 5 },

  skipBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderRadius: 14, borderWidth: 1.5, borderColor: C.accent,
    paddingHorizontal: 24, paddingVertical: 13,
  },
  skipBtnText: { color: C.accent, fontSize: 15, fontWeight: "700" },

  // Camera HUD
  cameraProgress: {
    position: "absolute", top: 0, left: 0, right: 0,
    height: 3, backgroundColor: "rgba(0,0,0,0.3)", zIndex: 50,
  },
  cameraProgressFill: { height: 3, backgroundColor: C.accent },

  hudTop: {
    position: "absolute",
    // top e setat dinamic cu hudTopOffset — nu mai e hardcodat
    left: 12, right: 12,
    flexDirection: "row", gap: 8, zIndex: 40,
  },
  hudInfo: {
    flex: 1,
    backgroundColor: "rgba(247,248,250,0.88)",
    borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.9)",
  },
  hudStep: { fontSize: 11, color: C.textMuted },
  hudName: { fontSize: 15, fontWeight: "700", color: C.text, marginTop: 2 },
  hudCounter: {
    backgroundColor: "rgba(247,248,250,0.88)",
    borderRadius: 14, padding: 12,
    alignItems: "center", minWidth: 80,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.9)",
  },
  hudCountValue: { fontSize: 26, fontWeight: "700", color: C.warning, letterSpacing: -0.5 },
  hudCountTarget: { fontSize: 11, color: C.textMuted, marginTop: 2 },

  hudBottom: {
    position: "absolute",
    // bottom e setat dinamic cu insets.bottom
    left: 16, right: 16,
    flexDirection: "row", gap: 10, zIndex: 40,
  },
  hudEndBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "rgba(239,68,68,0.85)",
    borderRadius: 12, paddingHorizontal: 18, paddingVertical: 13,
  },
  hudEndBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  hudSkipBtn: {
    flex: 1, flexDirection: "row", alignItems: "center",
    justifyContent: "center", gap: 6,
    backgroundColor: "rgba(247,248,250,0.88)",
    borderRadius: 12, paddingVertical: 13,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.9)",
  },
  hudSkipBtnText: { color: C.text, fontWeight: "700", fontSize: 14 },
});