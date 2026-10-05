import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Image,
  Linking,
} from "react-native";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useLanguage } from "../context/LanguageContext";
import { useAparencia } from "../context/AparenciaContext";
import { getFavorites, addFavorite, removeFavorite } from "../api/favorites";
import ReportButton from "../components/ReportButton";
import { partilharProduto } from "../utils/whatsapp";

// Vídeo dentro do app. Precisa do pacote expo-video (npx expo install expo-video).
// Sem o pacote, o botão abre o vídeo no navegador.
let VideoMod: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  VideoMod = require("expo-video");
} catch (e) {
  VideoMod = null;
}

function Tocador({ url, style }: { url: string; style: any }) {
  const player = VideoMod.useVideoPlayer(url, (p: any) => {
    p.loop = false;
    p.play();
  });
  return <VideoMod.VideoView player={player} style={style} allowsFullscreen nativeControls />;
}

type Product = {
  id: string;
  title: string;
  ownerId: string;
  owner?: { id: string; name: string; role: string; phone?: string | null };
  price: number;
  unit?: string;
  quantity?: number | null;
  location?: string | null;
  category?: string;
  imageUrl?: string | null;
  videoUrl?: string | null;
};

export default function ProductsScreen({ navigation }: any) {
  const { cores, escala, escuro } = useAparencia();
  const primary = escuro ? cores.verde : "#1B5E20";
  const styles = useMemo(() => makeStyles(cores, escala, primary), [cores, escala, primary]);

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const CATEGORIES = ["AGRICOLA", "PESCA", "ARTESANATO", "OUTRO"];
  const [error, setError] = useState("");
  const { user } = useAuth();
  const { t } = useLanguage();
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const loadFavorites = useCallback(async () => {
    try {
      const favs = await getFavorites();
      setFavoriteIds(favs.map((f: any) => f.productId));
    } catch (err) {
      console.log("Erro ao carregar favoritos", err);
    }
  }, []);

  async function toggleFavorite(productId: string) {
    const isFav = favoriteIds.includes(productId);
    try {
      if (isFav) {
        await removeFavorite(productId);
        setFavoriteIds((prev) => prev.filter((id) => id !== productId));
      } else {
        await addFavorite(productId);
        setFavoriteIds((prev) => [...prev, productId]);
      }
    } catch (err) {
      console.log("Erro ao favoritar", err);
    }
  }

  const loadProducts = useCallback(async () => {
    try {
      setError("");
      const response = await api.get("/api/products");
      setProducts(response.data.products || response.data || []);
    } catch (err: any) {
      setError(t("loadError"));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useEffect(() => {
    loadProducts();
    loadFavorites();
  }, [loadProducts, loadFavorites]);

  const onRefresh = () => {
    setRefreshing(true);
    loadProducts();
  };

  const filtered = products.filter((p) => {
    const matchesSearch = p.title?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !categoryFilter || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const verVideo = (item: Product) => {
    if (!item.videoUrl) return;
    if (VideoMod) {
      setPlayingId(playingId === item.id ? null : item.id);
    } else {
      Linking.openURL(item.videoUrl);
    }
  };

  const ligar = (phone: string) => {
    Linking.openURL(`tel:${String(phone).replace(/\s/g, "")}`);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t("productsTitle")}</Text>

      <TextInput
        style={styles.searchInput}
        placeholder={t("searchProduct")}
        placeholderTextColor={cores.suave}
        value={search}
        onChangeText={setSearch}
      />

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 12 }}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat}
            onPress={() => setCategoryFilter(categoryFilter === cat ? "" : cat)}
            style={[styles.chip, categoryFilter === cat && styles.chipActive]}
          >
            <Text style={[styles.chipText, categoryFilter === cat && styles.chipTextActive]}>
              {t(`cat_${cat}`)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={styles.addButton}
        onPress={() => navigation.navigate("AddProduct")}
      >
        <Text style={styles.addButtonText}>{t("addProduct")}</Text>
      </TouchableOpacity>

      <FlatList
        data={filtered}
        keyExtractor={(item, index) => String(item.id ?? index)}
        extraData={playingId}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>{t("noProducts")}</Text>
        }
        renderItem={({ item }) => {
          const phone = item.owner?.phone;
          const isMine = item.ownerId === user?.id;
          const details = [
            item.quantity ? `Disponível: ${item.quantity}${item.unit ? " " + item.unit : ""}` : "",
            item.location || "",
          ]
            .filter(Boolean)
            .join(" • ");

          return (
            <View style={styles.card}>
              {item.imageUrl ? (
                <Image
                  source={{ uri: item.imageUrl }}
                  style={styles.productImage}
                  resizeMode="cover"
                />
              ) : null}

              {item.videoUrl && VideoMod && playingId === item.id ? (
                <Tocador url={item.videoUrl} style={styles.video} />
              ) : null}

              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={styles.productName}>{item.title}</Text>
                <TouchableOpacity onPress={() => toggleFavorite(item.id)}>
                  <Text style={{ fontSize: 20 }}>
                    {favoriteIds.includes(item.id) ? "❤️" : "🤍"}
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.productPrice}>
                {item.price} FCFA {item.unit ? `/ ${item.unit}` : ""}
              </Text>
              {details ? <Text style={styles.productDetails}>{details}</Text> : null}
              {item.category ? (
                <Text style={styles.productCategory}>
                  {CATEGORIES.includes(item.category)
                    ? t(`cat_${item.category}`)
                    : item.category}
                </Text>
              ) : null}

              <View style={styles.actionsRow}>
                {item.videoUrl ? (
                  <TouchableOpacity style={styles.smallButton} onPress={() => verVideo(item)}>
                    <Text style={styles.smallButtonText}>
                      {playingId === item.id && VideoMod ? "⏹ Fechar vídeo" : "▶ Ver vídeo"}
                    </Text>
                  </TouchableOpacity>
                ) : null}
                {phone && !isMine ? (
                  <TouchableOpacity style={styles.smallButton} onPress={() => ligar(phone)}>
                    <Text style={styles.smallButtonText}>📞 Ligar</Text>
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity style={styles.smallButton} onPress={() => partilharProduto(item)}>
                  <Text style={styles.smallButtonText}>📲 Partilhar</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.reviewsButton}
                onPress={() =>
                  navigation.navigate("Reviews", {
                    userId: item.ownerId,
                    userName: item.owner?.name ?? t("seller"),
                    productId: item.id,
                  })
                }
              >
                <Text style={styles.reviewsButtonText}>{t("reviews")}</Text>
              </TouchableOpacity>

              {!isMine && (
                <TouchableOpacity
                  style={styles.contactButton}
                  onPress={() =>
                    navigation.navigate("Chat", {
                      userId: item.ownerId,
                      userName: item.owner?.name ?? t("seller"),
                    })
                  }
                >
                  <Text style={styles.contactButtonText}>{t("contactSeller")}</Text>
                </TouchableOpacity>
              )}

              <ReportButton productId={item.id} ownerId={item.ownerId} />
            </View>
          );
        }}
      />
    </View>
  );
}

function makeStyles(c: any, e: number, primary: string) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.fundo, padding: 16 },
    center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: c.fundo },
    title: { fontSize: 24 * e, fontWeight: "bold", color: primary, marginBottom: 12 },
    searchInput: {
      borderWidth: 1,
      borderColor: c.borda,
      borderRadius: 8,
      padding: 10,
      marginBottom: 12,
      color: c.texto,
      backgroundColor: c.fundo,
      fontSize: 14 * e,
    },
    errorText: { color: "red", marginBottom: 8 },
    emptyText: { textAlign: "center", color: c.suave, marginTop: 40, fontSize: 14 * e },
    chip: {
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.borda,
      borderRadius: 16,
      paddingVertical: 6,
      paddingHorizontal: 14,
      marginRight: 8,
      marginBottom: 8,
    },
    chipActive: { backgroundColor: primary, borderColor: primary },
    chipText: { color: c.texto, fontSize: 13 * e },
    chipTextActive: { color: "#fff" },
    card: {
      borderWidth: 1,
      borderColor: c.borda,
      borderRadius: 8,
      padding: 12,
      marginBottom: 10,
      backgroundColor: c.card,
    },
    productImage: {
      width: "100%",
      height: 180,
      borderRadius: 8,
      marginBottom: 10,
      backgroundColor: "#f0f0f0",
    },
    video: { width: "100%", height: 220, borderRadius: 8, marginBottom: 10, backgroundColor: "#000" },
    productName: { fontSize: 16 * e, fontWeight: "600", color: c.texto, flex: 1 },
    productPrice: { fontSize: 14 * e, color: primary, marginTop: 4, fontWeight: "600" },
    productDetails: { fontSize: 13 * e, color: c.texto, marginTop: 4 },
    productCategory: { fontSize: 12 * e, color: c.suave, marginTop: 2 },
    actionsRow: { flexDirection: "row", flexWrap: "wrap", marginTop: 8 },
    smallButton: {
      backgroundColor: primary,
      borderRadius: 6,
      paddingVertical: 8,
      paddingHorizontal: 12,
      marginRight: 8,
      marginBottom: 4,
    },
    smallButtonText: { color: "#fff", fontSize: 13 * e, fontWeight: "600" },
    addButton: {
      backgroundColor: primary,
      borderRadius: 8,
      paddingVertical: 12,
      alignItems: "center",
      marginBottom: 16,
    },
    addButtonText: { color: "#fff", fontSize: 15 * e, fontWeight: "600" },
    reviewsButton: {
      borderWidth: 1,
      borderColor: primary,
      borderRadius: 6,
      paddingVertical: 8,
      alignItems: "center",
      marginTop: 8,
    },
    reviewsButtonText: { color: primary, fontSize: 13 * e, fontWeight: "600" },
    contactButton: {
      backgroundColor: "#000",
      borderRadius: 6,
      paddingVertical: 8,
      alignItems: "center",
      marginTop: 8,
    },
    contactButtonText: { color: "#fff", fontSize: 13 * e, fontWeight: "600" },
  });
}
