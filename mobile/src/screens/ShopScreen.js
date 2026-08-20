import React, { useCallback, useState } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { colors, spacing, radius, typography } from "../../theme";
import { shopApi, session } from "../api";

export default function ShopScreen({ navigation }) {
  const [frames, setFrames] = useState([]);
  const [owned, setOwned] = useState([]);
  const [token, setToken] = useState(null);

  const load = useCallback(async () => {
    const { token } = await session.load();
    setToken(token);
    const [{ frames }, { frames: owned }] = await Promise.all([
      shopApi.frames(),
      shopApi.ownedFrames(token),
    ]);
    setFrames(frames);
    setOwned(owned);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handlePurchase(frame) {
    try {
      await shopApi.purchaseFrame(frame.id, token);
      Alert.alert("تم الشراء", `تم شراء ${frame.name}`);
      load();
    } catch (e) {
      Alert.alert("تعذّر الشراء", "تحقق من رصيد عملاتك");
    }
  }

  async function handleEquip(frame) {
    await shopApi.equipFrame(frame.id, token);
    Alert.alert("تم التفعيل", `أصبح ${frame.name} إطارك الحالي`);
  }

  const ownedIds = new Set(owned.map((f) => f.id));

  return (
    <View style={styles.container}>
      <Pressable onPress={() => navigation.goBack()} style={styles.back}>
        <Text style={styles.backText}>‹ رجوع</Text>
      </Pressable>
      <Text style={styles.title}>المتجر</Text>

      <FlatList
        data={frames}
        keyExtractor={(f) => f.id}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.emoji}>{item.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.cost}>💰 {item.coinCost}</Text>
            </View>
            {ownedIds.has(item.id) ? (
              <Pressable style={styles.equipButton} onPress={() => handleEquip(item)}>
                <Text style={styles.equipButtonText}>تفعيل</Text>
              </Pressable>
            ) : (
              <Pressable style={styles.buyButton} onPress={() => handlePurchase(item)}>
                <Text style={styles.buyButtonText}>شراء</Text>
              </Pressable>
            )}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingTop: spacing.xl },
  back: { paddingHorizontal: spacing.lg },
  backText: { color: colors.blush, fontSize: 15 },
  title: { ...typography.title, color: colors.textPrimary, textAlign: "center", marginTop: spacing.sm },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emoji: { fontSize: 30 },
  name: { color: colors.textPrimary, fontWeight: "700" },
  cost: { color: colors.goldLight, fontSize: 12, marginTop: 2 },
  buyButton: {
    backgroundColor: colors.gold,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  buyButtonText: { color: colors.textOnGold, fontWeight: "700", fontSize: 12 },
  equipButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  equipButtonText: { color: colors.gold, fontWeight: "700", fontSize: 12 },
});
