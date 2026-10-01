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
import { useRoute } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { getUserReviews, createReview } from "../api/reviews";

const GREEN = "#1B5E20";

function stars(rating: number) {
  const full = Math.max(0, Math.min(5, Math.round(rating)));
  return "★".repeat(full) + "☆".repeat(5 - full);
}

export default function ReviewsScreen() {
  const route = useRoute<any>();
  const { userId, userName, productId } = route.params;
  const { user } = useAuth();

  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setError("");
      const data = await getUserReviews(userId);
      setReviews(data);
    } catch (err: any) {
      setError("Não foi possível carregar as avaliações.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const handleSubmit = async () => {
    if (rating < 1) {
      Alert.alert("Atenção", "Escolha uma nota de 1 a 5 estrelas.");
      return;
    }
    setSaving(true);
    try {
      await createReview({
        targetId: userId,
        rating,
        comment: comment.trim() || undefined,
        productId: productId || undefined,
      });
      setRating(0);
      setComment("");
      Alert.alert("Obrigado", "Avaliação enviada!");
      load();
    } catch (err: any) {
      Alert.alert(
        "Erro",
        err?.response?.data?.error ||
          err?.message ||
          "Não foi possível enviar a avaliação."
      );
    } finally {
      setSaving(false);
    }
  };

  const count = reviews.length;
  const average =
    count > 0
      ? reviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) / count
      : 0;

  const isMe = userId === user?.id;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={GREEN} />
      </View>
    );
  }

  const header = (
    <View>
      <View style={styles.summary}>
        <Text style={styles.average}>
          {count > 0 ? average.toFixed(1) : "—"}
        </Text>
        <Text style={styles.summaryStars}>{stars(average)}</Text>
        <Text style={styles.summaryCount}>
          {count} {count === 1 ? "avaliação" : "avaliações"}
          {userName ? ` de ${userName}` : ""}
        </Text>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {isMe ? (
        <Text style={styles.note}>
          Você não pode avaliar a si mesmo. Aqui estão as avaliações que você
          recebeu.
        </Text>
      ) : (
        <View style={styles.form}>
          <Text style={styles.formTitle}>Deixe sua avaliação</Text>
          <View style={styles.starRow}>
            {[1, 2, 3, 4, 5].map((n) => (
              <TouchableOpacity key={n} onPress={() => setRating(n)}>
                <Text style={styles.starButton}>{n <= rating ? "★" : "☆"}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={styles.input}
            placeholder="Comentário (opcional)"
            value={comment}
            onChangeText={setComment}
            multiline
          />
          <TouchableOpacity
            style={styles.button}
            onPress={handleSubmit}
            disabled={saving}
          >
            <Text style={styles.buttonText}>
              {saving ? "Enviando..." : "Enviar avaliação"}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <Text style={styles.listTitle}>Avaliações recebidas</Text>
    </View>
  );

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={reviews}
      keyExtractor={(item, index) => String(item.id ?? index)}
      ListHeaderComponent={header}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      ListEmptyComponent={
        <Text style={styles.emptyText}>Ainda não há avaliações.</Text>
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.cardTop}>
            <Text style={styles.cardAuthor}>
              {item.author?.name ?? "Usuário"}
            </Text>
            <Text style={styles.cardStars}>{stars(Number(item.rating))}</Text>
          </View>
          {item.comment ? (
            <Text style={styles.cardComment}>{item.comment}</Text>
          ) : null}
          {item.createdAt ? (
            <Text style={styles.cardDate}>
              {new Date(item.createdAt).toLocaleDateString("pt-BR")}
            </Text>
          ) : null}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  summary: {
    alignItems: "center",
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 8,
    marginBottom: 16,
  },
  average: { fontSize: 40, fontWeight: "bold", color: GREEN },
  summaryStars: { fontSize: 22, color: "#F9A825", marginTop: 2 },
  summaryCount: { fontSize: 13, color: "#888", marginTop: 4 },
  errorText: { color: "red", marginBottom: 8 },
  note: { color: "#666", fontSize: 13, marginBottom: 16 },
  form: {
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  formTitle: { fontSize: 15, fontWeight: "700", marginBottom: 8 },
  starRow: { flexDirection: "row", marginBottom: 10 },
  starButton: { fontSize: 34, color: "#F9A825", marginRight: 6 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    minHeight: 60,
    textAlignVertical: "top",
  },
  button: {
    backgroundColor: GREEN,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  listTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: GREEN,
    marginBottom: 8,
  },
  emptyText: { textAlign: "center", color: "#888", marginTop: 20 },
  card: {
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardAuthor: { fontSize: 14, fontWeight: "600" },
  cardStars: { fontSize: 15, color: "#F9A825" },
  cardComment: { fontSize: 14, color: "#444", marginTop: 6 },
  cardDate: { fontSize: 11, color: "#999", marginTop: 6 },
});
