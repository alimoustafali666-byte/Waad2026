import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TextInput,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import {
  createAgoraRtcEngine,
  ChannelProfileType,
  ClientRoleType,
} from "react-native-agora";
import { colors, spacing, radius, typography } from "../../theme";
import { roomsApi, giftsApi, session } from "../api";
import { connectRealtime, joinRoomChannel, leaveRoomChannel, disconnectRealtime } from "../realtime";

function Seat({ seat, isMine, isHostSeat, onPress }) {
  const occupied = !!seat.userId;
  return (
    <Pressable style={styles.seatWrap} onPress={() => onPress(seat)}>
      <View
        style={[
          styles.seatCircle,
          isMine && styles.myRing,
          isHostSeat && occupied && styles.hostRing,
          !occupied && styles.seatEmpty,
        ]}
      >
        <Text style={styles.seatInitial}>
          {occupied ? seat.displayName?.[0] ?? "؟" : `${seat.seatNumber}`}
        </Text>
      </View>
      <Text style={styles.seatLabel} numberOfLines={1}>
        {occupied ? seat.displayName ?? "" : "مقعد فارغ"}
      </Text>
      {seat.isMuted && occupied && <Text style={styles.mutedTag}>🔇</Text>}
    </Pressable>
  );
}

export default function RoomScreen({ route, navigation }) {
  const room = route.params?.room ?? { title: "غرفة", id: null };
  const [micOn, setMicOn] = useState(false);
  const [connecting, setConnecting] = useState(true);
  const [error, setError] = useState("");
  const engineRef = useRef(null);

  const [me, setMe] = useState({ userId: null, token: null });
  const [seats, setSeats] = useState([]);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [gifts, setGifts] = useState([]);
  const [giftModal, setGiftModal] = useState({ visible: false, targetUserId: null });
  const messagesRef = useRef(null);

  const isHost = !!me.userId && me.userId === room.host_user_id;

  const reloadSeats = useCallback(async () => {
    if (!room.id) return;
    const { seats } = await roomsApi.getSeats(room.id);
    setSeats(seats);
  }, [room.id]);

  useEffect(() => {
    let mounted = true;

    async function setup() {
      const { token, userId } = await session.load();
      if (!mounted) return;
      setMe({ userId, token });

      try {
        const [{ seats }, { messages }, { gifts }] = await Promise.all([
          roomsApi.getSeats(room.id),
          roomsApi.getMessages(room.id),
          giftsApi.catalog(),
        ]);
        if (!mounted) return;
        setSeats(seats);
        setMessages(messages);
        setGifts(gifts);
      } catch {
        // تجاهل فشل التحميل الأولي، سيُعاد تحميلها لاحقًا عبر السحب للتحديث لو لزم
      }

      const socket = connectRealtime(token);
      joinRoomChannel(room.id);
      socket.on("seats:update", (payload) => {
        if (mounted) setSeats(payload.seats);
      });
      socket.on("message:new", (payload) => {
        if (mounted) setMessages((prev) => [...prev, payload]);
      });
      socket.on("gift:new", (payload) => {
        if (mounted) {
          setMessages((prev) => [
            ...prev,
            {
              id: `gift-${payload.id}`,
              system: true,
              message: `${payload.giftEmoji} ${payload.senderName} أرسل ${payload.giftName}`,
            },
          ]);
        }
      });
    }

    async function joinVoice() {
      try {
        const { token: authToken } = await session.load();
        const { appId, token, channel, uid } = await roomsApi.getVoiceToken(room.id, authToken);

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
          onError: (err) => {
            if (mounted) setError(`خطأ اتصال صوتي (${err})`);
          },
        });

        engine.enableAudio();
        engine.muteLocalAudioStream(true);
        engine.joinChannel(token, channel, uid, {
          clientRoleType: ClientRoleType.ClientRoleBroadcaster,
        });
      } catch (e) {
        if (mounted) {
          setError("تعذّر الانضمام للغرفة الصوتية");
          setConnecting(false);
        }
      }
    }

    if (room.id) {
      setup();
      joinVoice();
    } else {
      setConnecting(false);
      setError("معرّف الغرفة غير موجود");
    }

    return () => {
      mounted = false;
      leaveRoomChannel(room.id);
      disconnectRealtime();
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

  async function handleSeatPress(seat) {
    if (!seat.userId) {
      try {
        await roomsApi.joinSeat(room.id, seat.seatNumber, me.token);
      } catch (e) {
        Alert.alert("تعذّر أخذ المقعد", "قد يكون المقعد مشغولًا بالفعل");
      }
      return;
    }

    if (seat.userId === me.userId) {
      Alert.alert("مقعدك", "هل تريد مغادرة المقعد؟", [
        { text: "إلغاء", style: "cancel" },
        {
          text: "مغادرة",
          style: "destructive",
          onPress: () => roomsApi.leaveSeat(room.id, seat.seatNumber, me.token),
        },
      ]);
      return;
    }

    if (isHost) {
      Alert.alert(seat.displayName ?? "متحدث", "إدارة المتحدث", [
        { text: "إلغاء", style: "cancel" },
        {
          text: seat.isMuted ? "إلغاء الكتم" : "كتم",
          onPress: () => roomsApi.muteSeat(room.id, seat.seatNumber, !seat.isMuted, me.token),
        },
        {
          text: "إنزال من المقعد",
          style: "destructive",
          onPress: () => roomsApi.kickSeat(room.id, seat.seatNumber, me.token),
        },
        {
          text: "إرسال هدية 🎁",
          onPress: () => setGiftModal({ visible: true, targetUserId: seat.userId }),
        },
      ]);
      return;
    }

    setGiftModal({ visible: true, targetUserId: seat.userId });
  }

  async function handleSendMessage() {
    const text = chatInput.trim();
    if (!text) return;
    setChatInput("");
    try {
      await roomsApi.sendMessage(room.id, text, me.token);
    } catch {
      Alert.alert("تعذّر الإرسال", "حاول مرة أخرى");
    }
  }

  async function handleSendGift(gift) {
    const targetUserId = giftModal.targetUserId ?? room.host_user_id;
    setGiftModal({ visible: false, targetUserId: null });
    try {
      await roomsApi.sendGift(room.id, gift.id, targetUserId, me.token);
    } catch (e) {
      Alert.alert("تعذّر إرسال الهدية", "تحقق من رصيد عملاتك");
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
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
      ) : (
        <>
          {!!error && <Text style={styles.errorText}>{error}</Text>}

          <FlatList
            data={seats}
            keyExtractor={(s) => String(s.seatNumber)}
            numColumns={4}
            scrollEnabled={false}
            contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
            columnWrapperStyle={{ gap: spacing.md }}
            renderItem={({ item }) => (
              <Seat
                seat={item}
                isMine={item.userId === me.userId}
                isHostSeat={item.userId === room.host_user_id}
                onPress={handleSeatPress}
              />
            )}
          />

          <FlatList
            ref={messagesRef}
            data={messages}
            keyExtractor={(m) => String(m.id)}
            style={styles.chatList}
            contentContainerStyle={{ padding: spacing.md, gap: spacing.xs }}
            onContentSizeChange={() => messagesRef.current?.scrollToEnd({ animated: true })}
            renderItem={({ item }) =>
              item.system ? (
                <Text style={styles.systemMessage}>{item.message}</Text>
              ) : (
                <Text style={styles.chatMessage}>
                  <Text style={styles.chatSender}>{item.displayName}: </Text>
                  {item.message}
                </Text>
              )
            }
          />

          <View style={styles.chatInputRow}>
            <TextInput
              value={chatInput}
              onChangeText={setChatInput}
              placeholder="اكتب رسالة..."
              placeholderTextColor={colors.textMuted}
              style={styles.chatInput}
              onSubmitEditing={handleSendMessage}
              returnKeyType="send"
            />
            <Pressable onPress={handleSendMessage} style={styles.sendButton}>
              <Text style={styles.sendButtonText}>إرسال</Text>
            </Pressable>
          </View>
        </>
      )}

      <View style={styles.controls}>
        <Pressable
          style={styles.giftButton}
          onPress={() => setGiftModal({ visible: true, targetUserId: room.host_user_id })}
        >
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

      <Modal
        visible={giftModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setGiftModal({ visible: false, targetUserId: null })}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setGiftModal({ visible: false, targetUserId: null })}
        >
          <View style={styles.giftSheet}>
            <Text style={styles.giftSheetTitle}>اختر هدية</Text>
            <FlatList
              data={gifts}
              keyExtractor={(g) => g.id}
              numColumns={3}
              columnWrapperStyle={{ gap: spacing.md }}
              contentContainerStyle={{ gap: spacing.md }}
              renderItem={({ item }) => (
                <Pressable style={styles.giftOption} onPress={() => handleSendGift(item)}>
                  <Text style={styles.giftEmoji}>{item.emoji}</Text>
                  <Text style={styles.giftName}>{item.name}</Text>
                  <Text style={styles.giftCost}>💰 {item.coinCost}</Text>
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
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
  errorText: { color: colors.danger, textAlign: "center", marginTop: spacing.md },
  seatWrap: { alignItems: "center", width: 70 },
  seatCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  seatEmpty: { opacity: 0.5, borderStyle: "dashed" },
  myRing: { borderWidth: 2, borderColor: colors.blush },
  hostRing: { borderWidth: 2, borderColor: colors.gold },
  seatInitial: { color: colors.goldLight, fontWeight: "700", fontSize: 12 },
  seatLabel: { color: colors.textMuted, fontSize: 10, marginTop: 2, maxWidth: 68, textAlign: "center" },
  mutedTag: { fontSize: 10 },
  chatList: { flex: 1, borderTopWidth: 1, borderTopColor: colors.border },
  systemMessage: { color: colors.goldLight, fontSize: 12.5, textAlign: "center", fontStyle: "italic" },
  chatMessage: { color: colors.textPrimary, fontSize: 13.5 },
  chatSender: { color: colors.blush, fontWeight: "700" },
  chatInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  chatInput: {
    flex: 1,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 13.5,
  },
  sendButton: {
    backgroundColor: colors.blush,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  sendButtonText: { color: colors.textOnGold, fontWeight: "700", fontSize: 13 },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    paddingVertical: spacing.lg,
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  giftSheet: {
    backgroundColor: colors.backgroundElevated,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    maxHeight: "60%",
  },
  giftSheetTitle: {
    ...typography.title,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    textAlign: "center",
  },
  giftOption: {
    flex: 1,
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  giftEmoji: { fontSize: 28 },
  giftName: { color: colors.textPrimary, fontSize: 12, marginTop: spacing.xs },
  giftCost: { color: colors.goldLight, fontSize: 11, marginTop: 2 },
});
