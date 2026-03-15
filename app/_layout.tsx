import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { onAuthStateChanged, User } from "firebase/auth";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { auth } from "../firebase/firebaseConfig";
import SignIn from "../firebase/signIn";
import { loadTodayNutrition } from "../src/nutritionPersistence";
import { passData } from "../src/passData";
import "./globals.css";

export default function TabLayout() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const setTotals = passData((state) => state.setTotals);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsLoading(false);

      if (!currentUser) {
        setTotals({ calories: 0, protein: 0, carbs: 0 });
        return;
      }

      loadTodayNutrition(currentUser.uid)
        .then((totals) => {
          if (!totals) {
            setTotals({ calories: 0, protein: 0, carbs: 0 });
            return;
          }
          setTotals(totals);
        })
        .catch(() => {
          setTotals({ calories: 0, protein: 0, carbs: 0 });
        });
    });

    return unsubscribe;
  }, [setTotals]);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!user) {
    return <SignIn />;
  }

  return (
    <SafeAreaProvider>
      <Tabs initialRouteName="profile">
        <Tabs.Screen
          name="workout"
          options={{
            title: "Workout",
            headerShown: false,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="barbell-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="assistant"
          options={{
            title: "Assistant",
            headerShown: false,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="chatbubbles-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="index"
          options={{
            href: null,
            headerShown: false,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
            headerShown: false,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: "Settings",
            headerShown: false,
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="settings-outline" size={size} color={color} />
            ),
          }}
        />
      </Tabs>
    </SafeAreaProvider>
  );
}
