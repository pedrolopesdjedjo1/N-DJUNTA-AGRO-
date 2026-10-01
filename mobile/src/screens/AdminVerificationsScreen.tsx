import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import {
  listVerifications,
  reviewVerification,
  verificationErrorMessage,
  VerificationRequest,
  VerificationStatus,
} from "../api/verification";

const FILTERS: { label: string; value?: VerificationStatus }[] = [
  { label: "Todas", value: undefined },
  { label: "Pendente", value: "PENDENTE" },
  { label: "Aprovado", value: "APROVADO" },
  { label: "Rejeitado", value: "REJEITADO" },
];

const STATUS_LABEL: Record<VerificationStatus, string> = {
  PENDENTE: "Pendente",
  APROVADO: "Aprovado",
  REJEITADO: "Rejeitado",
};

const STATUS_COLOR: Record<VerificationStatus, string> = {
  PENDENTE: "#F9A825",
  APROVADO: "#2E7D32",
  REJEITADO: "#C62828",
};

function formatDate(value: string) {
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

export default function AdminVerificationsScreen() {
  const [items, setItems] = useState<VerificationRequest[]>([]);
  const [filter, setFilter] = useState<VerificationStatus | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError("");
      const data = await listVerifications(filter);
      setItems(data);
    } catch (err: any) {
      setError(verificationErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  async function review(item: VerificationRequest, approve: boolean) {
    try {
      setBusyId(item.id);
      await reviewVerification(item.id, approve);
      await load();
    } catch (err: any) {
      Alert.alert("Erro", verificationErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  function confirmReview(item: VerificationRequest, approve: boolean) {
    Alert.alert(
      approve ? "Aprovar verificação" : "Rejeitar verificação",
      `${item.user?.name ?? "Usuário"} - ${item.documentType}`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: approve ? "Aprovar" : "Rejeitar",
          style: approve ? "default" : "destructive",
          onPress: () => review(item, approve),
        },
      ]
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Verificações</Text>

      <View style={styles.filters}>
        {FILTERS.map((f) => {
          const active = filter === f.value;
          return (
            <TouchableOpacity
              key={f.label}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => setFilter(f.value)}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {loading ? (
        <ActivityIndicator size="large" color="#1B5E20" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
            />
          }
          ListEmptyComponent={
            <Text style={styles.empty}>Nenhum pedido encontrado.</Text>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.name}>{item.user?.name ?? "Usuário"}</Text>
                <View
                  style={[
                    styles.badge,
                    { backgroundColor: STATUS_COLOR[item.status] ?? "#999" },
                  ]}
                >
                  <Text style={styles.badgeText}>
                    {STATUS_LABEL[item.status] ?? item.status}
                  </Text>
                </View>
              </View>

              <Text style={styles.line}>Documento: {item.documentType}</Text>
              {item.documentNote ? (
                <Text style={styles.line}>Obs.: {item.documentNote}</Text>
              ) : null}
              {item.user?.role ? (
                <Text style={styles.meta}>Perfil: {item.user.role}</Text>
              ) : null}
              {item.user?.phone ? (
                <Text style={styles.meta}>Telefone: {item.user.phone}</Text>
              ) : null}
              <Text style={styles.meta}>{formatDate(item.createdAt)}</Text>

              {item.status === "PENDENTE" && (
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.approveBtn]}
                    onPress={() => confirmReview(item, true)}
                    disabled={busyId === item.id}
                  >
                    <Text style={styles.approveText}>Aprovar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.rejectBtn]}
                    onPress={() => confirmReview(item, false)}
                    disabled={busyId === item.id}
                  >
                    <Text style={styles.rejectText}>Rejeitar</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 16 },
  title: { fontSize: 24, fontWeight: "bold", color: "#1B5E20", marginBottom: 12 },
  filters: { flexDirection: "row", flexWrap: "wrap", marginBottom: 8 },
  chip: {
    backgroundColor: "#eee",
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginRight: 8,
    marginBottom: 8,
  },
  chipActive: { backgroundColor: "#1B5E20" },
  chipText: { color: "#333", fontSize: 13 },
  chipTextActive: { color: "#fff", fontWeight: "600" },
  error: { color: "red", marginBottom: 8 },
  empty: { textAlign: "center", color: "#888", marginTop: 40 },
  card: {
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  name: { fontSize: 16, fontWeight: "bold", color: "#111", flex: 1, marginRight: 8 },
  badge: { borderRadius: 12, paddingVertical: 4, paddingHorizontal: 10 },
  badgeText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  line: { fontSize: 14, color: "#222", marginBottom: 4 },
  meta: { fontSize: 12, color: "#888", marginBottom: 2 },
  actions: { flexDirection: "row", marginTop: 10 },
  actionBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 10,
  },
  approveBtn: { borderColor: "#1B5E20" },
  approveText: { color: "#1B5E20", fontWeight: "600" },
  rejectBtn: { borderColor: "#B71C1C" },
  rejectText: { color: "#B71C1C", fontWeight: "600" },
});
