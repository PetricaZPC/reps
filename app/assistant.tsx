import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
} from "firebase/firestore";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Image,
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
import { passData } from "../src/passData";
import {
  AssistantContext,
  SmartResponse,
  WorkoutLogEntry,
  askAssistant,
  askAssistantWithImage,
} from "../src/useGemini";

let AsyncStorage: any = null;
try {
  const asyncStorageModule = require("@react-native-async-storage/async-storage");
  AsyncStorage = asyncStorageModule?.default ?? asyncStorageModule;
} catch {
  AsyncStorage = null;
}

function getImagePicker() {
  try {
    const imagePickerModule = require("expo-image-picker");
    return imagePickerModule?.default ?? imagePickerModule;
  } catch {
    return null;
  }
}

// ─── Tokens ──────────────────────────────────────────────────
const C = {
  bg: "#F7F8FA",
  glass: "rgba(255,255,255,0.72)",
  glassBorder: "rgba(255,255,255,0.9)",
  surface: "#FFFFFF",
  accent: "#4F6EF7",
  accentLight: "#EEF1FF",
  success: "#22C55E",
  successLight: "#DCFCE7",
  warning: "#F97316",
  warningLight: "#FFF0E8",
  text: "#0F0F10",
  textMuted: "#8A8FA8",
  textLight: "#B8BCCD",
  border: "rgba(0,0,0,0.07)",
  userBubble: "#0F0F10",
  blob1: "#E8EDFF",
  blob2: "#F0E8FF",
};

// ─── Types ────────────────────────────────────────────────────
interface Message {
  from: "user" | "ai";
  text: string;
  imageUri?: string;
  nutritionData?: SmartResponse["nutritionData"];
}

const DEFAULT_MESSAGES: Message[] = [
  {
    from: "ai",
    text: "Salut! 👋 Sunt REPS Assistant.\n\nPoți să îmi spui orice legat de:\n• Ce ai mâncat → calculez macro-urile\n• Plan de mese sau rețete\n• Program de antrenament\n• Tehnica unui exercițiu\n• Orice întrebare despre fitness și nutriție",
  },
];

const chatKey = (uid: string) => `assistant_chat_${uid}`;
const historyKey = (uid: string) => `assistant_history_${uid}`;
const hasAsyncStorage =
  !!AsyncStorage &&
  typeof (AsyncStorage as any).getItem === "function" &&
  typeof (AsyncStorage as any).setItem === "function";

// ─── Nutrition summary card ───────────────────────────────────
function NutritionCard({
  data,
  calTarget,
  protTarget,
  sessionCal,
  sessionProt,
}: {
  data: NonNullable<SmartResponse["nutritionData"]>;
  calTarget: number;
  protTarget: number;
  sessionCal: number;
  sessionProt: number;
}) {
  const calPct = Math.min(Math.round((sessionCal / calTarget) * 100), 100);
  const protPct = Math.min(Math.round((sessionProt / protTarget) * 100), 100);
  const calLeft = Math.max(calTarget - sessionCal, 0);
  const protLeft = Math.max(protTarget - sessionProt, 0);

  return (
    <View style={nc.card}>
      {/* Macro pills */}
      <View style={nc.pills}>
        {[
          {
            label: "kcal",
            value: data.calories,
            color: C.warning,
            bg: C.warningLight,
          },
          {
            label: "prot",
            value: `${data.protein}g`,
            color: C.accent,
            bg: C.accentLight,
          },
          {
            label: "carbs",
            value: `${data.carbs}g`,
            color: "#A855F7",
            bg: "#F3E8FF",
          },
          {
            label: "fat",
            value: `${data.fat}g`,
            color: "#64748B",
            bg: "#F1F5F9",
          },
        ].map((m) => (
          <View key={m.label} style={[nc.pill, { backgroundColor: m.bg }]}>
            <Text style={[nc.pillValue, { color: m.color }]}>{m.value}</Text>
            <Text style={[nc.pillLabel, { color: m.color }]}>{m.label}</Text>
          </View>
        ))}
      </View>

      {/* Progress bars */}
      <View style={nc.bars}>
        <ProgressRow
          label="Calorii azi"
          pct={calPct}
          left={`${calLeft} kcal rămase`}
          color={C.warning}
        />
        <ProgressRow
          label="Proteine azi"
          pct={protPct}
          left={`${protLeft}g rămase`}
          color={C.accent}
        />
      </View>

      {/* Micronutrients */}
      {(data.vitamins.length > 0 || data.minerals.length > 0) && (
        <View style={nc.micro}>
          {data.vitamins.length > 0 && (
            <Text style={nc.microText}>💊 {data.vitamins.join(", ")}</Text>
          )}
          {data.minerals.length > 0 && (
            <Text style={nc.microText}>🔩 {data.minerals.join(", ")}</Text>
          )}
        </View>
      )}
    </View>
  );
}

function ProgressRow({
  label,
  pct,
  left,
  color,
}: {
  label: string;
  pct: number;
  left: string;
  color: string;
}) {
  return (
    <View style={nc.barWrap}>
      <View style={nc.barHeader}>
        <Text style={nc.barLabel}>{label}</Text>
        <Text style={[nc.barPct, { color }]}>{pct}%</Text>
      </View>
      <View style={nc.barTrack}>
        <View
          style={[
            nc.barFill,
            { width: `${pct}%` as any, backgroundColor: color },
          ]}
        />
      </View>
      <Text style={nc.barLeft}>{left}</Text>
    </View>
  );
}

const nc = StyleSheet.create({
  card: {
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    marginTop: 8,
    gap: 12,
  },
  pills: { flexDirection: "row", gap: 6 },
  pill: { flex: 1, borderRadius: 10, padding: 8, alignItems: "center" },
  pillValue: { fontSize: 14, fontWeight: "700", letterSpacing: -0.3 },
  pillLabel: { fontSize: 10, fontWeight: "500", marginTop: 1 },
  bars: { gap: 8 },
  barWrap: { gap: 4 },
  barHeader: { flexDirection: "row", justifyContent: "space-between" },
  barLabel: { fontSize: 12, fontWeight: "600", color: C.text },
  barPct: { fontSize: 12, fontWeight: "700" },
  barTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: C.bg,
    overflow: "hidden",
  },
  barFill: { height: 6, borderRadius: 3 },
  barLeft: { fontSize: 11, color: C.textMuted },
  micro: { gap: 3 },
  microText: { fontSize: 12, color: C.textMuted, lineHeight: 18 },
});

// ─── Typing dots ──────────────────────────────────────────────
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

// ─── Quick suggestion chips ───────────────────────────────────
const CHIPS = [
  { label: "Am mâncat 3 ouă", icon: "egg-outline" },
  { label: "Plan de mese azi", icon: "calendar-outline" },
  { label: "Program antrenament", icon: "barbell-outline" },
  { label: "Cum fac flotări?", icon: "body-outline" },
  { label: "Cum slăbesc?", icon: "trending-down-outline" },
  { label: "Rețetă proteică", icon: "flask-outline" },
];

// ─── Main ─────────────────────────────────────────────────────
export default function Assistant() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);

  const [messages, setMessages] = useState<Message[]>(DEFAULT_MESSAGES);
  const [chatLoaded, setChatLoaded] = useState(false);

  // Istoricul pentru conversație multi-turn
  const historyRef = useRef<{ role: "user" | "model"; text: string }[]>([]);

  const [userText, setUserText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);

  const addCalories = passData((st) => st.addCalories);
  const addProtein = passData((st) => st.addProtein);
  const addCarbs = passData((st) => st.addCarbs);

  const [calTarget, setCalTarget] = useState(2000);
  const [protTarget, setProtTarget] = useState(150);
  const [carbTarget, setCarbTarget] = useState(250);

  // date personale — trimise în context ca Gemini să personalizeze recomandările
  const [userGoal, setUserGoal] = useState("");
  const [userActivity, setUserActivity] = useState("");
  const [userAge, setUserAge] = useState("");
  const [userWeight, setUserWeight] = useState("");

  // istoricul antrenamentelor — pentru recomandări inteligente
  const [recentWorkouts, setRecentWorkouts] = useState<WorkoutLogEntry[]>([]);

  const [sessionCal, setSessionCal] = useState(0);
  const [sessionProt, setSessionProt] = useState(0);
  const [sessionCarb, setSessionCarb] = useState(0);
  const userId = auth.currentUser?.uid;

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages, isTyping]);

  useEffect(() => {
    const loadChat = async () => {
      if (!hasAsyncStorage) {
        historyRef.current = [];
        setMessages(DEFAULT_MESSAGES);
        setChatLoaded(true);
        return;
      }

      if (!userId) {
        historyRef.current = [];
        setMessages(DEFAULT_MESSAGES);
        setChatLoaded(true);
        return;
      }

      try {
        const [savedMessages, savedHistory] = await Promise.all([
          AsyncStorage.getItem(chatKey(userId)),
          AsyncStorage.getItem(historyKey(userId)),
        ]);

        if (savedMessages) {
          const parsedMessages = JSON.parse(savedMessages) as Message[];
          setMessages(
            Array.isArray(parsedMessages) && parsedMessages.length > 0
              ? parsedMessages
              : DEFAULT_MESSAGES,
          );
        } else {
          setMessages(DEFAULT_MESSAGES);
        }

        if (savedHistory) {
          const parsedHistory = JSON.parse(savedHistory) as {
            role: "user" | "model";
            text: string;
          }[];
          historyRef.current = Array.isArray(parsedHistory)
            ? parsedHistory
            : [];
        } else {
          historyRef.current = [];
        }
      } catch {
        setMessages(DEFAULT_MESSAGES);
        historyRef.current = [];
      } finally {
        setChatLoaded(true);
      }
    };

    setChatLoaded(false);
    loadChat();
  }, [userId]);

  useEffect(() => {
    const persistChat = async () => {
      if (!chatLoaded || !userId || !hasAsyncStorage) return;
      try {
        await Promise.all([
          AsyncStorage.setItem(chatKey(userId), JSON.stringify(messages)),
          AsyncStorage.setItem(
            historyKey(userId),
            JSON.stringify(historyRef.current),
          ),
        ]);
      } catch {}
    };

    persistChat();
  }, [messages, chatLoaded, userId]);

  const loadTargets = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      // Date utilizator + plan
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) {
        const d = snap.data() as any;
        const cal = Number(d?.plan?.dailyCalories);
        const prot = Number(d?.plan?.dailyProtein);
        const carb = Number(d?.plan?.dailyCarbs);
        if (!isNaN(cal) && cal > 0) setCalTarget(cal);
        if (!isNaN(prot) && prot > 0) setProtTarget(prot);
        if (!isNaN(carb) && carb > 0) setCarbTarget(carb);
        if (d?.goal) setUserGoal(d.goal);
        if (d?.activityLevel) setUserActivity(d.activityLevel);
        if (d?.age) setUserAge(String(d.age));
        if (d?.weight) setUserWeight(String(d.weight));
      }

      // Istoricul antrenamentelor (ultimele 10)
      try {
        const q = query(
          collection(db, `users/${user.uid}/workoutLogs`),
          orderBy("completedAt", "desc"),
          limit(10),
        );
        const logsSnap = await getDocs(q);
        const logs: WorkoutLogEntry[] = [];
        logsSnap.forEach((d) => {
          const data = d.data() as any;
          logs.push({
            presetId: data.presetId,
            presetName: data.presetName ?? "Antrenament",
            difficulty: data.difficulty ?? "intermediate",
            completedAt: data.completedAt ?? "",
            completedSets: data.completedSets ?? 0,
            totalSets: data.totalSets ?? 0,
          });
        });
        setRecentWorkouts(logs);
      } catch {}
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

  // ── Send ───────────────────────────────────────────────────
  const send = async (text?: string) => {
    const raw = (text ?? userText).trim();
    if (!raw) return;

    setMessages((prev) => [...prev, { from: "user", text: raw }]);
    setUserText("");
    setIsTyping(true);

    const ctx: AssistantContext = {
      caloriesTarget: calTarget,
      proteinTarget: protTarget,
      carbTarget: carbTarget,
      sessionCalories: sessionCal,
      sessionProtein: sessionProt,
      sessionCarbs: sessionCarb,
      userGoal,
      userActivity,
      userAge,
      userWeight,
      recentWorkouts,
    };

    try {
      const result = await askAssistant(raw, ctx, historyRef.current);

      // Actualizăm istoricul pentru conversație continuă
      historyRef.current = [
        ...historyRef.current,
        { role: "user", text: raw },
        { role: "model", text: result.text },
      ];
      // Păstrăm ultimele 10 tururi (5 user + 5 model) pentru a nu crește prea mult
      if (historyRef.current.length > 20) {
        historyRef.current = historyRef.current.slice(-20);
      }

      // Dacă avem date nutriționale, actualizăm totalurile
      if (result.nutritionData) {
        const nd = result.nutritionData;
        const newCal = sessionCal + nd.calories;
        const newProt = sessionProt + nd.protein;
        const newCarb = sessionCarb + nd.carbs;
        setSessionCal(newCal);
        setSessionProt(newProt);
        setSessionCarb(newCarb);
        addCalories(nd.calories);
        addProtein(nd.protein);
        addCarbs(nd.carbs);

        setMessages((prev) => [
          ...prev,
          {
            from: "ai",
            text: result.text,
            nutritionData: { ...nd },
          },
        ]);
      } else {
        setMessages((prev) => [...prev, { from: "ai", text: result.text }]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          from: "ai",
          text: "Eroare: " + (err instanceof Error ? err.message : String(err)),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const canSend = !!userText.trim() && !isTyping;
  const canPickImage = !isTyping && !imageLoading;
  const showChips = messages.length <= 1;

  const sendFridgeImage = async (source: "camera" | "gallery") => {
    try {
      const ImagePicker = getImagePicker();
      if (!ImagePicker) {
        setMessages((prev) => [
          ...prev,
          {
            from: "ai",
            text: "Funcția foto nu este disponibilă în acest build. Reinstalează aplicația cu un build nativ nou.",
          },
        ]);
        return;
      }

      if (source === "camera") {
        const cameraPermission =
          await ImagePicker.requestCameraPermissionsAsync();
        if (!cameraPermission.granted) {
          setMessages((prev) => [
            ...prev,
            {
              from: "ai",
              text: "Am nevoie de acces la cameră ca să analizez poza cu ingredientele.",
            },
          ]);
          return;
        }
      } else {
        const mediaPermission =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!mediaPermission.granted) {
          setMessages((prev) => [
            ...prev,
            {
              from: "ai",
              text: "Am nevoie de acces la galerie ca să analizez poza cu ingredientele.",
            },
          ]);
          return;
        }
      }

      const pickerResult =
        source === "camera"
          ? await ImagePicker.launchCameraAsync({
              mediaTypes: ["images"],
              quality: 0.7,
              base64: true,
            })
          : await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ["images"],
              quality: 0.7,
              base64: true,
            });

      if (pickerResult.canceled) return;

      const asset = pickerResult.assets?.[0];
      if (!asset?.base64) {
        setMessages((prev) => [
          ...prev,
          {
            from: "ai",
            text: "Nu am putut citi imaginea. Încearcă o altă poză.",
          },
        ]);
        return;
      }

      const userCaption = userText.trim();
      setMessages((prev) => [
        ...prev,
        {
          from: "user",
          text:
            userCaption ||
            "Am trimis o poză cu ce am în frigider. Fă-mi o rețetă ca să mă apropii de targetul de azi.",
          imageUri: asset.uri,
        },
      ]);
      setUserText("");
      setIsTyping(true);
      setImageLoading(true);

      const ctx: AssistantContext = {
        caloriesTarget: calTarget,
        proteinTarget: protTarget,
        carbTarget: carbTarget,
        sessionCalories: sessionCal,
        sessionProtein: sessionProt,
        sessionCarbs: sessionCarb,
        userGoal,
        userActivity,
        userAge,
        userWeight,
        recentWorkouts,
      };

      const imagePrompt = `${
        userCaption ||
        "Analizează ingredientele din imagine și propune o rețetă potrivită pentru targetul meu rămas azi."
      }\n\nTe rog:\n1) identifică ingredientele vizibile;\n2) oferă o rețetă cu pași simpli;\n3) estimează calorii/proteine/carbo/grăsimi pe porție;\n4) explică cum mă ajută să ajung la targetul de azi.`;

      const result = await askAssistantWithImage(
        imagePrompt,
        ctx,
        asset.base64,
        asset.mimeType || "image/jpeg",
        historyRef.current,
      );

      historyRef.current = [
        ...historyRef.current,
        {
          role: "user",
          text: userCaption || "[Imagine cu ingrediente trimisă]",
        },
        { role: "model", text: result.text },
      ];
      if (historyRef.current.length > 20) {
        historyRef.current = historyRef.current.slice(-20);
      }

      if (result.nutritionData) {
        const nd = result.nutritionData;
        const newCal = sessionCal + nd.calories;
        const newProt = sessionProt + nd.protein;
        const newCarb = sessionCarb + nd.carbs;
        setSessionCal(newCal);
        setSessionProt(newProt);
        setSessionCarb(newCarb);
        addCalories(nd.calories);
        addProtein(nd.protein);
        addCarbs(nd.carbs);

        setMessages((prev) => [
          ...prev,
          {
            from: "ai",
            text: result.text,
            nutritionData: { ...nd },
          },
        ]);
      } else {
        setMessages((prev) => [...prev, { from: "ai", text: result.text }]);
      }
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          from: "ai",
          text:
            "Eroare la analizarea imaginii: " +
            (error instanceof Error ? error.message : String(error)),
        },
      ]);
    } finally {
      setImageLoading(false);
      setIsTyping(false);
    }
  };

  // ── Render ────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />
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

      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity
          style={s.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.75}
        >
          <Ionicons name="arrow-back" size={18} color={C.text} />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <View style={s.headerIconWrap}>
            <Ionicons name="nutrition" size={17} color={C.accent} />
          </View>
          <View>
            <Text style={s.headerTitle}>REPS Assistant</Text>
            <Text style={s.headerSub}>nutriție · fitness · exerciții</Text>
          </View>
        </View>
        <View style={s.targetPill}>
          <Text style={s.targetPillText}>{calTarget} kcal</Text>
        </View>
      </View>

      {/* Chips */}
      {showChips && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.chips}
          style={s.chipsScroll}
        >
          {CHIPS.map((chip) => (
            <TouchableOpacity
              key={chip.label}
              style={s.chip}
              onPress={() => send(chip.label)}
              activeOpacity={0.8}
            >
              <Ionicons name={chip.icon as any} size={13} color={C.accent} />
              <Text style={s.chipText}>{chip.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={s.messageList}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {messages.map((msg, idx) =>
          msg.from === "user" ? (
            <View key={idx} style={s.userRow}>
              <View style={s.userBubble}>
                {msg.imageUri ? (
                  <Image source={{ uri: msg.imageUri }} style={s.userImage} />
                ) : null}
                <Text style={s.userText}>{msg.text}</Text>
              </View>
            </View>
          ) : (
            <View key={idx} style={s.aiRow}>
              <View style={s.aiAvatar}>
                <Ionicons name="nutrition" size={15} color={C.accent} />
              </View>
              <View style={{ flex: 1, maxWidth: "85%" }}>
                <View style={s.aiBubble}>
                  <Text style={s.aiText}>{msg.text}</Text>
                </View>
                {msg.nutritionData && (
                  <NutritionCard
                    data={msg.nutritionData}
                    calTarget={calTarget}
                    protTarget={protTarget}
                    sessionCal={sessionCal}
                    sessionProt={sessionProt}
                  />
                )}
              </View>
            </View>
          ),
        )}
        {isTyping && <TypingDots />}
      </ScrollView>

      {/* Input */}
      <View
        style={[
          s.inputArea,
          { paddingBottom: Math.max(insets.bottom + 8, 16) },
        ]}
      >
        <TouchableOpacity
          style={[s.mediaBtn, !canPickImage && s.mediaBtnDisabled]}
          onPress={() => sendFridgeImage("camera")}
          disabled={!canPickImage}
          activeOpacity={0.85}
        >
          <Ionicons
            name="camera-outline"
            size={18}
            color={canPickImage ? C.accent : C.textLight}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.mediaBtn, !canPickImage && s.mediaBtnDisabled]}
          onPress={() => sendFridgeImage("gallery")}
          disabled={!canPickImage}
          activeOpacity={0.85}
        >
          <Ionicons
            name="image-outline"
            size={18}
            color={canPickImage ? C.accent : C.textLight}
          />
        </TouchableOpacity>

        <TextInput
          style={[s.input, inputFocused && s.inputFocused]}
          placeholder="Scrie un mesaj..."
          placeholderTextColor={C.textLight}
          value={userText}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          onChangeText={setUserText}
          onFocus={() => setInputFocused(true)}
          onBlur={() => setInputFocused(false)}
        />
        <TouchableOpacity
          style={[s.sendBtn, !canSend && s.sendBtnDisabled]}
          onPress={() => send()}
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

// ─── Styles ───────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  blob: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    opacity: 0.5,
  },

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

  chipsScroll: { maxHeight: 50, flexGrow: 0 },
  chips: { paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: C.glass,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.glassBorder,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipText: { fontSize: 12, fontWeight: "600", color: C.accent },

  messageList: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
    gap: 10,
  },

  userRow: { flexDirection: "row", justifyContent: "flex-end" },
  userBubble: {
    backgroundColor: C.userBubble,
    borderRadius: 20,
    borderBottomRightRadius: 5,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxWidth: "80%",
  },
  userImage: {
    width: 180,
    height: 180,
    borderRadius: 12,
    marginBottom: 8,
    alignSelf: "flex-end",
  },
  userText: { color: "#FFFFFF", fontSize: 15, lineHeight: 22 },

  aiRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  aiAvatar: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: C.accentLight,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    alignSelf: "flex-start",
    marginTop: 2,
  },
  aiBubble: {
    backgroundColor: C.surface,
    borderRadius: 20,
    borderBottomLeftRadius: 5,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  aiText: { color: C.text, fontSize: 15, lineHeight: 22 },

  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.accent },

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
  inputFocused: { borderColor: C.accent, backgroundColor: C.accentLight },
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
  mediaBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: C.surface,
    borderWidth: 1.5,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
  },
  mediaBtnDisabled: {
    backgroundColor: C.bg,
  },
});
