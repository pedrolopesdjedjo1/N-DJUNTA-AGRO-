import React, { useState, useCallback } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { colors } from "../theme/colors";
import { useAuth } from "../context/AuthContext";
import { getConversations } from "../api/messages";

interface Conv { key: string; userId: string; userName: string; lastMessage: string; productTitle: string }

function normalize(data: any, myId?: string): Conv[] {
  const list: any[] = Array.isArray(data) ? data : Array.isArray(data?.conversations) ? data.conversations : Array.isArray(data?.data) ? data.data : [];
  const result: Conv[] = [];
  list.forEach((item: any, index: number) => {
    let otherId: any;
    let otherName: any;
    if (item?.senderId !== undefined || item?.receiverId !== undefined) {
      const iAmSender = String(item.senderId) === String(myId);
      const other = iAmSender ? item.receiver : item.sender;
      otherId = iAmSender ? item.receiverId : item.senderId;
      otherName = other?.name;
    } else {
      const other = item?.user ?? item?.otherUser ?? item?.partner ?? {};
      otherId = item?.userId ?? item?.otherUserId ?? other.id;
      otherName = item?.userName ?? other.name;
    }
    if (!otherId) return;
    const content = item?.lastMessage ?? item?.content ?? "";
    result.push({
      key: `${otherId}-${item?.productId ?? "geral"}-${index}`,
      userId: String(otherId),
      userName: String(otherName ?? "Usuário"),
      lastMessage: typeof content === "string" ? content : "",
      productTitle: item?.product?.title ? String(item.product.title) : "",
    });
  });
  return result;
}

export default function ConversationsScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conv[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const myId = user?.id ? String(user.id) : undefined;

  const load = useCallback(async () => {
    try {
      setError("");
      const data = await getConversations();
      setConversations(normalize(data, myId));
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.response?.data?.message || err?.message || "Não foi possível carregar as conversas.");
    } finally {
      setRefreshing(false);
    }
  }, [myId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <View style={s.container}>
      {error ? <Text style={s.error}>{error}</Text> : null}
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.key}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        ListEmptyComponent={!error ? <Text style={s.empty}>Nenhuma conversa ainda</Text> : null}
        renderItem={({ item }) => (
          <TouchableOpacity style={s.item} onPress={() => navigation.navigate("Chat", { userId: item.userId, userName: item.userName })}>
            <View style={s.avatar}>
              <Text style={s.avatarText}>{item.userName.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.name}>{item.userName}</Text>
              {item.productTitle ? <Text style={s.product} numberOfLines={1}>📦 {item.productTitle}</Text> : null}
              <Text style={s.last} numberOfLines={1}>{item.lastMessage}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  empty: { textAlign: "center", marginTop: 40, color: colors.textSecondary },
  error: { color: "#B71C1C", textAlign: "center", padding: 16 },
  item: { flexDirection: "row", alignItems: "center", padding: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.primary, justifyContent: "center", alignItems: "center", marginRight: 12 },
  avatarText: { color: colors.white, fontWeight: "bold", fontSize: 18 },
  name: { fontWeight: "bold", color: colors.text },
  product: { color: colors.primary, fontSize: 12, marginTop: 2 },
  last: { color: colors.textSecondary, marginTop: 2 },
});
