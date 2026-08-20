import React, { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, spacing, typography } from "../../theme";

export default function SplashScreen({ navigation }) {
  useEffect(() => {
    const timer = setTimeout(() => navigation.replace("Login"), 1200);
    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={styles.container}>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>و</Text>
      </View>
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
  badge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: colors.gold,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
    backgroundColor: colors.surface,
  },
  badgeText: {
    color: colors.gold,
    fontSize: 40,
    fontWeight: "800",
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
