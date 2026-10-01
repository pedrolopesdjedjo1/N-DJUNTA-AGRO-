import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { colors } from "../theme/colors";
import { getConversations } from "../api/messages";

interface Conversation {
  userId: string;
  userName: string;
  lastMessage: string;
  updatedAt: string;
  user?: { id?: string; name?: string };
}

export default function ConversationsScreen() {
  const navigation = useNavigation<any>();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getConversations();
      setConversations(Array.isArray(data) ? data : []);
    } catch (err) {
      console.log("Erro ao carregar conversas", err);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={conversations}
        keyExtractor={(item, index) => String(item.userId ?? item.user?.id ?? index)}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={<Text style={styles.empty}>Nenhuma conversa ainda</Text>}
        renderItem={({ item }) => {
          const otherId = item.userId ?? item.user?.id;
          const otherName = item.userName ?? item.user?.name ?? "Usuário";

          return (
            <TouchableOpacity
              style={styles.item}
              onPress={() =>
                navigation.navigate("Chat", { userId: otherId, userName: otherName })
              }
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {otherName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{otherName}</Text>
                <Text style={styles.last} numberOfLines={1}>
                  {item.lastMessage}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  empty: { textAlign: "center", marginTop: 40, color: colors.textSecondary },
  item: {
    flexDirection: "row", alignItems: "center", padding: 14,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  avatar: {
    width: 46, height: 46, borderRadius: 23, backgroundColor: colors.primary,
    justifyContent: "center", alignItems: "center", marginRight: 12,
  },
  avatarText: { color: colors.white, fontWeight: "bold", fontSize: 18 },
  name: { fontWeight: "bold", color: colors.text },
  last: { color: colors.textSecondary, marginTop: 2 },
});
