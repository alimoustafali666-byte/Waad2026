import React, { useCallback, useEffect, useState } from "react";
import { View, Text, Image, FlatList, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { colors, spacing, radius, typography } from "../../theme";
import { roomsApi, walletApi, session } from "../api";

function RoomCard({ room, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{room.host_name?.[0] ?? "؟"}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle}>{room.title}</Text>
        <Text style={styles.cardHost}>بواسطة {room.host_name}</Text>
      </View>
    </Pressable>
  );
}

export default function RoomsScreen({ navigation }) {
  const [rooms, setRooms] = useState([]);
  const [coinBalance, setCoinBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { rooms } = await roomsApi.list();
      setRooms(rooms);

      const { userId } = await session.load();
      if (userId) {
        const wallet = await walletApi.get(userId);
        setCoinBalance(wallet.coinBalance);
      }
    } catch (e) {
      setError("تعذّر تحميل الغرف. تأكد من تشغيل الخادم.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerBrand}>
          <Image source={require("../../assets/icon.png")} style={styles.headerLogo} />
          <Text style={styles.headerTitle}>الغرف النشطة</Text>
        </View>
        <View style={styles.walletPill}>
          <Text style={styles.walletText}>💰 {coinBalance}</Text>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.gold} style={{ marginTop: spacing.xxl }} />
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : (
        <FlatList
          data={rooms}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
          onRefresh={load}
          refreshing={loading}
          ListEmptyComponent={<Text style={styles.empty}>لا توجد غرف نشطة الآن</Text>}
          renderItem={({ item }) => (
            <RoomCard room={item} onPress={() => navigation.navigate("Room", { room: item })} />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  headerBrand: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  headerLogo: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: colors.gold },
  headerTitle: { ...typography.title, color: colors.textPrimary },
  walletPill: {
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  walletText: { color: colors.goldLight, fontWeight: "700" },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.backgroundElevated,
    borderWidth: 1.5,
    borderColor: colors.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: colors.goldLight, fontWeight: "700", fontSize: 18 },
  cardTitle: { color: colors.textPrimary, fontWeight: "700", fontSize: 15 },
  cardHost: { color: colors.textMuted, fontSize: 12.5, marginTop: 2 },
  errorText: { color: colors.danger, textAlign: "center", marginTop: spacing.xxl },
  empty: { color: colors.textMuted, textAlign: "center", marginTop: spacing.xxl },
});
