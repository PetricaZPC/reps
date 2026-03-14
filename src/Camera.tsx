import { RNMediapipe } from "@thinksys/react-native-mediapipe";
import { useCameraPermissions } from "expo-camera";
import React, { useEffect, useRef, useState } from "react";
import { Dimensions, Pressable, Text, View } from "react-native";
import { ExerciseConfig, calculateAngle, landmarkIndexMap } from "./exercises";
import SkeletonOverlay from "./skeletonOverlay";

const { width, height } = Dimensions.get("window");

interface CameraProps {
  exercise: ExerciseConfig;
  onExit: () => void;
  onRepsUpdate?: (reps: number) => void;
  onSecondsUpdate?: (seconds: number) => void;
  workoutMode?: boolean;
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

export default function Camera({ exercise, onExit, onRepsUpdate, onSecondsUpdate, workoutMode = false }: CameraProps) {
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
  const lastFeedbackRef = useRef<string>('');
  const formViolationTime = useRef<Record<string, number>>({});
  const countdownRef = useRef<any>(null);

  // Auto-start in workout mode + reset when exercise changes
  useEffect(() => {
    // Reset state
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
    lastFeedbackRef.current = '';
    formViolationTime.current = {};
    if (plankInterval.current) clearInterval(plankInterval.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    isReadyRef.current = false;

    if (workoutMode) {
      startCountdown();
    }
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

    let parsed: any;
    try {
      parsed = typeof data === "string" ? JSON.parse(data) : data;
    } catch (e) {
      parsed = data;
    }

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

    // FORM CHECKING
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
          if (duration > 1000) {
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

    // TIMED
    if (exercise.type === "timed") {
      const mainPoints = exercise.landmarks.map((name: string) => landmarkObj[name]);
      const pointsVisible = mainPoints.every((p: any) =>
        p && typeof p.x === 'number' && (p.visibility ?? 1) > 0.3
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

    // REPS
    if (exercise.countOn === "up") {
      if (angle < exercise.minAngle && !upPosRef.current) {
        upPosRef.current = true;
      }
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
      if (angle > exercise.maxAngle && !upPosRef.current) {
        upPosRef.current = true;
      }
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
      <Pressable onPress={onExit} style={{ backgroundColor: "#3b82f6", paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 }}>
        <Text style={{ color: "#fff", fontWeight: "600" }}>Back</Text>
      </Pressable>
    </View>
  );

  if (!permission) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#000" }}>
        <Text style={{ color: "#fff", fontSize: 18 }}>Loading camera...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#000" }}>
        <Text style={{ color: "#fff", fontSize: 18, marginBottom: 20 }}>Camera permission required</Text>
        <Pressable onPress={requestPermission} style={{ backgroundColor: "#3b82f6", paddingHorizontal: 24, paddingVertical: 14, borderRadius: 8 }}>
          <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>Grant Permission</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
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

      {skeletonLandmarks.length > 0 && (
        <SkeletonOverlay
          landmarks={skeletonLandmarks}
          affectedLandmarks={affectedLandmarks}
        />
      )}

      {/* Start screen - nu in workout mode */}
      {!workoutMode && !started && (
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.8)", zIndex: 30 }}>
          <Text style={{ color: "#fff", fontSize: 28, fontWeight: "bold", marginBottom: 12 }}>
            {exercise.name}
          </Text>
          <Text style={{ color: "#9ca3af", fontSize: 15, textAlign: "center", paddingHorizontal: 40, marginBottom: 20 }}>
            {exercise.description}
          </Text>
          <View style={{ backgroundColor: "rgba(234,179,8,0.2)", borderRadius: 8, padding: 14, paddingHorizontal: 24, marginBottom: 40 }}>
            <Text style={{ color: "#facc15", fontSize: 14, textAlign: "center" }}>
              📱 {exercise.cameraPosition}
            </Text>
          </View>
          <Pressable
            onPress={startCountdown}
            style={{ backgroundColor: "#16a34a", paddingHorizontal: 56, paddingVertical: 18, borderRadius: 14, marginBottom: 16 }}
          >
            <Text style={{ color: "#fff", fontSize: 20, fontWeight: "bold" }}>START</Text>
          </Pressable>
          <Pressable onPress={onExit} style={{ paddingHorizontal: 40, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: "#4b5563" }}>
            <Text style={{ color: "#9ca3af", fontSize: 16 }}>Back</Text>
          </Pressable>
        </View>
      )}

      {/* Countdown - atat in normal cat si workout mode */}
      {started && !isReady && (
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.7)", zIndex: 30 }}>
          <Text style={{ color: "#9ca3af", fontSize: 16, marginBottom: 8 }}>
            {exercise.name}
          </Text>
          <Text style={{ color: "#fff", fontSize: 24, fontWeight: "600", marginBottom: 12 }}>Get ready!</Text>
          <Text style={{ color: "#facc15", fontSize: 100, fontWeight: "bold" }}>{countdown}</Text>
          <Text style={{ color: "#9ca3af", fontSize: 14, marginTop: 16, textAlign: "center", paddingHorizontal: 32 }}>
            📱 {exercise.cameraPosition}
          </Text>
        </View>
      )}

      {/* Form warning */}
      {isReady && exercise.type === "timed" && formWarning && (
        <View style={{ position: "absolute", top: workoutMode ? 100 : 120, left: 16, right: 16, backgroundColor: "rgba(220,38,38,0.9)", borderRadius: 8, padding: 14, zIndex: 20, alignItems: "center" }}>
          <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 16 }}>⚠️ Fix your form!</Text>
        </View>
      )}

      {/* UI normal mode only */}
      {!workoutMode && (
        <>
          <Text style={{ position: "absolute", top: 16, left: 16, color: "#fff", fontWeight: "bold", fontSize: 18, backgroundColor: "rgba(0,0,0,0.6)", padding: 10, borderRadius: 8, zIndex: 20 }}>
            {exercise.name}
          </Text>

          <Pressable onPress={onExit} style={{ position: "absolute", top: 16, right: 16, backgroundColor: "rgba(0,0,0,0.6)", padding: 10, borderRadius: 8, zIndex: 100 }}>
            <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 18 }}>✕</Text>
          </Pressable>

          {isReady && (
            <View style={{ position: "absolute", top: 16, left: 0, right: 0, alignItems: "center", zIndex: 20 }}>
              <View style={{
                backgroundColor: exercise.type === "timed" && plankActive.current ? "rgba(34,197,94,0.9)" : "rgba(0,0,0,0.7)",
                paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12
              }}>
                <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 28 }}>
                  {exercise.type === "timed" ? `⏱ ${formatTime(seconds)}` : `🔄 ${reps} reps`}
                </Text>
              </View>
            </View>
          )}

          {isReady && formFeedback.length > 0 && (
            <View style={{ position: "absolute", bottom: 40, left: 16, right: 16, zIndex: 20 }}>
              {formFeedback.map((msg, idx) => (
                <View key={idx} style={{ backgroundColor: "rgba(220,38,38,0.9)", borderRadius: 8, padding: 12, marginBottom: 8, flexDirection: "row", alignItems: "center" }}>
                  <Text style={{ fontSize: 18, marginRight: 8 }}>⚠️</Text>
                  <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 14, flex: 1 }}>{msg}</Text>
                </View>
              ))}
            </View>
          )}
        </>
      )}

      {/* Form feedback in workout mode */}
      {workoutMode && isReady && formFeedback.length > 0 && (
        <View style={{ position: "absolute", bottom: 100, left: 16, right: 16, zIndex: 20 }}>
          {formFeedback.map((msg, idx) => (
            <View key={idx} style={{ backgroundColor: "rgba(220,38,38,0.9)", borderRadius: 8, padding: 10, marginBottom: 6, flexDirection: "row", alignItems: "center" }}>
              <Text style={{ fontSize: 16, marginRight: 6 }}>⚠️</Text>
              <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 13, flex: 1 }}>{msg}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}