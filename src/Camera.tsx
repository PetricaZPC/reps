import { RNMediapipe } from '@thinksys/react-native-mediapipe';
import { useCameraPermissions } from 'expo-camera';
import { useEffect, useRef, useState } from 'react';
import { Dimensions, Pressable, Text, View } from 'react-native';
import { ExerciseConfig, calculateAngle, landmarkIndexMap } from './exercises';

const { width, height } = Dimensions.get('window');

interface CameraProps {
  exercise: ExerciseConfig;
  onExit: () => void;
}

export default function Camera({ exercise, onExit }: CameraProps) {
    const [permission, requestPermission] = useCameraPermissions();
    const [reps, setReps] = useState(0);
    const [seconds, setSeconds] = useState(0);
    const [countdown, setCountdown] = useState(5);
    const [isReady, setIsReady] = useState(false);
    const [started, setStarted] = useState(false);
    const [formWarning, setFormWarning] = useState(false);

    const upPosRef = useRef(false);
    const repsRef = useRef(0);
    const lastLogTime = useRef(0);
    const lastRepTime = useRef(0);
    const plankActive = useRef(false);
    const plankInterval = useRef<any>(null);

    // Countdown
    useEffect(() => {
        if (!started) return;
        if (isReady) return;
        if (countdown === 0) {
            setIsReady(true);
            return;
        }
        const timer = setTimeout(() => setCountdown(prev => prev - 1), 1000);
        return () => clearTimeout(timer);
    }, [countdown, isReady, started]);

    const handleLandmark = (data: any) => {
        if (!isReady) return;

        const now = Date.now();
        let parsed: any;
        try {
            parsed = typeof data === 'string' ? JSON.parse(data) : data;
        } catch (e) {
            return;
        }

        const landmarkArray = parsed.worldLandmarks?.length > 0
            ? parsed.worldLandmarks
            : parsed.landmarks;

        if (!landmarkArray || landmarkArray.length === 0) return;

        const landmarkObj: Record<string, any> = {};
        Object.entries(landmarkIndexMap).forEach(([name, idx]) => {
            landmarkObj[name] = landmarkArray[idx];
        });

        const points = exercise.landmarks.map((name: string) => landmarkObj[name]);

        if (!points.length || !points.every((p: any) => p && typeof p.x === 'number')) return;

        const angle = calculateAngle(points[0], points[1], points[2]);

        if (now - lastLogTime.current > 1000) {
            lastLogTime.current = now;
            console.log('Angle:', angle);
        }

        // PLANK
        if (exercise.type === 'timed') {
            const goodForm = angle >= exercise.minAngle;
            if (goodForm !== plankActive.current) {
                plankActive.current = goodForm;
                setFormWarning(!goodForm);
                if (goodForm) {
                    plankInterval.current = setInterval(() => {
                        setSeconds(prev => prev + 1);
                    }, 1000);
                } else {
                    clearInterval(plankInterval.current);
                }
            }
            return;
        }

        // REPS
        if (exercise.countOn === 'up') {
            if (angle < exercise.minAngle && !upPosRef.current) {
                upPosRef.current = true;
            }
            if (angle > exercise.maxAngle && upPosRef.current) {
                if (now - lastRepTime.current > 500) {
                    upPosRef.current = false;
                    repsRef.current += 1;
                    lastRepTime.current = now;
                    setReps(repsRef.current);
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
                }
            }
        }
    };

    const formatTime = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${sec.toString().padStart(2, '0')}`;
    };

    if (!permission) {
        return (
            <View className="flex-1 justify-center items-center">
                <Text>Loading camera...</Text>
            </View>
        );
    }

    if (!permission.granted) {
        return (
            <View className="flex-1 justify-center items-center">
                <Text className="mb-4">Camera permission required</Text>
                <Pressable onPress={requestPermission} className="bg-blue-600 px-6 py-3 rounded-md">
                    <Text className="text-white font-semibold">Grant Permission</Text>
                </Pressable>
            </View>
        );
    }

    return (
        <View className="flex-1">
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
                onLandmark={handleLandmark}
            />

            {/* Start screen */}
            {!started && (
                <View style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    justifyContent: 'center', alignItems: 'center',
                    backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 30,
                }}>
                    <Text style={{ color: 'white', fontSize: 30, fontWeight: 'bold', marginBottom: 8 }}>
                        {exercise.name}
                    </Text>
                    <Text style={{
                        color: '#d1d5db', fontSize: 15, textAlign: 'center',
                        paddingHorizontal: 32, marginBottom: 16,
                    }}>
                        {exercise.description}
                    </Text>
                    <View style={{
                        backgroundColor: 'rgba(234,179,8,0.2)',
                        borderRadius: 8, padding: 12, paddingHorizontal: 20, marginBottom: 40,
                    }}>
                        <Text style={{ color: '#facc15', fontSize: 14, textAlign: 'center' }}>
                            📱 {exercise.cameraPosition}
                        </Text>
                    </View>
                    <Pressable
                        onPress={() => setStarted(true)}
                        style={{
                            backgroundColor: '#16a34a',
                            paddingHorizontal: 48, paddingVertical: 16,
                            borderRadius: 12, marginBottom: 16,
                        }}
                    >
                        <Text style={{ color: 'white', fontSize: 22, fontWeight: 'bold' }}>
                            Start
                        </Text>
                    </Pressable>
                    <Pressable
                        onPress={onExit}
                        style={{
                            paddingHorizontal: 48, paddingVertical: 12,
                            borderRadius: 12, borderWidth: 1, borderColor: '#6b7280',
                        }}
                    >
                        <Text style={{ color: '#9ca3af', fontSize: 16 }}>
                            Back
                        </Text>
                    </Pressable>
                </View>
            )}

            {/* Countdown overlay */}
            {started && !isReady && (
                <View style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    justifyContent: 'center', alignItems: 'center',
                    backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 30,
                }}>
                    <Text style={{ color: 'white', fontSize: 24, fontWeight: '600', marginBottom: 8 }}>
                        Get ready!
                    </Text>
                    <Text style={{ color: '#facc15', fontSize: 120, fontWeight: 'bold', lineHeight: 130 }}>
                        {countdown}
                    </Text>
                </View>
            )}

            {/* Form warning plank */}
            {isReady && exercise.type === 'timed' && formWarning && (
                <View style={{
                    position: 'absolute', top: 120, left: 16, right: 16,
                    backgroundColor: 'rgba(220,38,38,0.8)',
                    borderRadius: 8, padding: 12, zIndex: 20, alignItems: 'center',
                }}>
                    <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>
                        ⚠️ Fix your form! Keep body straight
                    </Text>
                </View>
            )}

            {/* Exercise name */}
            <Text style={{
                position: 'absolute', top: 16, left: 16,
                color: 'white', fontWeight: 'bold', fontSize: 20,
                backgroundColor: 'rgba(0,0,0,0.5)',
                padding: 8, borderRadius: 8, zIndex: 20,
            }}>
                {exercise.name}
            </Text>

            {/* Back button */}
            <Pressable
                onPress={onExit}
                style={{
                    position: 'absolute', top: 16, right: 16,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    padding: 8, borderRadius: 8, zIndex: 20,
                }}
            >
                <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 20 }}>
                    ✕
                </Text>
            </Pressable>

            {/* Counter */}
            <Text style={{
                position: 'absolute', top: 56, left: 16,
                color: 'white', fontWeight: 'bold', fontSize: 20,
                backgroundColor: exercise.type === 'timed' && plankActive.current
                    ? 'rgba(34,197,94,0.7)'
                    : 'rgba(0,0,0,0.5)',
                padding: 8, borderRadius: 8, zIndex: 20,
            }}>
                {exercise.type === 'timed'
                    ? `⏱ ${formatTime(seconds)}`
                    : `Reps: ${reps}`
                }
           das </Text>
        </View>
    );
}