import React, { useCallback, useState } from "react";
import { View, Text, TextInput, Pressable, FlatList, StyleSheet, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { colors, spacing, radius, typography } from "../../theme";
import { agenciesApi, searchApi, session } from "../api";

export default function AgencyScreen({ navigation }) {
  const [token, setToken] = useState(null);
  const [agency, setAgency] = useState(null);
  const [hostStatus, setHostStatus] = useState(null);
  const [dashboard, setDashboard] = useState({ hosts: [] });
  const [payoutRequests, setPayoutRequests] = useState([]);
  const [newAgencyName, setNewAgencyName] = useState("");
  const [recruitQuery, setRecruitQuery] = useState("");
  const [recruitResults, setRecruitResults] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { token } = await session.load();
    setToken(token);

    const [{ agency }, hostStatus] = await Promise.all([
      agenciesApi.mine(token),
      agenciesApi.myHostStatus(token),
    ]);
    setAgency(agency);
    setHostStatus(hostStatus);

    if (agency) {
      const [dashboard, { payoutRequests }] = await Promise.all([
        agenciesApi.dashboard(agency.id, token),
        agenciesApi.payoutRequests(agency.id, token),
      ]);
      setDashboard(dashboard);
      setPayoutRequests(payoutRequests);
    }
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleCreateAgency() {
    if (!newAgencyName.trim()) return;
    try {
      await agenciesApi.create(newAgencyName.trim(), token);
      load();
    } catch (e) {
      Alert.alert("تعذّر الإنشاء", "قد تملك وكالة بالفعل");
    }
  }

  async function handleRecruitSearch(text) {
    setRecruitQuery(text);
    if (!text.trim()) return setRecruitResults([]);
    const { users } = await searchApi.search(text.trim());
    setRecruitResults(users);
  }

  async function handleRecruit(user) {
    await agenciesApi.recruitHost(agency.id, user.id, token);
    setRecruitQuery("");
    setRecruitResults([]);
    load();
  }

  async function handleRequestPayout() {
    try {
      await agenciesApi.requestPayout(hostStatus.diamondBalance, token);
      Alert.alert("تم الإرسال", "تم إرسال طلب السحب لوكالتك");
      load();
    } catch (e) {
      Alert.alert("تعذّر الإرسال", "تحقق من رصيد الماس لديك");
    }
  }

  async function handleApprove(requestId) {
    await agenciesApi.approvePayout(requestId, token);
    load();
  }

  if (loading) return <View style={styles.container} />;

  return (
    <View style={styles.container}>
      <Pressable onPress={() => navigation.goBack()} style={styles.back}>
        <Text style={styles.backText}>‹ رجوع</Text>
      </Pressable>
      <Text style={styles.title}>لوحة الوكالة</Text>

      <FlatList
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
        ListHeaderComponent={
          <>
            {hostStatus?.isHost && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>رصيدك كمذيع</Text>
                <Text style={styles.diamondBalance}>💎 {hostStatus.diamondBalance}</Text>
                <Pressable
                  style={styles.actionButton}
                  onPress={handleRequestPayout}
                  disabled={hostStatus.diamondBalance <= 0}
                >
                  <Text style={styles.actionButtonText}>طلب سحب كامل الرصيد</Text>
                </Pressable>
              </View>
            )}

            {!agency ? (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>لا تملك وكالة بعد</Text>
                <TextInput
                  value={newAgencyName}
                  onChangeText={setNewAgencyName}
                  placeholder="اسم الوكالة"
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                  textAlign="right"
                />
                <Pressable style={styles.actionButton} onPress={handleCreateAgency}>
                  <Text style={styles.actionButtonText}>إنشاء وكالة</Text>
                </Pressable>
              </View>
            ) : (
              <>
                <Text style={styles.sectionTitle}>{agency.name}</Text>

                <View style={styles.card}>
                  <Text style={styles.cardTitle}>تعيين مذيع جديد</Text>
                  <TextInput
                    value={recruitQuery}
                    onChangeText={handleRecruitSearch}
                    placeholder="ابحث بالاسم..."
                    placeholderTextColor={colors.textMuted}
                    style={styles.input}
                    textAlign="right"
                  />
                  {recruitResults.map((u) => (
                    <Pressable key={u.id} style={styles.recruitRow} onPress={() => handleRecruit(u)}>
                      <Text style={styles.recruitName}>{u.avatarEmoji} {u.displayName}</Text>
                      <Text style={styles.recruitAdd}>تعيين +</Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={styles.sectionTitle}>المذيعون ({dashboard.hosts.length})</Text>
              </>
            )}
          </>
        }
        data={agency ? dashboard.hosts : []}
        keyExtractor={(h) => h.userId}
        renderItem={({ item }) => (
          <View style={styles.hostRow}>
            <Text style={styles.hostName}>{item.displayName}</Text>
            <Text style={styles.hostDiamonds}>💎 {item.diamondBalance}</Text>
          </View>
        )}
        ListFooterComponent={
          agency && payoutRequests.length > 0 ? (
            <>
              <Text style={styles.sectionTitle}>طلبات السحب المعلّقة</Text>
              {payoutRequests
                .filter((p) => p.status === "pending")
                .map((p) => (
                  <View key={p.id} style={styles.hostRow}>
                    <Text style={styles.hostName}>
                      {p.display_name} — {p.diamonds_requested} 💎
                    </Text>
                    <Pressable style={styles.approveButton} onPress={() => handleApprove(p.id)}>
                      <Text style={styles.approveButtonText}>موافقة</Text>
                    </Pressable>
                  </View>
                ))}
            </>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingTop: spacing.xl },
  back: { paddingHorizontal: spacing.lg },
  backText: { color: colors.blush, fontSize: 15 },
  title: { ...typography.title, color: colors.textPrimary, textAlign: "center", marginTop: spacing.sm },
  sectionTitle: {
    color: colors.textPrimary,
    fontWeight: "700",
    fontSize: 15,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: { color: colors.textPrimary, fontWeight: "700" },
  diamondBalance: { color: colors.goldLight, fontSize: 20, fontWeight: "700", marginVertical: spacing.sm },
  input: {
    color: colors.textPrimary,
    backgroundColor: colors.backgroundElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
  },
  actionButton: {
    backgroundColor: colors.gold,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    alignItems: "center",
    marginTop: spacing.sm,
  },
  actionButtonText: { color: colors.textOnGold, fontWeight: "700", fontSize: 13 },
  recruitRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.sm,
  },
  recruitName: { color: colors.textPrimary },
  recruitAdd: { color: colors.blush, fontWeight: "700", fontSize: 12 },
  hostRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  hostName: { color: colors.textPrimary },
  hostDiamonds: { color: colors.goldLight, fontWeight: "700" },
  approveButton: {
    backgroundColor: colors.success,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  approveButtonText: { color: "#0a2e17", fontWeight: "700", fontSize: 12 },
});
