import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Camera from '../src/Camera';
import { EXERCISES, ExerciseConfig } from '../src/exercises';

export default function Workout() {
  const [selectedExercise, setSelectedExercise] = useState<ExerciseConfig | null>(null);

  if (selectedExercise == null) {
    return (
      <View className="flex-1 justify-center items-center">
        <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 32, color: '#111' }}>
          Choose Exercise
        </Text>
        {Object.keys(EXERCISES).map((key) => (
          <Pressable
            key={key}
            onPress={() => setSelectedExercise(EXERCISES[key])}
            style={{
              backgroundColor: '#16a34a',
              paddingHorizontal: 32, paddingVertical: 14,
              borderRadius: 12, marginBottom: 12, width: 260, alignItems: 'center',
            }}
          >
            <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>
              {EXERCISES[key].name}
            </Text>
          </Pressable>
        ))}
      </View>
    );
  }

  return (
    <View className="flex-1">
      <Camera
        exercise={selectedExercise}
        onExit={() => setSelectedExercise(null)}
      />
    </View>
  );
}