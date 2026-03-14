import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { doc, getDoc } from "firebase/firestore";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { auth, db } from "../firebase/firebaseConfig";
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

  const [caloriesTarget, setCaloriesTarget] = useState(2000);
  const [proteinTarget, setProteinTarget] = useState(150);
  const [carbsTarget, setCarbsTarget] = useState(250);
  const [currentCalories, setCurrentCalories] = useState(0);
  const [currentProtein, setCurrentProtein] = useState(0);
  const [currentCarbs, setCurrentCarbs] = useState(0);
  const [currentVitamins, setCurrentVitamins] = useState<string[]>([]);
  const [currentMinerals, setCurrentMinerals] = useState<string[]>([]);

  useEffect(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, [messages, isTyping]);

  const loadTargets = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      const snap = await getDoc(doc(db, "users", user.uid));
      if (!snap.exists()) return;
      const data = snap.data() as any;
      const dailyCalories = Number(data?.plan?.dailyCalories);
      const dailyProtein = Number(data?.plan?.dailyProtein);
      const dailyCarbs = Number(data?.plan?.dailyCarbs);

      if (!Number.isNaN(dailyCalories) && dailyCalories > 0) {
        setCaloriesTarget(dailyCalories);
      }
      if (!Number.isNaN(dailyProtein) && dailyProtein > 0) {
        setProteinTarget(dailyProtein);
      }
      if (!Number.isNaN(dailyCarbs) && dailyCarbs > 0) {
        setCarbsTarget(dailyCarbs);
      }
    } catch {
      // keep default targets
    }
  }, []);

  useEffect(() => {
    loadTargets();
  }, [loadTargets]);

  useFocusEffect(
    useCallback(() => {
      loadTargets();
    }, [loadTargets]),
  );

  const goBack = () => {
    navigation.goBack();
  };

  const buildNutritionPrompt = (inputText: string) =>
    `Ești expert în nutriție. Analizează mâncarea descrisă mai jos și răspunde DOAR cu JSON valid, fără text extra, fără markdown, fără blocuri de cod.
Schema JSON:
{
  "items": [
    {
      "nume_aliment": "string",
      "calorii": number,
      "carbohidrati": number,
      "proteine": number,
      "vitamine": ["string"],
      "minerale": ["string"]
    }
  ]
}
Dacă lipsesc cantități, estimează porții uzuale.
Input utilizator: ${inputText}`;

  const buildMealPlanPrompt = (inputText: string) =>
    `Ești asistent de nutriție sportivă. Creează un plan alimentar pentru azi care să ajute utilizatorul să își atingă targetul zilnic.
Target utilizator: ${caloriesTarget} kcal, ${proteinTarget} g proteine, ${carbsTarget} g carbohidrați.
Constrângeri/cerințe utilizator: ${inputText}

Răspunde în română, clar și practic, cu:
1) mese pe ore (mic dejun, prânz, cină + gustări)
2) cantități aproximative
3) total estimat calorii/proteine/carbohidrați
4) sfaturi scurte de ajustare dacă rămâne sub/peste target.`;

  const isOnTopic = (text: string) => {
    const topicKeywords = [
      "manc",
      "mânc",
      "aliment",
      "nutri",
      "calor",
      "protein",
      "carb",
      "grăsim",
      "grasim",
      "vitamin",
      "mineral",
      "retet",
      "rețet",
      "recipe",
      "plan alimentar",
      "meal plan",
      "meniu",
      "masa",
      "slab",
      "bulk",
      "deficit",
      "surplus",
      "bmi",
      "sport",
      "antren",
      "workout",
      "fitness",
    ];
    return topicKeywords.some((k) => text.includes(k));
  };

  const isMealPlanRequest = (text: string) => {
    const mealPlanKeywords = [
      "plan alimentar",
      "plan de mese",
      "meal plan",
      "meniu",
      "ce sa mananc",
      "ce să mănânc",
      "ce mananc azi",
      "ce mănânc azi",
      "ating target",
      "ating obiectiv",
      "plan pe azi",
    ];
    return mealPlanKeywords.some((k) => text.includes(k));
  };

  const isNutritionLogRequest = (text: string) => {
    const nutritionKeywords = [
      "am mancat",
      "am mâncat",
      "am baut",
      "am băut",
      "calculeaza",
      "calculează",
      "calorii",
      "proteine",
      "carbo",
      "macros",
      "macro",
      "kcal",
      "gram",
      "g ",
    ];
    return nutritionKeywords.some((k) => text.includes(k));
  };

  const getMessage = async () => {
    if (!userText.trim()) return;
    const input = userText.trim().toLowerCase();
    setMessages((prev) => [...prev, { from: "user", text: userText }]);
    getUserText("");
    setIsTyping(true);
    try {
      const isRecipe =
        input.includes("retetă") ||
        input.includes("rețetă") ||
        input.includes("recipe");

      const mealPlanRequested = isMealPlanRequest(input);
      const nutritionLogRequested = isNutritionLogRequest(input);
      const onTopic = isOnTopic(input);

      if (!onTopic) {
        setMessages((prev) => [
          ...prev,
          {
            from: "ai",
            text: "Sunt specializat pe nutriție și sport (calorii, macro-uri, plan alimentar, rețete, recomandări pentru obiectiv). Pentru alt subiect nu sunt cel mai potrivit asistent.",
          },
        ]);
        return;
      }

      if (mealPlanRequested) {
        const mealPlanResponse = await Gemini(buildMealPlanPrompt(userText));
        setMessages((prev) => [...prev, { from: "ai", text: mealPlanResponse }]);
        return;
      }

      if (isRecipe) {
        const recipePrompt = `${userText} Ține cont că targetul zilnic al utilizatorului este ${caloriesTarget} calorii, ${proteinTarget}g proteină și ${carbsTarget}g carbohidrați. Oferă o rețetă care să se încadreze în aceste valori.`;
        const response = await Gemini(recipePrompt);
        setMessages((prev) => [...prev, { from: "ai", text: response }]);
        return;
      }

      if (!nutritionLogRequested) {
        setMessages((prev) => [
          ...prev,
          {
            from: "ai",
            text: "Te pot ajuta cu nutriție/sport. Dacă vrei calcul, scrie ce ai mâncat + cantitatea (ex: 200g pui, 150g orez). Dacă vrei plan, spune «fă-mi un plan alimentar pentru azi».",
          },
        ]);
        return;
      }

      const response = await Gemini(buildNutritionPrompt(userText));
      const extracted = extractCalories(response);

      const hasNutritionData =
        extracted.calories > 0 ||
        extracted.protein > 0 ||
        extracted.carbs > 0 ||
        extracted.vitamins.length > 0 ||
        extracted.minerals.length > 0;

      if (!hasNutritionData) {
        setMessages((prev) => [
          ...prev,
          {
            from: "ai",
            text: "Nu am putut estima valorile nutriționale din mesaj. Încearcă să scrii alimentul + cantitatea (ex: 200g piept de pui, 1 banană, 2 ouă).",
          },
        ]);
        return;
      } else {
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

      const nextCalories = currentCalories + extracted.calories;
      const nextProtein = currentProtein + extracted.protein;
      const nextCarbs = currentCarbs + extracted.carbs;

      const calProgress = Math.min((nextCalories / caloriesTarget) * 100, 100);
      const protProgress = Math.min((nextProtein / proteinTarget) * 100, 100);
      const carbProgress = Math.min((nextCarbs / carbsTarget) * 100, 100);

      const vitaminsMerged = [
        ...new Set([...currentVitamins, ...extracted.vitamins]),
      ];
      const mineralsMerged = [
        ...new Set([...currentMinerals, ...extracted.minerals]),
      ];

      setMessages((prev) => [
        ...prev,
        {
          from: "ai",
          text: `Adăugat la target: ${extracted.calories} cal, ${extracted.protein}g prot, ${extracted.carbs}g carb.\nProgres zilnic: Calorii ${Math.round(calProgress)}%, Proteină ${Math.round(protProgress)}%, Carbohidrați ${Math.round(carbProgress)}%.\nVitamine detectate: ${vitaminsMerged.length ? vitaminsMerged.join(", ") : "-"}.\nMinerale detectate: ${mineralsMerged.length ? mineralsMerged.join(", ") : "-"}.`,
        },
      ]);
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
