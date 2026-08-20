import React, { useCallback, useState } from "react";
import { View, Text, Pressable, StyleSheet, TextInput, ScrollView, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { colors, spacing, radius, typography } from "../../theme";
import { usersApi, walletApi, session } from "../api";

const AVATAR_OPTIONS = ["🐺", "🌹", "👑", "🦋", "🌙", "⭐", "🔥", "💎"];

export default function ProfileScreen({ navigation }) {
  const [profile, setProfile] = useState(null);
  const [token, setToken] = useState(null);
  const [editing, setEditing] = useState(false);
  const [bioDraft, setBioDraft] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { token } = await session.load();
    setToken(token);
    try {
      const { profile } = await usersApi.me(token);
      setProfile(profile);
      setBioDraft(profile.bio ?? "");
    } catch {
      // تجاهل، سيُعاد المحاولة عند السحب للتحديث
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function saveBio() {
    const { profile } = await usersApi.updateMe({ bio: bioDraft }, token);
    setProfile(profile);
    setEditing(false);
  }

  async function pickAvatar(emoji) {
    const { profile } = await usersApi.updateMe({ avatarEmoji: emoji }, token);
    setProfile(profile);
  }

  async function handleDevTopup() {
    try {
      await walletApi.devTopup(1000, token);
      load();
    } catch (e) {
      Alert.alert("غير متاح", "الشحن التجريبي متاح فقط في بيئة التطوير");
    }
  }

  async function handleLogout() {
    await session.clear();
    navigation.getParent("Root")?.reset({ index: 0, routes: [{ name: "Login" }] });
  }

  if (loading || !profile) {
    return <View style={styles.container} />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.lg }}>
      <View style={styles.avatarCircle}>
        <Text style={styles.avatarEmoji}>{profile.avatarEmoji}</Text>
      </View>
      <Text style={styles.name}>{profile.displayName}</Text>
      {profile.vipLevel > 0 && <Text style={styles.vipBadge}>VIP {profile.vipLevel}</Text>}
      {profile.equippedFrame && (
        <Text style={styles.frameBadge}>
          {profile.equippedFrame.emoji} {profile.equippedFrame.name}
        </Text>
      )}

      <View style={styles.avatarPicker}>
        {AVATAR_OPTIONS.map((emoji) => (
          <Pressable key={emoji} onPress={() => pickAvatar(emoji)} style={styles.avatarOption}>
            <Text style={styles.avatarOptionText}>{emoji}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{profile.followerCount}</Text>
          <Text style={styles.statLabel}>متابِعون</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{profile.followingCount}</Text>
          <Text style={styles.statLabel}>يتابع</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>💰 {profile.coinBalance}</Text>
          <Text style={styles.statLabel}>عملات</Text>
        </View>
      </View>

      {editing ? (
        <>
          <TextInput
            value={bioDraft}
            onChangeText={setBioDraft}
            placeholder="اكتب نبذة عنك"
            placeholderTextColor={colors.textMuted}
            style={styles.bioInput}
            multiline
            maxLength={150}
          />
          <Pressable style={styles.saveButton} onPress={saveBio}>
            <Text style={styles.saveButtonText}>حفظ</Text>
          </Pressable>
        </>
      ) : (
        <Pressable onPress={() => setEditing(true)}>
          <Text style={styles.bio}>{profile.bio || "اضغط لإضافة نبذة عنك"}</Text>
        </Pressable>
      )}

      <Pressable style={styles.actionButton} onPress={() => navigation.navigate("Shop")}>
        <Text style={styles.actionButtonText}>🛍️ المتجر</Text>
      </Pressable>
      <Pressable style={styles.actionButton} onPress={() => navigation.navigate("Leaderboard")}>
        <Text style={styles.actionButtonText}>🏆 لوحة الصدارة</Text>
      </Pressable>
      <Pressable style={styles.actionButton} onPress={() => navigation.navigate("Agency")}>
        <Text style={styles.actionButtonText}>🏢 لوحة الوكالة</Text>
      </Pressable>
      <Pressable style={styles.actionButton} onPress={handleDevTopup}>
        <Text style={styles.actionButtonText}>➕ شحن تجريبي (+1000 عملة)</Text>
      </Pressable>
      <Pressable style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>تسجيل الخروج</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  avatarCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.gold,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  avatarEmoji: { fontSize: 40 },
  name: {
    ...typography.title,
    color: colors.textPrimary,
    textAlign: "center",
    marginTop: spacing.md,
  },
  vipBadge: {
    color: colors.textOnGold,
    backgroundColor: colors.gold,
    alignSelf: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: 2,
    borderRadius: radius.pill,
    fontWeight: "700",
    fontSize: 12,
    marginTop: spacing.xs,
  },
  frameBadge: { color: colors.goldLight, textAlign: "center", marginTop: spacing.xs, fontSize: 12 },
  avatarPicker: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  avatarOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarOptionText: { fontSize: 18 },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: spacing.xl,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
  },
  statItem: { alignItems: "center" },
  statNumber: { color: colors.goldLight, fontWeight: "700", fontSize: 16 },
  statLabel: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  bio: {
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.lg,
    fontSize: 13.5,
  },
  bioInput: {
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.lg,
    minHeight: 60,
    textAlign: "right",
  },
  saveButton: {
    backgroundColor: colors.gold,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    alignItems: "center",
    marginTop: spacing.sm,
  },
  saveButtonText: { color: colors.textOnGold, fontWeight: "700" },
  actionButton: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    alignItems: "center",
    marginTop: spacing.md,
  },
  actionButtonText: { color: colors.textPrimary, fontWeight: "600" },
  logoutButton: { marginTop: spacing.xl, alignItems: "center", marginBottom: spacing.xl },
  logoutButtonText: { color: colors.danger, fontWeight: "600" },
});
