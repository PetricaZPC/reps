import { Ionicons } from "@expo/vector-icons";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Dimensions,
  Platform,
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
import { passData } from "../src/passData";

// Tokens
const C = {
  bg: "#F7F8FA",
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
  blob1: "#E8EDFF",
  blob2: "#F0E8FF",
};

const TODAY = new Date().toISOString().split("T")[0];
const screenWidth = Dimensions.get("window").width;

// Types
interface ProgressEntry {
  date: string;
  weight: number;
  protein: number;
}

interface UserData {
  weight?: string;
  targetWeight?: string;
  height?: string;
  activityLevel?: string;
  goal?: string;
  plan?: {
    dailyCalories: number;
    dailyProtein: number;
    dailyCarbs?: number | string;
    dailyFat?: number | string;
    dailyVitamins?: string;
  };
  hasHealthCondition?: boolean;
  progress?: ProgressEntry[];
  streak?: number;
  lastLogDate?: string;
}

// Helpers
function SectionLabel({ label }: { label: string }) {
  return <Text style={s.sectionLabel}>{label}</Text>;
}

function MacroBar({
  label,
  value,
  target,
  color,
  unit,
}: {
  label: string;
  value: number;
  target: number;
  color: string;
  unit: string;
}) {
  const pct = Math.min(value / target, 1) * 100;
  return (
    <View style={s.macroBarWrap}>
      <View style={s.macroBarHeader}>
        <Text style={s.macroBarLabel}>{label}</Text>
        <Text style={s.macroBarValue}>
          <Text style={{ color, fontWeight: "700" }}>{value}</Text>
          <Text style={{ color: C.textMuted }}>
            {" "}
            / {target} {unit}
          </Text>
        </Text>
      </View>
      <View style={s.macroBarTrack}>
        <View
          style={[s.macroBarFill, { width: `${pct}%`, backgroundColor: color }]}
        />
      </View>
    </View>
  );
}

// Main
export default function Profile() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [todayWeight, setTodayWeight] = useState("");
  const [weightFocused, setWeightFocused] = useState(false);

  const consumedCalories = passData((state) => state.calories) ?? 0;
  const consumedProtein = passData((state) => state.protein) ?? 0;

  function hitDailyGoal(
    goal: string | undefined,
    targets: { calories: number; protein: number },
  ) {
    const g = goal?.toLowerCase() ?? "";
    const cal = consumedCalories;
    const prot = consumedProtein;
    const calTarget = targets.calories;
    const protTarget = targets.protein;
    const protOk = prot >= protTarget * 0.9; // allow small margin on protein

    if (g.includes("slab")) {
      return cal >= calTarget - 200 && cal <= calTarget && protOk;
    }
    if (g.includes("masa")) {
      return cal >= calTarget && cal <= calTarget + 400 && protOk;
    }
    // mentinere / default window
    return cal >= calTarget - 200 && cal <= calTarget + 200 && protOk;
  }

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    const user = auth.currentUser;
    if (!user) return;
    const snap = await getDoc(doc(db, "users", user.uid));
    if (snap.exists()) {
      const data = snap.data() as UserData;
      setUserData(data);
      const todayEntry = (data.progress ?? []).find((p) => p.date === TODAY);
      if (todayEntry) setTodayWeight(String(todayEntry.weight));
    }
  };

  const logWeight = async () => {
    const w = parseFloat(todayWeight);
    if (isNaN(w) || w <= 0) {
      Alert.alert("Eroare", "Introdu o greutate valida.");
      return;
    }
    const user = auth.currentUser;
    if (!user || !userData) return;

    const progress = [...(userData.progress ?? [])];
    const existingIdx = progress.findIndex((p) => p.date === TODAY);
    const entry: ProgressEntry = {
      date: TODAY,
      weight: w,
      protein: consumedProtein,
    };

    if (existingIdx >= 0) {
      progress[existingIdx] = entry;
    } else {
      progress.push(entry);
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = yesterday.toISOString().split("T")[0];
    const dailyTargets = {
      calories: userData.plan?.dailyCalories ?? 2000,
      protein: userData.plan?.dailyProtein ?? 150,
    };
    const hitGoal = hitDailyGoal(userData.goal, dailyTargets);

    let streak = userData.streak ?? 0;
    if (hitGoal) {
      if (userData.lastLogDate === yStr) {
        streak += 1;
      } else if (userData.lastLogDate !== TODAY) {
        streak = 1;
      }
    } else {
      // break the streak if goals are not met
      streak = 0;
    }

    await updateDoc(doc(db, "users", user.uid), {
      progress,
      streak,
      lastLogDate: hitGoal ? TODAY : userData.lastLogDate,
    } as any);

    setUserData({
      ...userData,
      progress,
      streak,
      lastLogDate: hitGoal ? TODAY : userData.lastLogDate,
    });
    Alert.alert(
      hitGoal ? "Zi reusita!" : "Greutate salvata",
      hitGoal
        ? `${w} kg si obiective atinse pentru azi.`
        : `${w} kg salvat, dar obiectivele zilnice nu au fost atinse (calorii/proteine).`,
    );
  };

  if (!userData) {
    return (
      <View
        style={[s.root, { alignItems: "center", justifyContent: "center" }]}
      >
        <Text style={{ color: C.textMuted }}>Se incarca...</Text>
      </View>
    );
  }

  const progress = userData.progress ?? [];
  const streak = userData.streak ?? 0;

  const latestWeight =
    (progress.length > 0 ? progress[progress.length - 1].weight : undefined) ??
    (userData.weight ? parseFloat(userData.weight) : undefined);
  const targetWeight = userData.targetWeight
    ? parseFloat(userData.targetWeight)
    : undefined;
  const heightCm = userData.height ? parseFloat(userData.height) : undefined;
  const bmi =
    latestWeight && heightCm
      ? (latestWeight / Math.pow(heightCm / 100, 2)).toFixed(1)
      : undefined;

  const recent = [...progress].slice(-7);
  const chartLabels = recent.map((p) => p.date.slice(5));
  const weightData = recent.map((p) => p.weight);
  const hasChartData = recent.length >= 2;

  const dailyCalories = userData.plan?.dailyCalories ?? 2000;
  const dailyProtein = userData.plan?.dailyProtein ?? 150;
  const dailyCarbs = userData.plan?.dailyCarbs
    ? Number(userData.plan.dailyCarbs)
    : undefined;
  const dailyFat = userData.plan?.dailyFat
    ? Number(userData.plan.dailyFat)
    : undefined;
  const dailyVitamins = userData.plan?.dailyVitamins;

  const todayEntry = progress.find((p) => p.date === TODAY);

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      <View
        style={[s.blob, { top: -60, right: -80, backgroundColor: C.blob1 }]}
      />
      <View
        style={[
          s.blob,
          {
            bottom: 200,
            left: -100,
            width: 240,
            height: 240,
            backgroundColor: C.blob2,
          },
        ]}
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
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
            <Text style={s.headerSub}>Progresul tau de azi</Text>
          </View>
        </View>

        {/* Streak */}
        <View style={s.card}>
          <View style={s.streakRow}>
            <View style={s.streakFlame}>
              <Ionicons name="flame" size={22} color="#F97316" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.streakCount}>
                {streak} {streak === 1 ? "zi" : "zile"} la rand
              </Text>
              <Text style={s.streakSub}>
                {streak === 0
                  ? "Inregistreaza greutatea azi pentru a incepe streak-ul"
                  : streak < 7
                    ? "Continua, esti pe drumul cel bun!"
                    : "Fenomenal, esti consistent!"}
              </Text>
            </View>
            {streak >= 7 && (
              <View style={s.streakBadge}>
                <Ionicons name="trophy" size={16} color="#EAB308" />
              </View>
            )}
          </View>

          <View style={s.streakDots}>
            {["L", "Ma", "Mi", "J", "V", "S", "D"].map((day, i) => {
              const d = new Date();
              d.setDate(d.getDate() - (6 - i));
              const dStr = d.toISOString().split("T")[0];
              const logged = progress.some((p) => p.date === dStr);
              return (
                <View key={i} style={s.streakDotWrap}>
                  <View style={[s.streakDot, logged && s.streakDotActive]} />
                  <Text style={s.streakDotLabel}>{day}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Snapshot */}
        <View style={s.card}>
          <SectionLabel label="Stare rapida" />
          <View style={s.snapshotRow}>
            <View style={s.snapshotItem}>
              <Text style={s.snapshotLabel}>Greutate</Text>
              <Text style={s.snapshotValue}>
                {latestWeight ? `${latestWeight.toFixed(1)} kg` : "–"}
              </Text>
            </View>
            <View style={s.snapshotItem}>
              <Text style={s.snapshotLabel}>Tint03</Text>
              <Text style={s.snapshotValue}>
                {targetWeight ? `${targetWeight.toFixed(1)} kg` : "–"}
              </Text>
            </View>
            <View style={s.snapshotItem}>
              <Text style={s.snapshotLabel}>BMI</Text>
              <Text style={s.snapshotValue}>{bmi ?? "–"}</Text>
            </View>
            <View style={s.snapshotItem}>
              <Text style={s.snapshotLabel}>Obiectiv</Text>
              <Text style={s.snapshotValue} numberOfLines={1}>
                {userData.goal || "–"}
              </Text>
            </View>
          </View>
        </View>

        {/* Targets */}
        <View style={s.card}>
          <SectionLabel label="Target de azi" />
          <MacroBar
            label="Calorii"
            value={consumedCalories}
            target={dailyCalories}
            color="#F97316"
            unit="kcal"
          />
          <MacroBar
            label="Proteine"
            value={consumedProtein}
            target={dailyProtein}
            color={C.accent}
            unit="g"
          />

          <View style={s.remainRow}>
            <View style={[s.remainChip, { backgroundColor: "#FFF0E8" }]}>
              <Text style={[s.remainChipText, { color: "#F97316" }]}>
                {Math.max(dailyCalories - consumedCalories, 0)} kcal ramase
              </Text>
            </View>
            <View style={[s.remainChip, { backgroundColor: C.accentLight }]}>
              <Text style={[s.remainChipText, { color: C.accent }]}>
                {Math.max(dailyProtein - consumedProtein, 0)}g proteina ramasa
              </Text>
            </View>
          </View>
        </View>

        {userData.hasHealthCondition && (dailyCarbs || dailyFat || dailyVitamins) && (
          <View style={s.card}>
            <SectionLabel label="Plan special" />
            {dailyCarbs !== undefined && (
              <Text style={s.specialLine}>Carbohidrați: {dailyCarbs} g</Text>
            )}
            {dailyFat !== undefined && (
              <Text style={s.specialLine}>Grăsimi: {dailyFat} g</Text>
            )}
            {dailyVitamins ? (
              <Text style={s.specialLine}>Vitamine: {dailyVitamins}</Text>
            ) : null}
          </View>
        )}

        {/* Weight log */}
        <View style={s.card}>
          <SectionLabel label="Greutate azi" />
          <View style={s.weightRow}>
            <TextInput
              style={[s.weightInput, weightFocused && s.inputFocused]}
              placeholder="ex. 78.5"
              placeholderTextColor={C.textLight}
              value={todayWeight}
              onChangeText={setTodayWeight}
              onFocus={() => setWeightFocused(true)}
              onBlur={() => setWeightFocused(false)}
              keyboardType="decimal-pad"
            />
            <Text style={s.weightUnit}>kg</Text>
            <TouchableOpacity
              style={s.logBtn}
              onPress={logWeight}
              activeOpacity={0.85}
            >
              <Ionicons name="checkmark" size={18} color="#fff" />
              <Text style={s.logBtnText}>
                {todayEntry ? "Actualizeaza" : "Salveaza"}
              </Text>
            </TouchableOpacity>
          </View>
          {todayEntry && (
            <View style={s.todayLogged}>
              <Ionicons name="checkmark-circle" size={15} color={C.success} />
              <Text style={s.todayLoggedText}>
                Inregistrat azi:{" "}
                <Text style={{ fontWeight: "700", color: C.text }}>
                  {todayEntry.weight} kg
                </Text>
              </Text>
            </View>
          )}
        </View>

        {/* Chart */}
        {hasChartData ? (
          <View style={s.card}>
            <SectionLabel label="Evolutie greutate" />
            <LineChart
              data={{
                labels: chartLabels,
                datasets: [{ data: weightData }],
              }}
              width={screenWidth - 80}
              height={180}
              chartConfig={{
                backgroundColor: "transparent",
                backgroundGradientFrom: "#FFFFFF",
                backgroundGradientTo: "#FFFFFF",
                decimalPlaces: 1,
                color: (opacity = 1) => `rgba(79, 110, 247, ${opacity})`,
                labelColor: () => C.textMuted,
                propsForDots: { r: "4", strokeWidth: "2", stroke: C.accent },
                propsForBackgroundLines: { stroke: C.border, strokeWidth: 0.5 },
              }}
              bezier
              style={{ borderRadius: 16, marginTop: 4 }}
              withInnerLines
              withOuterLines={false}
            />
            {weightData.length >= 2 &&
              (() => {
                const delta = (
                  weightData[weightData.length - 1] - weightData[0]
                ).toFixed(1);
                const isDown = parseFloat(delta) < 0;
                return (
                  <View
                    style={[
                      s.deltaChip,
                      {
                        backgroundColor: isDown
                          ? C.successLight
                          : C.warningLight,
                      },
                    ]}
                  >
                    <Ionicons
                      name={isDown ? "trending-down" : "trending-up"}
                      size={14}
                      color={isDown ? C.success : C.warning}
                    />
                    <Text
                      style={[
                        s.deltaText,
                        { color: isDown ? C.success : C.warning },
                      ]}
                    >
                      {isDown ? "" : "+"}
                      {delta} kg in ultimele {recent.length} inregistrari
                    </Text>
                  </View>
                );
              })()}
          </View>
        ) : (
          <View style={[s.card, s.emptyChart]}>
            <Ionicons name="stats-chart" size={28} color={C.text} />
            <Text style={s.emptyChartTitle}>Prea putine date</Text>
            <Text style={s.emptyChartSub}>
              Inregistreaza greutatea cel putin 2 zile pentru a vedea graficul.
            </Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// Styles
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
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

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 4,
  },
  avatarWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: C.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: { fontSize: 20, fontWeight: "700", color: "#fff" },
  headerName: {
    fontSize: 18,
    fontWeight: "700",
    color: C.text,
    letterSpacing: -0.4,
  },
  headerSub: { fontSize: 12, color: C.textMuted, marginTop: 2 },

  card: {
    backgroundColor: C.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 1,
  },

  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: C.accent,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    marginBottom: 14,
  },

  streakRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 16,
  },
  streakFlame: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: "#FFF0E8",
    alignItems: "center",
    justifyContent: "center",
  },
  streakCount: {
    fontSize: 20,
    fontWeight: "700",
    color: C.text,
    letterSpacing: -0.4,
  },
  streakSub: { fontSize: 12, color: C.textMuted, marginTop: 3 },
  streakBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#FEF9C3",
    alignItems: "center",
    justifyContent: "center",
  },
  streakDots: { flexDirection: "row", justifyContent: "space-between" },
  streakDotWrap: { alignItems: "center", gap: 5 },
  streakDot: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: C.border,
  },
  streakDotActive: {
    backgroundColor: "#FFF0E8",
    borderColor: "#F97316",
  },
  streakDotLabel: { fontSize: 10, color: C.textMuted, fontWeight: "600" },

  snapshotRow: {
    flexDirection: "row",
    gap: 10,
  },
  snapshotItem: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: "transparent",
  },
  snapshotLabel: {
    fontSize: 11,
    color: C.textMuted,
    marginBottom: 6,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  snapshotValue: { fontSize: 15, fontWeight: "700", color: C.text },

  macroBarWrap: { marginBottom: 14 },
  macroBarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 7,
  },
  macroBarLabel: { fontSize: 13, fontWeight: "600", color: C.text },
  macroBarValue: { fontSize: 13 },
  macroBarTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EEF1F7",
    overflow: "hidden",
  },
  macroBarFill: { height: 8, borderRadius: 4 },
  remainRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  remainChip: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: "center",
  },
  remainChipText: { fontSize: 12, fontWeight: "600" },

  weightRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  weightInput: {
    flex: 1,
    backgroundColor: "transparent",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 18,
    fontWeight: "700",
    color: C.text,
  },
  inputFocused: { borderColor: C.accent, backgroundColor: C.accentLight },
  weightUnit: {
    fontSize: 15,
    fontWeight: "600",
    color: C.textMuted,
    marginRight: 4,
  },
  logBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: C.accent,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  logBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  todayLogged: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    backgroundColor: C.successLight,
    borderRadius: 10,
    padding: 10,
  },
  todayLoggedText: { fontSize: 13, color: C.textMuted },

  deltaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  deltaText: { fontSize: 13, fontWeight: "600" },
  emptyChart: { alignItems: "center", paddingVertical: 28, gap: 6 },
  emptyChartTitle: { fontSize: 15, fontWeight: "700", color: C.text },
  emptyChartSub: {
    fontSize: 13,
    color: C.textMuted,
    textAlign: "center",
    lineHeight: 20,
  },
  specialLine: { fontSize: 14, color: C.text, marginBottom: 6, fontWeight: "600" },
});
