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
import { useAuth } from "../context/AuthContext";
import { getConversations } from "../api/messages";

interface Conversation {
  key: string;
  userId: string;
  userName: string;
  lastMessage: string;
  productTitle: string;
}

function normalize(data: any, myId?: string): Conversation[] {
  const list: any[] = Array.isArray(data)
    ? data
    : Array.isArray(data?.conversations)
    ? data.conversations
    : Array.isArray(data?.data)
    ? data.data
    : [];

  const result: Conversation[] = [];

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
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const myId = user?.id ? String(user.id) : undefined;

  const load = useCallback(async () => {
    try {
      setError("");
      const data = await getConversations();
      setConversations(normalize(data, myId));
    } catch (err: any) {
      console.log("Erro ao carregar conversas", err);
      setError(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          "Não foi possível carregar as conversas."
      );
    } finally {
      setRefreshing(false);
    }
  }, [myId]);

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
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={conversations}
        keyExtractor={(item) => item.key}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          !error ? <Text style={styles.empty}>Nenhuma conversa ainda</Text> : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.item}
            onPress={() =>
              navigation.navigate("Chat", {
                userId: item.userId,
                userName: item.userName,
              })
            }
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {item.userName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.userName}</Text>
              {item.productTitle ? (
                <Text style={styles.product} numberOfLines={1}>
                  📦 {item.productTitle}
                </Text>
              ) : null}
              <Text style={styles.last} numberOfLines={1}>
                {item.lastMessage}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  empty: { textAlign: "center", marginTop: 40, color: colors.textSecondary },
  error: { color: "#B71C1C", textAlign: "center", p
