import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Camera from '../src/Camera';
import { EXERCISES, ExerciseConfig } from '../src/exercises';

export default function Workout() {

  const [selectedExercise, setSelectedExercise] = useState<ExerciseConfig | null>(null);

  if(selectedExercise == null) {
    return(
      <View className="flex items-center m-auto">
        {Object.keys(EXERCISES).map((key) => (
          <Pressable
            key={key}
            className="border-2 border-black p-2 mb-4"
            onPress={() => setSelectedExercise(EXERCISES[key])}
          >
            <Text>{EXERCISES[key].name}</Text>
          </Pressable>
        ))}
      </View>
    )
  }
  else {
    return (
      <View className="flex-1">
        <Camera exercise={selectedExercise} />
      </View>
    );
  }
  
}