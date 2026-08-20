import React, { useState } from "react";
import { View, Text, TextInput, FlatList, Pressable, StyleSheet } from "react-native";
import { colors, spacing, radius, typography } from "../../theme";
import { searchApi } from "../api";

export default function SearchScreen({ navigation }) {
  const [q, setQ] = useState("");
  const [rooms, setRooms] = useState([]);
  const [users, setUsers] = useState([]);
  const [searched, setSearched] = useState(false);

  async function handleSearch(text) {
    setQ(text);
    if (!text.trim()) {
      setRooms([]);
      setUsers([]);
      setSearched(false);
      return;
    }
    const { rooms, users } = await searchApi.search(text.trim());
    setRooms(rooms);
    setUsers(users);
    setSearched(true);
  }

  const combined = [
    ...rooms.map((r) => ({ type: "room", ...r })),
    ...users.map((u) => ({ type: "user", ...u })),
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>بحث</Text>
      <TextInput
        value={q}
        onChangeText={handleSearch}
        placeholder="ابحث عن غرفة أو مستخدم..."
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        textAlign="right"
      />

      <FlatList
        data={combined}
        keyExtractor={(item, idx) => `${item.type}-${item.id}-${idx}`}
        contentContainerStyle={{ padding: spacing.lg, gap: spacing.sm }}
        ListEmptyComponent={
          searched ? <Text style={styles.empty}>لا توجد نتائج</Text> : null
        }
        renderItem={({ item }) =>
          item.type === "room" ? (
            <Pressable
              style={styles.resultCard}
              onPress={() => navigation.navigate("Room", { room: item })}
            >
              <Text style={styles.resultIcon}>🎙️</Text>
              <View>
                <Text style={styles.resultTitle}>{item.title}</Text>
                <Text style={styles.resultSubtitle}>بواسطة {item.host_name}</Text>
              </View>
            </Pressable>
          ) : (
            <Pressable
              style={styles.resultCard}
              onPress={() => navigation.navigate("PublicProfile", { userId: item.id })}
            >
              <Text style={styles.resultIcon}>{item.avatarEmoji}</Text>
              <Text style={styles.resultTitle}>{item.displayName}</Text>
            </Pressable>
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingTop: spacing.xl },
  title: { ...typography.title, color: colors.textPrimary, textAlign: "center" },
  input: {
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  empty: { color: colors.textMuted, textAlign: "center", marginTop: spacing.xxl },
  resultCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  resultIcon: { fontSize: 22 },
  resultTitle: { color: colors.textPrimary, fontWeight: "700" },
  resultSubtitle: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
});
