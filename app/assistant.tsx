import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { doc, getDoc } from "firebase/firestore";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { auth, db } from "../firebase/firebaseConfig";
import { saveTodayNutrition } from "../src/nutritionPersistence";
import { passData } from "../src/passData";
import { Gemini, extractCalories } from "../src/useGemini";

// ─── Tokens ──────────────────────────────────────────────────
const C = {
  bg: "#F7F8FA",
  glass: "rgba(255,255,255,0.72)",
  glassBorder: "rgba(255,255,255,0.9)",
  surface: "#FFFFFF",
  accent: "#4F6EF7",
  accentLight: "#EEF1FF",
  text: "#0F0F10",
  textMuted: "#8A8FA8",
  textLight: "#B8BCCD",
  border: "rgba(0,0,0,0.07)",
  userBubble: "#0F0F10",
  blob1: "#E8EDFF",
  blob2: "#F0E8FF",
};

// ─── Typing indicator ────────────────────────────────────────
function TypingDots() {
  return (
    <View style={s.aiRow}>
      <View style={s.aiAvatar}>
        <Ionicons name="nutrition" size={15} color={C.accent} />
      </View>
      <View
        style={[s.aiBubble, { paddingHorizontal: 18, paddingVertical: 14 }]}
      >
        <View style={{ flexDirection: "row", gap: 5, alignItems: "center" }}>
          <View style={s.dot} />
          <View style={[s.dot, { opacity: 0.6 }]} />
          <View style={[s.dot, { opacity: 0.3 }]} />
        </View>
      </View>
    </View>
  );
}

// ─── Main ────────────────────────────────────────────────────
export default function Assistant() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);

  const [messages, setMessages] = useState([
    {
      from: "ai",
      text: "Salut! Spune-mi ce ai mâncat și eu îți voi oferi informații nutriționale.",
    },
  ]);
  const [userText, getUserText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);

  const consumedCalories = passData((state) => state.calories);
  const consumedProtein = passData((state) => state.protein);
  const consumedCarbs = passData((state) => state.carbs);
  const setTotals = passData((state) => state.setTotals);

  const [caloriesTarget, setCaloriesTarget] = useState(2000);
  const [proteinTarget, setProteinTarget] = useState(150);
  const [carbsTarget, setCarbsTarget] = useState(250);
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
      const cal = Number(data?.plan?.dailyCalories);
      const prot = Number(data?.plan?.dailyProtein);
      const carb = Number(data?.plan?.dailyCarbs);
      if (!isNaN(cal) && cal > 0) setCaloriesTarget(cal);
      if (!isNaN(prot) && prot > 0) setProteinTarget(prot);
      if (!isNaN(carb) && carb > 0) setCarbsTarget(carb);
    } catch {}
  }, []);

  useEffect(() => {
    loadTargets();
  }, [loadTargets]);
  useFocusEffect(
    useCallback(() => {
      loadTargets();
    }, [loadTargets]),
  );

  // ── Prompt builders ──────────────────────────────────────
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

  const COMMON_FOOD_KEYWORDS = [
    "ou",
    "oua",
    "ouă",
    "pui",
    "piept",
    "orez",
    "cartof",
    "iaurt",
    "lapte",
    "branza",
    "brânză",
    "banana",
    "banană",
    "mar",
    "măr",
    "paine",
    "pâine",
    "somon",
    "ton",
    "paste",
    "fasole",
    "salata",
    "salată",
    "friptura",
    "friptură",
  ];

  const hasLikelyFoodMention = (text: string) => {
    const quantityPattern =
      /\b\d+\s*(g|gr|kg|ml|l|buc|bucata|bucăți|bucati|felii|linguri|portii|porții|oua|ouă|ou)\b/;
    const hasFoodWord = COMMON_FOOD_KEYWORDS.some((k) => text.includes(k));
    return quantityPattern.test(text) || hasFoodWord;
  };

  const estimateQuickFood = (text: string) => {
    const eggMatch = text.match(/\b(\d+)\s*(oua|ouă|ou|egg|eggs)\b/);
    const hasEggWord = /\b(oua|ouă|ou|egg|eggs)\b/.test(text);

    if (eggMatch || hasEggWord) {
      const qty = eggMatch ? Math.max(Number(eggMatch[1]), 1) : 1;
      return {
        calories: qty * 72,
        protein: qty * 6,
        carbs: Math.round(qty * 0.4),
        vitamins: ["B12", "D"],
        minerals: ["Seleniu", "Fosfor"],
      };
    }

    return null;
  };

  // ── Intent detection ─────────────────────────────────────
  const isOnTopic = (text: string) => {
    const kw = [
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
    return kw.some((k) => text.includes(k)) || hasLikelyFoodMention(text);
  };

  const isMealPlanRequest = (text: string) => {
    const kw = [
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
      "vreau plan",
      "fa-mi plan",
      "fă-mi plan",
      "targetul de azi",
      "obiectivul de azi",
    ];
    return kw.some((k) => text.includes(k));
  };

  const isNutritionLogRequest = (text: string) => {
    const kw = [
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
    return kw.some((k) => text.includes(k)) || hasLikelyFoodMention(text);
  };

  // ── Send message ─────────────────────────────────────────
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
        const response = await Gemini(buildMealPlanPrompt(userText));
        if (response.startsWith("Error:")) {
          setMessages((prev) => [
            ...prev,
            {
              from: "ai",
              text: "Nu pot accesa AI acum, deci nu pot genera un plan alimentar în acest moment. Încearcă din nou când revine conexiunea.",
            },
          ]);
          return;
        }
        setMessages((prev) => [...prev, { from: "ai", text: response }]);
        return;
      }

      if (isRecipe) {
        const response = await Gemini(
          `${userText} Ține cont că targetul zilnic al utilizatorului este ${caloriesTarget} calorii, ${proteinTarget}g proteină și ${carbsTarget}g carbohidrați. Oferă o rețetă care să se încadreze în aceste valori.`,
        );
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
      let extracted = extractCalories(response);

      const isGeminiError = response.startsWith("Error:");
      if (isGeminiError) {
        const quickEstimate = estimateQuickFood(input);
        if (quickEstimate) {
          extracted = quickEstimate;
        }
      }

      const hasData =
        extracted.calories > 0 ||
        extracted.protein > 0 ||
        extracted.carbs > 0 ||
        extracted.vitamins.length > 0 ||
        extracted.minerals.length > 0;

      if (!hasData) {
        setMessages((prev) => [
          ...prev,
          {
            from: "ai",
            text: isGeminiError
              ? "Nu pot accesa AI momentan (probabil conexiune), și nu am reușit nici estimarea locală. Încearcă din nou sau scrie mai clar aliment + cantitate."
              : "Nu am putut estima valorile nutriționale din mesaj. Încearcă să scrii alimentul + cantitatea (ex: 200g piept de pui, 1 banană, 2 ouă).",
          },
        ]);
        return;
      }

      const nextCal = consumedCalories + extracted.calories;
      const nextProt = consumedProtein + extracted.protein;
      const nextCarb = consumedCarbs + extracted.carbs;

      setTotals({
        calories: nextCal,
        protein: nextProt,
        carbs: nextCarb,
      });

      const uid = auth.currentUser?.uid;
      if (uid) {
        await saveTodayNutrition(uid, {
          calories: nextCal,
          protein: nextProt,
          carbs: nextCarb,
        });
      }
      if (extracted.vitamins.length)
        setCurrentVitamins((prev) => [
          ...new Set([...prev, ...extracted.vitamins]),
        ]);
      if (extracted.minerals.length)
        setCurrentMinerals((prev) => [
          ...new Set([...prev, ...extracted.minerals]),
        ]);

      const calPct = Math.min((nextCal / caloriesTarget) * 100, 100);
      const protPct = Math.min((nextProt / proteinTarget) * 100, 100);
      const carbPct = Math.min((nextCarb / carbsTarget) * 100, 100);
      const vit = [...new Set([...currentVitamins, ...extracted.vitamins])];
      const min = [...new Set([...currentMinerals, ...extracted.minerals])];

      setMessages((prev) => [
        ...prev,
        {
          from: "ai",
          text: `Adăugat: ${extracted.calories} cal · ${extracted.protein}g prot · ${extracted.carbs}g carb\n\nProgres zilnic: Calorii ${Math.round(calPct)}% · Proteină ${Math.round(protPct)}% · Carbs ${Math.round(carbPct)}%\n\nVitamine: ${vit.length ? vit.join(", ") : "—"}\nMinerale: ${min.length ? min.join(", ") : "—"}`,
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          from: "ai",
          text:
            "Eroare: " +
            (error instanceof Error ? error.message : String(error)),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const canSend = !!userText.trim() && !isTyping;

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* Blobs */}
      <View
        style={[s.blob, { top: -60, right: -80, backgroundColor: C.blob1 }]}
      />
      <View
        style={[
          s.blob,
          {
            bottom: 120,
            left: -80,
            width: 220,
            height: 220,
            backgroundColor: C.blob2,
          },
        ]}
      />

      {/* ── Header ── */}
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <View style={s.headerCenter}>
          <View style={s.headerIconWrap}>
            <Ionicons name="nutrition" size={17} color={C.accent} />
          </View>
          <View>
            <Text style={s.headerTitle}>Asistent Nutrițional</Text>
            <Text style={s.headerSub}>powered by Gemini</Text>
          </View>
        </View>
        {/* Target summary pill */}
        <View style={s.targetPill}>
          <Text style={s.targetPillText}>{caloriesTarget} kcal</Text>
        </View>
      </View>

      {/* ── Messages ── */}
      <ScrollView
        ref={scrollViewRef}
        style={{ flex: 1 }}
        contentContainerStyle={s.messageList}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {messages.map((msg, idx) =>
          msg.from === "user" ? (
            <View key={idx} style={s.userRow}>
              <View style={s.userBubble}>
                <Text style={s.userText}>{msg.text}</Text>
              </View>
            </View>
          ) : (
            <View key={idx} style={s.aiRow}>
              <View style={s.aiAvatar}>
                <Ionicons name="nutrition" size={15} color={C.accent} />
              </View>
              <View style={s.aiBubble}>
                <Text style={s.aiText}>{msg.text}</Text>
              </View>
            </View>
          ),
        )}
        {isTyping && <TypingDots />}
      </ScrollView>

      {/* ── Input area ── */}
      <View
        style={[
          s.inputArea,
          { paddingBottom: Math.max(insets.bottom + 8, 16) },
        ]}
      >
        <TextInput
          style={[s.input, inputFocused && s.inputFocused]}
          placeholder="Scrie un mesaj..."
          placeholderTextColor={C.textLight}
          value={userText}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          onChangeText={getUserText}
          onFocus={() => setInputFocused(true)}
          onBlur={() => setInputFocused(false)}
        />
        <TouchableOpacity
          style={[s.sendBtn, !canSend && s.sendBtnDisabled]}
          onPress={getMessage}
          disabled={!canSend}
          activeOpacity={0.85}
        >
          <Ionicons
            name="send"
            size={17}
            color={canSend ? "#fff" : C.textLight}
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ──────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  blob: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    opacity: 0.5,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: C.glass,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  headerIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: C.accentLight,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: C.text,
    letterSpacing: -0.3,
  },
  headerSub: { fontSize: 11, color: C.textMuted, marginTop: 1 },
  targetPill: {
    backgroundColor: C.accentLight,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  targetPillText: { fontSize: 11, fontWeight: "700", color: C.accent },

  // Messages
  messageList: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 10,
  },

  // User bubble
  userRow: { flexDirection: "row", justifyContent: "flex-end" },
  userBubble: {
    backgroundColor: C.userBubble,
    borderRadius: 20,
    borderBottomRightRadius: 5,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxWidth: "80%",
  },
  userText: { color: "#FFFFFF", fontSize: 15, lineHeight: 22 },

  // AI bubble
  aiRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  aiAvatar: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: C.accentLight,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  aiBubble: {
    backgroundColor: C.surface,
    borderRadius: 20,
    borderBottomLeftRadius: 5,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxWidth: "80%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  aiText: { color: C.text, fontSize: 15, lineHeight: 22 },

  // Dots
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: C.accent,
  },

  // Input
  inputArea: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: C.glass,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  input: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: C.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: C.text,
    maxHeight: 120,
    minHeight: 48,
  },
  inputFocused: {
    borderColor: C.accent,
    backgroundColor: C.accentLight,
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: C.accent,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  sendBtnDisabled: {
    backgroundColor: C.bg,
    borderWidth: 1.5,
    borderColor: C.border,
    shadowOpacity: 0,
    elevation: 0,
  },
});
