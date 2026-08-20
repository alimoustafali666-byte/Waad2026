import React, { useCallback, useState } from "react";
import { View, Text, FlatList, Pressable, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { colors, spacing, radius, typography } from "../../theme";
import { notificationsApi, session } from "../api";

function describeNotification(n) {
  if (n.type === "follow") return `${n.payload.followerName} بدأ متابعتك 👤`;
  if (n.type === "gift")
    return `${n.payload.senderName} أرسل لك ${n.payload.giftEmoji} ${n.payload.giftName} (+${n.payload.diamondsCredited} 💎)`;
  return "إشعار جديد";
}

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState([]);
  const [token, setToken] = useState(null);

  const load = useCallback(async () => {
    const { token } = await session.load();
    setToken(token);
    const { notifications } = await notificationsApi.list(token);
    setNotifications(notifications);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function markAllRead() {
    await notificationsApi.markAllRead(token);
    load();
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>الإشعارات</Text>
        <Pressable onPress={markAllRead}>
          <Text style={styles.markAll}>تعليم الكل كمقروء</Text>
        </Pressable>
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(n) => n.id}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm }}
        ListEmptyComponent={<Text style={styles.empty}>لا توجد إشعارات بعد</Text>}
        renderItem={({ item }) => (
          <View style={[styles.card, !item.isRead && styles.unread]}>
            <Text style={styles.cardText}>{describeNotification(item)}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingTop: spacing.xl },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
  },
  title: { ...typography.title, color: colors.textPrimary },
  markAll: { color: colors.blush, fontSize: 12 },
  empty: { color: colors.textMuted, textAlign: "center", marginTop: spacing.xxl },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  unread: { borderColor: colors.gold },
  cardText: { color: colors.textPrimary, fontSize: 13.5 },
});
