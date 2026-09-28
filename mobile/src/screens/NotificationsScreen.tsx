import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { getNotifications, markAsRead } from "../api/notifications";

type Notification = {
  id: string;
  title?: string;
  message?: string;
  body?: string;
  read?: boolean;
  createdAt?: string;
};

export default function NotificationsScreen() {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setError("");
      const data = await getNotifications();
      setItems(data);
    } catch (err: any) {
      setError("Não foi possível carregar as notificações.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  async function handlePress(item: Notification) {
    if (item.read) return;
    setItems((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, read: true } : n))
    );
    try {
      await markAsRead(item.id);
    } catch (err) {
      console.log("Erro ao marcar como lida", err);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1B5E20" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Notificações</Text>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>Nenhuma notificação.</Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, !item.read && styles.cardUnread]}
            onPress={() => handlePress(item)}
          >
            <Text style={styles.cardTitle}>{item.title ?? "Notificação"}</Text>
            <Text style={styles.cardMessage}>
              {item.message ?? item.body ?? ""}
            </Text>
            {item.createdAt ? (
              <Text style={styles.cardDate}>
                {new Date(item.createdAt).toLocaleString()}
              </Text>
            ) : null}
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 24, fontWeight: "bold", color: "#1B5E20", marginBottom: 12 },
  errorText: { color: "red", marginBottom: 8 },
  emptyText: { textAlign: "center", color: "#888", marginTop: 40 },
  card: {
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  cardUnread: { backgroundColor: "#E8F5E9", borderColor: "#1B5E20" },
  cardTitle: { fontSize: 16, fontWeight: "600" },
  cardMessage: { fontSize: 14, color: "#333", marginTop: 4 },
  cardDate: { fontSize: 12, color: "#888", marginTop: 6 },
});
