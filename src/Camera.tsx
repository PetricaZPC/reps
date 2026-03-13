import { RNMediapipe } from '@thinksys/react-native-mediapipe';
import { useCameraPermissions } from 'expo-camera';
import { useRef, useState } from 'react';
import { Dimensions, Pressable, Text, View } from 'react-native';
import { ExerciseConfig, Point, calculateAngle, landmarkIndexMap } from './exercises';

const { width, height } = Dimensions.get('window');

interface CameraProps {
  exercise: ExerciseConfig;
}

export default function Camera({ exercise }: CameraProps) {
    const [permission, requestPermission] = useCameraPermissions();
    const [reps, setReps] = useState(0);
    const upPosRef = useRef(false);
    const repsRef = useRef(0);
    const lastLogTime = useRef(0);

    const handleLandmark = (landmarks: any) => {
        const now = Date.now();
        let landmarkArray: Point[] | undefined = undefined;

        if (Array.isArray(landmarks.worldLandmarks) && landmarks.worldLandmarks.length > 0) {
            landmarkArray = landmarks.worldLandmarks;
        } else if (Array.isArray(landmarks.landmarks) && landmarks.landmarks.length > 0) {
            landmarkArray = landmarks.landmarks;
        }

        if (!landmarkArray || landmarkArray.length === 0) {
            return;
        }

        // Transform array în obiect cu chei
        const landmarkObj: Record<string, any> = {};
        Object.entries(landmarkIndexMap).forEach(([name, idx]) => {
            landmarkObj[name] = landmarkArray![idx];
        });

        // Extrage punctele după nume
        const points = exercise.landmarks.map(name => landmarkObj[name]);

        // LOG MEREU (nu doar la 500ms) ca să vedem ce se întâmplă
        if (now - lastLogTime.current > 1000) {
            lastLogTime.current = now;
            console.log('--- DEBUG ---');
            console.log('exercise.landmarks:', exercise.landmarks);
            console.log('points:', JSON.stringify(points));
            console.log('upPosRef:', upPosRef.current);
            console.log('reps:', repsRef.current);
            
            if (points.length === 3 && points.every((p: any) => p && typeof p.x === 'number')) {
                const angle = calculateAngle(points[0], points[1], points[2]);
                console.log('Angle:', angle, '| min:', exercise.minAngle, '| max:', exercise.maxAngle);
            } else {
                console.log('POINTS INVALIDE - nu pot calcula unghiul');
                console.log('landmarkObj keys:', Object.keys(landmarkObj));
            }
        }

        if (points.length === 3 && points.every((p: any) => p && typeof p.x === 'number')) {
            const angle = calculateAngle(points[0], points[1], points[2]);

            if (angle > exercise.maxAngle && !upPosRef.current) {
                upPosRef.current = true;
                console.log('UP, angle:', angle);
            }

            if (angle < exercise.minAngle && upPosRef.current) {
                upPosRef.current = false;
                repsRef.current += 1;
                setReps(repsRef.current);
                console.log('REP:', repsRef.current);
            }
        }
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
                <Pressable
                    onPress={requestPermission}
                    className="bg-blue-600 px-6 py-3 rounded-md"
                >
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
            <Text style={{
                position: 'absolute', top: 16, left: 16,
                color: 'white', fontWeight: 'bold', fontSize: 20,
                backgroundColor: 'rgba(0,0,0,0.5)', padding: 8, borderRadius: 8, zIndex: 20
            }}>
                {exercise.name}
            </Text>
            <Text style={{
                position: 'absolute', top: 56, left: 16,
                color: 'white', fontWeight: 'bold', fontSize: 20,
                backgroundColor: 'rgba(0,0,0,0.5)', padding: 8, borderRadius: 8, zIndex: 20
            }}>
                Repetitii: {reps}
            </Text>
        </View>
    );
}