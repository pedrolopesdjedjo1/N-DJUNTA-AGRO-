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
  Image,
  Modal,
  TextInput,
} from "react-native";
import { useLanguage } from "../context/LanguageContext";
import { listBoIdentity, reviewBoIdentity } from "../api/backoffice";

type Status = "PENDENTE" | "APROVADA" | "RECUSADA";

type IdentityItem = {
  id: string;
  userId: string;
  status: Status;
  documentKind: string;
  documentUrl?: string | null;
  selfieUrl?: string | null;
  note?: string | null;
  reviewNote?: string | null;
  createdAt: string;
  user?: { id: string; name: string; phone?: string | null; role?: string; roleName?: string; location?: string | null } | null;
};

const FILTERS: { value: Status; label: string }[] = [
  { value: "PENDENTE", label: "Em análise" },
  { value: "APROVADA", label: "Aprovadas" },
  { value: "RECUSADA", label: "Recusadas" },
];

const STATUS_LABEL: Record<Status, string> = {
  PENDENTE: "Em análise",
  APROVADA: "Aprovada",
  RECUSADA: "Recusada",
};

const STATUS_COLOR: Record<Status, string> = {
  PENDENTE: "#F9A825",
  APROVADA: "#2E7D32",
  RECUSADA: "#C62828",
};

const KIND_LABEL: Record<string, string> = {
  BI: "Bilhete de identidade",
  PASSAPORTE: "Passaporte",
  CARTA_CONDUCAO: "Carta de condução",
  CARTAO_ELEITOR: "Cartão de eleitor",
  OUTRO: "Outro documento",
};

function formatDate(value: string) {
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

function errorMessage(err: any): string {
  return (
    err?.response?.data?.error ||
    err?.response?.data?.message ||
    err?.message ||
    "Ocorreu um erro. Tente novamente."
  );
}

export default function AdminVerificationsScreen() {
  const { t } = useLanguage();
  const [items, setItems] = useState<IdentityItem[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [filter, setFilter] = useState<Status>("PENDENTE");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const [rejectItem, setRejectItem] = useState<IdentityItem | null>(null);
  const [rejectNote, setRejectNote] = useState("");

  const load = useCallback(async () => {
    try {
      setError("");
      const data = await listBoIdentity({ status: filter });
      setItems(Array.isArray(data?.items) ? data.items : []);
      setCounts(data?.counts || {});
    } catch (err: any) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  async function approve(item: IdentityItem) {
    try {
      setBusyId(item.id);
      await reviewBoIdentity(item.id, { approve: true });
      await load();
    } catch (err: any) {
      Alert.alert(t("error"), errorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  function confirmApprove(item: IdentityItem) {
    Alert.alert("Aprovar verificação", `${item.user?.name ?? "Utilizador"} - ${KIND_LABEL[item.documentKind] ?? item.documentKind}`, [
      { text: t("cancel"), style: "cancel" },
      { text: t("approve"), onPress: () => approve(item) },
    ]);
  }

  async function confirmReject() {
    if (!rejectItem) return;
    const note = rejectNote.trim();
    if (note.length < 3) {
      Alert.alert(t("error"), "Explique o motivo da recusa, para a pessoa corrigir.");
      return;
    }
    const item = rejectItem;
    try {
      setBusyId(item.id);
      await reviewBoIdentity(item.id, { approve: false, note });
      setRejectItem(null);
      setRejectNote("");
      await load();
    } catch (err: any) {
      Alert.alert(t("error"), errorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <View style={s.container}>
      <Text style={s.title}>{t("verifications")}</Text>

      <View style={s.filters}>
        {FILTERS.map((f) => {
          const active = filter === f.value;
          const total = counts[f.value];
          return (
            <TouchableOpacity key={f.value} style={[s.chip, active && s.chipActive]} onPress={() => setFilter(f.value)}>
              <Text style={[s.chipText, active && s.chipTextActive]}>
                {f.label}
                {typeof total === "number" ? ` (${total})` : ""}
              </Text>
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
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
            />
          }
          ListEmptyComponent={<Text style={s.empty}>Nenhum pedido encontrado.</Text>}
          renderItem={({ item }) => (
            <View style={s.card}>
              <View style={s.cardHeader}>
                <Text style={s.name}>{item.user?.name ?? "Utilizador"}</Text>
                <View style={[s.badge, { backgroundColor: STATUS_COLOR[item.status] ?? "#999" }]}>
                  <Text style={s.badgeText}>{STATUS_LABEL[item.status] ?? item.status}</Text>
                </View>
              </View>

              <Text style={s.line}>Documento: {KIND_LABEL[item.documentKind] ?? item.documentKind}</Text>
              {item.note ? <Text style={s.line}>Nota: {item.note}</Text> : null}
              {item.reviewNote ? <Text style={s.line}>Resposta da equipa: {item.reviewNote}</Text> : null}
              {item.user?.roleName || item.user?.role ? <Text style={s.meta}>Perfil: {item.user?.roleName || item.user?.role}</Text> : null}
              {item.user?.phone ? <Text style={s.meta}>Telefone: {item.user.phone}</Text> : null}
              <Text style={s.meta}>{formatDate(item.createdAt)}</Text>

              {item.documentUrl ? <Image source={{ uri: item.documentUrl }} style={s.photo} resizeMode="cover" /> : null}
              {item.selfieUrl ? <Image source={{ uri: item.selfieUrl }} style={s.photo} resizeMode="cover" /> : null}

              {item.status === "PENDENTE" && (
                <View style={s.actions}>
                  <TouchableOpacity style={[s.actionBtn, s.approveBtn]} onPress={() => confirmApprove(item)} disabled={busyId === item.id}>
                    <Text style={s.approveText}>{t("approve")}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.actionBtn, s.rejectBtn]}
                    onPress={() => {
                      setRejectNote("");
                      setRejectItem(item);
                    }}
                    disabled={busyId === item.id}
                  >
                    <Text style={s.rejectText}>{t("reject")}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        />
      )}

      <Modal visible={!!rejectItem} transparent animationType="fade" onRequestClose={() => setRejectItem(null)}>
        <View style={s.modalBg}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Motivo da recusa</Text>
            <Text style={s.modalHint}>Escreva o que a pessoa deve corrigir. Ela vai ver esta mensagem.</Text>
            <TextInput
              style={s.input}
              value={rejectNote}
              onChangeText={setRejectNote}
              placeholder="Ex.: foto do documento sem nitidez"
              multiline
              maxLength={300}
            />
            <View style={s.actions}>
              <TouchableOpacity style={[s.actionBtn, { borderColor: "#999" }]} onPress={() => setRejectItem(null)}>
                <Text style={{ color: "#555", fontWeight: "600" }}>{t("cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.actionBtn, s.rejectBtn]} onPress={confirmReject} disabled={!!busyId}>
                <Text style={s.rejectText}>{t("reject")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  photo: { width: "100%", height: 180, borderRadius: 8, marginTop: 8, backgroundColor: "#f2f2f2" },
  actions: { flexDirection: "row", marginTop: 10 },
  actionBtn: { borderWidth: 1, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 16, marginRight: 10 },
  approveBtn: { borderColor: "#1B5E20" },
  approveText: { color: "#1B5E20", fontWeight: "600" },
  rejectBtn: { borderColor: "#B71C1C" },
  rejectText: { color: "#B71C1C", fontWeight: "600" },
  modalBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", padding: 20 },
  modalCard: { backgroundColor: "#fff", borderRadius: 12, padding: 16 },
  modalTitle: { fontSize: 18, fontWeight: "bold", color: "#111", marginBottom: 4 },
  modalHint: { fontSize: 13, color: "#666", marginBottom: 10 },
  input: { borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 10, minHeight: 80, textAlignVertical: "top" },
});
