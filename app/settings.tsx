import { Ionicons } from "@expo/vector-icons";
import { sendPasswordResetEmail, updateEmail } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { auth, db } from "../firebase/firebaseConfig";
import { Gemini } from "../src/useGemini";

// ─── Design tokens ──────────────────────────────────────────
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
  hasHealthCondition?: boolean;
  healthConditionName?: string;
  plan?: {
    dailyCalories?: number | string;
    dailyProtein?: number | string;
    dailyCarbs?: number | string;
    dailyFat?: number | string;
    dailyVitamins?: string;
  };
  progress?: { date: string; weight: number; protein: number }[];
}

const EMPTY: UserData = {
  age: "",
  weight: "",
  height: "",
  sex: "",
  targetWeight: "",
  activityLevel: "",
  goal: "",
  hasHealthCondition: false,
  healthConditionName: "",
  plan: {},
  progress: [],
};

// Small heuristic to prefill special plan targets based on the named condition
function getSuggestedSpecialPlan(condition: string) {
  const c = condition.toLowerCase().trim();
  if (!c) return undefined;
  if (c.includes("diab")) {
    return {
      dailyCarbs: 150,
      dailyFat: 60,
      dailyVitamins: "Omega-3, Magneziu, Vitamina D",
    };
  }
  if (c.includes("tensiune") || c.includes("hipert")) {
    return {
      dailyCarbs: 180,
      dailyFat: 65,
      dailyVitamins: "Magneziu, Potasiu, Omega-3",
    };
  }
  if (c.includes("anemie")) {
    return {
      dailyCarbs: 200,
      dailyFat: 70,
      dailyVitamins: "Fier, B12, Folat, Vitamina C",
    };
  }
  if (c.includes("colesterol") || c.includes("dislip")) {
    return {
      dailyCarbs: 190,
      dailyFat: 55,
      dailyVitamins: "Omega-3, Fibre 25-30g, Steroli vegetali",
    };
  }
  if (c.includes("tiroid")) {
    return {
      dailyCarbs: 190,
      dailyFat: 65,
      dailyVitamins: "Iod moderat, Seleniu, Vitamina D",
    };
  }
  return {
    dailyCarbs: 200,
    dailyFat: 70,
    dailyVitamins: "Multivitamine, Omega-3, Magneziu",
  };
}

function calculatePersonalPlan(user: UserData) {
  const age = Number(user.age);
  const weight = Number(user.weight);
  const height = Number(user.height);
  const sex = (user.sex || "").toLowerCase();
  const activity = (user.activityLevel || "").toLowerCase();
  const goal = (user.goal || "").toLowerCase();

  if (
    !Number.isFinite(age) ||
    !Number.isFinite(weight) ||
    !Number.isFinite(height) ||
    age <= 0 ||
    weight <= 0 ||
    height <= 0
  ) {
    return undefined;
  }

  const isFemale = sex.includes("f");
  const bmr = isFemale
    ? 10 * weight + 6.25 * height - 5 * age - 161
    : 10 * weight + 6.25 * height - 5 * age + 5;

  let activityFactor = 1.35;
  if (activity.includes("sedent")) activityFactor = 1.2;
  else if (activity.includes("activ") || activity.includes("intens"))
    activityFactor = 1.6;
  else if (activity.includes("moderat")) activityFactor = 1.45;

  let dailyCalories = Math.round(bmr * activityFactor);
  if (goal.includes("slab")) dailyCalories -= 350;
  if (goal.includes("masa")) dailyCalories += 300;
  dailyCalories = Math.max(dailyCalories, 1200);

  const proteinPerKg = goal.includes("masa")
    ? 2.0
    : goal.includes("slab")
      ? 1.9
      : 1.6;
  const dailyProtein = Math.max(Math.round(weight * proteinPerKg), 70);

  const proteinCalories = dailyProtein * 4;
  const fatGrams = Math.round((dailyCalories * 0.28) / 9);
  const fatCalories = fatGrams * 9;
  const carbsGrams = Math.max(
    Math.round((dailyCalories - proteinCalories - fatCalories) / 4),
    80,
  );

  return {
    dailyCalories,
    dailyProtein,
    dailyCarbs: carbsGrams,
    dailyFat: fatGrams,
  };
}

async function calculatePlanWithAI(user: UserData) {
  const prompt = `Ești nutriționist. Calculează ținte zilnice personalizate bazate pe:
- vârstă: ${user.age}
- greutate: ${user.weight} kg
- înălțime: ${user.height} cm
- sex: ${user.sex}
- greutate țintă: ${user.targetWeight} kg
- activitate: ${user.activityLevel}
- obiectiv: ${user.goal}

Răspunde DOAR cu JSON valid (fără markdown), schema:
{
  "dailyCalories": number,
  "dailyProtein": number,
  "dailyCarbs": number,
  "dailyFat": number
}`;

  const response = await Gemini(prompt);
  const cleaned = response
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();
  const parsed = JSON.parse(cleaned);

  const dailyCalories = Number(parsed?.dailyCalories);
  const dailyProtein = Number(parsed?.dailyProtein);
  const dailyCarbs = Number(parsed?.dailyCarbs);
  const dailyFat = Number(parsed?.dailyFat);

  if (
    !Number.isFinite(dailyCalories) ||
    !Number.isFinite(dailyProtein) ||
    !Number.isFinite(dailyCarbs) ||
    !Number.isFinite(dailyFat) ||
    dailyCalories <= 0 ||
    dailyProtein <= 0 ||
    dailyCarbs <= 0 ||
    dailyFat <= 0
  ) {
    throw new Error("AI plan invalid");
  }

  return {
    dailyCalories: Math.round(dailyCalories),
    dailyProtein: Math.round(dailyProtein),
    dailyCarbs: Math.round(dailyCarbs),
    dailyFat: Math.round(dailyFat),
  };
}

// ─── Sub-components ─────────────────────────────────────────
function SectionLabel({ label }: { label: string }) {
  return <Text style={s.sectionLabel}>{label}</Text>;
}

function Field({
  label,
  value,
  onChangeText,
  keyboard,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  keyboard?: any;
  placeholder?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={s.fieldWrap}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        style={[s.input, focused && s.inputFocused]}
        value={value}
        placeholder={placeholder}
        placeholderTextColor={C.textLight}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        keyboardType={keyboard}
        autoCapitalize="none"
      />
    </View>
  );
}

function ToggleRow({
  label,
  value,
  onToggle,
}: {
  label: string;
  value: boolean;
  onToggle: () => void;
}) {
  return (
    <TouchableOpacity
      style={s.toggleRow}
      onPress={onToggle}
      activeOpacity={0.8}
    >
      <View style={[s.toggleDot, value && s.toggleDotOn]}>
        <View style={[s.toggleKnob, value && s.toggleKnobOn]} />
      </View>
      <Text style={s.toggleLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) {
  return (
    <View style={s.infoRow}>
      <View style={s.infoIcon}>
        <Ionicons name={icon} size={15} color={C.accent} />
      </View>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={s.infoValue}>{value || "—"}</Text>
    </View>
  );
}

function ActionRow({
  icon,
  label,
  sublabel,
  onPress,
  color = C.accent,
  bgColor = C.accentLight,
  danger = false,
}: {
  icon: any;
  label: string;
  sublabel?: string;
  onPress: () => void;
  color?: string;
  bgColor?: string;
  danger?: boolean;
}) {
  return (
    <TouchableOpacity
      style={s.actionRow}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={[s.actionIcon, { backgroundColor: bgColor }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[s.actionLabel, danger && { color: C.danger }]}>
          {label}
        </Text>
        {sublabel && <Text style={s.actionSublabel}>{sublabel}</Text>}
      </View>
      {!danger && (
        <Ionicons name="chevron-forward" size={16} color={C.textLight} />
      )}
    </TouchableOpacity>
  );
}

// ─── Main ───────────────────────────────────────────────────
export default function Settings() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [editing, setEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [newEmail, setNewEmail] = useState("");
  const [emailFocused, setEmailFocused] = useState(false);

  useEffect(() => {
    loadUserData();
    setNewEmail(auth.currentUser?.email || "");
  }, []);

  const loadUserData = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        setUserData(EMPTY);
        return;
      }
      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setUserData({ ...EMPTY, ...(docSnap.data() as UserData) });
      } else {
        await setDoc(docRef, EMPTY, { merge: true });
        setUserData(EMPTY);
      }
    } catch {
      setUserData(EMPTY);
    }
  };

  const saveData = async () => {
    const user = auth.currentUser;
    if (!user || !userData || isSaving) return;
    setIsSaving(true);
    setSaveStatus(null);
    try {
      let aiOrFallbackPlan = calculatePersonalPlan(userData);
      try {
        aiOrFallbackPlan = await calculatePlanWithAI(userData);
      } catch {
        // fallback remains local heuristic
      }

      const specialPlan =
        userData.hasHealthCondition && userData.healthConditionName
          ? getSuggestedSpecialPlan(userData.healthConditionName)
          : undefined;

      const nextPlan = {
        ...(userData.plan ?? {}),
        ...(aiOrFallbackPlan ?? {}),
        ...(specialPlan ?? {}),
      };

      const payload = {
        ...userData,
        plan: Object.keys(nextPlan).length ? nextPlan : userData.plan,
      };

      await setDoc(doc(db, "users", user.uid), payload as any, {
        merge: true,
      });
      setUserData(payload);
      setEditing(false);
      setSaveStatus({
        type: "success",
        text: "Plan AI recalculat și datele personale au fost salvate.",
      });
    } catch {
      setSaveStatus({
        type: "error",
        text: "Nu am putut salva datele sau recalcula planul AI.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const onChangeEmail = async () => {
    const user = auth.currentUser;
    if (!user || !newEmail.trim()) {
      Alert.alert("Eroare", "Introdu un email valid.");
      return;
    }
    try {
      await updateEmail(user, newEmail.trim());
      Alert.alert("Succes", "Email-ul a fost actualizat.");
    } catch (error: any) {
      if (error?.code === "auth/requires-recent-login") {
        Alert.alert(
          "Reautentificare necesară",
          "Pentru a schimba email-ul, fă logout și autentifică-te din nou.",
        );
      } else {
        Alert.alert("Eroare", "Nu am putut actualiza email-ul.");
      }
    }
  };

  const onResetPassword = async () => {
    const email = auth.currentUser?.email;
    if (!email) {
      Alert.alert("Eroare", "Nu există email asociat contului.");
      return;
    }
    Alert.alert(
      "Resetează parola",
      `Trimitem un email de resetare la ${email}.`,
      [
        { text: "Anulează", style: "cancel" },
        {
          text: "Trimite",
          onPress: async () => {
            try {
              await sendPasswordResetEmail(auth, email);
              Alert.alert("Email trimis!", "Verifică inbox-ul.");
            } catch {
              Alert.alert("Eroare", "Nu am putut trimite email-ul.");
            }
          },
        },
      ],
    );
  };

  if (!userData) {
    return (
      <View
        style={[s.root, { alignItems: "center", justifyContent: "center" }]}
      >
        <Text style={{ color: C.textMuted }}>Se încarcă...</Text>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* Blobs */}
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
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Header ── */}
        <View style={s.pageHeader}>
          <View style={s.pageIconWrap}>
            <Ionicons name="settings-outline" size={22} color={C.accent} />
          </View>
          <View>
            <Text style={s.pageTitle}>Setări</Text>
            <Text style={s.pageSubtitle}>{auth.currentUser?.email}</Text>
          </View>
        </View>

        {/* ── Personal info ── */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <SectionLabel label="Date personale" />
            {editing ? (
              <View style={s.cardHeaderActions}>
                <TouchableOpacity
                  onPress={() => {
                    setEditing(false);
                    setSaveStatus(null);
                  }}
                  style={[s.editBtn, { borderColor: C.textLight }]}
                  disabled={isSaving}
                >
                  <Text style={[s.editBtnText, { color: C.textMuted }]}>
                    Anulează
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={saveData}
                  style={[
                    s.editBtn,
                    { backgroundColor: C.accent, borderColor: C.accent },
                    isSaving && { opacity: 0.75 },
                  ]}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="checkmark" size={13} color="#fff" />
                  )}
                  <Text style={[s.editBtnText, { color: "#fff" }]}>
                    {isSaving ? "Se salvează" : "Salvează"}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => {
                  setEditing(true);
                  setSaveStatus(null);
                }}
                style={s.editBtn}
              >
                <Ionicons name="pencil" size={13} color={C.accent} />
                <Text style={s.editBtnText}>Editează</Text>
              </TouchableOpacity>
            )}
          </View>

          {saveStatus && (
            <View
              style={[
                s.saveStatusWrap,
                saveStatus.type === "success"
                  ? s.saveStatusSuccess
                  : s.saveStatusError,
              ]}
            >
              <Ionicons
                name={
                  saveStatus.type === "success"
                    ? "checkmark-circle"
                    : "alert-circle"
                }
                size={16}
                color={saveStatus.type === "success" ? C.success : C.danger}
              />
              <Text
                style={[
                  s.saveStatusText,
                  {
                    color: saveStatus.type === "success" ? C.success : C.danger,
                  },
                ]}
              >
                {saveStatus.text}
              </Text>
            </View>
          )}

          {editing ? (
            <>
              <ToggleRow
                label="Am condiții medicale (plan special)"
                value={!!userData.hasHealthCondition}
                onToggle={() => {
                  const next = !userData.hasHealthCondition;
                  setUserData({
                    ...userData,
                    hasHealthCondition: next,
                    healthConditionName: next
                      ? userData.healthConditionName
                      : "",
                  });
                }}
              />
              {userData.hasHealthCondition && (
                <Field
                  label="Condiție medicală"
                  value={userData.healthConditionName ?? ""}
                  onChangeText={(v) => {
                    const suggestion = getSuggestedSpecialPlan(v);
                    const nextPlan = suggestion
                      ? { ...(userData.plan ?? {}), ...suggestion }
                      : userData.plan;
                    setUserData({
                      ...userData,
                      healthConditionName: v,
                      plan: nextPlan,
                    });
                  }}
                  placeholder="ex: diabet, hipertensiune"
                />
              )}
              <View style={s.fieldRow}>
                <View style={{ flex: 1 }}>
                  <Field
                    label="Vârstă"
                    value={userData.age}
                    onChangeText={(v) => setUserData({ ...userData, age: v })}
                    keyboard="numeric"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Field
                    label="Sex"
                    value={userData.sex}
                    onChangeText={(v) => setUserData({ ...userData, sex: v })}
                    placeholder="M / F"
                  />
                </View>
              </View>
              <View style={s.fieldRow}>
                <View style={{ flex: 1 }}>
                  <Field
                    label="Greutate (kg)"
                    value={userData.weight}
                    onChangeText={(v) =>
                      setUserData({ ...userData, weight: v })
                    }
                    keyboard="numeric"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Field
                    label="Înălțime (cm)"
                    value={userData.height}
                    onChangeText={(v) =>
                      setUserData({ ...userData, height: v })
                    }
                    keyboard="numeric"
                  />
                </View>
              </View>
              <Field
                label="Greutate țintă (kg)"
                value={userData.targetWeight}
                onChangeText={(v) =>
                  setUserData({ ...userData, targetWeight: v })
                }
                keyboard="numeric"
              />
              <Field
                label="Nivel activitate"
                value={userData.activityLevel}
                onChangeText={(v) =>
                  setUserData({ ...userData, activityLevel: v })
                }
                placeholder="sedentar / moderat / activ"
              />
              <Field
                label="Obiectiv"
                value={userData.goal}
                onChangeText={(v) => setUserData({ ...userData, goal: v })}
                placeholder="slăbire / menținere / masă musculară"
              />

              {userData.hasHealthCondition && (
                <>
                  <SectionLabel label="Plan special nutrienți" />
                  <Field
                    label="Carbohidrați țintă (g)"
                    value={userData.plan?.dailyCarbs?.toString() ?? ""}
                    onChangeText={(v) =>
                      setUserData({
                        ...userData,
                        plan: { ...userData.plan, dailyCarbs: v },
                      })
                    }
                    keyboard="numeric"
                  />
                  <Field
                    label="Grăsimi țintă (g)"
                    value={userData.plan?.dailyFat?.toString() ?? ""}
                    onChangeText={(v) =>
                      setUserData({
                        ...userData,
                        plan: { ...userData.plan, dailyFat: v },
                      })
                    }
                    keyboard="numeric"
                  />
                  <Field
                    label="Vitamine / note speciale"
                    value={userData.plan?.dailyVitamins ?? ""}
                    onChangeText={(v) =>
                      setUserData({
                        ...userData,
                        plan: { ...userData.plan, dailyVitamins: v },
                      })
                    }
                    placeholder="ex: complex B, D3 2000UI, magneziu"
                  />
                </>
              )}
            </>
          ) : (
            <>
              <InfoRow
                icon="medkit-outline"
                label="Plan special sănătate"
                value={userData.hasHealthCondition ? "Da" : "Nu"}
              />
              <InfoRow
                icon="alert-circle-outline"
                label="Condiție medicală"
                value={userData.healthConditionName || "—"}
              />
              <InfoRow
                icon="calendar-outline"
                label="Vârstă"
                value={userData.age ? `${userData.age} ani` : ""}
              />
              <InfoRow
                icon="scale-outline"
                label="Greutate"
                value={userData.weight ? `${userData.weight} kg` : ""}
              />
              <InfoRow
                icon="resize-outline"
                label="Înălțime"
                value={userData.height ? `${userData.height} cm` : ""}
              />
              <InfoRow icon="person-outline" label="Sex" value={userData.sex} />
              <InfoRow
                icon="flag-outline"
                label="Greutate țintă"
                value={
                  userData.targetWeight ? `${userData.targetWeight} kg` : ""
                }
              />
              <InfoRow
                icon="flash-outline"
                label="Activitate"
                value={userData.activityLevel}
              />
              <InfoRow
                icon="trophy-outline"
                label="Obiectiv"
                value={userData.goal}
              />
              {userData.hasHealthCondition && (
                <>
                  <InfoRow
                    icon="leaf-outline"
                    label="Carbohidrați"
                    value={
                      userData.plan?.dailyCarbs
                        ? `${userData.plan.dailyCarbs} g`
                        : "—"
                    }
                  />
                  <InfoRow
                    icon="egg-outline"
                    label="Grăsimi"
                    value={
                      userData.plan?.dailyFat
                        ? `${userData.plan.dailyFat} g`
                        : "—"
                    }
                  />
                  <InfoRow
                    icon="heart-outline"
                    label="Vitamine / note"
                    value={userData.plan?.dailyVitamins || "—"}
                  />
                </>
              )}
            </>
          )}
        </View>

        {/* ── Account / Email ── */}
        <View style={s.card}>
          <SectionLabel label="Cont" />

          <View style={s.fieldWrap}>
            <Text style={s.fieldLabel}>Adresă de email</Text>
            <View style={s.emailRow}>
              <TextInput
                style={[
                  s.input,
                  { flex: 1, marginBottom: 0 },
                  emailFocused && s.inputFocused,
                ]}
                value={newEmail}
                onChangeText={setNewEmail}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor={C.textLight}
              />
              <TouchableOpacity
                style={s.emailBtn}
                onPress={onChangeEmail}
                activeOpacity={0.85}
              >
                <Text style={s.emailBtnText}>Actualizează</Text>
              </TouchableOpacity>
            </View>
            <Text style={s.fieldHint}>
              Necesită reautentificare recentă pentru a schimba email-ul.
            </Text>
          </View>
        </View>

        {/* ── Quick actions ── */}
        <View style={s.card}>
          <SectionLabel label="Securitate" />
          <ActionRow
            icon="lock-closed-outline"
            label="Resetează parola"
            sublabel="Primești un email de resetare"
            onPress={onResetPassword}
            color={C.warning}
            bgColor={C.warningLight}
          />
        </View>

        {/* ── Danger zone ── */}
        <View style={s.card}>
          <SectionLabel label="Sesiune" />
          <ActionRow
            icon="log-out-outline"
            label="Deconectează-te"
            onPress={() =>
              Alert.alert("Ești sigur?", "Vei fi deconectat din cont.", [
                { text: "Anulează", style: "cancel" },
                {
                  text: "Logout",
                  style: "destructive",
                  onPress: () => auth.signOut(),
                },
              ])
            }
            color={C.danger}
            bgColor={C.dangerLight}
            danger
          />
        </View>

        {/* App version */}
        <Text style={s.version}>REPS · v1.0.0</Text>

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

  // Page header
  pageHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 4,
  },
  pageIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: C.accentLight,
    alignItems: "center",
    justifyContent: "center",
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: C.text,
    letterSpacing: -0.5,
  },
  pageSubtitle: {
    fontSize: 12,
    color: C.textMuted,
    marginTop: 2,
  },

  // Card
  card: {
    backgroundColor: C.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  cardHeaderActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: 8,
    marginLeft: 8,
    flexShrink: 1,
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
  saveStatusWrap: {
    marginBottom: 10,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  saveStatusSuccess: {
    backgroundColor: C.successLight,
  },
  saveStatusError: {
    backgroundColor: C.dangerLight,
  },
  saveStatusText: {
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },

  // Info row (view mode)
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

  // Field (edit mode)
  fieldRow: {
    flexDirection: "row",
    gap: 10,
  },
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
  fieldHint: {
    fontSize: 11,
    color: C.textLight,
    marginTop: 6,
  },
  input: {
    backgroundColor: "transparent",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: C.text,
    marginBottom: 0,
  },
  inputFocused: {
    borderColor: C.accent,
    backgroundColor: C.accentLight,
  },

  // Email row
  emailRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  emailBtn: {
    backgroundColor: C.accent,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  emailBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },

  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 6,
    marginBottom: 10,
  },
  toggleDot: {
    width: 46,
    height: 26,
    borderRadius: 13,
    backgroundColor: C.border,
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  toggleDotOn: {
    backgroundColor: C.accent,
  },
  toggleKnob: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#fff",
    transform: [{ translateX: 0 }],
  },
  toggleKnobOn: {
    transform: [{ translateX: 18 }],
  },
  toggleLabel: {
    fontSize: 14,
    color: C.text,
    fontWeight: "600",
  },

  // Action row
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  actionLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: C.text,
  },
  actionSublabel: {
    fontSize: 12,
    color: C.textMuted,
    marginTop: 1,
  },

  // Version
  version: {
    textAlign: "center",
    fontSize: 12,
    color: C.textLight,
    letterSpacing: 1,
    marginTop: 4,
  },
});
