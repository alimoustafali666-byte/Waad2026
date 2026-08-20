import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  I18nManager,
} from "react-native";
import { colors, spacing, radius, typography } from "../../theme";

export default function LoginScreen({ navigation }) {
  const [phone, setPhone] = useState("");

  return (
    <View style={styles.container}>
      <Text style={styles.title}>مرحبًا بك في وعد</Text>
      <Text style={styles.subtitle}>أدخل رقم جوالك لإرسال رمز التحقق</Text>

      <View style={styles.inputRow}>
        <Text style={styles.dial}>+971</Text>
        <TextInput
          value={phone}
          onChangeText={setPhone}
          placeholder="5X XXX XXXX"
          placeholderTextColor={colors.textMuted}
          keyboardType="phone-pad"
          style={styles.input}
          textAlign={I18nManager.isRTL ? "right" : "left"}
        />
      </View>

      <Pressable
        style={({ pressed }) => [styles.button, pressed && { opacity: 0.85 }]}
        onPress={() => navigation.replace("Rooms")}
      >
        <Text style={styles.buttonText}>متابعة</Text>
      </Pressable>

      <Text style={styles.terms}>
        بالمتابعة أنت توافق على شروط الاستخدام وسياسة الخصوصية
      </Text>
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
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  dial: { color: colors.textMuted, marginInlineEnd: spacing.sm, fontWeight: "600" },
  input: { flex: 1, color: colors.textPrimary, paddingVertical: spacing.md, fontSize: 16 },
  button: {
    backgroundColor: colors.gold,
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  buttonText: { color: colors.textOnGold, fontWeight: "700", fontSize: 16 },
  terms: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.lg,
  },
});
