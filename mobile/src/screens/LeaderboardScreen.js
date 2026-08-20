import React, { useCallback, useState } from "react";
import { View, Text, FlatList, Pressable, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { colors, spacing, radius, typography } from "../../theme";
import { leaderboardApi } from "../api";

export default function LeaderboardScreen({ navigation }) {
  const [tab, setTab] = useState("senders");
  const [leaders, setLeaders] = useState([]);

  const load = useCallback(async (which) => {
    const { leaders } = which === "senders" ? await leaderboardApi.senders() : await leaderboardApi.hosts();
    setLeaders(leaders);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(tab);
    }, [tab, load])
  );

  return (
    <View style={styles.container}>
      <Pressable onPress={() => navigation.goBack()} style={styles.back}>
        <Text style={styles.backText}>‹ رجوع</Text>
      </Pressable>
      <Text style={styles.title}>لوحة الصدارة</Text>

      <View style={styles.tabs}>
        <Pressable
          style={[styles.tabButton, tab === "senders" && styles.tabActive]}
          onPress={() => setTab("senders")}
        >
          <Text style={[styles.tabText, tab === "senders" && styles.tabTextActive]}>
            أكثر المُهدين
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tabButton, tab === "hosts" && styles.tabActive]}
          onPress={() => setTab("hosts")}
        >
          <Text style={[styles.tabText, tab === "hosts" && styles.tabTextActive]}>
            أكثر المضيفين شعبية
          </Text>
        </Pressable>
      </View>

      <FlatList
        data={leaders}
        keyExtractor={(l) => l.id}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm }}
        renderItem={({ item, index }) => (
          <View style={styles.row}>
            <Text style={styles.rank}>#{index + 1}</Text>
            <Text style={styles.emoji}>{item.avatarEmoji}</Text>
            <Text style={styles.name}>{item.displayName}</Text>
            <Text style={styles.value}>
              {tab === "senders" ? `💰 ${item.totalSpent}` : `💎 ${item.totalEarned}`}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingTop: spacing.xl },
  back: { paddingHorizontal: spacing.lg },
  backText: { color: colors.blush, fontSize: 15 },
  title: { ...typography.title, color: colors.textPrimary, textAlign: "center", marginTop: spacing.sm },
  tabs: { flexDirection: "row", gap: spacing.sm, paddingHorizontal: spacing.lg, marginTop: spacing.md },
  tabButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  tabText: { color: colors.textMuted, fontSize: 12, fontWeight: "600" },
  tabTextActive: { color: colors.textOnGold },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rank: { color: colors.goldLight, fontWeight: "700", width: 28 },
  emoji: { fontSize: 20 },
  name: { color: colors.textPrimary, flex: 1, fontWeight: "600" },
  value: { color: colors.goldLight, fontWeight: "700", fontSize: 12 },
});
