import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Gemini } from "../src/useGemini";
import { auth, db } from "./firebaseConfig";

// ─── Design tokens ─────────────────────────────────────────
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
};

// ─── REPS Icon ──────────────────────────────────────────────
function RepsIcon() {
  return (
    <View style={s.repsIconBox}>
      <Text style={s.repsIconText}>REPS</Text>
    </View>
  );
}

// ─── Reusable Field ─────────────────────────────────────────
function Field({
  placeholder,
  value,
  onChangeText,
  secure,
  keyboard,
}: {
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
  secure?: boolean;
  keyboard?: any;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <TextInput
      style={[s.input, focused && s.inputFocused]}
      placeholder={placeholder}
      placeholderTextColor={C.textLight}
      value={value}
      onChangeText={onChangeText}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      secureTextEntry={secure}
      keyboardType={keyboard}
      autoCapitalize="none"
    />
  );
}

// ─── Section label ──────────────────────────────────────────
function SectionLabel({ label }: { label: string }) {
  return <Text style={s.sectionLabel}>{label}</Text>;
}

// ─── Main component ─────────────────────────────────────────
export default function SignIn() {
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

  const set = (key: keyof typeof userData) => (val: string) =>
    setUserData((prev) => ({ ...prev, [key]: val }));

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
    } catch {
      Alert.alert("Eroare", "Nu s-a putut genera planul.");
    }
  };

  const handleAuth = async () => {
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
        setShowQuestionnaire(true);
      }
    } catch (error: any) {
      Alert.alert("Eroare", error.message);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={s.root}
    >
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* Decorative blobs */}
      <View
        style={[s.blob, { top: -80, left: -60, backgroundColor: C.blob1 }]}
      />
      <View
        style={[
          s.blob,
          {
            top: 140,
            right: -100,
            width: 280,
            height: 280,
            backgroundColor: C.blob2,
          },
        ]}
      />

      <ScrollView
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={s.header}>
          <RepsIcon />
          <Text style={s.title}>
            {isLogin ? "Bine ai revenit" : "Creează cont"}
          </Text>
          <Text style={s.subtitle}>
            {isLogin
              ? "Introdu datele pentru a continua"
              : "Completează pentru a te înregistra"}
          </Text>
        </View>

        {/* Glass card */}
        <View style={s.card}>
          <Field
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboard="email-address"
          />
          <Field
            placeholder="Parolă"
            value={password}
            onChangeText={setPassword}
            secure
          />
          <TouchableOpacity
            style={s.btn}
            onPress={handleAuth}
            activeOpacity={0.88}
          >
            <Text style={s.btnText}>
              {isLogin ? "Intră în cont" : "Creează cont"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Toggle */}
        <TouchableOpacity
          style={s.toggleWrap}
          onPress={() => setIsLogin(!isLogin)}
        >
          <Text style={s.toggleText}>
            {isLogin ? "Nu ai cont? " : "Ai deja cont? "}
            <Text style={s.toggleAccent}>
              {isLogin ? "Înregistrează-te" : "Autentifică-te"}
            </Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* ── Questionnaire Modal ── */}
      <Modal
        visible={showQuestionnaire}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={s.modalRoot}>
          <View style={s.modalBlobTop} />

          {/* Modal header */}
          <View style={s.modalHeader}>
            <View style={s.modalIconWrap}>
              <View style={s.repsMiniBox}>
                <Text style={s.repsMiniText}>REPS</Text>
              </View>
            </View>
            <View>
              <Text style={s.modalTitle}>Completează profilul</Text>
              <Text style={s.modalSubtitle}>
                Îți construim planul personalizat
              </Text>
            </View>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={s.modalScroll}
            showsVerticalScrollIndicator={false}
          >
            <SectionLabel label="Date personale" />
            <Field
              placeholder="Vârsta (ani)"
              value={userData.age}
              onChangeText={set("age")}
              keyboard="numeric"
            />
            <Field
              placeholder="Greutatea actuală (kg)"
              value={userData.weight}
              onChangeText={set("weight")}
              keyboard="numeric"
            />
            <Field
              placeholder="Înălțimea (cm)"
              value={userData.height}
              onChangeText={set("height")}
              keyboard="numeric"
            />
            <Field
              placeholder="Sex (M / F)"
              value={userData.sex}
              onChangeText={set("sex")}
            />

            <SectionLabel label="Obiective" />
            <Field
              placeholder="Greutatea țintă (kg)"
              value={userData.targetWeight}
              onChangeText={set("targetWeight")}
              keyboard="numeric"
            />
            <Field
              placeholder="Nivel activitate  ·  sedentar / moderat / activ"
              value={userData.activityLevel}
              onChangeText={set("activityLevel")}
            />
            <Field
              placeholder="Obiectiv  ·  slăbire / menținere / masă musculară"
              value={userData.goal}
              onChangeText={set("goal")}
            />

            <Pressable
              style={({ pressed }) => [
                s.btn,
                { marginTop: 28, opacity: pressed ? 0.82 : 1 },
              ]}
              onPress={submitQuestionnaire}
            >
              <Text style={s.btnText}>Generează planul nutrițional</Text>
            </Pressable>
          </ScrollView>
        </View>
      </Modal>
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
    width: 320,
    height: 320,
    borderRadius: 160,
    opacity: 0.55,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 64,
  },

  // Header
  header: {
    alignItems: "center",
    marginBottom: 36,
    gap: 14,
  },
  repsIconBox: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: "#0F0F10",
    alignItems: "center",
    justifyContent: "center",
  },
  repsIconText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 1,
  },
  repsMiniBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#0F0F10",
    alignItems: "center",
    justifyContent: "center",
  },
  repsMiniText: {
    color: "#fff",
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: C.text,
    letterSpacing: -0.6,
    marginTop: 4,
  },
  subtitle: {
    fontSize: 15,
    color: C.textMuted,
    marginTop: -6,
  },

  // Card
  card: {
    backgroundColor: C.glass,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: C.glassBorder,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 3,
  },

  // Input
  input: {
    backgroundColor: C.bg,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: C.border,
    paddingHorizontal: 18,
    paddingVertical: 15,
    fontSize: 15,
    color: C.text,
    marginBottom: 12,
  },
  inputFocused: {
    borderColor: C.accent,
    backgroundColor: C.accentLight,
  },

  // Button
  btn: {
    backgroundColor: C.accent,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 4,
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 6,
  },
  btnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.2,
  },

  // Toggle
  toggleWrap: {
    alignItems: "center",
    marginTop: 24,
  },
  toggleText: {
    fontSize: 14,
    color: C.textMuted,
  },
  toggleAccent: {
    color: C.accent,
    fontWeight: "600",
  },

  // Modal
  modalRoot: {
    flex: 1,
    backgroundColor: C.bg,
  },
  modalBlobTop: {
    position: "absolute",
    top: -60,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: C.blob1,
    opacity: 0.6,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingTop: 24,
    paddingBottom: 18,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    backgroundColor: C.glass,
  },
  modalIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: C.accentLight,
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: C.text,
    letterSpacing: -0.3,
  },
  modalSubtitle: {
    fontSize: 13,
    color: C.textMuted,
    marginTop: 2,
  },
  modalScroll: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 48,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: C.accent,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    marginBottom: 14,
    marginTop: 8,
  },
});
