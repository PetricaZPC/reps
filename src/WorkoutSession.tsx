import { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Camera from "./Camera";
import { EXERCISES, ExerciseConfig } from "./exercises";
import { WorkoutPreset } from "./workoutPresets";

const getRestBetweenSets = (muscleGroup: string, exerciseKey: string): number => {
  if (exerciseKey === 'calfRaises') return 90;
  switch (muscleGroup) {
    case 'chest':
    case 'back':
    case 'legs':
      return 120;
    case 'arms':
    case 'shoulders':
    case 'fullbody':
    case 'cardio':
      return 90;
    case 'core':
      return 60;
    default:
      return 90;
  }
};

const getSets = (difficulty: string): number => {
  switch (difficulty) {
    case 'beginner': return 2;
    case 'intermediate': return 3;
    case 'advanced': return 4;
    default: return 3;
  }
};

const getTarget = (exercise: ExerciseConfig, difficulty: string): number => {
  if (exercise.type === 'timed') {
    switch (difficulty) {
      case 'beginner': return 20;
      case 'intermediate': return 30;
      case 'advanced': return 45;
      default: return 30;
    }
  } else {
    switch (difficulty) {
      case 'beginner': return 8;
      case 'intermediate': return 12;
      case 'advanced': return 15;
      default: return 10;
    }
  }
};

export interface WorkoutResult {
  exerciseKey: string;
  exerciseName: string;
  sets: { repsOrSeconds: number; target: number }[];
}

interface Props {
  preset: WorkoutPreset;
  customRestTime?: number;
  onFinish: (results: WorkoutResult[]) => void;
  onExit: () => void;
}

type Phase = 'exercise' | 'rest_between_sets' | 'rest_between_exercises';

export default function WorkoutSession({ preset, customRestTime, onFinish, onExit }: Props) {
  const totalSets = getSets(preset.difficulty);
  const exerciseKeys = preset.exercises;

  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [setIndex, setSetIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('exercise');
  const [restCountdown, setRestCountdown] = useState(0);
  const [results, setResults] = useState<WorkoutResult[]>([]);
  const [currentSetReps, setCurrentSetReps] = useState(0);
  const [currentSetSeconds, setCurrentSetSeconds] = useState(0);

  const restIntervalRef = useRef<any>(null);
  const resultsRef = useRef<WorkoutResult[]>([]);

  const currentKey = exerciseKeys[exerciseIndex];
  const currentExercise = EXERCISES[currentKey];
  const target = getTarget(currentExercise, preset.difficulty);
  const isLastSet = setIndex === totalSets - 1;
  const isLastExercise = exerciseIndex === exerciseKeys.length - 1;

  useEffect(() => {
    return () => { if (restIntervalRef.current) clearInterval(restIntervalRef.current); };
  }, []);

  const startRest = (seconds: number, nextPhase: () => void) => {
    setRestCountdown(seconds);
    restIntervalRef.current = setInterval(() => {
      setRestCountdown(prev => {
        if (prev <= 1) {
          clearInterval(restIntervalRef.current);
          nextPhase();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const saveSetResult = (value: number) => {
    const setResult = { repsOrSeconds: value, target };
    const existing = resultsRef.current.find(r => r.exerciseKey === currentKey);
    if (existing) {
      existing.sets.push(setResult);
    } else {
      resultsRef.current.push({
        exerciseKey: currentKey,
        exerciseName: currentExercise.name,
        sets: [setResult],
      });
    }
    setResults([...resultsRef.current]);
  };

  const handleRepsUpdate = (reps: number) => {
    setCurrentSetReps(reps);
    if (currentExercise.type === 'reps' && reps >= target) {
      completeSet(reps);
    }
  };

  const handleSecondsUpdate = (seconds: number) => {
    setCurrentSetSeconds(seconds);
    if (currentExercise.type === 'timed' && seconds >= target) {
      completeSet(seconds);
    }
  };

  const completeSet = (value: number) => {
    saveSetResult(value);

    if (isLastSet) {
      if (isLastExercise) {
        onFinish(resultsRef.current);
      } else {
        const restTime = customRestTime ?? 120;
        setPhase('rest_between_exercises');
        startRest(restTime, () => {
          setExerciseIndex(prev => prev + 1);
          setSetIndex(0);
          setCurrentSetReps(0);
          setCurrentSetSeconds(0);
          setPhase('exercise');
        });
      }
    } else {
      const restTime = getRestBetweenSets(currentExercise.muscleGroup, currentKey);
      setPhase('rest_between_sets');
      startRest(restTime, () => {
        setSetIndex(prev => prev + 1);
        setCurrentSetReps(0);
        setCurrentSetSeconds(0);
        setPhase('exercise');
      });
    }
  };

  const skipCurrentSet = () => {
    completeSet(currentExercise.type === 'reps' ? currentSetReps : currentSetSeconds);
  };

  const skipRest = () => {
    if (restIntervalRef.current) clearInterval(restIntervalRef.current);
    if (phase === 'rest_between_sets') {
      setSetIndex(prev => prev + 1);
      setCurrentSetReps(0);
      setCurrentSetSeconds(0);
      setPhase('exercise');
    } else {
      setExerciseIndex(prev => prev + 1);
      setSetIndex(0);
      setCurrentSetReps(0);
      setCurrentSetSeconds(0);
      setPhase('exercise');
    }
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const progressPercent = ((exerciseIndex * totalSets + setIndex) / (exerciseKeys.length * totalSets)) * 100;

  if (phase === 'rest_between_sets' || phase === 'rest_between_exercises') {
    const isBetweenExercises = phase === 'rest_between_exercises';
    const nextKey = isBetweenExercises ? exerciseKeys[exerciseIndex + 1] : currentKey;
    const nextExercise = EXERCISES[nextKey];

    return (
      <View style={{ flex: 1, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, backgroundColor: '#333' }}>
          <View style={{ width: `${progressPercent}%`, height: 4, backgroundColor: '#22c55e' }} />
        </View>

        <Text style={{ color: '#9ca3af', fontSize: 16, marginBottom: 8 }}>
          {isBetweenExercises ? 'Rest between exercises' : 'Rest between sets'}
        </Text>

        <Text style={{ color: '#facc15', fontSize: 100, fontWeight: 'bold', lineHeight: 110 }}>
          {formatTime(restCountdown)}
        </Text>

        {isBetweenExercises && (
          <View style={{ marginTop: 32, alignItems: 'center' }}>
            <Text style={{ color: '#6b7280', fontSize: 14, marginBottom: 8 }}>Next up</Text>
            <Text style={{ color: '#fff', fontSize: 22, fontWeight: 'bold' }}>
              {nextExercise?.name}
            </Text>
            <Text style={{ color: '#9ca3af', fontSize: 14, marginTop: 4 }}>
              {totalSets} sets × {target} {nextExercise?.type === 'timed' ? 'sec' : 'reps'}
            </Text>
          </View>
        )}

        {!isBetweenExercises && (
          <View style={{ marginTop: 32, alignItems: 'center' }}>
            <Text style={{ color: '#6b7280', fontSize: 14, marginBottom: 8 }}>
              Set {setIndex + 2} of {totalSets}
            </Text>
            <Text style={{ color: '#fff', fontSize: 22, fontWeight: 'bold' }}>
              {currentExercise.name}
            </Text>
          </View>
        )}

        <Pressable
          onPress={skipRest}
          style={{ marginTop: 40, backgroundColor: '#16a34a', paddingHorizontal: 40, paddingVertical: 14, borderRadius: 12 }}
        >
          <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Skip Rest →</Text>
        </Pressable>

        <Pressable
          onPress={onExit}
          style={{ marginTop: 16, paddingHorizontal: 40, paddingVertical: 12 }}
        >
          <Text style={{ color: '#ef4444', fontSize: 14 }}>End Workout</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      <Camera
        exercise={currentExercise}
        onExit={onExit}
        onRepsUpdate={handleRepsUpdate}
        onSecondsUpdate={handleSecondsUpdate}
        workoutMode={true}
      />

      {/* Progress bar */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 50 }}>
        <View style={{ width: `${progressPercent}%`, height: 4, backgroundColor: '#22c55e' }} />
      </View>

      {/* Workout info overlay */}
      <View style={{
        position: 'absolute', top: 8, left: 0, right: 0,
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', paddingHorizontal: 16, zIndex: 40,
      }}>
        <View style={{ backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 10, padding: 10, flex: 1, marginRight: 8 }}>
          <Text style={{ color: '#9ca3af', fontSize: 11 }}>
            Exercise {exerciseIndex + 1}/{exerciseKeys.length} · Set {setIndex + 1}/{totalSets}
          </Text>
          <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>
            {currentExercise.name}
          </Text>
        </View>

        <View style={{ backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 10, padding: 10, alignItems: 'center', minWidth: 80 }}>
          <Text style={{ color: '#facc15', fontWeight: 'bold', fontSize: 24 }}>
            {currentExercise.type === 'timed'
              ? formatTime(currentSetSeconds)
              : currentSetReps
            }
          </Text>
          <Text style={{ color: '#6b7280', fontSize: 11 }}>
            / {currentExercise.type === 'timed' ? formatTime(target) : `${target} reps`}
          </Text>
        </View>
      </View>

      {/* Butoane jos */}
      <View style={{
        position: 'absolute', bottom: 40, left: 16, right: 16,
        flexDirection: 'row', justifyContent: 'space-between', zIndex: 40,
      }}>
        <Pressable
          onPress={onExit}
          style={{ backgroundColor: 'rgba(220,38,38,0.8)', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10 }}
        >
          <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 }}>End Workout</Text>
        </Pressable>

        <Pressable
          onPress={skipCurrentSet}
          style={{ backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 10 }}
        >
          <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 }}>Skip Set →</Text>
        </Pressable>
      </View>
    </View>
  );
}