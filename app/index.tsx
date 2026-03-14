import { doc, getDoc, setDoc } from "firebase/firestore";
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
import { passData } from "../src/passData";

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

const EMPTY_USER_DATA: UserData = {
  age: "",
  weight: "",
  height: "",
  sex: "",
  targetWeight: "",
  activityLevel: "",
  goal: "",
  progress: [],
};

export default function Index() {
  const calories = passData((state) => state.calories);
  const protein = passData((state) => state.protein);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [newProgress, setNewProgress] = useState({ weight: "" });

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    setIsProfileLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        setUserData(EMPTY_USER_DATA);
        return;
      }

      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        setUserData({ ...EMPTY_USER_DATA, ...(docSnap.data() as UserData) });
      } else {
        await setDoc(docRef, EMPTY_USER_DATA, { merge: true });
        setUserData(EMPTY_USER_DATA);
      }
    } catch (error) {
      console.log("Error loading user profile:", error);
      setUserData(EMPTY_USER_DATA);
    } finally {
      setIsProfileLoading(false);
    }
  };

  const addProgress = async () => {
    const user = auth.currentUser;
    if (user && userData) {
      const progress = userData.progress || [];
      progress.push({
        date: new Date().toISOString().split("T")[0],
        weight: parseFloat(newProgress.weight),
        protein: 0,
      });
      await setDoc(doc(db, "users", user.uid), { progress } as any, {
        merge: true,
      });
      setUserData({ ...userData, progress });
      setNewProgress({ weight: "" });
      Alert.alert("Progres adăugat!");
    }
  };

  if (isProfileLoading || !userData) return <Text>Loading...</Text>;

  const screenWidth = Dimensions.get("window").width;
  const progressData = userData.progress || [];
  const weightData = progressData.map((p) => p.weight);

  const activityMultiplierMap: Record<string, number> = {
    sedentar: 1.2,
    sedentary: 1.2,
    low: 1.375,
    usor: 1.375,
    light: 1.375,
    moderat: 1.55,
    moderate: 1.55,
    activ: 1.725,
    active: 1.725,
    foarteactiv: 1.9,
    veryactive: 1.9,
  };

  const parseNum = (value?: string) =>
    Number(String(value || "").replace(",", ".")) || 0;

  const age = parseNum(userData.age);
  const weight = parseNum(userData.weight);
  const height = parseNum(userData.height);
  const targetWeight = parseNum(userData.targetWeight);
  const sex = (userData.sex || "").toLowerCase();
  const activityLevelKey = (userData.activityLevel || "")
    .toLowerCase()
    .replace(/\s+/g, "");
  const goal = (userData.goal || "").toLowerCase();

  const bmr =
    age > 0 && weight > 0 && height > 0
      ? sex.startsWith("f")
        ? 10 * weight + 6.25 * height - 5 * age - 161
        : 10 * weight + 6.25 * height - 5 * age + 5
      : 0;

  const activityMultiplier = activityMultiplierMap[activityLevelKey] || 1.55;
  const maintenanceCalories = bmr > 0 ? bmr * activityMultiplier : 0;
  const goalDelta =
    goal.includes("slab") ||
    goal.includes("cut") ||
    (targetWeight > 0 && targetWeight < weight)
      ? -350
      : goal.includes("masa") ||
          goal.includes("bulk") ||
          (targetWeight > 0 && targetWeight > weight)
        ? 300
        : 0;

  const estimatedCalories = Math.max(
    1200,
    Math.round(maintenanceCalories + goalDelta),
  );
  const estimatedProtein = Math.max(60, Math.round((weight || 70) * 1.8));

  const dailyCalorieTarget =
    Number(userData.plan?.dailyCalories) || estimatedCalories;
  const dailyProteinTarget =
    Number(userData.plan?.dailyProtein) || estimatedProtein;

  const caloriePercent =
    dailyCalorieTarget > 0
      ? Math.min((calories / dailyCalorieTarget) * 100, 100)
      : 0;
  const proteinPercent =
    dailyProteinTarget > 0
      ? Math.min((protein / dailyProteinTarget) * 100, 100)
      : 0;

  const streak = (() => {
    if (!progressData.length) return 0;
    const uniqueDates = [...new Set(progressData.map((p) => p.date))]
      .map((d) => new Date(d + "T00:00:00"))
      .sort((a, b) => b.getTime() - a.getTime());

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const latest = uniqueDates[0];
    const starts =
      latest.getTime() === today.getTime() ||
      latest.getTime() === yesterday.getTime();
    if (!starts) return 0;

    let s = 1;
    for (let i = 1; i < uniqueDates.length; i++) {
      const prev = uniqueDates[i - 1];
      const current = uniqueDates[i];
      const diffDays = Math.round(
        (prev.getTime() - current.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (diffDays === 1) s += 1;
      else break;
    }
    return s;
  })();

  return (
    <ScrollView className="flex-1 bg-white">
      <View className="pt-12 pb-4 px-4 border-b border-gray-200">
        <Text className="text-xl font-bold">Profil</Text>
      </View>

      <View className="px-4 py-4">
        <View className="mb-6 rounded border border-gray-200 px-3 py-2">
          <Text className="text-sm text-gray-600">Streak dedicație</Text>
          <Text className="text-lg font-bold">{streak} zile</Text>
        </View>

        <View className="mt-6 rounded border border-gray-200 p-3">
          <Text className="font-semibold mb-2">
            Ținte zilnice (calculate AI)
          </Text>
          <Text>Calorii țintă: {dailyCalorieTarget} kcal</Text>
          <Text>Proteine țintă: {dailyProteinTarget} g</Text>

          <Text className="mt-3 font-medium">Progres alimentar azi</Text>
          <Text>
            Calorii: {Math.round(calories)}/{dailyCalorieTarget} kcal (
            {Math.round(caloriePercent)}%)
          </Text>
          <View className="h-2 bg-gray-200 rounded mt-1 mb-2 overflow-hidden">
            <View
              style={{ width: `${caloriePercent}%` }}
              className="h-2 bg-blue-500"
            />
          </View>

          <Text>
            Proteine: {Math.round(protein)}/{dailyProteinTarget} g (
            {Math.round(proteinPercent)}%)
          </Text>
          <View className="h-2 bg-gray-200 rounded mt-1 overflow-hidden">
            <View
              style={{ width: `${proteinPercent}%` }}
              className="h-2 bg-green-500"
            />
          </View>
        </View>

        <Text className="text-lg font-bold mt-8 mb-4">Cate kg ai azi?</Text>
        <TextInput
          className="border border-gray-300 rounded px-3 py-2 mb-2"
          placeholder="Greutate (kg)"
          value={newProgress.weight}
          onChangeText={(v: string) =>
            setNewProgress({ ...newProgress, weight: v })
          }
        />
        <Pressable
          onPress={addProgress}
          className="bg-green-500 px-4 py-2 rounded mb-4"
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
          </>
        )}
      </View>
    </ScrollView>
  );
}
