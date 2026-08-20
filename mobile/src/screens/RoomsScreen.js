import React from "react";
import { View, Text, FlatList, Pressable, StyleSheet } from "react-native";
import { colors, spacing, radius, typography } from "../../theme";

const MOCK_ROOMS = [
  { id: "1", title: "سهرة الخميس ☕", hostName: "سارة", listeners: 128 },
  { id: "2", title: "نقاش: أفلام رمضان", hostName: "خالد", listeners: 54 },
  { id: "3", title: "موسيقى وسط الليل 🎵", hostName: "ريم", listeners: 301 },
];

function RoomCard({ room, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{room.hostName[0]}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle}>{room.title}</Text>
        <Text style={styles.cardHost}>بواسطة {room.hostName}</Text>
      </View>
      <Text style={styles.listeners}>{room.listeners} 🎧</Text>
    </Pressable>
  );
}

export default function RoomsScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>الغرف النشطة</Text>
        <Pressable style={styles.walletPill}>
          <Text style={styles.walletText}>💎 0</Text>
        </Pressable>
      </View>

      <FlatList
        data={MOCK_ROOMS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
        renderItem={({ item }) => (
          <RoomCard room={item} onPress={() => navigation.navigate("Room", { room: item })} />
        )}
      />
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
  listeners: { color: colors.blush, fontWeight: "600", fontSize: 12.5 },
});
