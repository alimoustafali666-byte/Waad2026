import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, FlatList } from "react-native";
import { colors, spacing, radius, typography } from "../../theme";

const MOCK_SPEAKERS = [
  { id: "1", name: "سارة", isHost: true, muted: false },
  { id: "2", name: "خالد", isHost: false, muted: false },
  { id: "3", name: "ريم", isHost: false, muted: true },
];

function SpeakerAvatar({ speaker }) {
  return (
    <View style={styles.speakerWrap}>
      <View style={[styles.speakerCircle, speaker.isHost && styles.hostRing]}>
        <Text style={styles.speakerInitial}>{speaker.name[0]}</Text>
      </View>
      <Text style={styles.speakerName} numberOfLines={1}>
        {speaker.name}
      </Text>
      {speaker.muted && <Text style={styles.mutedTag}>🔇</Text>}
    </View>
  );
}

export default function RoomScreen({ route, navigation }) {
  const room = route.params?.room ?? { title: "غرفة", hostName: "" };
  const [micOn, setMicOn] = useState(false);

  // TODO(agora): الانضمام الفعلي للقناة الصوتية يتم هنا عبر Agora RTC Engine
  // بعد توفر App ID وخادم توليد التوكن (server/src/agora). حاليًا واجهة فقط.

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.close}>✕</Text>
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>
          {room.title}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={MOCK_SPEAKERS}
        keyExtractor={(s) => s.id}
        numColumns={4}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
        columnWrapperStyle={{ gap: spacing.md }}
        renderItem={({ item }) => <SpeakerAvatar speaker={item} />}
      />

      <View style={styles.controls}>
        <Pressable style={styles.giftButton}>
          <Text style={styles.giftText}>🎁 هدية</Text>
        </Pressable>
        <Pressable
          style={[styles.micButton, micOn && styles.micOn]}
          onPress={() => setMicOn((v) => !v)}
        >
          <Text style={styles.micText}>{micOn ? "🎙️" : "🔇"}</Text>
        </Pressable>
        <Pressable style={styles.leaveButton} onPress={() => navigation.goBack()}>
          <Text style={styles.leaveText}>مغادرة</Text>
        </Pressable>
      </View>
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
  close: { color: colors.textMuted, fontSize: 18 },
  title: { ...typography.title, color: colors.textPrimary, flex: 1, textAlign: "center" },
  speakerWrap: { alignItems: "center", width: 70 },
  speakerCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  hostRing: { borderWidth: 2, borderColor: colors.gold },
  speakerInitial: { color: colors.goldLight, fontWeight: "700" },
  speakerName: { color: colors.textMuted, fontSize: 11, marginTop: 4 },
  mutedTag: { fontSize: 10, marginTop: 2 },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  giftButton: {
    backgroundColor: colors.blushSoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  giftText: { color: colors.textOnGold, fontWeight: "700" },
  micButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  micOn: { backgroundColor: colors.gold, borderColor: colors.gold },
  micText: { fontSize: 20 },
  leaveButton: {
    backgroundColor: colors.danger,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  leaveText: { color: "#fff", fontWeight: "700" },
});
