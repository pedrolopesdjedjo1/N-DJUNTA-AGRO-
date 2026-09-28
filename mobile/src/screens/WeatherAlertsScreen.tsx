import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { getWeatherAlerts } from "../api/weatherAlerts";

type WeatherAlert = {
  id: string;
  title?: string;
  type?: string;
  message?: string;
  description?: string;
  severity?: string;
  region?: string;
  createdAt?: string;
};

function severityColor(severity?: string) {
  const s = (severity ?? "").toUpperCase();
  if (s === "HIGH" || s === "ALTA" || s === "CRITICAL") return "#C62828";
  if (s === "MEDIUM" || s === "MEDIA" || s === "MÉDIA") return "#EF6C00";
  return "#1B5E20";
}

export default function WeatherAlertsScreen() {
  const [items, setItems] = useState<WeatherAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setError("");
      const data = await getWeatherAlerts();
      setItems(data);
    } catch (err: any) {
      setError("Não foi possível carregar os alertas de clima.");
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

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1B5E20" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Clima e Alertas</Text>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>Nenhum alerta no momento.</Text>
        }
        renderItem={({ item }) => (
          <View
            style={[
              styles.card,
              { borderLeftColor: severityColor(item.severity) },
            ]}
          >
            <Text style={styles.cardTitle}>
              {item.title ?? item.type ?? "Alerta"}
            </Text>
            <Text style={styles.cardMessage}>
              {item.message ?? item.description ?? ""}
            </Text>
            {item.severity ? (
              <Text
                style={[styles.badge, { color: severityColor(item.severity) }]}
              >
                Nível: {item.severity}
              </Text>
            ) : null}
            {item.region ? (
              <Text style={styles.meta}>Região: {item.region}</Text>
            ) : null}
            {item.createdAt ? (
              <Text style={styles.meta}>
                {new Date(item.createdAt).toLocaleString()}
              </Text>
            ) : null}
          </View>
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
    borderLeftWidth: 6,
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  cardTitle: { fontSize: 16, fontWeight: "600" },
  cardMessage: { fontSize: 14, color: "#333", marginTop: 4 },
  badge: { fontSize: 13, fontWeight: "600", marginTop: 6 },
  meta: { fontSize: 12, color: "#888", marginTop: 2 },
});
