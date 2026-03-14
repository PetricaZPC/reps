import { ScrollView, StyleSheet, Text, TouchableOpacity, View, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { WorkoutResult } from "./WorkoutSession";
import { WorkoutPreset } from "./workoutPresets";

const C = {
  bg: "#F7F8FA",
  glass: "rgba(255,255,255,0.72)",
  glassBorder: "rgba(255,255,255,0.9)",
  accent: "#4F6EF7",
  accentLight: "#EEF1FF",
  success: "#22C55E",
  successLight: "#DCFCE7",
  danger: "#EF4444",
  dangerLight: "#FEE2E2",
  warning: "#F97316",
  warningLight: "#FFF0E8",
  text: "#0F0F10",
  textMuted: "#8A8FA8",
  textLight: "#B8BCCD",
  border: "rgba(0,0,0,0.07)",
  blob1: "#E8EDFF",
  blob2: "#F0E8FF",
};

interface Props {
  preset: WorkoutPreset;
  results: WorkoutResult[];
  onClose: () => void;
}

export default function WorkoutSummary({ preset, results, onClose }: Props) {
  const totalSets     = results.reduce((acc, r) => acc + r.sets.length, 0);
  const totalReps     = results.reduce((acc, r) => acc + r.sets.reduce((s, set) => s + set.repsOrSeconds, 0), 0);
  const completedSets = results.reduce((acc, r) => acc + r.sets.filter((s) => s.repsOrSeconds >= s.target).length, 0);
  const pct           = totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0;

  return (
    <View style={s.root}>
      <View style={[s.blob, { top: -60, right: -80, backgroundColor: C.blob1 }]} />
      <View style={[s.blob, { bottom: 100, left: -80, backgroundColor: C.blob2 }]} />

      {/* ── Header ── */}
      <View style={s.header}>
        <View style={s.trophyWrap}>
          <Text style={{ fontSize: 38 }}>🏆</Text>
        </View>
        <Text style={s.headerTitle}>Antrenament finalizat!</Text>
        <Text style={s.headerSub}>{preset.name}</Text>

        {/* Completion bar */}
        <View style={s.completionWrap}>
          <View style={s.completionRow}>
            <Text style={s.completionLabel}>Completat</Text>
            <Text style={[s.completionPct, { color: pct >= 80 ? C.success : pct >= 50 ? C.warning : C.danger }]}>
              {pct}%
            </Text>
          </View>
          <View style={s.completionTrack}>
            <View style={[s.completionFill, {
              width: `${pct}%` as any,
              backgroundColor: pct >= 80 ? C.success : pct >= 50 ? C.warning : C.danger,
            }]} />
          </View>
        </View>
      </View>

      {/* ── Stats ── */}
      <View style={s.statsRow}>
        {[
          { value: results.length, label: "Exerciții", icon: "barbell-outline", color: C.accent, bg: C.accentLight },
          { value: totalSets, label: "Seturi", icon: "layers-outline", color: C.warning, bg: C.warningLight },
          { value: totalReps, label: "Repetări", icon: "repeat-outline", color: C.success, bg: C.successLight },
        ].map((stat) => (
          <View key={stat.label} style={s.statCard}>
            <View style={[s.statIcon, { backgroundColor: stat.bg }]}>
              <Ionicons name={stat.icon as any} size={16} color={stat.color} />
            </View>
            <Text style={[s.statValue, { color: stat.color }]}>{stat.value}</Text>
            <Text style={s.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* ── Exercise breakdown ── */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={s.sectionLabel}>Detalii exerciții</Text>

        {results.map((result, idx) => {
          const done = result.sets.filter((s) => s.repsOrSeconds >= s.target).length;
          const all  = result.sets.length;
          const allDone = done === all;

          return (
            <View key={idx} style={s.exerciseCard}>
              <View style={s.exerciseCardHeader}>
                <View style={[s.exerciseIconWrap, { backgroundColor: allDone ? C.successLight : C.dangerLight }]}>
                  <Ionicons
                    name={allDone ? "checkmark-circle" : "close-circle"}
                    size={18}
                    color={allDone ? C.success : C.danger}
                  />
                </View>
                <Text style={s.exerciseName}>{result.exerciseName}</Text>
                <View style={[s.miniBadge, { backgroundColor: allDone ? C.successLight : C.dangerLight }]}>
                  <Text style={[s.miniBadgeText, { color: allDone ? C.success : C.danger }]}>
                    {done}/{all}
                  </Text>
                </View>
              </View>

              {result.sets.map((set, sIdx) => {
                const ok = set.repsOrSeconds >= set.target;
                return (
                  <View key={sIdx} style={s.setRow}>
                    <View style={[s.setDot, { backgroundColor: ok ? C.successLight : C.dangerLight }]}>
                      <Ionicons name={ok ? "checkmark" : "close"} size={10} color={ok ? C.success : C.danger} />
                    </View>
                    <Text style={s.setLabel}>Set {sIdx + 1}</Text>
                    <Text style={[s.setScore, { color: ok ? C.success : C.danger }]}>
                      {set.repsOrSeconds}
                    </Text>
                    <Text style={s.setTarget}>/ {set.target}</Text>
                  </View>
                );
              })}
            </View>
          );
        })}

        <View style={{ height: 110 }} />
      </ScrollView>

      {/* ── Footer button ── */}
      <View style={s.footer}>
        <TouchableOpacity style={s.closeBtn} onPress={onClose} activeOpacity={0.88}>
          <Ionicons name="checkmark" size={20} color="#fff" />
          <Text style={s.closeBtnText}>Gata</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  blob: { position: "absolute", width: 280, height: 280, borderRadius: 140, opacity: 0.5 },
  scroll: { paddingHorizontal: 20, paddingBottom: 20, gap: 10 },

  // Header
  header: {
    alignItems: "center",
    paddingTop: Platform.OS === "ios" ? 60 : 44,
    paddingBottom: 20,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    backgroundColor: C.glass,
    gap: 6,
  },
  trophyWrap: {
    width: 72, height: 72, borderRadius: 22,
    backgroundColor: C.warningLight,
    alignItems: "center", justifyContent: "center",
    marginBottom: 6,
  },
  headerTitle: { fontSize: 24, fontWeight: "700", color: C.text, letterSpacing: -0.5 },
  headerSub: { fontSize: 14, color: C.textMuted },
  completionWrap: { width: "100%", marginTop: 12, gap: 6 },
  completionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  completionLabel: { fontSize: 12, color: C.textMuted, fontWeight: "500" },
  completionPct: { fontSize: 13, fontWeight: "700" },
  completionTrack: { height: 7, borderRadius: 4, backgroundColor: C.border, overflow: "hidden" },
  completionFill: { height: 7, borderRadius: 4 },

  // Stats
  statsRow: { flexDirection: "row", gap: 10, paddingHorizontal: 20, paddingVertical: 16 },
  statCard: {
    flex: 1,
    backgroundColor: C.glass,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.glassBorder,
    padding: 14,
    alignItems: "center",
    gap: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 1,
  },
  statIcon: { width: 32, height: 32, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  statValue: { fontSize: 22, fontWeight: "700", letterSpacing: -0.5 },
  statLabel: { fontSize: 11, color: C.textMuted, fontWeight: "500" },

  // Section label
  sectionLabel: {
    fontSize: 11, fontWeight: "700", color: C.accent,
    letterSpacing: 1.4, textTransform: "uppercase", marginBottom: 4,
  },

  // Exercise card
  exerciseCard: {
    backgroundColor: C.glass,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.glassBorder,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 2,
  },
  exerciseCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  exerciseIconWrap: { width: 32, height: 32, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  exerciseName: { flex: 1, fontSize: 14, fontWeight: "700", color: C.text },
  miniBadge: { borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4 },
  miniBadgeText: { fontSize: 12, fontWeight: "700" },

  // Set row
  setRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  setDot: { width: 20, height: 20, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  setLabel: { flex: 1, fontSize: 13, color: C.textMuted },
  setScore: { fontSize: 15, fontWeight: "700" },
  setTarget: { fontSize: 13, color: C.textMuted },

  // Footer
  footer: {
    position: "absolute",
    bottom: 0, left: 0, right: 0,
    padding: 20,
    paddingBottom: Platform.OS === "ios" ? 36 : 20,
    backgroundColor: C.glass,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  closeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: C.success,
    borderRadius: 16,
    paddingVertical: 16,
    shadowColor: C.success,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 6,
  },
  closeBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});