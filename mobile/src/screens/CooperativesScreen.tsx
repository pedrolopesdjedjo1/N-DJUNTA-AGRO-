import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import {
  getCooperatives,
  createCooperative,
  joinCooperative,
  leaveCooperative,
} from "../api/cooperatives";

const GREEN = "#1B5E20";

export default function CooperativesScreen() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [joinedIds, setJoinedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [region, setRegion] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setError("");
      const data = await getCooperatives();
      setItems(data);
      const mine = data
        .filter((c: any) =>
          Array.isArray(c.members)
            ? c.members.some((m: any) => m.userId === user?.id)
            : false
        )
        .map((c: any) => c.id);
      setJoinedIds((prev) => Array.from(new Set([...prev, ...mine])));
    } catch (err: any) {
      setError("Não foi possível carregar as cooperativas.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const errorMessage = (err: any, fallback: string) =>
    err?.response?.data?.error || err?.message || fallback;

  const handleJoin = async (id: string) => {
    setBusyId(id);
    try {
      await joinCooperative(id);
      setJoinedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
      load();
    } catch (err: any) {
      Alert.alert("Erro", errorMessage(err, "Não foi possível entrar."));
    } finally {
      setBusyId(null);
    }
  };

  const handleLeave = async (id: string) => {
    setBusyId(id);
    try {
      await leaveCooperative(id);
      setJoinedIds((prev) => prev.filter((x) => x !== id));
      load();
    } catch (err: any) {
      Alert.alert("Erro", errorMessage(err, "Não foi possível sair."));
    } finally {
      setBusyId(null);
    }
  };

  const handleCreate = async () => {
    if (!name.trim() || !region.trim()) {
      Alert.alert("Erro", "Preencha o nome e a região da cooperativa.");
      return;
    }
    setSaving(true);
    try {
      await createCooperative({
        name: name.trim(),
        region: region.trim(),
        description: description.trim() || undefined,
      });
      setName("");
      setRegion("");
      setDescription("");
      setShowForm(false);
      Alert.alert("Sucesso", "Cooperativa criada!");
      load();
    } catch (err: any) {
      Alert.alert("Erro", errorMessage(err, "Não foi possível criar."));
    } finally {
      setSaving(false);
    }
  };

  const filtered = items.filter((c) => {
    const text = search.toLowerCase();
    return (
      !text ||
      String(c.name ?? "").toLowerCase().includes(text) ||
      String(c.region ?? "").toLowerCase().includes(text)
    );
  });

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={GREEN} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Cooperativas</Text>

      <TextInput
        style={styles.input}
        placeholder="Buscar por nome ou região..."
        value={search}
        onChangeText={setSearch}
      />

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setShowForm(!showForm)}
      >
        <Text style={styles.addButtonText}>
          {showForm ? "Fechar" : "+ Criar Cooperativa"}
        </Text>
      </TouchableOpacity>

      {showForm ? (
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Nome da cooperativa"
            value={name}
            onChangeText={setName}
          />
          <TextInput
            style={styles.input}
            placeholder="Região (ex: Bafatá)"
            value={region}
            onChangeText={setRegion}
          />
          <TextInput
            style={[styles.input, styles.multiline]}
            placeholder="Descrição (opcional)"
            value={description}
            onChangeText={setDescription}
            multiline
          />
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleCreate}
            disabled={saving}
          >
            <Text style={styles.addButtonText}>
              {saving ? "Salvando..." : "Salvar cooperativa"}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <FlatList
        data={filtered}
        keyExtractor={(item, index) => String(item.id ?? index)}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>Nenhuma cooperativa encontrada.</Text>
        }
        renderItem={({ item }) => {
          const isLeader = item.leaderId === user?.id;
          const isMember = joinedIds.includes(item.id);
          const count =
            item._count?.members ??
            (Array.isArray(item.members) ? item.members.length : 0);

          return (
            <View style={styles.card}>
              <Text style={styles.cardName}>{item.name}</Text>
              <Text style={styles.cardRegion}>Região: {item.region}</Text>
              {item.description ? (
                <Text style={styles.cardDescription}>{item.description}</Text>
              ) : null}
              <Text style={styles.cardMeta}>
                {count} {count === 1 ? "membro" : "membros"}
                {item.leader?.name ? ` · Líder: ${item.leader.name}` : ""}
              </Text>

              {isLeader ? (
                <Text style={styles.leaderText}>Você é o líder</Text>
              ) : isMember ? (
                <TouchableOpacity
                  style={styles.leaveButton}
                  onPress={() => handleLeave(item.id)}
                  disabled={busyId === item.id}
                >
                  <Text style={styles.leaveButtonText}>
                    {busyId === item.id ? "Saindo..." : "Sair da cooperativa"}
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.joinButton}
                  onPress={() => handleJoin(item.id)}
                  disabled={busyId === item.id}
                >
                  <Text style={styles.joinButtonText}>
                    {busyId === item.id ? "Entrando..." : "Entrar"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 16 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  title: { fontSize: 24, fontWeight: "bold", color: GREEN, marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  multiline: { minHeight: 70, textAlignVertical: "top" },
  errorText: { color: "red", marginBottom: 8 },
  emptyText: { textAlign: "center", color: "#888", marginTop: 40 },
  addButton: {
    backgroundColor: GREEN,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  addButtonText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  form: { marginBottom: 8 },
  card: {
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  cardName: { fontSize: 17, fontWeight: "700", color: "#111" },
  cardRegion: { fontSize: 13, color: GREEN, marginTop: 4 },
  cardDescription: { fontSize: 14, color: "#444", marginTop: 6 },
  cardMeta: { fontSize: 12, color: "#888", marginTop: 6 },
  leaderText: {
    marginTop: 10,
    color: GREEN,
    fontWeight: "600",
    fontSize: 13,
  },
  joinButton: {
    backgroundColor: GREEN,
    borderRadius: 6,
    paddingVertical: 9,
    alignItems: "center",
    marginTop: 10,
  },
  joinButtonText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  leaveButton: {
    backgroundColor: "#000",
    borderRadius: 6,
    paddingVertical: 9,
    alignItems: "center",
    marginTop: 10,
  },
  leaveButtonText: { color: "#fff", fontSize: 14, fontWeight: "600" },
});
