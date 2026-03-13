import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  User,
} from "firebase/auth";
import { useEffect, useState } from "react";
import { Alert, Text, TextInput, TouchableOpacity, View } from "react-native";
import { auth } from "./firebaseConfig";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return unsubscribe;
  }, []);

  const handleAuth = async () => {
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        Alert.alert("Login successful!");
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
        Alert.alert("Account created successfully!");
      }
    } catch (error: any) {
      Alert.alert("Error", error.message);
    }
  };

  if (user) {
    return (
      <View className="flex-1 justify-center items-center bg-white p-5">
        <Text className="text-2xl font-bold mb-4">Welcome,</Text>
        <Text className="text-base mb-2">{user.email}</Text>
        <TouchableOpacity
          onPress={() => auth.signOut()}
          className="bg-red-500 px-8 py-3 rounded-lg mt-4"
        >
          <Text className="text-white font-semibold">Logout</Text>
        </TouchableOpacity>
      </View>
    );
  }

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
    </View>
  );
}
