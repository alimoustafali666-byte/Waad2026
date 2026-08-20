import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  I18nManager,
  ActivityIndicator,
  Image,
} from "react-native";
import { colors, spacing, radius, typography } from "../../theme";
import { authApi, session } from "../api";

const COUNTRIES = [
  { code: "AE", dial: "+971", flag: "🇦🇪", placeholder: "5X XXX XXXX" },
  { code: "EG", dial: "+20", flag: "🇪🇬", placeholder: "1X XXXX XXXX" },
  { code: "SA", dial: "+966", flag: "🇸🇦", placeholder: "5X XXX XXXX" },
];

export default function LoginScreen({ navigation }) {
  const [step, setStep] = useState("phone"); // "phone" | "otp"
  const [country, setCountry] = useState(COUNTRIES[0]);
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fullPhone = `${country.dial}${phone.replace(/\D/g, "")}`;

  function cycleCountry() {
    const idx = COUNTRIES.findIndex((c) => c.code === country.code);
    setCountry(COUNTRIES[(idx + 1) % COUNTRIES.length]);
  }

  async function handleSendCode() {
    if (phone.length < 8) {
      setError("أدخل رقم جوال صحيح");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await authApi.requestOtp(fullPhone);
      setStep("otp");
    } catch (e) {
      setError("تعذّر إرسال رمز التحقق. تأكد من اتصال الخادم.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyCode() {
    if (code.length < 4) {
      setError("أدخل رمز التحقق كاملًا");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const { token, userId } = await authApi.verifyOtp(fullPhone, code, name || undefined);
      await session.save(token, userId);
      navigation.replace("Rooms");
    } catch (e) {
      setError("الرمز غير صحيح أو منتهي الصلاحية");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Image source={require("../../assets/icon.png")} style={styles.logo} resizeMode="cover" />
      {step === "phone" ? (
        <>
          <Text style={styles.title}>مرحبًا بك في وعد</Text>
          <Text style={styles.subtitle}>أدخل رقم جوالك لإرسال رمز التحقق</Text>

          <View style={styles.inputRow}>
            <Pressable onPress={cycleCountry} style={styles.dialButton}>
              <Text style={styles.dial}>{country.flag} {country.dial}</Text>
            </Pressable>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder={country.placeholder}
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
              style={styles.input}
              textAlign={I18nManager.isRTL ? "right" : "left"}
            />
          </View>
          <Text style={styles.countryHint}>اضغط على رمز الدولة لتغييره (إمارات / مصر / السعودية)</Text>

          {!!error && <Text style={styles.error}>{error}</Text>}

          <Pressable
            style={({ pressed }) => [styles.button, pressed && { opacity: 0.85 }]}
            onPress={handleSendCode}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.textOnGold} />
            ) : (
              <Text style={styles.buttonText}>إرسال رمز التحقق</Text>
            )}
          </Pressable>
        </>
      ) : (
        <>
          <Text style={styles.title}>رمز التحقق</Text>
          <Text style={styles.subtitle}>أرسلنا رمزًا مكوّنًا من ٦ أرقام إلى {fullPhone}</Text>

          <TextInput
            value={code}
            onChangeText={setCode}
            placeholder="000000"
            placeholderTextColor={colors.textMuted}
            keyboardType="number-pad"
            maxLength={6}
            style={[styles.input, styles.otpInput]}
            textAlign="center"
          />

          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="اسمك (اختياري)"
            placeholderTextColor={colors.textMuted}
            style={[styles.input, styles.nameInput]}
            textAlign={I18nManager.isRTL ? "right" : "left"}
          />

          {!!error && <Text style={styles.error}>{error}</Text>}

          <Pressable
            style={({ pressed }) => [styles.button, pressed && { opacity: 0.85 }]}
            onPress={handleVerifyCode}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.textOnGold} />
            ) : (
              <Text style={styles.buttonText}>تأكيد الدخول</Text>
            )}
          </Pressable>

          <Pressable onPress={() => setStep("phone")}>
            <Text style={styles.back}>تغيير رقم الجوال</Text>
          </Pressable>
        </>
      )}

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
  logo: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: colors.gold,
    alignSelf: "center",
    marginBottom: spacing.xl,
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
  dialButton: {
    marginInlineEnd: spacing.sm,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: colors.backgroundElevated,
  },
  dial: { color: colors.textMuted, fontWeight: "600" },
  countryHint: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: -spacing.md + 4,
    marginBottom: spacing.lg,
  },
  input: {
    flex: 1,
    color: colors.textPrimary,
    paddingVertical: spacing.md,
    fontSize: 16,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  otpInput: {
    fontSize: 24,
    letterSpacing: 8,
    marginBottom: spacing.md,
    fontVariant: ["tabular-nums"],
  },
  nameInput: { marginBottom: spacing.lg },
  button: {
    backgroundColor: colors.gold,
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  buttonText: { color: colors.textOnGold, fontWeight: "700", fontSize: 16 },
  back: { color: colors.blush, textAlign: "center", marginTop: spacing.md },
  error: { color: colors.danger, marginBottom: spacing.md, fontSize: 13 },
  terms: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.lg,
  },
});
