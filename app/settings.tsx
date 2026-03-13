import { Text, TouchableOpacity, View } from "react-native";
import { auth } from "../firebase/firebaseConfig";

export default function Settings() {
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="mb-4 text-base">Settings</Text>
      <TouchableOpacity
        onPress={() => auth.signOut()}
        className="rounded-lg bg-red-500 px-6 py-3"
      >
        <Text className="font-semibold text-white">Logout</Text>
      </TouchableOpacity>
    </View>
  );
}
