import { RNMediapipe } from "@thinksys/react-native-mediapipe";
import { useCameraPermissions } from "expo-camera";
import { Accelerometer } from "expo-sensors";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ExerciseConfig, calculateAngle, landmarkIndexMap } from "./exercises";
import SkeletonOverlay from "./skeletonOverlay";

// ─── Device rotation hook ─────────────────────────────────────
type DeviceOrientation = "portrait" | "landscape-left" | "landscape-right";
function useDeviceRotation() {
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const [orientation, setOrientation] = useState<DeviceOrientation>("portrait");
  const currentOrientRef = useRef<DeviceOrientation>("portrait");
  useEffect(() => {
    Accelerometer.setUpdateInterval(300);
    const sub = Accelerometer.addListener(({ x, y }) => {
      let next: DeviceOrientation = "portrait";
      if (Math.abs(y) > 0.7) next = "portrait";
      else if (x > 0.6) next = "landscape-left";
      else if (x < -0.6) next = "landscape-right";
      else return;
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
  return { rotate, isLandscape };
}

// ─── RotatedView ──────────────────────────────────────────────
// MATEMATICA CORECTĂ:
// Ecranul fizic e mereu W×H (portret lock), W < H.
// Vrem ca conținutul să pară rotit 90° fără ca aplicația să schimbe orientarea.
// Un View de dimensiuni H×W, rotit vizual 90°, va ocupa exact W×H pe ecran.
// Ca centrul View-ului rotit să coincidă cu centrul ecranului:
//   top  = (H - W) / 2   (View-ul e mai înalt decât ecranul, îl coborâm)
//   left = (W - H) / 2   (valoare negativă — View-ul e mai lat decât ecranul)
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
  const W = Math.min(screen.width, screen.height); // latura mică = lățimea portret
  const H = Math.max(screen.width, screen.height); // latura mare = înălțimea portret

  return (
    <View
      style={{ position: "absolute", top: 0, left: 0, width: W, height: H }}
    >
      <Animated.View
        style={{
          position: "absolute",
          width: isLandscape ? H : W,
          height: isLandscape ? W : H,
          top: isLandscape ? (H - W) / 2 : 0,
          left: isLandscape ? (W - H) / 2 : 0,
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

const { width, height } = Dimensions.get("window");

// ─── Props ────────────────────────────────────────────────────
interface CameraProps {
  exercise: ExerciseConfig;
  onExit: () => void;
  onRepsUpdate?: (reps: number) => void;
  onSecondsUpdate?: (seconds: number) => void;
  onSecondaryAction?: () => void;
  secondaryLabel?: string;
  workoutMode?: boolean;
  targetReps?: number;
  setNumber?: number;
  totalSets?: number;
  uiRotate?: Animated.AnimatedInterpolation<string>;
  isLandscape?: boolean;
  onFormFeedback?: (msgs: string[]) => void;
}

interface ErrorBoundaryProps {
  fallback: React.ReactNode;
  children: React.ReactNode;
}
interface ErrorBoundaryState {
  hasError: boolean;
}

class MediapipeErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }
  componentDidCatch(error: unknown): void {
    console.log("Mediapipe render error:", error);
  }
  render(): React.ReactNode {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

// ─── Main ─────────────────────────────────────────────────────
export default function Camera({
  exercise,
  onExit,
  onRepsUpdate,
  onSecondsUpdate,
  onSecondaryAction,
  secondaryLabel,
  workoutMode = false,
  targetReps,
  setNumber,
  totalSets,
  uiRotate,
  isLandscape: isLandscapeExternal,
  onFormFeedback,
}: CameraProps) {
  const insets = useSafeAreaInsets();
  const safeTop = insets.top + 10;

  // Single mode are rotație proprie din accelerometru
  // Workout mode primește rotația din WorkoutSession (uiRotate + isLandscapeExternal)
  const { rotate: singleRotate, isLandscape: singleIsLandscape } =
    useDeviceRotation();
  const activeRotate = workoutMode && uiRotate ? uiRotate : singleRotate;
  const activeIsLandscape =
    workoutMode && typeof isLandscapeExternal === "boolean"
      ? isLandscapeExternal
      : singleIsLandscape;

  const [permission, requestPermission] = useCameraPermissions();
  const [reps, setReps] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [started, setStarted] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [formWarning, setFormWarning] = useState(false);
  const [formFeedback, setFormFeedback] = useState<string[]>([]);
  const [skeletonLandmarks, setSkeletonLandmarks] = useState<any[]>([]);
  const [affectedLandmarks, setAffectedLandmarks] = useState<string[]>([]);

  const isReadyRef = useRef(false);
  const upPosRef = useRef(false);
  const repsRef = useRef(0);
  const lastLogTime = useRef(0);
  const lastRepTime = useRef(0);
  const plankActive = useRef(false);
  const plankInterval = useRef<any>(null);
  const lastFeedbackRef = useRef<string>("");
  const formViolationTime = useRef<Record<string, number>>({});
  const countdownRef = useRef<any>(null);
  const lastAngleRef = useRef<number | null>(null);

  useEffect(() => {
    setReps(0);
    setSeconds(0);
    setStarted(false);
    setIsReady(false);
    setCountdown(5);
    setFormWarning(false);
    setFormFeedback([]);
    setAffectedLandmarks([]);
    upPosRef.current = false;
    repsRef.current = 0;
    plankActive.current = false;
    lastFeedbackRef.current = "";
    formViolationTime.current = {};
    lastAngleRef.current = null;
    if (plankInterval.current) clearInterval(plankInterval.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    isReadyRef.current = false;
    if (workoutMode) startCountdown();
  }, [exercise.name, workoutMode]);

  const startCountdown = () => {
    setStarted(true);
    let count = 5;
    setCountdown(count);
    countdownRef.current = setInterval(() => {
      count -= 1;
      setCountdown(count);
      if (count === 0) {
        clearInterval(countdownRef.current);
        setIsReady(true);
        isReadyRef.current = true;
      }
    }, 1000);
  };

  const resetSession = () => {
    if (plankInterval.current) clearInterval(plankInterval.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    setReps(0);
    setSeconds(0);
    setStarted(false);
    setIsReady(false);
    setCountdown(5);
    setFormWarning(false);
    setFormFeedback([]);
    setAffectedLandmarks([]);
    upPosRef.current = false;
    repsRef.current = 0;
    isReadyRef.current = false;
    plankActive.current = false;
    lastFeedbackRef.current = "";
    formViolationTime.current = {};
    lastAngleRef.current = null;
    onRepsUpdate?.(0);
    onSecondsUpdate?.(0);
  };

  const handleLandmark = (data: any) => {
    const now = Date.now();
    let parsed: any;
    try {
      parsed = typeof data === "string" ? JSON.parse(data) : data;
    } catch (e) {
      parsed = data;
    }

    let landmarkArray: any[] | null = null;
    if (
      Array.isArray(parsed.worldLandmarks) &&
      parsed.worldLandmarks.length > 0
    ) {
      landmarkArray = parsed.worldLandmarks;
    } else if (Array.isArray(parsed.landmarks) && parsed.landmarks.length > 0) {
      landmarkArray = parsed.landmarks;
    }
    if (!landmarkArray || landmarkArray.length === 0) return;

    const landmarks2D =
      Array.isArray(parsed.landmarks) && parsed.landmarks.length > 0
        ? parsed.landmarks
        : null;

    if (landmarks2D) setSkeletonLandmarks(landmarks2D);
    if (!isReadyRef.current) return;

    const landmarkObj: Record<string, any> = {};
    Object.entries(landmarkIndexMap).forEach(([name, idx]) => {
      landmarkObj[name] = landmarkArray![idx];
    });
    const landmarkObj2D: Record<string, any> = {};
    if (landmarks2D) {
      Object.entries(landmarkIndexMap).forEach(([name, idx]) => {
        landmarkObj2D[name] = landmarks2D[idx];
      });
    }

    const points = exercise.landmarks.map((name: string) => landmarkObj[name]);
    if (
      !points.length ||
      !points.every((p: any) => p && typeof p.x === "number")
    )
      return;

    const angle = calculateAngle(points[0], points[1], points[2]);

    // ── Form rules — ÎNAINTE de visibility check ──────────────
    // Rulează mereu ca să coloreze scheletul roșu și să afișeze mesajul
    const violations: string[] = [];
    const allAffected: string[] = [];
    if (landmarks2D) {
      exercise.formRules.forEach((rule) => {
        const rulePoints = rule.landmarks.map(
          (name: string) => landmarkObj2D[name],
        );
        if (!rulePoints.every((p: any) => p && typeof p.x === "number")) return;
        const ruleAngle = calculateAngle(
          rulePoints[0],
          rulePoints[1],
          rulePoints[2],
        );
        let violated = false;
        if (rule.minAngle !== undefined && ruleAngle < rule.minAngle)
          violated = true;
        if (rule.maxAngle !== undefined && ruleAngle > rule.maxAngle)
          violated = true;
        if (violated) {
          if (!formViolationTime.current[rule.message])
            formViolationTime.current[rule.message] = now;
          if (now - formViolationTime.current[rule.message] > 800) {
            violations.push(rule.message);
            allAffected.push(...rule.affectedLandmarks);
          }
        } else {
          delete formViolationTime.current[rule.message];
        }
      });
    }
    const newFeedback = violations.join("|");
    if (newFeedback !== lastFeedbackRef.current) {
      lastFeedbackRef.current = newFeedback;
      setFormFeedback(violations);
      setAffectedLandmarks(violations.length > 0 ? allAffected : []);
      // Trimitem feedback-ul și către WorkoutSession dacă e workout mode
      onFormFeedback?.(violations);
    }

    // ── Visibility check — doar pentru numărare ───────────────
    if (landmarks2D) {
      const points2D = exercise.landmarks.map((name: string) => {
        const idx = landmarkIndexMap[name];
        return landmarks2D[idx];
      });
      const allVisible = points2D.every(
        (p: any) => p && typeof p.x === "number" && (p.visibility ?? 0) >= 0.5,
      );
      if (!allVisible) {
        upPosRef.current = false;
        return;
      }
    }

    if (now - lastLogTime.current > 1000) {
      lastLogTime.current = now;
      console.log("EXERCISE:", exercise.name, "| angle:", angle.toFixed(1));
    }

    // ── Timed (plank etc.) ────────────────────────────────────
    if (exercise.type === "timed") {
      const mainPoints = exercise.landmarks.map(
        (name: string) => landmarkObj[name],
      );
      const pointsVisible = mainPoints.every(
        (p: any) => p && typeof p.x === "number" && (p.visibility ?? 1) > 0.3,
      );
      const goodForm = pointsVisible && angle >= exercise.minAngle;
      if (goodForm !== plankActive.current) {
        plankActive.current = goodForm;
        setFormWarning(!goodForm && pointsVisible);
        if (goodForm) {
          plankInterval.current = setInterval(() => {
            setSeconds((prev) => {
              const next = prev + 1;
              onSecondsUpdate?.(next);
              return next;
            });
          }, 1000);
        } else {
          clearInterval(plankInterval.current);
        }
      }
      return;
    }

    if (violations.length > 0) return;

    // ── Spike detection — mișcări haotice ────────────────────
    const SPIKE_THRESHOLD = 40;
    if (lastAngleRef.current !== null) {
      const delta = Math.abs(angle - lastAngleRef.current);
      if (delta > SPIKE_THRESHOLD) {
        upPosRef.current = false;
        lastAngleRef.current = angle;
        return;
      }
    }
    lastAngleRef.current = angle;

    // ── Rep counting ──────────────────────────────────────────
    if (exercise.countOn === "up") {
      if (angle < exercise.minAngle && !upPosRef.current)
        upPosRef.current = true;
      if (angle > exercise.maxAngle && upPosRef.current) {
        if (now - lastRepTime.current > 500) {
          upPosRef.current = false;
          repsRef.current += 1;
          lastRepTime.current = now;
          setReps(repsRef.current);
          onRepsUpdate?.(repsRef.current);
          console.log("REP:", repsRef.current);
        }
      }
    } else {
      if (angle > exercise.maxAngle && !upPosRef.current)
        upPosRef.current = true;
      if (angle < exercise.minAngle && upPosRef.current) {
        if (now - lastRepTime.current > 500) {
          upPosRef.current = false;
          repsRef.current += 1;
          lastRepTime.current = now;
          setReps(repsRef.current);
          onRepsUpdate?.(repsRef.current);
          console.log("REP:", repsRef.current);
        }
      }
    }
  };

  const fmt = (s: number) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const plankOn = exercise.type === "timed" && plankActive.current;
  const counterValue = exercise.type === "timed" ? fmt(seconds) : String(reps);
  const counterTarget = targetReps
    ? exercise.type === "timed"
      ? fmt(targetReps)
      : String(targetReps)
    : null;
  const hudBottom = Math.max(insets.bottom + 16, 32);
  const secondaryText =
    secondaryLabel ?? (workoutMode ? "Sari setul" : "Resetează");
  const secondaryHandler =
    onSecondaryAction ?? (workoutMode ? undefined : resetSession);

  // ── Fallback ──────────────────────────────────────────────
  const cameraFallback = (
    <View
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#000",
        paddingHorizontal: 24,
      }}
    >
      <Text
        style={{
          color: "#fff",
          fontSize: 18,
          textAlign: "center",
          marginBottom: 12,
        }}
      >
        Camera tracking is not available on this device.
      </Text>
      <TouchableOpacity
        onPress={onExit}
        style={{
          backgroundColor: "#4F6EF7",
          paddingHorizontal: 24,
          paddingVertical: 12,
          borderRadius: 12,
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "600" }}>Înapoi</Text>
      </TouchableOpacity>
    </View>
  );

  if (!permission) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#000",
        }}
      >
        <Text style={{ color: "#fff", fontSize: 16 }}>
          Se încarcă camera...
        </Text>
      </View>
    );
  }
  if (!permission.granted) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#000",
          paddingHorizontal: 32,
        }}
      >
        <Text
          style={{
            color: "#fff",
            fontSize: 18,
            marginBottom: 8,
            fontWeight: "700",
            textAlign: "center",
          }}
        >
          Permisiune cameră necesară
        </Text>
        <Text
          style={{
            color: "#8A8FA8",
            fontSize: 14,
            textAlign: "center",
            marginBottom: 28,
            lineHeight: 20,
          }}
        >
          Aplicația are nevoie de acces la cameră pentru a detecta mișcările.
        </Text>
        <TouchableOpacity
          onPress={requestPermission}
          style={{
            backgroundColor: "#4F6EF7",
            paddingHorizontal: 32,
            paddingVertical: 14,
            borderRadius: 14,
          }}
        >
          <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>
            Acordă permisiunea
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      {/* ── Camera feed ── */}
      {RNMediapipe ? (
        <MediapipeErrorBoundary fallback={cameraFallback}>
          <RNMediapipe
            width={width}
            height={height}
            face={false}
            leftArm={false}
            rightArm={false}
            leftWrist={false}
            rightWrist={false}
            torso={false}
            leftLeg={false}
            rightLeg={false}
            leftAnkle={false}
            rightAnkle={false}
            onLandmark={(data) => handleLandmark(data)}
          />
        </MediapipeErrorBoundary>
      ) : (
        cameraFallback
      )}

      {/* ── Skeleton overlay ── */}
      {skeletonLandmarks.length > 0 && (
        <SkeletonOverlay
          landmarks={skeletonLandmarks}
          affectedLandmarks={affectedLandmarks}
        />
      )}

      {/* ── Start screen — single mode, se rotește ── */}
      {!workoutMode && !started && (
        <RotatedView rotate={singleRotate} isLandscape={singleIsLandscape}>
          <View
            style={{
              flex: 1,
              width: "100%",
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: "rgba(0,0,0,0.85)",
              paddingHorizontal: 32,
            }}
          >
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 22,
                backgroundColor: "rgba(79,110,247,0.2)",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
              }}
            >
              <Text style={{ fontSize: 36 }}>🏋️</Text>
            </View>
            <Text
              style={{
                color: "#fff",
                fontSize: 24,
                fontWeight: "700",
                marginBottom: 8,
                textAlign: "center",
                letterSpacing: -0.5,
              }}
            >
              {exercise.name}
            </Text>
            <Text
              style={{
                color: "#8A8FA8",
                fontSize: 13,
                textAlign: "center",
                marginBottom: 20,
                lineHeight: 19,
              }}
            >
              {exercise.description}
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                backgroundColor: "rgba(249,115,22,0.15)",
                borderRadius: 12,
                padding: 12,
                paddingHorizontal: 16,
                marginBottom: 32,
              }}
            >
              <Text style={{ fontSize: 14 }}>📱</Text>
              <Text
                style={{
                  color: "#F97316",
                  fontSize: 13,
                  fontWeight: "500",
                  flex: 1,
                }}
              >
                {exercise.cameraPosition}
              </Text>
            </View>
            <TouchableOpacity
              onPress={startCountdown}
              style={{
                backgroundColor: "#22C55E",
                paddingHorizontal: 52,
                paddingVertical: 15,
                borderRadius: 16,
                marginBottom: 12,
                shadowColor: "#22C55E",
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.3,
                shadowRadius: 12,
                elevation: 6,
              }}
            >
              <Text style={{ color: "#fff", fontSize: 17, fontWeight: "700" }}>
                START
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onExit}
              style={{ paddingHorizontal: 40, paddingVertical: 10 }}
            >
              <Text style={{ color: "#8A8FA8", fontSize: 14 }}>Înapoi</Text>
            </TouchableOpacity>
          </View>
        </RotatedView>
      )}

      {/* ── Countdown — se rotește ── */}
      {started && !isReady && (
        <RotatedView rotate={activeRotate} isLandscape={activeIsLandscape}>
          <View
            style={{
              flex: 1,
              width: "100%",
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: "rgba(0,0,0,0.8)",
            }}
          >
            <Text style={{ color: "#8A8FA8", fontSize: 14, marginBottom: 8 }}>
              {exercise.name}
            </Text>
            <Text
              style={{
                color: "#fff",
                fontSize: 20,
                fontWeight: "600",
                marginBottom: 12,
              }}
            >
              Pregătește-te!
            </Text>
            <Text
              style={{
                color: "#F97316",
                fontSize: 96,
                fontWeight: "700",
                lineHeight: 104,
              }}
            >
              {countdown}
            </Text>
            <Text
              style={{
                color: "#8A8FA8",
                fontSize: 12,
                marginTop: 20,
                textAlign: "center",
                paddingHorizontal: 32,
              }}
            >
              📱 {exercise.cameraPosition}
            </Text>
          </View>
        </RotatedView>
      )}

      {/* ════════════════════════════════════════════════════════
          HUD ACTIV — același layout pentru AMBELE moduri
          Se rotește cu telefonul via RotatedView
          ════════════════════════════════════════════════════════ */}
      {started && isReady && (
        <RotatedView rotate={activeRotate} isLandscape={activeIsLandscape}>
          <View
            style={{
              flex: 1,
              width: "100%",
              paddingTop: safeTop,
              paddingBottom: hudBottom,
              paddingLeft: Math.max(insets.left + 10, 10),
              paddingRight: Math.max(insets.right + 10, 10),
            }}
          >
            {/* ── Top: info box + counter — exact ca WorkoutSession ── */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "flex-end",
                alignItems: "flex-start",
                gap: 8,
              }}
            >
              {/* Info box */}
              <View
                style={{
                  backgroundColor: "rgba(247,248,250,0.88)",
                  borderRadius: 12,
                  padding: 10,
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.9)",
                  maxWidth: 160,
                  flexShrink: 1,
                }}
              >
                <Text style={{ fontSize: 10, color: "#8A8FA8" }}>
                  {workoutMode && setNumber && totalSets
                    ? `${setNumber}/${totalSets} · seturi`
                    : exercise.muscleGroup}
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "700",
                    color: "#0F0F10",
                    marginTop: 1,
                  }}
                >
                  {exercise.name}
                </Text>
              </View>
              {/* Counter box */}
              <View
                style={{
                  backgroundColor: plankOn
                    ? "rgba(34,197,94,0.9)"
                    : "rgba(247,248,250,0.88)",
                  borderRadius: 12,
                  padding: 10,
                  alignItems: "center",
                  minWidth: 68,
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.9)",
                }}
              >
                <Text
                  style={{
                    fontSize: 22,
                    fontWeight: "700",
                    color: plankOn ? "#fff" : "#F97316",
                    letterSpacing: -0.5,
                  }}
                >
                  {counterValue}
                </Text>
                {counterTarget !== null && (
                  <Text
                    style={{
                      fontSize: 10,
                      marginTop: 1,
                      color: plankOn ? "rgba(255,255,255,0.75)" : "#8A8FA8",
                    }}
                  >
                    / {counterTarget}
                  </Text>
                )}
              </View>
            </View>

            {/* Form warning (timed) */}
            {exercise.type === "timed" && formWarning && (
              <View
                style={{
                  marginTop: 10,
                  backgroundColor: "rgba(239,68,68,0.92)",
                  borderRadius: 12,
                  padding: 12,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Text style={{ fontSize: 16 }}>⚠️</Text>
                <Text
                  style={{
                    color: "#fff",
                    fontWeight: "700",
                    fontSize: 14,
                    flex: 1,
                  }}
                >
                  Corectează postura!
                </Text>
              </View>
            )}

            {/* Spacer */}
            <View style={{ flex: 1 }} />

            {/* ── Form feedback — deasupra butoanelor, rotit ── */}
            {formFeedback.length > 0 && (
              <View style={{ gap: 6, marginBottom: 10 }}>
                {formFeedback.map((msg, idx) => (
                  <View
                    key={idx}
                    style={{
                      backgroundColor: "rgba(239,68,68,0.9)",
                      borderRadius: 12,
                      padding: 10,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <Text style={{ fontSize: 14 }}>⚠️</Text>
                    <Text
                      style={{
                        color: "#fff",
                        fontWeight: "700",
                        fontSize: 13,
                        flex: 1,
                      }}
                    >
                      {msg}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* ── Butoane jos — identice WorkoutSession ── */}
            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity
                onPress={onExit}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  backgroundColor: "rgba(239,68,68,0.85)",
                  borderRadius: 12,
                  paddingHorizontal: 18,
                  paddingVertical: 13,
                }}
              >
                <Text
                  style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}
                >
                  Oprește
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={secondaryHandler}
                disabled={!secondaryHandler}
                style={{
                  flex: 1,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  backgroundColor: "rgba(247,248,250,0.88)",
                  borderRadius: 12,
                  paddingVertical: workoutMode ? 10 : 13,
                  paddingHorizontal: workoutMode ? 12 : undefined,
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.9)",
                }}
              >
                <Text
                  style={{ color: "#0F0F10", fontWeight: "700", fontSize: 14 }}
                >
                  {secondaryText}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </RotatedView>
      )}
    </View>
  );
}
