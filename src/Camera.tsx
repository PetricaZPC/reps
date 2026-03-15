import { RNMediapipe } from "@thinksys/react-native-mediapipe";
import { useCameraPermissions } from "expo-camera";
import React, { useEffect, useRef, useState } from "react";
import { Text, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ExerciseConfig, calculateAngle, landmarkIndexMap } from "./exercises";
import SkeletonOverlay from "./skeletonOverlay";

interface CameraProps {
  exercise: ExerciseConfig;
  onExit: () => void;
  onRepsUpdate?: (reps: number) => void;
  onSecondsUpdate?: (seconds: number) => void;
  workoutMode?: boolean;
  targetReps?: number;
  setNumber?: number;
  totalSets?: number;
}

interface ErrorBoundaryProps {
  fallback: React.ReactNode;
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class MediapipeErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(): ErrorBoundaryState { return { hasError: true }; }
  componentDidCatch(error: unknown): void { console.log("Mediapipe render error:", error); }
  render(): React.ReactNode {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

export default function Camera({
  exercise,
  onExit,
  onRepsUpdate,
  onSecondsUpdate,
  workoutMode = false,
  targetReps = 12,
  setNumber = 1,
  totalSets = 3,
}: CameraProps) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isLandscape = width > height;
  const safeTop = isLandscape ? 8 : insets.top + 8;
  const safeLeft = isLandscape ? insets.left + 8 : 0;

  // Force camera feed to stay in portrait aspect (avoid zoom/stretch when device is landscape)
  const cameraWidth = Math.min(width, height);
  const cameraHeight = Math.max(width, height);


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
  const [positionWarning, setPositionWarning] = useState(false);
  const [orientationKey, setOrientationKey] = useState(0);

  const isReadyRef = useRef(false);
  const upPosRef = useRef(false);
  const repsRef = useRef(0);
  const lastLogTime = useRef(0);
  const lastRepTime = useRef(0);
  const plankActive = useRef(false);
  const plankInterval = useRef<any>(null);
  const lastFeedbackRef = useRef<string>('');
  const formViolationTime = useRef<Record<string, number>>({});
  const countdownRef = useRef<any>(null);
  const lastPositionWarnTime = useRef(0);
  const lowVisibilityCount = useRef(0);
  const lastFrameTime = useRef(0);
  const FRAME_INTERVAL = 1000 / 30;

  // Remount MediaPipe la schimbarea orientarii

// Reset stare doar la schimbarea exercitiului
useEffect(() => {
  setReps(0);
  setSeconds(0);
  setStarted(false);
  setIsReady(false);
  setCountdown(5);
  setFormWarning(false);
  setFormFeedback([]);
  setAffectedLandmarks([]);
  setPositionWarning(false);
  upPosRef.current = false;
  repsRef.current = 0;
  plankActive.current = false;
  lastFeedbackRef.current = '';
  formViolationTime.current = {};
  lowVisibilityCount.current = 0;
  lastPositionWarnTime.current = 0;
  lastFrameTime.current = 0;
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

  const handleLandmark = (data: any) => {
    const now = Date.now();

    if (now - lastFrameTime.current < FRAME_INTERVAL) return;
    lastFrameTime.current = now;

    let parsed: any;
    try {
      parsed = typeof data === "string" ? JSON.parse(data) : data;
    } catch (e) { parsed = data; }

    let landmarkArray: any[] | null = null;
    if (Array.isArray(parsed.worldLandmarks) && parsed.worldLandmarks.length > 0) {
      landmarkArray = parsed.worldLandmarks;
    } else if (Array.isArray(parsed.landmarks) && parsed.landmarks.length > 0) {
      landmarkArray = parsed.landmarks;
    }

    if (!landmarkArray || landmarkArray.length === 0) return;

    const landmarks2D = Array.isArray(parsed.landmarks) && parsed.landmarks.length > 0
      ? parsed.landmarks : null;

    if (landmarks2D) setSkeletonLandmarks(landmarks2D);

    if (landmarks2D && isReadyRef.current) {
      const keyPoints = ['leftShoulder', 'rightShoulder', 'leftHip', 'rightHip'];
      const visibilities = keyPoints.map(name => {
        const idx = landmarkIndexMap[name];
        return landmarks2D[idx]?.visibility ?? 0;
      });
      const avgVisibility = visibilities.reduce((a, b) => a + b, 0) / visibilities.length;

      if (avgVisibility < 0.4) {
        lowVisibilityCount.current += 1;
        if (lowVisibilityCount.current > 15) {
          setPositionWarning(true);
        }
      } else {
        lowVisibilityCount.current = 0;
        setPositionWarning(false);
      }
    }

    const MIN_VISIBILITY = 0.5;
    if (landmarks2D) {
      const points2D = exercise.landmarks.map((name: string) => {
        const idx = landmarkIndexMap[name];
        return landmarks2D[idx];
      });
      const allVisible = points2D.length > 0 && points2D.every(
        (p: any) => p && typeof p.x === 'number' && (p.visibility ?? 0) >= MIN_VISIBILITY
      );
      if (!allVisible) {
        upPosRef.current = false;
        return;
      }
    }

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
    if (!points.length || !points.every((p: any) => p && typeof p.x === "number")) return;

    const angle = calculateAngle(points[0], points[1], points[2]);

    const violations: string[] = [];
    const allAffected: string[] = [];

    if (landmarks2D) {
      exercise.formRules.forEach((rule) => {
        const rulePoints = rule.landmarks.map((name: string) => landmarkObj2D[name]);
        if (!rulePoints.every((p: any) => p && typeof p.x === 'number')) return;

        const ruleAngle = calculateAngle(rulePoints[0], rulePoints[1], rulePoints[2]);

        let violated = false;
        if (rule.minAngle !== undefined && ruleAngle < rule.minAngle) violated = true;
        if (rule.maxAngle !== undefined && ruleAngle > rule.maxAngle) violated = true;

        if (violated) {
          if (!formViolationTime.current[rule.message]) {
            formViolationTime.current[rule.message] = now;
          }
          const duration = now - formViolationTime.current[rule.message];
          if (duration > 800) {
            violations.push(rule.message);
            allAffected.push(...rule.affectedLandmarks);
          }
        } else {
          delete formViolationTime.current[rule.message];
        }
      });
    }

    const newFeedback = violations.join('|');
    if (newFeedback !== lastFeedbackRef.current) {
      lastFeedbackRef.current = newFeedback;
      setFormFeedback(violations);
      setAffectedLandmarks(allAffected);
    }

    if (now - lastLogTime.current > 1000) {
      lastLogTime.current = now;
      console.log('EXERCISE:', exercise.name, '| angle:', angle.toFixed(1));
    }

    if (exercise.type === "timed") {
      const pointsVisible = points.every(
        (p: any) => p && typeof p.x === 'number' && (p.visibility ?? 1) > 0.3
      );
      const goodForm = pointsVisible && angle >= exercise.minAngle;

      if (goodForm !== plankActive.current) {
        plankActive.current = goodForm;
        setFormWarning(!goodForm && pointsVisible);

        if (goodForm) {
          plankInterval.current = setInterval(() => {
            setSeconds(prev => {
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

    if (exercise.countOn === "up") {
      if (angle < exercise.minAngle && !upPosRef.current) upPosRef.current = true;
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
      if (angle > exercise.maxAngle && !upPosRef.current) upPosRef.current = true;
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

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const cameraFallback = (
    <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, justifyContent: "center", alignItems: "center", backgroundColor: "#000", paddingHorizontal: 24 }}>
      <Text style={{ color: "#fff", fontSize: 18, textAlign: "center", marginBottom: 12 }}>
        Camera tracking is not available on this device.
      </Text>
      <TouchableOpacity onPress={onExit} style={{ backgroundColor: "#4F6EF7", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 }}>
        <Text style={{ color: "#fff", fontWeight: "600" }}>Back</Text>
      </TouchableOpacity>
    </View>
  );

  if (!permission) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#000" }}>
        <Text style={{ color: "#fff", fontSize: 16 }}>Loading camera...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#000", paddingHorizontal: 32 }}>
        <Text style={{ color: "#fff", fontSize: 18, marginBottom: 8, fontWeight: "700", textAlign: "center" }}>
          Camera permission required
        </Text>
        <TouchableOpacity
          onPress={requestPermission}
          style={{ backgroundColor: "#4F6EF7", paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14 }}
        >
          <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      {RNMediapipe ? (
        <MediapipeErrorBoundary fallback={cameraFallback}>
          <View style={{ width: cameraWidth, height: cameraHeight, overflow: 'hidden', alignSelf: 'center' }}>
            <RNMediapipe
              width={cameraWidth}
              height={cameraHeight}
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
          </View>
        </MediapipeErrorBoundary>
      ) : (
        cameraFallback
      )}

      {skeletonLandmarks.length > 0 && (
        <SkeletonOverlay
          landmarks={skeletonLandmarks}
          affectedLandmarks={affectedLandmarks}
        />
      )}

      {positionWarning && isReady && (
        <View style={{
          position: "absolute",
          top: safeTop + 72,
          left: safeLeft + 16,
          right: 16,
          backgroundColor: "rgba(234,179,8,0.92)",
          borderRadius: 12, padding: 12, zIndex: 25,
          flexDirection: "row", alignItems: "center", gap: 8,
        }}>
          <Text style={{ fontSize: 16 }}>📍</Text>
          <Text style={{ color: "#000", fontWeight: "700", fontSize: 14, flex: 1 }}>
            Position yourself better in front of the camera
          </Text>
        </View>
      )}

      {!workoutMode && !started && (
        <View style={{
          position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
          justifyContent: "center", alignItems: "center",
          backgroundColor: "rgba(0,0,0,0.82)", zIndex: 30, paddingHorizontal: 28,
        }}>
          <Text style={{ color: "#fff", fontSize: 26, fontWeight: "700", marginBottom: 10, textAlign: "center" }}>
            {exercise.name}
          </Text>
          <Text style={{ color: "#8A8FA8", fontSize: 14, textAlign: "center", marginBottom: 24, lineHeight: 20 }}>
            {exercise.description}
          </Text>
          <View style={{ backgroundColor: "rgba(249,115,22,0.15)", borderRadius: 12, padding: 12, paddingHorizontal: 20, marginBottom: 36 }}>
            <Text style={{ color: "#F97316", fontSize: 13, textAlign: "center", fontWeight: "500" }}>
              📱 {exercise.cameraPosition}
            </Text>
          </View>
          <TouchableOpacity
            onPress={startCountdown}
            style={{ backgroundColor: "#22C55E", paddingHorizontal: 56, paddingVertical: 16, borderRadius: 16, marginBottom: 14 }}
          >
            <Text style={{ color: "#fff", fontSize: 18, fontWeight: "700" }}>START</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onExit} style={{ paddingHorizontal: 40, paddingVertical: 12 }}>
            <Text style={{ color: "#8A8FA8", fontSize: 15 }}>Back</Text>
          </TouchableOpacity>
        </View>
      )}

      {started && !isReady && (
        <View style={{
          position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
          justifyContent: "center", alignItems: "center",
          backgroundColor: "rgba(0,0,0,0.75)", zIndex: 30,
        }}>
          <Text style={{ color: "#8A8FA8", fontSize: 15, marginBottom: 6 }}>{exercise.name}</Text>
          <Text style={{ color: "#fff", fontSize: 22, fontWeight: "600", marginBottom: 10 }}>Get ready!</Text>
          <Text style={{ color: "#F97316", fontSize: 96, fontWeight: "700", lineHeight: 100 }}>{countdown}</Text>
          <Text style={{ color: "#8A8FA8", fontSize: 13, marginTop: 20, textAlign: "center", paddingHorizontal: 32 }}>
            📱 {exercise.cameraPosition}
          </Text>
        </View>
      )}

      {isReady && exercise.type === "timed" && formWarning && (
        <View style={{
          position: "absolute",
          top: safeTop + 72,
          left: safeLeft + 16,
          right: 16,
          backgroundColor: "rgba(239,68,68,0.92)",
          borderRadius: 12, padding: 14,
          zIndex: 20, flexDirection: "row", alignItems: "center", gap: 8,
        }}>
          <Text style={{ fontSize: 18 }}>⚠️</Text>
          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>Fix your form!</Text>
        </View>
      )}

      {!workoutMode && (
        <>
          <View style={{
            position: "absolute", top: safeTop, left: safeLeft + 16,
            backgroundColor: "rgba(247,248,250,0.9)",
            borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8,
            zIndex: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.9)",
          }}>
            <Text style={{ color: "#0F0F10", fontWeight: "700", fontSize: 14 }}>{exercise.name}</Text>
          </View>

          <TouchableOpacity
            onPress={onExit}
            style={{
              position: "absolute", top: safeTop, right: 16,
              width: 36, height: 36,
              backgroundColor: "rgba(247,248,250,0.9)",
              borderRadius: 10, alignItems: "center", justifyContent: "center",
              zIndex: 100, borderWidth: 1, borderColor: "rgba(255,255,255,0.9)",
            }}
          >
            <Text style={{ color: "#0F0F10", fontWeight: "700", fontSize: 16 }}>✕</Text>
          </TouchableOpacity>

          {isReady && (
            <View style={{ position: "absolute", top: safeTop + 52, left: 0, right: 0, alignItems: "center", zIndex: 20 }}>
              <View style={{
                backgroundColor: exercise.type === "timed" && plankActive.current
                  ? "rgba(34,197,94,0.9)" : "rgba(247,248,250,0.9)",
                paddingHorizontal: 24, paddingVertical: 12, borderRadius: 16,
                borderWidth: 1, borderColor: "rgba(255,255,255,0.9)",
              }}>
                <Text style={{ color: exercise.type === "timed" && plankActive.current ? "#fff" : "#0F0F10", fontWeight: "700", fontSize: 28 }}>
                  {exercise.type === "timed" ? `⏱ ${formatTime(seconds)}` : `${reps} reps`}
                </Text>
              </View>
            </View>
          )}

          {isReady && formFeedback.length > 0 && (
            <View style={{ position: "absolute", bottom: 40, left: safeLeft + 16, right: 16, zIndex: 20, gap: 8 }}>
              {formFeedback.map((msg, idx) => (
                <View key={idx} style={{ backgroundColor: "rgba(239,68,68,0.9)", borderRadius: 12, padding: 12, flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text style={{ fontSize: 16 }}>⚠️</Text>
                  <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14, flex: 1 }}>{msg}</Text>
                </View>
              ))}
            </View>
          )}
        </>
      )}

      {workoutMode && isReady && formFeedback.length > 0 && (
        <View style={{ position: "absolute", bottom: 100, left: safeLeft + 16, right: 16, zIndex: 20, gap: 6 }}>
          {formFeedback.map((msg, idx) => (
            <View key={idx} style={{ backgroundColor: "rgba(239,68,68,0.9)", borderRadius: 12, padding: 10, flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={{ fontSize: 14 }}>⚠️</Text>
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 13, flex: 1 }}>{msg}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}