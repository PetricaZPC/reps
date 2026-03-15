import { RNMediapipe } from "@thinksys/react-native-mediapipe";
import { useCameraPermissions } from "expo-camera";
import { Accelerometer } from "expo-sensors";
import React, { useEffect, useRef, useState } from "react";
import {
    Animated,
    Dimensions,
    Easing,
    StyleSheet,
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
  }, [rotateAnim]);

  const isLandscape = orientation !== "portrait";
  const rotate = rotateAnim.interpolate({
    inputRange: [-90, 0, 90],
    outputRange: ["-90deg", "0deg", "90deg"],
  });

  return { rotate, isLandscape };
}

// ─── RotatedView ──────────────────────────────────────────────
function RotatedView({
  rotate,
  isLandscape,
  children,
  pointerEvents = "box-none",
}: {
  rotate: Animated.AnimatedInterpolation<string>;
  isLandscape: boolean;
  children: React.ReactNode;
  pointerEvents?: "box-none" | "none" | "auto";
}) {
  const screen = Dimensions.get("screen");
  const W = Math.min(screen.width, screen.height);
  const H = Math.max(screen.width, screen.height);

  return (
    <View
      pointerEvents={pointerEvents}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: W,
        height: H,
      }}
    >
      <Animated.View
        pointerEvents={pointerEvents}
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
  const [isFullyVisible, setIsFullyVisible] = useState(true);

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
  const lastVisibilityRef = useRef(true);

  useEffect(() => {
    setReps(0);
    setSeconds(0);
    setStarted(false);
    setIsReady(false);
    setCountdown(5);
    setFormWarning(false);
    setFormFeedback([]);
    setAffectedLandmarks([]);
    setIsFullyVisible(true);

    upPosRef.current = false;
    repsRef.current = 0;
    plankActive.current = false;
    lastFeedbackRef.current = "";
    formViolationTime.current = {};
    lastAngleRef.current = null;
    lastVisibilityRef.current = true;

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
    setIsFullyVisible(true);

    upPosRef.current = false;
    repsRef.current = 0;
    isReadyRef.current = false;
    plankActive.current = false;
    lastFeedbackRef.current = "";
    formViolationTime.current = {};
    lastAngleRef.current = null;
    lastVisibilityRef.current = true;

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

    // ── VISIBILITY CHECK ──
    let currentlyVisible = false;
    if (landmarks2D) {
      const points2D = exercise.landmarks.map((name: string) => {
        const idx = landmarkIndexMap[name];
        return landmarks2D[idx];
      });

      currentlyVisible = points2D.every(
        (p: any) =>
          p &&
          typeof p.x === "number" &&
          (p.visibility === undefined ? true : p.visibility >= 0.5) &&
          p.x >= 0.0 &&
          p.x <= 1.0 &&
          p.y >= 0.0 &&
          p.y <= 1.0
      );
    }

    if (currentlyVisible !== lastVisibilityRef.current) {
      lastVisibilityRef.current = currentlyVisible;
      setIsFullyVisible(currentlyVisible);
      if (!currentlyVisible) {
        setFormFeedback([]);
        setAffectedLandmarks([]);
        lastFeedbackRef.current = "";
      }
    }

    if (!currentlyVisible) {
      upPosRef.current = false;
      return;
    }

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

    // ── Form rules ──
    const violations: string[] = [];
    const allAffected: string[] = [];
    if (landmarks2D) {
      exercise.formRules.forEach((rule) => {
        const rulePoints = rule.landmarks.map(
          (name: string) => landmarkObj2D[name]
        );
        if (!rulePoints.every((p: any) => p && typeof p.x === "number")) return;
        const ruleAngle = calculateAngle(
          rulePoints[0],
          rulePoints[1],
          rulePoints[2]
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
      onFormFeedback?.(violations);
    }

    if (now - lastLogTime.current > 1000) {
      lastLogTime.current = now;
      console.log("EXERCISE:", exercise.name, "| angle:", angle.toFixed(1));
    }

    // ── Timed exercises ──
    if (exercise.type === "timed") {
      const mainPoints = exercise.landmarks.map(
        (name: string) => landmarkObj[name]
      );
      const pointsVisible = mainPoints.every(
        (p: any) => p && typeof p.x === "number" && (p.visibility ?? 1) > 0.3
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

    // ── Rep counting ──
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
  const secondaryHandler = workoutMode
    ? onSecondaryAction
    : onSecondaryAction ?? resetSession;

  // ── Fallback ──
  const cameraFallback = (
    <View
      style={{
        ...StyleSheet.absoluteFillObject,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#000",
        paddingHorizontal: 24,
        zIndex: 999,
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
      {/* LAYER 1: FEED CAMERA NATIV */}
      <View style={{ flex: 1, zIndex: 1 }}>
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
      </View>

      {/* LAYER 2: SKELETON OVERLAY (Ignoră complet touch-urile) */}
      <View
        pointerEvents="none"
        style={{ ...StyleSheet.absoluteFillObject, zIndex: 2 }}
      >
        {skeletonLandmarks.length > 0 && (
          <SkeletonOverlay
            landmarks={skeletonLandmarks}
            affectedLandmarks={affectedLandmarks}
          />
        )}
      </View>

      {/* LAYER 3: INTERFAȚA CU BUTOANE (Deasupra la tot, prinde click-urile corect) */}
      <View
        pointerEvents="box-none"
        style={{ ...StyleSheet.absoluteFillObject, zIndex: 999 }}
      >
        {/* ── Start screen (single mode) ── */}
        {!workoutMode && !started && (
          <RotatedView
            rotate={singleRotate}
            isLandscape={singleIsLandscape}
            pointerEvents="auto"
          >
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
                <Text
                  style={{ color: "#fff", fontSize: 17, fontWeight: "700" }}
                >
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

        {/* ── Countdown ── */}
        {started && !isReady && (
          <RotatedView
            rotate={activeRotate}
            isLandscape={activeIsLandscape}
            pointerEvents="auto"
          >
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

        {/* ── Active HUD (Aici butoanele vor merge!) ── */}
        {started && isReady && (
          <RotatedView
            rotate={activeRotate}
            isLandscape={activeIsLandscape}
            pointerEvents="box-none"
          >
            <View
              pointerEvents="box-none"
              style={{
                flex: 1,
                width: "100%",
                paddingTop: safeTop,
                paddingBottom: hudBottom,
                paddingLeft: Math.max(insets.left + 10, 10),
                paddingRight: Math.max(insets.right + 10, 10),
              }}
            >
              {/* Top Row: Counter */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "flex-end",
                  alignItems: "flex-start",
                  gap: 8,
                }}
                pointerEvents="none"
              >
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
                        color: plankOn
                          ? "rgba(255,255,255,0.75)"
                          : "#8A8FA8",
                      }}
                    >
                      / {counterTarget}
                    </Text>
                  )}
                </View>
              </View>

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

              <View pointerEvents="none" style={{ flex: 1 }} />

              {!isFullyVisible && (
                <View
                  style={{
                    backgroundColor: "rgba(220, 38, 38, 0.95)",
                    borderRadius: 12,
                    padding: 14,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 10,
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.2)",
                  }}
                >
                  <Text style={{ fontSize: 20 }}>📸</Text>
                  <Text
                    style={{
                      color: "#fff",
                      fontWeight: "700",
                      fontSize: 14,
                      flex: 1,
                    }}
                  >
                    Nu ești complet în cadru! Ajustează unghiul camerei.
                  </Text>
                </View>
              )}

              {formFeedback.length > 0 && isFullyVisible && (
                <View style={{ gap: 6, marginBottom: 10 }}>
                  {formFeedback.map((msg, idx) => (
                    <View
                      key={idx}
                      style={{
                        backgroundColor: "rgba(239,68,68,0.92)",
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

              {/* ── BUTOANELE AICI ACUM PRIMESC CLICKURILE ── */}
              <View
                style={{ flexDirection: "row", gap: 10 }}
                pointerEvents="auto"
              >
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
                    style={{
                      color: "#0F0F10",
                      fontWeight: "700",
                      fontSize: 14,
                    }}
                  >
                    {secondaryText}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </RotatedView>
        )}
      </View>
    </View>
  );
}