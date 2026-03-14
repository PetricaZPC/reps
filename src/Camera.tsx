import { RNMediapipe } from "@thinksys/react-native-mediapipe";
import { useCameraPermissions } from "expo-camera";
import React, { useEffect, useRef, useState } from "react";
import { Dimensions, Pressable, Text, View } from "react-native";
import { ExerciseConfig, calculateAngle, landmarkIndexMap } from "./exercises";

const { width, height } = Dimensions.get("window");

interface CameraProps {
  exercise: ExerciseConfig;
  onExit: () => void;
}

class MediapipeErrorBoundary extends React.Component<
  { fallback: React.ReactNode; children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { fallback: React.ReactNode; children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.log("Mediapipe render error:", error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

export default function Camera({ exercise, onExit }: CameraProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [reps, setReps] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [countdown, setCountdown] = useState(5);
  const [isReady, setIsReady] = useState(false);
  const [started, setStarted] = useState(false);
  const [formWarning, setFormWarning] = useState(false);

  const isReadyRef = useRef(false);
  const upPosRef = useRef(false);
  const repsRef = useRef(0);
  const lastLogTime = useRef(0);
  const lastRepTime = useRef(0);
  const plankActive = useRef(false);
  const plankInterval = useRef<any>(null);

  useEffect(() => {
    if (!started) return;
    if (isReady) return;
    if (countdown === 0) {
      setIsReady(true);
      isReadyRef.current = true;
      return;
    }
    const timer = setTimeout(() => setCountdown((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, isReady, started]);

  const handleLandmark = (data: any) => {
    if (!isReadyRef.current) return;

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

    const landmarkObj: Record<string, any> = {};
    Object.entries(landmarkIndexMap).forEach(([name, idx]) => {
      landmarkObj[name] = landmarkArray![idx];
    });

    const points = exercise.landmarks.map((name: string) => landmarkObj[name]);
    if (
      !points.length ||
      !points.every((p: any) => p && typeof p.x === "number")
    )
      return;

    const angle = calculateAngle(points[0], points[1], points[2]);

    if (now - lastLogTime.current > 1000) {
      lastLogTime.current = now;
      console.log(
        "Angle:",
        angle,
        "| min:",
        exercise.minAngle,
        "| max:",
        exercise.maxAngle,
      );
    }

    if (exercise.type === "timed") {
      const goodForm = angle >= exercise.minAngle;
      if (goodForm !== plankActive.current) {
        plankActive.current = goodForm;
        setFormWarning(!goodForm);
        if (goodForm) {
          plankInterval.current = setInterval(() => {
            setSeconds((prev) => prev + 1);
          }, 1000);
        } else {
          clearInterval(plankInterval.current);
        }
      }
      return;
    }

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
          console.log("REP:", repsRef.current);
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
          console.log("REP:", repsRef.current);
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
      <Text
        style={{
          color: "#9ca3af",
          fontSize: 14,
          textAlign: "center",
          marginBottom: 24,
        }}
      >
        Please update app build or try another device.
      </Text>
      <Pressable
        onPress={onExit}
        style={{
          backgroundColor: "#3b82f6",
          paddingHorizontal: 24,
          paddingVertical: 12,
          borderRadius: 8,
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "600" }}>Back</Text>
      </Pressable>
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
        <Text style={{ color: "#fff", fontSize: 18 }}>Loading camera...</Text>
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
        }}
      >
        <Text style={{ color: "#fff", fontSize: 18, marginBottom: 20 }}>
          Camera permission required
        </Text>
        <Pressable
          onPress={requestPermission}
          style={{
            backgroundColor: "#3b82f6",
            paddingHorizontal: 24,
            paddingVertical: 14,
            borderRadius: 8,
          }}
        >
          <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>
            Grant Permission
          </Text>
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
            face={true}
            leftArm={true}
            rightArm={true}
            leftWrist={true}
            rightWrist={true}
            torso={true}
            leftLeg={true}
            rightLeg={true}
            leftAnkle={true}
            rightAnkle={true}
            onLandmark={(data) => handleLandmark(data)}
          />
        </MediapipeErrorBoundary>
      ) : (
        cameraFallback
      )}

      {/* Start screen */}
      {!started && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "rgba(0,0,0,0.8)",
            zIndex: 30,
          }}
        >
          <Text
            style={{
              color: "#fff",
              fontSize: 28,
              fontWeight: "bold",
              marginBottom: 12,
            }}
          >
            {exercise.name}
          </Text>
          <Text
            style={{
              color: "#9ca3af",
              fontSize: 15,
              textAlign: "center",
              paddingHorizontal: 40,
              marginBottom: 20,
            }}
          >
            {exercise.description}
          </Text>
          <View
            style={{
              backgroundColor: "rgba(234,179,8,0.2)",
              borderRadius: 8,
              padding: 14,
              paddingHorizontal: 24,
              marginBottom: 40,
            }}
          >
            <Text
              style={{ color: "#facc15", fontSize: 14, textAlign: "center" }}
            >
              📱 {exercise.cameraPosition}
            </Text>
          </View>
          <Pressable
            onPress={() => setStarted(true)}
            style={{
              backgroundColor: "#16a34a",
              paddingHorizontal: 56,
              paddingVertical: 18,
              borderRadius: 14,
              marginBottom: 16,
            }}
          >
            <Text style={{ color: "#fff", fontSize: 20, fontWeight: "bold" }}>
              START
            </Text>
          </Pressable>
          <Pressable
            onPress={onExit}
            style={{
              paddingHorizontal: 40,
              paddingVertical: 12,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: "#4b5563",
            }}
          >
            <Text style={{ color: "#9ca3af", fontSize: 16 }}>Back</Text>
          </Pressable>
        </View>
      )}

      {/* Countdown overlay */}
      {started && !isReady && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "rgba(0,0,0,0.8)",
            zIndex: 30,
          }}
        >
          <Text
            style={{
              color: "#fff",
              fontSize: 24,
              fontWeight: "600",
              marginBottom: 12,
            }}
          >
            Get ready!
          </Text>
          <Text style={{ color: "#facc15", fontSize: 100, fontWeight: "bold" }}>
            {countdown}
          </Text>
        </View>
      )}

      {/* Form warning for plank */}
      {isReady && exercise.type === "timed" && formWarning && (
        <View
          style={{
            position: "absolute",
            top: 120,
            left: 16,
            right: 16,
            backgroundColor: "rgba(220,38,38,0.9)",
            borderRadius: 8,
            padding: 14,
            zIndex: 20,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 16 }}>
            ⚠️ Fix your form! Keep body straight
          </Text>
        </View>
      )}

      {/* Exercise name */}
      <Text
        style={{
          position: "absolute",
          top: 16,
          left: 16,
          color: "#fff",
          fontWeight: "bold",
          fontSize: 18,
          backgroundColor: "rgba(0,0,0,0.6)",
          padding: 10,
          borderRadius: 8,
          zIndex: 20,
        }}
      >
        {exercise.name}
      </Text>

      {/* Back button */}
      <Pressable
        onPress={onExit}
        style={{
          position: "absolute",
          top: 16,
          right: 16,
          backgroundColor: "rgba(0,0,0,0.6)",
          padding: 10,
          borderRadius: 8,
          zIndex: 20,
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 18 }}>
          ✕
        </Text>
      </Pressable>

      {/* Counter display */}
      <View
        style={{
          position: "absolute",
          top: 16,
          left: 0,
          right: 0,
          alignItems: "center",
          zIndex: 20,
        }}
      >
        <View
          style={{
            backgroundColor:
              exercise.type === "timed" && plankActive.current
                ? "rgba(34,197,94,0.9)"
                : "rgba(0,0,0,0.7)",
            paddingHorizontal: 24,
            paddingVertical: 12,
            borderRadius: 12,
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 28 }}>
            {exercise.type === "timed"
              ? `⏱ ${formatTime(seconds)}`
              : `🔄 ${reps} reps`}
          </Text>
        </View>
      </View>
    </View>
  );
}
