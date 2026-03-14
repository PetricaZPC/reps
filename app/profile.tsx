import { useNavigation } from "@react-navigation/native";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Dimensions,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { LineChart } from "react-native-chart-kit";
import { auth, db } from "../firebase/firebaseConfig";

interface UserData {
  age: string;
  weight: string;
  height: string;
  sex: string;
  targetWeight: string;
  activityLevel: string;
  goal: string;
  plan?: any;
  progress?: { date: string; weight: number; protein: number }[];
}

export default function Profile() {
  const navigation = useNavigation();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [editing, setEditing] = useState(false);
  const [newProgress, setNewProgress] = useState({ weight: "", protein: "" });

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    const user = auth.currentUser;
    if (user) {
      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setUserData(docSnap.data() as UserData);
      }
    }
  };

  const saveData = async () => {
    const user = auth.currentUser;
    if (user && userData) {
      await updateDoc(doc(db, "users", user.uid), userData as any);
      setEditing(false);
      Alert.alert("Salvat!");
    }
  };

  const addProgress = async () => {
    const user = auth.currentUser;
    if (user && userData) {
      const progress = userData.progress || [];
      progress.push({
        date: new Date().toISOString().split("T")[0],
        weight: parseFloat(newProgress.weight),
        protein: parseFloat(newProgress.protein),
      });
      await updateDoc(doc(db, "users", user.uid), { progress } as any);
      setUserData({ ...userData, progress });
      setNewProgress({ weight: "", protein: "" });
      Alert.alert("Progres adăugat!");
    }
  };

  if (!userData) return <Text>Loading...</Text>;

  const screenWidth = Dimensions.get("window").width;
  const progressData = userData.progress || [];
  const weightData = progressData.map((p) => p.weight);
  const proteinData = progressData.map((p) => p.protein);

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="pt-12 pb-4 px-4 border-b border-gray-200">
        <Text className="text-xl font-bold">Profil</Text>
      </View>
      <View className="px-4 py-4">
        <Text className="text-lg font-bold mb-4">Detalii personale</Text>
        {editing ? (
          <>
            <TextInput
              className="border border-gray-300 rounded px-3 py-2 mb-2"
              placeholder="Vârstă"
              value={userData.age}
              onChangeText={(v) => setUserData({ ...userData, age: v })}
            />
            <TextInput
              className="border border-gray-300 rounded px-3 py-2 mb-2"
              placeholder="Greutate"
              value={userData.weight}
              onChangeText={(v) => setUserData({ ...userData, weight: v })}
            />
            <TextInput
              className="border border-gray-300 rounded px-3 py-2 mb-2"
              placeholder="Înălțime"
              value={userData.height}
              onChangeText={(v) => setUserData({ ...userData, height: v })}
            />
            <TextInput
              className="border border-gray-300 rounded px-3 py-2 mb-2"
              placeholder="Sex"
              value={userData.sex}
              onChangeText={(v) => setUserData({ ...userData, sex: v })}
            />
            <TextInput
              className="border border-gray-300 rounded px-3 py-2 mb-2"
              placeholder="Greutate țintă"
              value={userData.targetWeight}
              onChangeText={(v) =>
                setUserData({ ...userData, targetWeight: v })
              }
            />
            <TextInput
              className="border border-gray-300 rounded px-3 py-2 mb-2"
              placeholder="Nivel activitate"
              value={userData.activityLevel}
              onChangeText={(v) =>
                setUserData({ ...userData, activityLevel: v })
              }
            />
            <TextInput
              className="border border-gray-300 rounded px-3 py-2 mb-4"
              placeholder="Obiectiv"
              value={userData.goal}
              onChangeText={(v) => setUserData({ ...userData, goal: v })}
            />
            <Pressable
              onPress={saveData}
              className="bg-blue-500 px-4 py-2 rounded"
            >
              <Text className="text-white">Salvează</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text>Vârstă: {userData.age}</Text>
            <Text>Greutate: {userData.weight}kg</Text>
            <Text>Înălțime: {userData.height}cm</Text>
            <Text>Sex: {userData.sex}</Text>
            <Text>Greutate țintă: {userData.targetWeight}kg</Text>
            <Text>Nivel activitate: {userData.activityLevel}</Text>
            <Text>Obiectiv: {userData.goal}</Text>
            <Pressable
              onPress={() => setEditing(true)}
              className="bg-blue-500 px-4 py-2 rounded mt-4"
            >
              <Text className="text-white">Editează</Text>
            </Pressable>
          </>
        )}

        <Text className="text-lg font-bold mt-8 mb-4">Plan zilnic</Text>
        {userData.plan && (
          <>
            <Text>Calorii: {userData.plan.dailyCalories}</Text>
            <Text>Proteine: {userData.plan.dailyProtein}g</Text>
            <Text>Carbohidrați: {userData.plan.dailyCarbs}g</Text>
            <Text>Grăsimi: {userData.plan.dailyFat}g</Text>
            <Text>Apă: {userData.plan.dailyWater}ml</Text>
          </>
        )}

        <Text className="text-lg font-bold mt-8 mb-4">Adaugă progres</Text>
        <TextInput
          className="border border-gray-300 rounded px-3 py-2 mb-2"
          placeholder="Greutate (kg)"
          value={newProgress.weight}
          onChangeText={(v) => setNewProgress({ ...newProgress, weight: v })}
        />
        <TextInput
          className="border border-gray-300 rounded px-3 py-2 mb-4"
          placeholder="Proteine consumate (g)"
          value={newProgress.protein}
          onChangeText={(v) => setNewProgress({ ...newProgress, protein: v })}
        />
        <Pressable
          onPress={addProgress}
          className="bg-green-500 px-4 py-2 rounded"
        >
          <Text className="text-white">Adaugă</Text>
        </Pressable>

        <Text className="text-lg font-bold mt-8 mb-4">Statistici</Text>
        {progressData.length > 0 && (
          <>
            <Text>Greutate</Text>
            <LineChart
              data={{
                labels: progressData.map((p) => p.date),
                datasets: [{ data: weightData }],
              }}
              width={screenWidth - 32}
              height={220}
              chartConfig={{
                backgroundColor: "#ffffff",
                backgroundGradientFrom: "#ffffff",
                backgroundGradientTo: "#ffffff",
                decimalPlaces: 1,
                color: (opacity = 1) => `rgba(0, 123, 255, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                style: { borderRadius: 16 },
              }}
              style={{ marginVertical: 8, borderRadius: 16 }}
            />
            <Text>Proteine</Text>
            <LineChart
              data={{
                labels: progressData.map((p) => p.date),
                datasets: [{ data: proteinData }],
              }}
              width={screenWidth - 32}
              height={220}
              chartConfig={{
                backgroundColor: "#ffffff",
                backgroundGradientFrom: "#ffffff",
                backgroundGradientTo: "#ffffff",
                decimalPlaces: 1,
                color: (opacity = 1) => `rgba(0, 255, 0, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                style: { borderRadius: 16 },
              }}
              style={{ marginVertical: 8, borderRadius: 16 }}
            />
          </>
        )}

        <Text className="text-lg font-bold mt-8 mb-4">Cont</Text>
        <Pressable
          onPress={() => auth.signOut()}
          className="bg-red-500 px-4 py-2 rounded"
        >
          <Text className="text-white">Logout</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
