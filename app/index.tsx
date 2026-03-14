import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { passData } from "../src/passData";
import { Gemini, extractCalories } from "../src/useGemini";

// ─── Design tokens (same as SignIn) ────────────────────────
const C = {
  bg: "#F7F8FA",
  glass: "rgba(255,255,255,0.72)",
  glassBorder: "rgba(255,255,255,0.9)",
  accent: "#4F6EF7",
  accentLight: "#EEF1FF",
  text: "#0F0F10",
  textMuted: "#8A8FA8",
  textLight: "#B8BCCD",
  border: "rgba(0,0,0,0.07)",
  blob1: "#E8EDFF",
  blob2: "#F0E8FF",
  userBubble: "#0F0F10",
  aiBubble: "#FFFFFF",
};

// ─── Typing dots ────────────────────────────────────────────
function TypingIndicator() {
  return (
    <View style={s.aiRow}>
      <View style={s.aiAvatar}>
        <Ionicons name="nutrition" size={16} color={C.accent} />
      </View>
      <View style={[s.aiBubble, { paddingHorizontal: 18, paddingVertical: 14 }]}>
        <View style={{ flexDirection: "row", gap: 5, alignItems: "center" }}>
          <View style={s.dot} />
          <View style={[s.dot, { opacity: 0.6 }]} />
          <View style={[s.dot, { opacity: 0.3 }]} />
        </View>
      </View>
    </View>
  );
}

// ─── Main ───────────────────────────────────────────────────
export default function Assistant() {
  const navigation = useNavigation();
  const scrollViewRef = useRef<ScrollView>(null);
  const [messages, setMessages] = useState([
    {
      from: "ai",
      text: "Salut! Spune-mi ce ai mâncat și eu îți voi oferi informații nutriționale.",
    },
  ]);
  const [userText, getUserText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const addCalories = passData((state) => state.addCalories);
  const addProtein = passData((state) => state.addProtein);
  const addCarbs = passData((state) => state.addCarbs);

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

  const getMessage = async () => {
    if (!userText.trim()) return;
    const input = userText.trim().toLowerCase();
    setMessages((prev) => [...prev, { from: "user", text: userText }]);
    getUserText("");
    setIsTyping(true);
    try {
      let response = "";
      const isRecipe =
        input.includes("retetă") ||
        input.includes("rețetă") ||
        input.includes("recipe");
      const isCalculation =
        input.includes("calorii") ||
        input.includes("protein") ||
        input.includes("carb") ||
        input.includes("vitamin") ||
        input.includes("mineral") ||
        input.includes("calculează") ||
        input.includes("calculate");

      if (isRecipe) {
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
          if (extracted.vitamins.length)
            setCurrentVitamins((prev) => [...new Set([...prev, ...extracted.vitamins])]);
          if (extracted.minerals.length)
            setCurrentMinerals((prev) => [...new Set([...prev, ...extracted.minerals])]);

          const calProgress = Math.min(((currentCalories + extracted.calories) / caloriesTarget) * 100, 100);
          const protProgress = Math.min(((currentProtein + extracted.protein) / proteinTarget) * 100, 100);
          const carbProgress = Math.min(((currentCarbs + extracted.carbs) / carbsTarget) * 100, 100);
          const vitaminsMerged = [...new Set([...currentVitamins, ...extracted.vitamins])];
          const mineralsMerged = [...new Set([...currentMinerals, ...extracted.minerals])];

          setMessages((prev) => [
            ...prev,
            { from: "ai", text: response },
            {
              from: "ai",
              text: `Adăugat la target: ${extracted.calories} cal · ${extracted.protein}g prot · ${extracted.carbs}g carb\n\nProgres zilnic: Calorii ${Math.round(calProgress)}% · Proteină ${Math.round(protProgress)}% · Carbohidrați ${Math.round(carbProgress)}%\n\nVitamine: ${vitaminsMerged.length ? vitaminsMerged.join(", ") : "—"}\nMinerale: ${mineralsMerged.length ? mineralsMerged.join(", ") : "—"}`,
            },
          ]);
          setIsTyping(false);
          return;
        }
      } else {
        response =
          "Salut! Sunt asistentul tău nutrițional. Pot să calculez calorii și proteine din alimente sau să îți ofer rețete adaptate la targetul tău zilnic. Cu ce te pot ajuta?";
      }

      setMessages((prev) => [...prev, { from: "ai", text: response }]);

      if (isRecipe) {
        const extracted = extractCalories(response);
        if (extracted) {
          setCurrentCalories((prev) => prev + extracted.calories);
          setCurrentProtein((prev) => prev + extracted.protein);
          setCurrentCarbs((prev) => prev + extracted.carbs);
          addCalories(extracted.calories);
          addProtein(extracted.protein);
          addCarbs(extracted.carbs);
          if (extracted.vitamins.length)
            setCurrentVitamins((prev) => [...new Set([...prev, ...extracted.vitamins])]);
          if (extracted.minerals.length)
            setCurrentMinerals((prev) => [...new Set([...prev, ...extracted.minerals])]);
        }
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          from: "ai",
          text: "Eroare: " + (error instanceof Error ? error.message : String(error)),
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

      {/* Decorative blobs */}
      <View style={[s.blob, { top: -60, right: -80, backgroundColor: C.blob1 }]} />
      <View style={[s.blob, { bottom: 100, left: -100, width: 240, height: 240, backgroundColor: C.blob2 }]} />

      {/* ── Header ── */}
      <View style={s.header}>
        <Pressable onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={20} color={C.text} />
        </Pressable>
        <View style={s.headerCenter}>
          <View style={s.headerIcon}>
            <Ionicons name="nutrition" size={18} color={C.accent} />
          </View>
          <View>
            <Text style={s.headerTitle}>Asistent Nutrițional</Text>
            <Text style={s.headerSub}>powered by Gemini</Text>
          </View>
        </View>
      </View>

      {/* ── Messages ── */}
      <ScrollView
        ref={scrollViewRef}
        style={{ flex: 1 }}
        contentContainerStyle={s.messageList}
        showsVerticalScrollIndicator={false}
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
                <Ionicons name="nutrition" size={16} color={C.accent} />
              </View>
              <View style={s.aiBubble}>
                <Text style={s.aiText}>{msg.text}</Text>
              </View>
            </View>
          )
        )}
        {isTyping && <TypingIndicator />}
      </ScrollView>

      {/* ── Input ── */}
      <View style={s.inputArea}>
        <TextInput
          style={s.input}
          placeholder="Scrie un mesaj..."
          placeholderTextColor={C.textLight}
          value={userText}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          onChangeText={getUserText}
        />
        <Pressable
          onPress={getMessage}
          disabled={!canSend}
          style={[s.sendBtn, !canSend && s.sendBtnDisabled]}
        >
          <Ionicons name="send" size={18} color={canSend ? "#fff" : C.textLight} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ─────────────────────────────────────────────────
const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  blob: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    opacity: 0.5,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: Platform.OS === "ios" ? 56 : 40,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: C.glass,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  headerIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: C.accentLight,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: C.text,
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 11,
    color: C.textMuted,
    marginTop: 1,
  },

  // Messages
  messageList: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 12,
  },

  // User bubble
  userRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  userBubble: {
    backgroundColor: C.userBubble,
    borderRadius: 20,
    borderBottomRightRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxWidth: "78%",
  },
  userText: {
    color: "#FFFFFF",
    fontSize: 15,
    lineHeight: 22,
  },

  // AI bubble
  aiRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: C.accentLight,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  aiBubble: {
    backgroundColor: C.aiBubble,
    borderRadius: 20,
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxWidth: "78%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  aiText: {
    color: C.text,
    fontSize: 15,
    lineHeight: 22,
  },

  // Typing dots
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: C.accent,
  },

  // Input area
  inputArea: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.OS === "ios" ? 28 : 12,
    backgroundColor: C.glass,
    borderTopWidth: 1,
    borderTopColor: C.border,
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: "#FFFFFF",
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