import React, { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { colors, spacing, radius, typography } from "../../theme";
import { roomsApi, session } from "../api";

export default function CreateRoomScreen({ navigation }) {
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate() {
    if (!title.trim()) {
      setError("أدخل عنوانًا للغرفة");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const { token } = await session.load();
      const { room } = await roomsApi.create(title.trim(), token);
      navigation.replace("Room", { room });
    } catch (e) {
      setError("تعذّر إنشاء الغرفة. تأكد من اتصال الخادم.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>غرفة جديدة</Text>
      <Text style={styles.subtitle}>اختر عنوانًا يجذب المستمعين لغرفتك</Text>

      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="مثال: سهرة الليل 🌙"
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        maxLength={60}
      />

      {!!error && <Text style={styles.error}>{error}</Text>}

      <Pressable
        style={({ pressed }) => [styles.button, pressed && { opacity: 0.85 }]}
        onPress={handleCreate}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={colors.textOnGold} />
        ) : (
          <Text style={styles.buttonText}>ابدأ البث</Text>
        )}
      </Pressable>

      <Pressable onPress={() => navigation.goBack()}>
        <Text style={styles.back}>إلغاء</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.xl,
    justifyContent: "center",
  },
  title: { ...typography.title, color: colors.textPrimary, marginBottom: spacing.xs },
  subtitle: { ...typography.body, color: colors.textMuted, marginBottom: spacing.xl },
  input: {
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 16,
    marginBottom: spacing.lg,
    textAlign: "right",
  },
  button: {
    backgroundColor: colors.gold,
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  buttonText: { color: colors.textOnGold, fontWeight: "700", fontSize: 16 },
  back: { color: colors.blush, textAlign: "center", marginTop: spacing.lg },
  error: { color: colors.danger, marginBottom: spacing.md, fontSize: 13 },
});
