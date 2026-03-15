import React from "react";
import { useWindowDimensions } from "react-native";
import Svg, { Circle, Line } from "react-native-svg";
import { landmarkIndexMap } from "./exercises";

const CONNECTIONS: [
  keyof typeof landmarkIndexMap,
  keyof typeof landmarkIndexMap,
][] = [
  ["leftShoulder", "rightShoulder"],
  ["leftShoulder", "leftHip"],
  ["rightShoulder", "rightHip"],
  ["leftHip", "rightHip"],
  ["leftShoulder", "leftElbow"],
  ["leftElbow", "leftWrist"],
  ["rightShoulder", "rightElbow"],
  ["rightElbow", "rightWrist"],
  ["leftHip", "leftKnee"],
  ["leftKnee", "leftAnkle"],
  ["rightHip", "rightKnee"],
  ["rightKnee", "rightAnkle"],
];

const JOINTS: (keyof typeof landmarkIndexMap)[] = [
  "leftShoulder", "rightShoulder",
  "leftElbow",    "rightElbow",
  "leftWrist",    "rightWrist",
  "leftHip",      "rightHip",
  "leftKnee",     "rightKnee",
  "leftAnkle",    "rightAnkle",
];

interface Props {
  landmarks: any[];
  affectedLandmarks: string[];
}

export default function SkeletonOverlay({ landmarks, affectedLandmarks }: Props) {
  const { width, height } = useWindowDimensions();

  if (!landmarks || landmarks.length === 0) return null;

  const getLandmarkPos = (name: keyof typeof landmarkIndexMap) => {
    const idx = landmarkIndexMap[name];
    const point = landmarks[idx];
    if (!point) return null;
    return {
      // Coordonatele MediaPipe sunt normalizate 0-1, le scalăm pe ecran
      x: point.x * width,
      y: point.y * height,
      visibility: point.visibility ?? 1,
    };
  };

  const isAffected = (name: string) => affectedLandmarks.includes(name);

  return (
    // viewBox = exact dimensiunile ecranului, fără distorsiune
    // Nu mai folosim viewBox custom sau preserveAspectRatio
    <Svg
      width={width}
      height={height}
      style={{ position: "absolute", top: 0, left: 0, zIndex: 10 }}
    >
      {/* Linii de conexiune */}
      {CONNECTIONS.map(([from, to], idx) => {
        const p1 = getLandmarkPos(from);
        const p2 = getLandmarkPos(to);
        if (!p1 || !p2) return null;
        if (p1.visibility < 0.5 || p2.visibility < 0.5) return null;
        const affected = isAffected(from) || isAffected(to);
        return (
          <Line
            key={idx}
            x1={p1.x} y1={p1.y}
            x2={p2.x} y2={p2.y}
            stroke={affected ? "#ef4444" : "#22c55e"}
            strokeWidth={affected ? 4 : 3}
            strokeOpacity={0.85}
          />
        );
      })}

      {/* Cercuri articulații */}
      {JOINTS.map((name) => {
        const pos = getLandmarkPos(name);
        if (!pos || pos.visibility < 0.5) return null;
        const affected = isAffected(name);
        return (
          <Circle
            key={name}
            cx={pos.x}
            cy={pos.y}
            r={affected ? 9 : 6}
            fill={affected ? "#ef4444" : "#22c55e"}
            fillOpacity={0.9}
          />
        );
      })}
    </Svg>
  );
}