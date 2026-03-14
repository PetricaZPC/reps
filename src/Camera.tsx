import { RNMediapipe } from '@thinksys/react-native-mediapipe';
import { useCameraPermissions } from 'expo-camera';
import { useEffect, useRef, useState } from 'react';
import { Dimensions, Pressable, Text, View } from 'react-native';
import { ExerciseConfig, calculateAngle, landmarkIndexMap } from './exercises';
import SkeletonOverlay from './skeletonOverlay';

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
    const [formFeedback, setFormFeedback] = useState<string[]>([]);
    const [skeletonLandmarks, setSkeletonLandmarks] = useState<any[]>([]);
    const [affectedLandmarks, setAffectedLandmarks] = useState<string[]>([]);
    const [phase, setPhase] = useState<'start' | 'calibrating' | 'countdown' | 'exercise'>('start');
    const [calibrationCountdown, setCalibrationCountdown] = useState(3);

    const isReadyRef = useRef(false);
    const phaseRef = useRef<'start' | 'calibrating' | 'countdown' | 'exercise'>('start');
    const upPosRef = useRef(false);
    const repsRef = useRef(0);
    const lastLogTime = useRef(0);
    const lastRepTime = useRef(0);
    const plankActive = useRef(false);
    const plankInterval = useRef<any>(null);
    const lastFeedbackRef = useRef<string>('');
    const formViolationTime = useRef<Record<string, number>>({});
    const calibrationData = useRef<Record<string, number[]>>({});
    const calibratedAngles = useRef<Record<string, { min: number, max: number }>>({});
    const calibrationStartTime = useRef<number>(0);

    // Countdown pentru exercitiu
    useEffect(() => {
        if (phase !== 'countdown') return;
        if (countdown === 0) {
            setPhase('exercise');
            phaseRef.current = 'exercise';
            setIsReady(true);
            isReadyRef.current = true;
            return;
        }
        const timer = setTimeout(() => setCountdown(prev => prev - 1), 1000);
        return () => clearTimeout(timer);
    }, [countdown, phase]);

    // Countdown pentru calibrare
    useEffect(() => {
        if (phase !== 'calibrating') return;
        if (calibrationCountdown === 0) {
            // Calibrarea s-a terminat - calculeaza unghiurile
            Object.entries(calibrationData.current).forEach(([message, angles]) => {
                if (angles.length === 0) return;
                const avg = angles.reduce((a, b) => a + b, 0) / angles.length;
                calibratedAngles.current[message] = {
                    min: avg - 20,
                    max: avg + 20,
                };
            });
            console.log('Calibrare finalizata:', calibratedAngles.current);
            setPhase('countdown');
            phaseRef.current = 'countdown';
            return;
        }
        const timer = setTimeout(() => setCalibrationCountdown(prev => prev - 1), 1000);
        return () => clearTimeout(timer);
    }, [calibrationCountdown, phase]);

    const handleLandmark = (data: any) => {
        const now = Date.now();

        let parsed: any;
        try {
            parsed = typeof data === 'string' ? JSON.parse(data) : data;
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

        if (Array.isArray(parsed.landmarks) && parsed.landmarks.length > 0) {
            setSkeletonLandmarks(parsed.landmarks);
        }

        const landmarkObj: Record<string, any> = {};
        Object.entries(landmarkIndexMap).forEach(([name, idx]) => {
            landmarkObj[name] = landmarkArray![idx];
        });

        // FAZA CALIBRARE - colecteaza unghiuri
        if (phaseRef.current === 'calibrating') {
            exercise.formRules.forEach((rule) => {
                const rulePoints = rule.landmarks.map((name: string) => landmarkObj[name]);
                if (!rulePoints.every((p: any) => p && typeof p.x === 'number')) return;
                const ruleAngle = calculateAngle(rulePoints[0], rulePoints[1], rulePoints[2]);
                if (!calibrationData.current[rule.message]) {
                    calibrationData.current[rule.message] = [];
                }
                calibrationData.current[rule.message].push(ruleAngle);
            });
            return;
        }

        // FAZA EXERCITIU
        if (!isReadyRef.current) return;

        const points = exercise.landmarks.map((name: string) => landmarkObj[name]);
        if (!points.length || !points.every((p: any) => p && typeof p.x === 'number')) return;

        const angle = calculateAngle(points[0], points[1], points[2]);

        // FORM CHECKING cu debounce de 1 secunda si unghiuri calibrate
        const violations: string[] = [];
        const allAffected: string[] = [];

        exercise.formRules.forEach((rule) => {
            const rulePoints = rule.landmarks.map((name: string) => landmarkObj[name]);
            if (!rulePoints.every((p: any) => p && typeof p.x === 'number')) return;
            
            const ruleAngle = calculateAngle(rulePoints[0], rulePoints[1], rulePoints[2]);
    
    // ADAUGA ASTA temporar
    if (now - lastLogTime.current > 1000) {
        console.log(`Rule: ${rule.message} | angle: ${ruleAngle.toFixed(1)} | min: ${rule.minAngle} | max: ${rule.maxAngle}`);
    }

           

            let violated = false;
            const calibrated = calibratedAngles.current[rule.message];
            if (calibrated) {
                // Foloseste unghiurile calibrate
                if (ruleAngle < calibrated.min) violated = true;
                if (ruleAngle > calibrated.max) violated = true;
            } else {
                // Fallback la hardcodate
                if (rule.minAngle !== undefined && ruleAngle < rule.minAngle) violated = true;
                if (rule.maxAngle !== undefined && ruleAngle > rule.maxAngle) violated = true;
            }

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

        const newFeedback = violations.join('|');
        if (newFeedback !== lastFeedbackRef.current) {
            lastFeedbackRef.current = newFeedback;
            setFormFeedback(violations);
            setAffectedLandmarks(allAffected);
        }

        if (now - lastLogTime.current > 1000) {
            lastLogTime.current = now;
            console.log('Angle:', angle, '| min:', exercise.minAngle, '| max:', exercise.maxAngle);
        }

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

        if (violations.length > 0) return;

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
                    console.log('REP:', repsRef.current);
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
                    console.log('REP:', repsRef.current);
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
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
                <Text style={{ color: '#fff', fontSize: 18 }}>Loading camera...</Text>
            </View>
        );
    }

    if (!permission.granted) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
                <Text style={{ color: '#fff', fontSize: 18, marginBottom: 20 }}>Camera permission required</Text>
                <Pressable
                    onPress={requestPermission}
                    style={{ backgroundColor: '#3b82f6', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 8 }}
                >
                    <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Grant Permission</Text>
                </Pressable>
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: '#000' }}>
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

            {/* Skeleton overlay */}
            {phase === 'exercise' && (
                <SkeletonOverlay
                    landmarks={skeletonLandmarks}
                    affectedLandmarks={affectedLandmarks}
                />
            )}

            {/* Start screen */}
            {phase === 'start' && (
                <View style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    justifyContent: 'center', alignItems: 'center',
                    backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 30,
                }}>
                    <Text style={{ color: '#fff', fontSize: 28, fontWeight: 'bold', marginBottom: 12 }}>
                        {exercise.name}
                    </Text>
                    <Text style={{
                        color: '#9ca3af', fontSize: 15, textAlign: 'center',
                        paddingHorizontal: 40, marginBottom: 20,
                    }}>
                        {exercise.description}
                    </Text>
                    <View style={{
                        backgroundColor: 'rgba(234,179,8,0.2)',
                        borderRadius: 8, padding: 14, paddingHorizontal: 24, marginBottom: 40,
                    }}>
                        <Text style={{ color: '#facc15', fontSize: 14, textAlign: 'center' }}>
                            📱 {exercise.cameraPosition}
                        </Text>
                    </View>
                    <Pressable
                        onPress={() => {
                            setPhase('calibrating');
                            phaseRef.current = 'calibrating';
                        }}
                        style={{
                            backgroundColor: '#16a34a',
                            paddingHorizontal: 56, paddingVertical: 18,
                            borderRadius: 14, marginBottom: 16,
                        }}
                    >
                        <Text style={{ color: '#fff', fontSize: 20, fontWeight: 'bold' }}>
                            START
                        </Text>
                    </Pressable>
                    <Pressable
                        onPress={onExit}
                        style={{
                            paddingHorizontal: 40, paddingVertical: 12,
                            borderRadius: 12, borderWidth: 1, borderColor: '#4b5563',
                        }}
                    >
                        <Text style={{ color: '#9ca3af', fontSize: 16 }}>
                            Back
                        </Text>
                    </Pressable>
                </View>
            )}

            {/* Calibrare overlay */}
            {phase === 'calibrating' && (
                <View style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    justifyContent: 'center', alignItems: 'center',
                    backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 30,
                }}>
                    <Text style={{ color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 8, textAlign: 'center', paddingHorizontal: 32 }}>
                        Stand in starting position
                    </Text>
                    <Text style={{ color: '#9ca3af', fontSize: 15, textAlign: 'center', paddingHorizontal: 40, marginBottom: 24 }}>
                        Hold still while we calibrate to your body
                    </Text>
                    <Text style={{ color: '#facc15', fontSize: 80, fontWeight: 'bold' }}>
                        {calibrationCountdown}
                    </Text>
                </View>
            )}

            {/* Countdown overlay */}
            {phase === 'countdown' && (
                <View style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    justifyContent: 'center', alignItems: 'center',
                    backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 30,
                }}>
                    <Text style={{ color: '#fff', fontSize: 24, fontWeight: '600', marginBottom: 12 }}>
                        Get ready!
                    </Text>
                    <Text style={{ color: '#facc15', fontSize: 100, fontWeight: 'bold' }}>
                        {countdown}
                    </Text>
                </View>
            )}

            {/* Form warning for plank */}
            {phase === 'exercise' && exercise.type === 'timed' && formWarning && (
                <View style={{
                    position: 'absolute', top: 120, left: 16, right: 16,
                    backgroundColor: 'rgba(220,38,38,0.9)',
                    borderRadius: 8, padding: 14, zIndex: 20, alignItems: 'center',
                }}>
                    <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>
                        ⚠️ Fix your form! Keep body straight
                    </Text>
                </View>
            )}

            {/* Exercise name */}
            <Text style={{
                position: 'absolute', top: 16, left: 16,
                color: '#fff', fontWeight: 'bold', fontSize: 18,
                backgroundColor: 'rgba(0,0,0,0.6)',
                padding: 10, borderRadius: 8, zIndex: 20,
            }}>
                {exercise.name}
            </Text>

            {/* Back button */}
            <Pressable
                onPress={onExit}
                style={{
                    position: 'absolute', top: 16, right: 16,
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    padding: 10, borderRadius: 8, zIndex: 20,
                }}
            >
                <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 18 }}>
                    ✕
                </Text>
            </Pressable>

            {/* Counter display */}
            {phase === 'exercise' && (
                <View style={{
                    position: 'absolute', top: 16, left: 0, right: 0,
                    alignItems: 'center', zIndex: 20,
                }}>
                    <View style={{
                        backgroundColor: exercise.type === 'timed' && plankActive.current
                            ? 'rgba(34,197,94,0.9)'
                            : 'rgba(0,0,0,0.7)',
                        paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12,
                    }}>
                        <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 28 }}>
                            {exercise.type === 'timed'
                                ? `⏱ ${formatTime(seconds)}`
                                : `🔄 ${reps} reps`
                            }
                        </Text>
                    </View>
                </View>
            )}

            {/* Form feedback messages */}
            {phase === 'exercise' && formFeedback.length > 0 && (
                <View style={{
                    position: 'absolute', bottom: 40, left: 16, right: 16,
                    zIndex: 20,
                }}>
                    {formFeedback.map((msg, idx) => (
                        <View key={idx} style={{
                            backgroundColor: 'rgba(220,38,38,0.9)',
                            borderRadius: 8, padding: 12,
                            marginBottom: 8, flexDirection: 'row',
                            alignItems: 'center',
                        }}>
                            <Text style={{ fontSize: 18, marginRight: 8 }}>⚠️</Text>
                            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 14, flex: 1 }}>
                                {msg}
                            </Text>
                        </View>
                    ))}
                </View>
            )}
        </View>
    );
}