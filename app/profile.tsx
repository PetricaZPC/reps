import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Dimensions,
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
import { LineChart } from "react-native-chart-kit";
import { auth, db } from "../firebase/firebaseConfig";

// ─── Design tokens (same as SignIn / Assistant) ─────────────
const C = {
  bg: "#F7F8FA",
  glass: "rgba(255,255,255,0.72)",
  glassBorder: "rgba(255,255,255,0.9)",
  surface: "#FFFFFF",
  accent: "#4F6EF7",
  accentLight: "#EEF1FF",
  success: "#22C55E",
  successLight: "#DCFCE7",
  danger: "#EF4444",
  dangerLight: "#FEE2E2",
  text: "#0F0F10",
  textMuted: "#8A8FA8",
  textLight: "#B8BCCD",
  border: "rgba(0,0,0,0.07)",
  blob1: "#E8EDFF",
  blob2: "#F0E8FF",
};

// ─── Types ──────────────────────────────────────────────────
interface UserData {
  age: string;
  weight: string;
  height: string;
  sex: string;
  targetWeight: string;
  activityLevel: string;
  goal: string;
  plan?: {
    dailyCalories: number;
    dailyProtein: number;
    dailyCarbs: number;
    dailyFat: number;
    dailyWater: number;
  };
  progress?: { date: string; weight: number; protein: number }[];
}

// ─── Helpers ────────────────────────────────────────────────
function SectionLabel({ label }: { label: string }) {
  return <Text style={s.sectionLabel}>{label}</Text>;
}

function InfoRow({ icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <View style={s.infoRow}>
      <View style={s.infoIcon}>
        <Ionicons name={icon} size={15} color={C.accent} />
      </View>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={s.infoValue}>{value}</Text>
    </View>
  );
}

function MacroCard({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: string | number;
  unit: string;
  color: string;
}) {
  return (
    <View style={[s.macroCard, { borderTopColor: color, borderTopWidth: 3 }]}>
      <Text style={[s.macroValue, { color }]}>{value}</Text>
      <Text style={s.macroUnit}>{unit}</Text>
      <Text style={s.macroLabel}>{label}</Text>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  keyboard,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  keyboard?: any;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={s.fieldWrap}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        style={[s.input, focused && s.inputFocused]}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        keyboardType={keyboard}
        autoCapitalize="none"
        placeholderTextColor={C.textLight}
      />
    </View>
  );
}

// ─── Main ───────────────────────────────────────────────────
export default function Profile() {
  const navigation = useNavigation();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [editing, setEditing] = useState(false);
  const [newProgress, setNewProgress] = useState({ weight: "", protein: "" });
  const [activeChart, setActiveChart] = useState<"weight" | "protein">("weight");

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    const user = auth.currentUser;
    if (user) {
      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) setUserData(docSnap.data() as UserData);
    }
  };

  const saveData = async () => {
    const user = auth.currentUser;
    if (user && userData) {
      await updateDoc(doc(db, "users", user.uid), userData as any);
      setEditing(false);
      Alert.alert("Salvat!", "Datele tale au fost actualizate.");
    }
  };

  const addProgress = async () => {
    const user = auth.currentUser;
    if (!newProgress.weight || !newProgress.protein) {
      Alert.alert("Completează ambele câmpuri.");
      return;
    }
    if (user && userData) {
      const progress = userData.progress || [];
      progress.push({
        date: new Date().toLocaleDateString("ro-RO", { day: "2-digit", month: "short" }),
        weight: parseFloat(newProgress.weight),
        protein: parseFloat(newProgress.protein),
      });
      await updateDoc(doc(db, "users", user.uid), { progress } as any);
      setUserData({ ...userData, progress });
      setNewProgress({ weight: "", protein: "" });
      Alert.alert("Progres adăugat!");
    }
  };

  if (!userData) {
    return (
      <View style={[s.root, { alignItems: "center", justifyContent: "center" }]}>
        <Text style={{ color: C.textMuted, fontSize: 15 }}>Se încarcă...</Text>
      </View>
    );
  }

  const screenWidth = Dimensions.get("window").width;
  const progressData = userData.progress || [];
  const chartLabels = progressData.map((p) => p.date);
  const weightData = progressData.length > 0 ? progressData.map((p) => p.weight) : [0];
  const proteinData = progressData.length > 0 ? progressData.map((p) => p.protein) : [0];

  const chartConfig = (color: string) => ({
    backgroundColor: C.surface,
    backgroundGradientFrom: C.surface,
    backgroundGradientTo: C.surface,
    decimalPlaces: 1,
    color: (opacity = 1) => color.replace("1)", `${opacity})`),
    labelColor: () => C.textMuted,
    propsForDots: { r: "4", strokeWidth: "2", stroke: color.replace(", 1)", ", 1)") },
    propsForBackgroundLines: { stroke: C.border, strokeWidth: 0.5 },
  });

  // BMI calculation
  const bmi = userData.weight && userData.height
    ? (parseFloat(userData.weight) / Math.pow(parseFloat(userData.height) / 100, 2)).toFixed(1)
    : null;

  const weightToGoal = userData.weight && userData.targetWeight
    ? (parseFloat(userData.weight) - parseFloat(userData.targetWeight)).toFixed(1)
    : null;

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* Blobs */}
      <View style={[s.blob, { top: -60, right: -80, backgroundColor: C.blob1 }]} />
      <View style={[s.blob, { bottom: 200, left: -100, width: 240, height: 240, backgroundColor: C.blob2 }]} />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={s.header}>
          <View style={s.avatarWrap}>
            <Text style={s.avatarInitial}>
              {auth.currentUser?.email?.[0]?.toUpperCase() ?? "U"}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.headerName}>
              {auth.currentUser?.email?.split("@")[0] ?? "Utilizator"}
            </Text>
            <Text style={s.headerEmail}>{auth.currentUser?.email}</Text>
          </View>
          {bmi && (
            <View style={s.bmiBadge}>
              <Text style={s.bmiLabel}>BMI</Text>
              <Text style={s.bmiValue}>{bmi}</Text>
            </View>
          )}
        </View>

        {/* ── Quick stats ── */}
        {weightToGoal && (
          <View style={[s.card, s.goalBanner]}>
            <Ionicons name="flag" size={16} color={C.accent} />
            <Text style={s.goalText}>
              {parseFloat(weightToGoal) > 0
                ? `Mai ai ${weightToGoal} kg până la obiectiv`
                : parseFloat(weightToGoal) < 0
                ? `Ai depășit obiectivul cu ${Math.abs(parseFloat(weightToGoal))} kg`
                : "Ai atins obiectivul! 🎉"}
            </Text>
          </View>
        )}

        {/* ── Personal info ── */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <SectionLabel label="Date personale" />
            <TouchableOpacity
              onPress={() => (editing ? saveData() : setEditing(true))}
              style={[s.editBtn, editing && { backgroundColor: C.accent }]}
            >
              <Ionicons
                name={editing ? "checkmark" : "pencil"}
                size={14}
                color={editing ? "#fff" : C.accent}
              />
              <Text style={[s.editBtnText, editing && { color: "#fff" }]}>
                {editing ? "Salvează" : "Editează"}
              </Text>
            </TouchableOpacity>
          </View>

          {editing ? (
            <>
              <Field label="Vârstă" value={userData.age} onChangeText={(v) => setUserData({ ...userData, age: v })} keyboard="numeric" />
              <Field label="Greutate (kg)" value={userData.weight} onChangeText={(v) => setUserData({ ...userData, weight: v })} keyboard="numeric" />
              <Field label="Înălțime (cm)" value={userData.height} onChangeText={(v) => setUserData({ ...userData, height: v })} keyboard="numeric" />
              <Field label="Sex" value={userData.sex} onChangeText={(v) => setUserData({ ...userData, sex: v })} />
              <Field label="Greutate țintă (kg)" value={userData.targetWeight} onChangeText={(v) => setUserData({ ...userData, targetWeight: v })} keyboard="numeric" />
              <Field label="Nivel activitate" value={userData.activityLevel} onChangeText={(v) => setUserData({ ...userData, activityLevel: v })} />
              <Field label="Obiectiv" value={userData.goal} onChangeText={(v) => setUserData({ ...userData, goal: v })} />
            </>
          ) : (
            <>
              <InfoRow icon="calendar-outline" label="Vârstă" value={`${userData.age} ani`} />
              <InfoRow icon="scale-outline" label="Greutate" value={`${userData.weight} kg`} />
              <InfoRow icon="resize-outline" label="Înălțime" value={`${userData.height} cm`} />
              <InfoRow icon="person-outline" label="Sex" value={userData.sex} />
              <InfoRow icon="flag-outline" label="Greutate țintă" value={`${userData.targetWeight} kg`} />
              <InfoRow icon="flash-outline" label="Activitate" value={userData.activityLevel} />
              <InfoRow icon="trophy-outline" label="Obiectiv" value={userData.goal} />
            </>
          )}
        </View>

        {/* ── Daily plan ── */}
        {userData.plan && (
          <View style={s.card}>
            <SectionLabel label="Plan zilnic" />
            <View style={s.macroGrid}>
              <MacroCard label="Calorii" value={userData.plan.dailyCalories} unit="kcal" color="#F97316" />
              <MacroCard label="Proteine" value={`${userData.plan.dailyProtein}g`} unit="" color={C.accent} />
              <MacroCard label="Carbs" value={`${userData.plan.dailyCarbs}g`} unit="" color="#A855F7" />
              <MacroCard label="Grăsimi" value={`${userData.plan.dailyFat}g`} unit="" color="#EAB308" />
            </View>
            <View style={s.waterRow}>
              <Ionicons name="water-outline" size={16} color="#38BDF8" />
              <Text style={s.waterText}>Apă zilnică: <Text style={{ color: "#38BDF8", fontWeight: "700" }}>{userData.plan.dailyWater} ml</Text></Text>
            </View>
          </View>
        )}

        {/* ── Add progress ── */}
        <View style={s.card}>
          <SectionLabel label="Adaugă progres" />
          <View style={s.progressInputRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.fieldLabel}>Greutate (kg)</Text>
              <TextInput
                style={s.input}
                placeholder="0"
                placeholderTextColor={C.textLight}
                value={newProgress.weight}
                onChangeText={(v) => setNewProgress({ ...newProgress, weight: v })}
                keyboardType="numeric"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.fieldLabel}>Proteine (g)</Text>
              <TextInput
                style={s.input}
                placeholder="0"
                placeholderTextColor={C.textLight}
                value={newProgress.protein}
                onChangeText={(v) => setNewProgress({ ...newProgress, protein: v })}
                keyboardType="numeric"
              />
            </View>
          </View>
          <TouchableOpacity style={[s.btn, { backgroundColor: C.success, shadowColor: C.success }]} onPress={addProgress} activeOpacity={0.88}>
            <Ionicons name="add-circle-outline" size={18} color="#fff" />
            <Text style={s.btnText}>Adaugă intrare</Text>
          </TouchableOpacity>
        </View>

        {/* ── Charts ── */}
        {progressData.length > 0 && (
          <View style={s.card}>
            <SectionLabel label="Statistici" />

            {/* Tab toggle */}
            <View style={s.tabRow}>
              <TouchableOpacity
                style={[s.tab, activeChart === "weight" && s.tabActive]}
                onPress={() => setActiveChart("weight")}
              >
                <Text style={[s.tabText, activeChart === "weight" && s.tabTextActive]}>Greutate</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.tab, activeChart === "protein" && s.tabActive]}
                onPress={() => setActiveChart("protein")}
              >
                <Text style={[s.tabText, activeChart === "protein" && s.tabTextActive]}>Proteine</Text>
              </TouchableOpacity>
            </View>

            <LineChart
              data={{
                labels: chartLabels.length > 5 ? chartLabels.slice(-5) : chartLabels,
                datasets: [{ data: activeChart === "weight" ? (weightData.length > 5 ? weightData.slice(-5) : weightData) : (proteinData.length > 5 ? proteinData.slice(-5) : proteinData) }],
              }}
              width={screenWidth - 80}
              height={180}
              chartConfig={
                activeChart === "weight"
                  ? chartConfig("rgba(79, 110, 247, 1)")
                  : chartConfig("rgba(34, 197, 94, 1)")
              }
              bezier
              style={{ borderRadius: 16, marginTop: 8 }}
              withInnerLines
              withOuterLines={false}
            />

            {/* Last entry summary */}
            {progressData.length > 0 && (
              <View style={s.lastEntry}>
                <Text style={s.lastEntryLabel}>Ultima înregistrare</Text>
                <Text style={s.lastEntryValue}>
                  {progressData[progressData.length - 1].date} · {progressData[progressData.length - 1].weight} kg · {progressData[progressData.length - 1].protein}g prot
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ── Account ── */}
        <View style={s.card}>
          <SectionLabel label="Cont" />
          <TouchableOpacity
            style={[s.btn, { backgroundColor: C.dangerLight, shadowOpacity: 0 }]}
            onPress={() =>
              Alert.alert("Ești sigur?", "Vei fi deconectat.", [
                { text: "Anulează", style: "cancel" },
                { text: "Logout", style: "destructive", onPress: () => auth.signOut() },
              ])
            }
            activeOpacity={0.88}
          >
            <Ionicons name="log-out-outline" size={18} color={C.danger} />
            <Text style={[s.btnText, { color: C.danger }]}>Deconectează-te</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
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
  scroll: {
    paddingTop: Platform.OS === "ios" ? 60 : 44,
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 14,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 4,
  },
  avatarWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: C.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    fontSize: 22,
    fontWeight: "700",
    color: "#fff",
  },
  headerName: {
    fontSize: 18,
    fontWeight: "700",
    color: C.text,
    letterSpacing: -0.4,
  },
  headerEmail: {
    fontSize: 12,
    color: C.textMuted,
    marginTop: 2,
  },
  bmiBadge: {
    backgroundColor: C.accentLight,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: "center",
  },
  bmiLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: C.accent,
    letterSpacing: 1,
  },
  bmiValue: {
    fontSize: 18,
    fontWeight: "700",
    color: C.accent,
  },

  // Goal banner
  goalBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
  },
  goalText: {
    fontSize: 14,
    color: C.text,
    fontWeight: "500",
    flex: 1,
  },

  // Card
  card: {
    backgroundColor: C.glass,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.glassBorder,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },

  // Section label
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: C.accent,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    marginBottom: 14,
  },

  // Edit button
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: C.accent,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: C.accent,
  },

  // Info row
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  infoIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: C.accentLight,
    alignItems: "center",
    justifyContent: "center",
  },
  infoLabel: {
    flex: 1,
    fontSize: 14,
    color: C.textMuted,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: C.text,
  },

  // Field
  fieldWrap: {
    marginBottom: 10,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: C.textMuted,
    letterSpacing: 0.5,
    marginBottom: 5,
  },
  input: {
    backgroundColor: C.bg,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: C.text,
  },
  inputFocused: {
    borderColor: C.accent,
    backgroundColor: C.accentLight,
  },

  // Macro grid
  macroGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  macroCard: {
    flex: 1,
    backgroundColor: C.bg,
    borderRadius: 12,
    padding: 10,
    alignItems: "center",
  },
  macroValue: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  macroUnit: {
    fontSize: 10,
    color: C.textMuted,
    marginTop: 1,
  },
  macroLabel: {
    fontSize: 10,
    color: C.textMuted,
    marginTop: 4,
    fontWeight: "500",
  },
  waterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#EFF9FF",
    borderRadius: 10,
    padding: 10,
  },
  waterText: {
    fontSize: 13,
    color: C.textMuted,
  },

  // Progress inputs
  progressInputRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },

  // Button
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
    backgroundColor: C.accent,
  },
  btnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },

  // Charts
  tabRow: {
    flexDirection: "row",
    backgroundColor: C.bg,
    borderRadius: 10,
    padding: 3,
    marginBottom: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 7,
    alignItems: "center",
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: C.surface,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  tabText: {
    fontSize: 13,
    color: C.textMuted,
    fontWeight: "500",
  },
  tabTextActive: {
    color: C.text,
    fontWeight: "700",
  },
  lastEntry: {
    marginTop: 12,
    padding: 12,
    backgroundColor: C.bg,
    borderRadius: 10,
  },
  lastEntryLabel: {
    fontSize: 11,
    color: C.textMuted,
    fontWeight: "600",
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  lastEntryValue: {
    fontSize: 13,
    color: C.text,
    fontWeight: "500",
  },
});