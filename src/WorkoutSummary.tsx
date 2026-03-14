import { Pressable, ScrollView, Text, View } from "react-native";
import { WorkoutResult } from "./WorkoutSession";
import { WorkoutPreset } from "./workouts";

interface Props {
  preset: WorkoutPreset;
  results: WorkoutResult[];
  onClose: () => void;
}

export default function WorkoutSummary({ preset, results, onClose }: Props) {
  const totalSets = results.reduce((acc, r) => acc + r.sets.length, 0);
  const totalReps = results.reduce((acc, r) =>
    acc + r.sets.reduce((s, set) => s + set.repsOrSeconds, 0), 0
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#111' }}>
      {/* Header */}
      <View style={{ backgroundColor: '#16a34a', paddingTop: 60, paddingBottom: 24, paddingHorizontal: 24, alignItems: 'center' }}>
        <Text style={{ fontSize: 40 }}>🏆</Text>
        <Text style={{ color: '#fff', fontSize: 26, fontWeight: 'bold', marginTop: 8 }}>
          Workout Complete!
        </Text>
        <Text style={{ color: '#bbf7d0', fontSize: 16, marginTop: 4 }}>
          {preset.name}
        </Text>
      </View>

      {/* Stats */}
      <View style={{ flexDirection: 'row', padding: 16, gap: 12 }}>
        <View style={{ flex: 1, backgroundColor: '#1f2937', borderRadius: 12, padding: 16, alignItems: 'center' }}>
          <Text style={{ color: '#facc15', fontSize: 28, fontWeight: 'bold' }}>{results.length}</Text>
          <Text style={{ color: '#9ca3af', fontSize: 13 }}>Exercises</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: '#1f2937', borderRadius: 12, padding: 16, alignItems: 'center' }}>
          <Text style={{ color: '#facc15', fontSize: 28, fontWeight: 'bold' }}>{totalSets}</Text>
          <Text style={{ color: '#9ca3af', fontSize: 13 }}>Sets</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: '#1f2937', borderRadius: 12, padding: 16, alignItems: 'center' }}>
          <Text style={{ color: '#facc15', fontSize: 28, fontWeight: 'bold' }}>{totalReps}</Text>
          <Text style={{ color: '#9ca3af', fontSize: 13 }}>Total Reps</Text>
        </View>
      </View>

      {/* Exercise breakdown */}
      <ScrollView style={{ flex: 1, padding: 16 }}>
        {results.map((result, idx) => (
          <View key={idx} style={{ backgroundColor: '#1f2937', borderRadius: 12, padding: 16, marginBottom: 12 }}>
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16, marginBottom: 8 }}>
              {result.exerciseName}
            </Text>
            {result.sets.map((set, sIdx) => {
              const completed = set.repsOrSeconds >= set.target;
              return (
                <View key={sIdx} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  <Text style={{ color: completed ? '#22c55e' : '#ef4444', fontSize: 16, marginRight: 8 }}>
                    {completed ? '✓' : '✗'}
                  </Text>
                  <Text style={{ color: '#9ca3af', fontSize: 14 }}>
                    Set {sIdx + 1}: {set.repsOrSeconds} / {set.target}
                  </Text>
                </View>
              );
            })}
          </View>
        ))}
      </ScrollView>

      <View style={{ padding: 24 }}>
        <Pressable
          onPress={onClose}
          style={{ backgroundColor: '#16a34a', paddingVertical: 16, borderRadius: 14, alignItems: 'center' }}
        >
          <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 18 }}>Done</Text>
        </Pressable>
      </View>
    </View>
  );
}