import React, { useCallback, useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl, Alert } from "react-native";
import { useLanguage } from "../context/LanguageContext";
import { listVerifications, reviewVerification, verificationErrorMessage, VerificationRequest, VerificationStatus } from "../api/verification";

const FILTERS: { key: string; value?: VerificationStatus }[] = [
  { key: "filterAll", value: undefined },
  { key: "status_PENDENTE", value: "PENDENTE" },
  { key: "status_APROVADO", value: "APROVADO" },
  { key: "status_REJEITADO", value: "REJEITADO" },
];

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
  const { t } = useLanguage();
  const [items, setItems] = useState<VerificationRequest[]>([]);
  const [filter, setFilter] = useState<VerificationStatus | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError("");
      setItems(await listVerifications(filter));
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
      Alert.alert(t("error"), verificationErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  function confirmReview(item: VerificationRequest, approve: boolean) {
    Alert.alert(
      approve ? t("approveTitle") : t("rejectTitle"),
      `${item.user?.name ?? t("defaultUser")} - ${item.documentType}`,
      [
        { text: t("cancel"), style: "cancel" },
        { text: approve ? t("approve") : t("reject"), style: approve ? "default" : "destructive", onPress: () => review(item, approve) },
      ]
    );
  }

  return (
    <View style={s.container}>
      <Text style={s.title}>{t("verifications")}</Text>

      <View style={s.filters}>
        {FILTERS.map((f) => {
          const active = filter === f.value;
          return (
            <TouchableOpacity key={f.key} style={[s.chip, active && s.chipActive]} onPress={() => setFilter(f.value)}>
              <Text style={[s.chipText, active && s.chipTextActive]}>{t(f.key)}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {error ? <Text style={s.error}>{error}</Text> : null}

      {loading ? (
        <ActivityIndicator size="large" color="#1B5E20" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
          ListEmptyComponent={<Text style={s.empty}>{t("noRequests")}</Text>}
          renderItem={({ item }) => (
            <View style={s.card}>
              <View style={s.cardHeader}>
                <Text style={s.name}>{item.user?.name ?? t("defaultUser")}</Text>
                <View style={[s.badge, { backgroundColor: STATUS_COLOR[item.status] ?? "#999" }]}>
                  <Text style={s.badgeText}>{t(`status_${item.status}`)}</Text>
                </View>
              </View>

              <Text style={s.line}>{t("documentLabel")}: {item.documentType}</Text>
              {item.documentNote ? <Text style={s.line}>{t("noteLabel")}: {item.documentNote}</Text> : null}
              {item.user?.role ? <Text style={s.meta}>{t("roleLabel")}: {item.user.role}</Text> : null}
              {item.user?.phone ? <Text style={s.meta}>{t("phoneLabel")}: {item.user.phone}</Text> : null}
              <Text style={s.meta}>{formatDate(item.createdAt)}</Text>

              {item.status === "PENDENTE" && (
                <View style={s.actions}>
                  <TouchableOpacity style={[s.actionBtn, s.approveBtn]} onPress={() => confirmReview(item, true)} disabled={busyId === item.id}>
                    <Text style={s.approveText}>{t("approve")}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.actionBtn, s.rejectBtn]} onPress={() => confirmReview(item, false)} disabled={busyId === item.id}>
                    <Text style={s.rejectText}>{t("reject")}</Text>
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

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 16 },
  title: { fontSize: 24, fontWeight: "bold", color: "#1B5E20", marginBottom: 12 },
  filters: { flexDirection: "row", flexWrap: "wrap", marginBottom: 8 },
  chip: { backgroundColor: "#eee", borderRadius: 16, paddingVertical: 6, paddingHorizontal: 14, marginRight: 8, marginBottom: 8 },
  chipActive: { backgroundColor: "#1B5E20" },
  chipText: { color: "#333", fontSize: 13 },
  chipTextActive: { color: "#fff", fontWeight: "600" },
  error: { color: "red", marginBottom: 8 },
  empty: { textAlign: "center", color: "#888", marginTop: 40 },
  card: { borderWidth: 1, borderColor: "#eee", borderRadius: 10, padding: 14, marginBottom: 12 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  name: { fontSize: 16, fontWeight: "bold", color: "#111", flex: 1, marginRight: 8 },
  badge: { borderRadius: 12, paddingVertical: 4, paddingHorizontal: 10 },
  badgeText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  line: { fontSize: 14, color: "#222", marginBottom: 4 },
  meta: { fontSize: 12, color: "#888", marginBottom: 2 },
  actions: { flexDirection: "row", marginTop: 10 },
  actionBtn: { borderWidth: 1, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 16, marginRight: 10 },
  approveBtn: { borderColor: "#1B5E20" },
  approveText: { color: "#1B5E20", fontWeight: "600" },
  rejectBtn: { borderColor: "#B71C1C" },
  rejectText: { color: "#B71C1C", fontWeight: "600" },
});
