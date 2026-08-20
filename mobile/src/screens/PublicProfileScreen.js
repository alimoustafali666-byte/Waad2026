import React, { useEffect, useState } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { colors, spacing, radius, typography } from "../../theme";
import { usersApi, session } from "../api";

export default function PublicProfileScreen({ route, navigation }) {
  const { userId } = route.params;
  const [profile, setProfile] = useState(null);
  const [me, setMe] = useState({ userId: null, token: null });
  const [following, setFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function load() {
      const { token, userId: myId } = await session.load();
      if (!mounted) return;
      setMe({ userId: myId, token });

      const { profile } = await usersApi.get(userId);
      if (!mounted) return;
      setProfile(profile);

      const { users: followers } = await usersApi.followers(userId);
      if (mounted) setFollowing(followers.some((f) => f.id === myId));
      setLoading(false);
    }
    load();
    return () => {
      mounted = false;
    };
  }, [userId]);

  async function toggleFollow() {
    if (following) {
      await usersApi.unfollow(userId, me.token);
    } else {
      await usersApi.follow(userId, me.token);
    }
    setFollowing(!following);
  }

  if (loading || !profile) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color={colors.gold} style={{ marginTop: spacing.xxl }} />
      </View>
    );
  }

  const isMe = me.userId === userId;

  return (
    <View style={styles.container}>
      <Pressable onPress={() => navigation.goBack()} style={styles.back}>
        <Text style={styles.backText}>‹ رجوع</Text>
      </Pressable>

      <View style={styles.avatarCircle}>
        <Text style={styles.avatarEmoji}>{profile.avatarEmoji}</Text>
      </View>
      <Text style={styles.name}>{profile.displayName}</Text>
      {profile.vipLevel > 0 && <Text style={styles.vipBadge}>VIP {profile.vipLevel}</Text>}
      <Text style={styles.bio}>{profile.bio || ""}</Text>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{profile.followerCount}</Text>
          <Text style={styles.statLabel}>متابِعون</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{profile.followingCount}</Text>
          <Text style={styles.statLabel}>يتابع</Text>
        </View>
      </View>

      {!isMe && (
        <Pressable
          style={[styles.followButton, following && styles.followingButton]}
          onPress={toggleFollow}
        >
          <Text style={styles.followButtonText}>{following ? "إلغاء المتابعة" : "متابعة"}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  back: { marginBottom: spacing.md },
  backText: { color: colors.blush, fontSize: 15 },
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
  name: { ...typography.title, color: colors.textPrimary, textAlign: "center", marginTop: spacing.md },
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
  bio: { color: colors.textMuted, textAlign: "center", marginTop: spacing.md, fontSize: 13.5 },
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
  followButton: {
    backgroundColor: colors.gold,
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
    alignItems: "center",
    marginTop: spacing.xl,
  },
  followingButton: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  followButtonText: { color: colors.textOnGold, fontWeight: "700" },
});
