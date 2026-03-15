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
  isFrontCamera?: boolean; // Opțional: setează pe true dacă imaginea e în oglindă
}

export default function SkeletonOverlay({ landmarks, affectedLandmarks, isFrontCamera = false }: Props) {
  const { width, height } = useWindowDimensions();
  
  if (!landmarks || landmarks.length === 0) return null;

  // ─── ALGORITM DE CALIBRARE (Aspect-Fill Correction) ───
  // Majoritatea camerelor video raportează cadre 16:9 (1.777) sau 4:3 (1.333).
  // Ajustează acest număr dacă observi că decalează în continuare.
  const CAMERA_ASPECT_RATIO = 16 / 9; 
  const screenRatio = height / width;

  let videoWidth = width;
  let videoHeight = height;
  let offsetX = 0;
  let offsetY = 0;

  // Calculăm cu cât s-a "întins" videoul ca să acopere ecranul
  if (screenRatio > CAMERA_ASPECT_RATIO) {
    // Ecranul este mai înalt decât videoul (videoul a tăiat din stânga și dreapta)
    videoWidth = height / CAMERA_ASPECT_RATIO;
    offsetX = (width - videoWidth) / 2; // Offset negativ
  } else {
    // Ecranul este mai lat decât videoul (videoul a tăiat din sus și jos)
    videoHeight = width * CAMERA_ASPECT_RATIO;
    offsetY = (height - videoHeight) / 2;
  }

  const getLandmarkPos = (name: keyof typeof landmarkIndexMap) => {
    const idx = landmarkIndexMap[name];
    const point = landmarks[idx];
    if (!point) return null;

    // Aplicăm offset-ul și noul scale pentru a mapa perfect peste imaginea tăiată
    let calculatedX = point.x * videoWidth + offsetX;
    let calculatedY = point.y * videoHeight + offsetY;

    // Dacă folosești camera de selfie, trebuie întors axul X în oglindă
    if (isFrontCamera) {
      calculatedX = width - calculatedX; 
    }

    return {
      x: calculatedX,
      y: calculatedY,
      visibility: point.visibility ?? 1,
    };
  };

  const isAffected = (name: string) => affectedLandmarks.includes(name);

  return (
    <Svg
      width={width}
      height={height}
      style={{ position: "absolute", top: 0, left: 0, zIndex: 10 }}
    >
      {/* Liniile de conexiune */}
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

      {/* Articulațiile (Cercurile) */}
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