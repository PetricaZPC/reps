import React from 'react';
import { Dimensions } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';
import { landmarkIndexMap } from './exercises';

const { width, height } = Dimensions.get('window');

// Conexiunile dintre landmark-uri - ce linii desenam
const CONNECTIONS: [keyof typeof landmarkIndexMap, keyof typeof landmarkIndexMap][] = [
    // Cap
    ['nose', 'leftEye'], ['nose', 'rightEye'],
    ['leftEye', 'leftEar'], ['rightEye', 'rightEar'],
    // Trunchi
    ['leftShoulder', 'rightShoulder'],
    ['leftShoulder', 'leftHip'],
    ['rightShoulder', 'rightHip'],
    ['leftHip', 'rightHip'],
    // Brat stang
    ['leftShoulder', 'leftElbow'],
    ['leftElbow', 'leftWrist'],
    // Brat drept
    ['rightShoulder', 'rightElbow'],
    ['rightElbow', 'rightWrist'],
    // Picior stang
    ['leftHip', 'leftKnee'],
    ['leftKnee', 'leftAnkle'],
    ['leftAnkle', 'leftFootIndex'],
    // Picior drept
    ['rightHip', 'rightKnee'],
    ['rightKnee', 'rightAnkle'],
    ['rightAnkle', 'rightFootIndex'],
];

interface Props {
    landmarks: any[];           // landmarks normalizate 0-1
    affectedLandmarks: string[]; // landmark-uri cu forma gresita - rosii
}

export default function SkeletonOverlay({ landmarks, affectedLandmarks }: Props) {
    if (!landmarks || landmarks.length === 0) return null;

    const getLandmarkPos = (name: keyof typeof landmarkIndexMap) => {
        const idx = landmarkIndexMap[name];
        const point = landmarks[idx];
        if (!point) return null;
        return {
            x: point.x * width,
            y: point.y * height,
            visibility: point.visibility ?? 1,
        };
    };

    const isAffected = (name: string) => affectedLandmarks.includes(name);

    return (
        <Svg
            width={width}
            height={height}
            style={{ position: 'absolute', top: 0, left: 0, zIndex: 10 }}
        >
            {/* Linii intre articulatii */}
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
                        stroke={affected ? '#ef4444' : '#22c55e'}
                        strokeWidth={affected ? 3 : 2}
                        strokeOpacity={0.8}
                    />
                );
            })}

            {/* Cercuri pe fiecare articulatie */}
            {Object.keys(landmarkIndexMap).map((name) => {
                const pos = getLandmarkPos(name as keyof typeof landmarkIndexMap);
                if (!pos || pos.visibility < 0.5) return null;

                const affected = isAffected(name);

                return (
                    <Circle
                        key={name}
                        cx={pos.x}
                        cy={pos.y}
                        r={affected ? 8 : 5}
                        fill={affected ? '#ef4444' : '#22c55e'}
                        fillOpacity={0.9}
                    />
                );
            })}
        </Svg>
    );
}