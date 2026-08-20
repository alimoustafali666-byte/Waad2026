import React, { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet, FlatList, ActivityIndicator } from "react-native";
import {
  createAgoraRtcEngine,
  ChannelProfileType,
  ClientRoleType,
} from "react-native-agora";
import { colors, spacing, radius, typography } from "../../theme";
import { roomsApi, session } from "../api";

function SpeakerAvatar({ uid, isMe, muted }) {
  return (
    <View style={styles.speakerWrap}>
      <View style={[styles.speakerCircle, isMe && styles.hostRing]}>
        <Text style={styles.speakerInitial}>{isMe ? "أنا" : String(uid).slice(-2)}</Text>
      </View>
      {muted && <Text style={styles.mutedTag}>🔇</Text>}
    </View>
  );
}

export default function RoomScreen({ route, navigation }) {
  const room = route.params?.room ?? { title: "غرفة", id: null };
  const [micOn, setMicOn] = useState(false);
  const [connecting, setConnecting] = useState(true);
  const [error, setError] = useState("");
  const [myUid, setMyUid] = useState(null);
  const [remoteUids, setRemoteUids] = useState([]);
  const engineRef = useRef(null);

  useEffect(() => {
    let mounted = true;

    async function joinChannel() {
      try {
        const { token: authToken } = await session.load();
        const { appId, token, channel, uid } = await roomsApi.getVoiceToken(
          room.id,
          authToken
        );

        const engine = createAgoraRtcEngine();
        engineRef.current = engine;
        engine.initialize({
          appId,
          channelProfile: ChannelProfileType.ChannelProfileLiveBroadcasting,
        });

        engine.registerEventHandler({
          onJoinChannelSuccess: () => {
            if (mounted) setConnecting(false);
          },
          onUserJoined: (_conn, joinedUid) => {
            if (mounted) setRemoteUids((prev) => [...new Set([...prev, joinedUid])]);
          },
          onUserOffline: (_conn, offlineUid) => {
            if (mounted) setRemoteUids((prev) => prev.filter((u) => u !== offlineUid));
          },
          onError: (err) => {
            if (mounted) setError(`خطأ اتصال صوتي (${err})`);
          },
        });

        engine.enableAudio();
        engine.muteLocalAudioStream(true); // يبدأ صامتًا حتى يضغط المستخدم زر المايك
        engine.joinChannel(token, channel, uid, {
          clientRoleType: ClientRoleType.ClientRoleBroadcaster,
        });

        if (mounted) setMyUid(uid);
      } catch (e) {
        if (mounted) {
          setError("تعذّر الانضمام للغرفة الصوتية");
          setConnecting(false);
        }
      }
    }

    if (room.id) {
      joinChannel();
    } else {
      setConnecting(false);
      setError("معرّف الغرفة غير موجود");
    }

    return () => {
      mounted = false;
      const engine = engineRef.current;
      if (engine) {
        engine.leaveChannel();
        engine.release();
      }
    };
  }, [room.id]);

  function toggleMic() {
    const next = !micOn;
    engineRef.current?.muteLocalAudioStream(!next);
    setMicOn(next);
  }

  function leaveRoom() {
    engineRef.current?.leaveChannel();
    engineRef.current?.release();
    navigation.goBack();
  }

  const speakers = myUid != null ? [{ uid: myUid, isMe: true }, ...remoteUids.map((u) => ({ uid: u, isMe: false }))] : [];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={leaveRoom}>
          <Text style={styles.close}>✕</Text>
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>
          {room.title}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {connecting ? (
        <ActivityIndicator color={colors.gold} style={{ marginTop: spacing.xxl }} />
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : (
        <FlatList
          data={speakers}
          keyExtractor={(s) => String(s.uid)}
          numColumns={4}
          contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
          columnWrapperStyle={{ gap: spacing.md }}
          renderItem={({ item }) => (
            <SpeakerAvatar uid={item.uid} isMe={item.isMe} muted={item.isMe && !micOn} />
          )}
        />
      )}

      <View style={styles.controls}>
        <Pressable style={styles.giftButton}>
          <Text style={styles.giftText}>🎁 هدية</Text>
        </Pressable>
        <Pressable
          style={[styles.micButton, micOn && styles.micOn]}
          onPress={toggleMic}
          disabled={connecting}
        >
          <Text style={styles.micText}>{micOn ? "🎙️" : "🔇"}</Text>
        </Pressable>
        <Pressable style={styles.leaveButton} onPress={leaveRoom}>
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
  errorText: { color: colors.danger, textAlign: "center", marginTop: spacing.xxl },
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
  speakerInitial: { color: colors.goldLight, fontWeight: "700", fontSize: 12 },
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
