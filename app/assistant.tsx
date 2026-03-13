import { addDoc, collection } from "firebase/firestore";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { auth, db } from "../firebase/firebaseConfig";
import { passData } from "../src/passData";
import { Gemini, extractCalories } from "../src/useGemini";

export default function Assistant() {
  const [aiText, getAiText] = useState("");
  const [userText, getUserText] = useState("");
  const addCalories = passData((state) => state.addCalories);

  const getMessage = async () => {
    try {
      console.log("Sending message:", userText);
      const response = await Gemini(userText);
      console.log("Gemini response:", response);
      getAiText(response);
      const calories = extractCalories(response);
      addCalories(calories);

      // Salvează automat în Firestore
      let nutritionData = null;
      try {
        const textCuratat = response
          .replace(/```json/g, "")
          .replace(/```/g, "")
          .trim();
        nutritionData = JSON.parse(textCuratat);
      } catch (e) {
        // nu salvezi dacă AI nu returnează JSON valid
        return;
      }
      const user = auth.currentUser;
      if (!user) return;
      const items = Array.isArray(nutritionData)
        ? nutritionData
        : [nutritionData];
      await addDoc(collection(db, "nutrition"), {
        email: user.email,
        food: items,
        date: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error in getMessage:", error);
      getAiText(
        "Error: " + (error instanceof Error ? error.message : String(error)),
      );
    }
  };

  return (
    <View className="flex-1 p-4 bg-white">
      <TextInput
        className="mt-12 border-2 border-gray-400 w-full p-2 min-h-20 max-h-60 color-black"
        placeholder="AI response will appear here"
        value={aiText}
        multiline={true}
        numberOfLines={4}
        textAlignVertical="top"
        editable={false}
      />
      <TextInput
        className="mt-2 border-2 border-gray-400 w-full p-2 min-h-20 max-h-40"
        placeholder="enter your text here"
        value={userText}
        multiline={true}
        numberOfLines={4}
        textAlignVertical="top"
        onChangeText={getUserText}
      />
      <Pressable
        onPress={getMessage}
        disabled={!userText.trim()}
        className={`h-12 mt-4 justify-center rounded-md ${!userText.trim() ? "bg-gray-400" : "bg-blue-700"}`}
      >
        <Text className="text-white text-center font-bold">Send</Text>
      </Pressable>
    </View>
  );
}
