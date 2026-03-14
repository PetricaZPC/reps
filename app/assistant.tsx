import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { passData } from "../src/passData";
import { Gemini, extractCalories } from "../src/useGemini";

export default function Assistant() {
  const navigation = useNavigation();
  const scrollViewRef = useRef<ScrollView>(null);
  const [messages, setMessages] = useState([
    {
      from: "ai",
      text: "Salut! Spune-mi ce ai mancat si eu iti voi oferi informatii nutriționale.",
    },
  ]);
  const [userText, getUserText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const addCalories = passData((state) => state.addCalories);
  const addProtein = passData((state) => state.addProtein);
  const addCarbs = passData((state) => state.addCarbs);

  // Daily targets (example values, can be set by user)
  const [caloriesTarget] = useState(2000);
  const [proteinTarget] = useState(150);
  const [carbsTarget] = useState(250);
  const [currentCalories, setCurrentCalories] = useState(0);
  const [currentProtein, setCurrentProtein] = useState(0);
  const [currentCarbs, setCurrentCarbs] = useState(0);
  const [currentVitamins, setCurrentVitamins] = useState<string[]>([]);
  const [currentMinerals, setCurrentMinerals] = useState<string[]>([]);

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages, isTyping]);

  const goBack = () => {
    navigation.goBack();
  };

  const getMessage = async () => {
    if (!userText.trim()) return;
    const input = userText.trim().toLowerCase();
    setMessages((prev) => [...prev, { from: "user", text: userText }]);
    getUserText("");
    setIsTyping(true);
    try {
      let response = "";
      let isRecipe =
        input.includes("retetă") ||
        input.includes("rețetă") ||
        input.includes("recipe");
      let isCalculation =
        input.includes("calorii") ||
        input.includes("protein") ||
        input.includes("carb") ||
        input.includes("vitamin") ||
        input.includes("mineral") ||
        input.includes("calculează") ||
        input.includes("calculate");

      if (isRecipe) {
        // Include targets in prompt
        const recipePrompt = `${userText} Ține cont că targetul zilnic al utilizatorului este ${caloriesTarget} calorii, ${proteinTarget}g proteină și ${carbsTarget}g carbohidrați. Oferă o rețetă care să se încadreze în aceste valori.`;
        response = await Gemini(recipePrompt);
      } else if (isCalculation) {
        response = await Gemini(userText);
        const extracted = extractCalories(response);
        if (extracted) {
          setCurrentCalories((prev) => prev + extracted.calories);
          setCurrentProtein((prev) => prev + extracted.protein);
          setCurrentCarbs((prev) => prev + extracted.carbs);
          addCalories(extracted.calories);
          addProtein(extracted.protein);
          addCarbs(extracted.carbs);

          if (extracted.vitamins.length) {
            setCurrentVitamins((prev) => [
              ...new Set([...prev, ...extracted.vitamins]),
            ]);
          }

          if (extracted.minerals.length) {
            setCurrentMinerals((prev) => [
              ...new Set([...prev, ...extracted.minerals]),
            ]);
          }

          // Add progress message
          const calProgress = Math.min(
            ((currentCalories + extracted.calories) / caloriesTarget) * 100,
            100,
          );
          const protProgress = Math.min(
            ((currentProtein + extracted.protein) / proteinTarget) * 100,
            100,
          );
          const carbProgress = Math.min(
            ((currentCarbs + extracted.carbs) / carbsTarget) * 100,
            100,
          );

          const vitaminsMerged = [
            ...new Set([...currentVitamins, ...extracted.vitamins]),
          ];
          const mineralsMerged = [
            ...new Set([...currentMinerals, ...extracted.minerals]),
          ];

          setMessages((prev) => [
            ...prev,
            { from: "ai", text: response },
            {
              from: "ai",
              text: `Adaugat la target: ${extracted.calories} cal, ${extracted.protein}g prot, ${extracted.carbs}g carb.\nProgres zilnic: Calorii ${Math.round(calProgress)}%, Proteină ${Math.round(protProgress)}%, Carbohidrați ${Math.round(carbProgress)}%.\nVitamine detectate: ${vitaminsMerged.length ? vitaminsMerged.join(", ") : "-"}.\nMinerale detectate: ${mineralsMerged.length ? mineralsMerged.join(", ") : "-"}.`,
            },
          ]);
          setIsTyping(false);
          return;
        }
      } else {
        response =
          "Salut! Sunt asistentul tău nutrițional. Pot să calculez calorii și proteine din alimente sau să îți ofer rețete de mâncare adaptate la targetul tău zilnic. Ce ai dori să facem?";
      }

      setMessages((prev) => [...prev, { from: "ai", text: response }]);

      // For recipes, still extract if possible
      if (isRecipe) {
        const extracted = extractCalories(response);
        if (extracted) {
          setCurrentCalories((prev) => prev + extracted.calories);
          setCurrentProtein((prev) => prev + extracted.protein);
          setCurrentCarbs((prev) => prev + extracted.carbs);
          addCalories(extracted.calories);
          addProtein(extracted.protein);
          addCarbs(extracted.carbs);

          if (extracted.vitamins.length) {
            setCurrentVitamins((prev) => [
              ...new Set([...prev, ...extracted.vitamins]),
            ]);
          }

          if (extracted.minerals.length) {
            setCurrentMinerals((prev) => [
              ...new Set([...prev, ...extracted.minerals]),
            ]);
          }
        }
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          from: "ai",
          text:
            "Error: " +
            (error instanceof Error ? error.message : String(error)),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
    >
      <View className="flex-1 bg-gradient-to-b from-gray-50 to-white">
        {/* Header */}
        <View className="bg-gradient-to-r from-blue-500 to-purple-600 pt-12 pb-4 px-4 flex-row items-center shadow-2xl">
          <Pressable onPress={goBack} className="mr-4">
            <Ionicons name="arrow-back" size={24} color="white" />
          </Pressable>
          <View className="flex-row items-center">
            <View className="w-12 h-12 bg-white rounded-full items-center justify-center mr-3 shadow-2xl">
              <Ionicons name="restaurant" size={22} color="#0095F6" />
            </View>
            <Text className="text-white text-xl font-bold">
              Asistent Nutrițional
            </Text>
          </View>
        </View>

        {/* Chat Messages */}
        <ScrollView
          ref={scrollViewRef}
          className="flex-1 px-4"
          contentContainerStyle={{ paddingVertical: 16 }}
        >
          {messages.map((msg, idx) => (
            <View
              key={idx}
              className={`flex-row mb-6 ${msg.from === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.from === "ai" && (
                <View className="w-12 h-12 bg-gradient-to-br from-gray-300 to-gray-500 rounded-full items-center justify-center mr-3 mt-1 shadow-md">
                  <Ionicons name="chatbubble" size={18} color="white" />
                </View>
              )}
              <View
                className={`rounded-3xl px-5 py-4 max-w-xs shadow-2xl ${
                  msg.from === "user"
                    ? "bg-gradient-to-r from-blue-500 to-blue-700 self-end"
                    : "bg-white border border-gray-200 self-start"
                }`}
              >
                <Text
                  className={`text-base leading-6 ${
                    msg.from === "user"
                      ? "text-white font-semibold"
                      : "text-gray-900 font-medium"
                  }`}
                >
                  {msg.text}
                </Text>
              </View>
              {msg.from === "user" && (
                <View className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full items-center justify-center ml-3 mt-1 shadow-md">
                  <Ionicons name="person" size={18} color="white" />
                </View>
              )}
            </View>
          ))}
          {isTyping && (
            <View className="flex-row mb-6 justify-start">
              <View className="w-12 h-12 bg-gradient-to-br from-gray-300 to-gray-500 rounded-full items-center justify-center mr-3 mt-1 shadow-md">
                <Ionicons name="chatbubble" size={18} color="white" />
              </View>
              <View className="bg-white border border-gray-200 rounded-3xl px-5 py-4 shadow-2xl">
                <View className="flex-row">
                  <View className="w-3 h-3 bg-blue-400 rounded-full mr-2 animate-pulse" />
                  <View className="w-3 h-3 bg-blue-400 rounded-full mr-2 animate-pulse" />
                  <View className="w-3 h-3 bg-blue-400 rounded-full animate-pulse" />
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input Area */}
        <View className="bg-gradient-to-t from-gray-100 to-white border-t border-gray-300 px-4 py-4 shadow-2xl">
          <View className="flex-row items-end">
            <TextInput
              className="flex-1 border border-gray-400 rounded-3xl px-5 py-4 min-h-12 max-h-32 bg-white text-gray-900 text-base shadow-2xl"
              placeholder="Scrie un mesaj..."
              placeholderTextColor="#6b7280"
              value={userText}
              multiline={true}
              numberOfLines={3}
              textAlignVertical="top"
              onChangeText={getUserText}
            />
            <Pressable
              onPress={getMessage}
              disabled={!userText.trim() || isTyping}
              className={`ml-4 w-14 h-14 rounded-full items-center justify-center shadow-2xl ${
                !userText.trim() || isTyping
                  ? "bg-gray-400"
                  : "bg-gradient-to-r from-blue-500 to-purple-600"
              }`}
            >
              <Ionicons
                name="send"
                size={22}
                color={!userText.trim() || isTyping ? "#9ca3af" : "white"}
              />
            </Pressable>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
