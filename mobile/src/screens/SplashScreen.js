import React, { useEffect } from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { colors, spacing, typography } from "../../theme";

export default function SplashScreen({ navigation }) {
  useEffect(() => {
    const timer = setTimeout(() => navigation.replace("Login"), 1400);
    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={styles.container}>
      <Image
        source={require("../../assets/icon.png")}
        style={styles.logo}
        resizeMode="cover"
      />
      <Text style={styles.title}>وعد</Text>
      <Text style={styles.subtitle}>غرف صوتية اجتماعية</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 128,
    height: 128,
    borderRadius: 64,
    borderWidth: 3,
    borderColor: colors.gold,
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.display,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.textMuted,
  },
});
