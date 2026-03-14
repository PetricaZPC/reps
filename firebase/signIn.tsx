import { useNavigation } from "@react-navigation/native";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Gemini } from "../src/useGemini";
import { auth, db } from "./firebaseConfig";

export default function SignIn() {
  const navigation = useNavigation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const [userData, setUserData] = useState({
    age: "",
    weight: "",
    height: "",
    sex: "",
    targetWeight: "",
    activityLevel: "",
    goal: "",
  });

  const submitQuestionnaire = async () => {
    try {
      const prompt = `Bazat pe datele utilizatorului: vârstă ${userData.age}, greutate ${userData.weight}kg, înălțime ${userData.height}cm, sex ${userData.sex}, greutate țintă ${userData.targetWeight}kg, nivel activitate ${userData.activityLevel}, obiectiv ${userData.goal}. Generează un plan zilnic de nutriție: calorii, proteine, carbohidrați, grăsimi, apă. Returnează JSON cu: dailyCalories, dailyProtein, dailyCarbs, dailyFat, dailyWater.`;
      const response = await Gemini(prompt);
      const plan = JSON.parse(
        response
          .replace(/```json/g, "")
          .replace(/```/g, "")
          .trim(),
      );

      const user = auth.currentUser;
      if (user) {
        await setDoc(doc(db, "users", user.uid), {
          ...userData,
          plan,
          createdAt: new Date(),
        });
      }

      setShowQuestionnaire(false);
      Alert.alert("Plan generat!", "Poți accesa aplicația acum.");
    } catch (error) {
      Alert.alert("Eroare", "Nu s-a putut genera planul.");
    }
  };

  const handleAuth = async () => {
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        Alert.alert("Login successful!");
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
        setShowQuestionnaire(true);
      }
    } catch (error: any) {
      Alert.alert("Error", error.message);
    }
  };

  return (
    <View className="flex-1 justify-center items-center bg-white p-5">
      <Text className="text-2xl font-bold mb-4">
        {isLogin ? "Login" : "Sign Up"}
      </Text>

      <TextInput
        className="w-full border border-gray-300 rounded-lg px-4 py-3 mb-4"
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        className="w-full border border-gray-300 rounded-lg px-4 py-3 mb-6"
        placeholder="Parolă"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity
        onPress={handleAuth}
        className="bg-blue-500 w-full py-3 rounded-lg mb-4"
      >
        <Text className="text-white text-center font-semibold text-base">
          {isLogin ? "Login" : "Creează Cont"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
        <Text className="text-blue-500">
          {isLogin ? "Nu ai cont? Creează unul" : "Ai deja cont? Login"}
        </Text>
      </TouchableOpacity>

      <Modal
        visible={showQuestionnaire}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View className="flex-1 bg-white">
          <View className="pt-12 pb-4 px-4 border-b border-gray-200">
            <Text className="text-xl font-bold text-center">
              Completează Profilul
            </Text>
          </View>
          <ScrollView className="flex-1 px-4 py-8">
            <TextInput
              className="border border-gray-300 rounded-lg px-4 py-3 mb-4"
              placeholder="Vârsta (ani)"
              value={userData.age}
              onChangeText={(value) => setUserData({ ...userData, age: value })}
              keyboardType="numeric"
            />
            <TextInput
              className="border border-gray-300 rounded-lg px-4 py-3 mb-4"
              placeholder="Greutatea actuală (kg)"
              value={userData.weight}
              onChangeText={(value) =>
                setUserData({ ...userData, weight: value })
              }
              keyboardType="numeric"
            />
            <TextInput
              className="border border-gray-300 rounded-lg px-4 py-3 mb-4"
              placeholder="Înălțimea (cm)"
              value={userData.height}
              onChangeText={(value) =>
                setUserData({ ...userData, height: value })
              }
              keyboardType="numeric"
            />
            <TextInput
              className="border border-gray-300 rounded-lg px-4 py-3 mb-4"
              placeholder="Sexul (M/F)"
              value={userData.sex}
              onChangeText={(value) => setUserData({ ...userData, sex: value })}
            />
            <TextInput
              className="border border-gray-300 rounded-lg px-4 py-3 mb-4"
              placeholder="Greutatea țintă (kg)"
              value={userData.targetWeight}
              onChangeText={(value) =>
                setUserData({ ...userData, targetWeight: value })
              }
              keyboardType="numeric"
            />
            <TextInput
              className="border border-gray-300 rounded-lg px-4 py-3 mb-4"
              placeholder="Nivelul de activitate (sedentar, moderat, activ)"
              value={userData.activityLevel}
              onChangeText={(value) =>
                setUserData({ ...userData, activityLevel: value })
              }
            />
            <TextInput
              className="border border-gray-300 rounded-lg px-4 py-3 mb-4"
              placeholder="Obiectiv (slăbire, menținere, creștere musculară)"
              value={userData.goal}
              onChangeText={(value) =>
                setUserData({ ...userData, goal: value })
              }
            />
            <Pressable
              onPress={submitQuestionnaire}
              className="bg-blue-500 py-3 rounded-lg mt-6"
            >
              <Text className="text-white text-center font-semibold">
                Generează Planul Nutrițional
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}
