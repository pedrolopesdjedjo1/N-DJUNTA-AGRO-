import React, { useState } from "react";
import { View, Text, Image, Alert, Linking, ScrollView } from "react-native";
import { Page, Title, SubTitle, Card, Badge, Btn, Empty, useLoader, u } from "../components/ui";
import ClientProductCard from "../components/ClientProductCard";
import {
  getShopProduct,
  getProductReviews,
  addToCart,
  setCartQuantity,
  toggleFavoriteProduct,
  toggleFavoriteSeller,
} from "../api/shop";
import { getApiErrorMessage } from "../api/errorMessage";
import { ESTADOS_PRODUTO, departmentLabel, money, formatDate } from "../constants/market";
import { colors } from "../theme/colors";

const INFO: [string, string][] = [
  ["brand", "Marca"],
  ["model", "Modelo"],
  ["estado", "Estado"],
  ["estadoProduto", "Estado do produto"],
  ["harvestDate", "Data de colheita ou pesca"],
  ["color", "Cor"],
  ["colors", "Cores"],
  ["size", "Tamanho"],
  ["weight", "Peso"],
  ["materials", "Materiais"],
  ["productionTime", "Tempo de produção"],
  ["deliveryOptions", "Opções de entrega"],
  ["saleConditions", "Condições de venda"],
];

const ROLES: Record<string, string> = {
  AGRICULTOR: "Agricultor",
  PESCADOR: "Pescador",
  ARTESAO: "Artesão",
  COMERCIANTE: "Comerciante",
  TRANSPORTADOR: "Transportador",
  COMPRADOR: "Comprador",
  CLIENTE: "Cliente",
};

function stars(n: number) {
  const full = Math.max(0, Math.min(5, Math.round(n)));
  return "★".repeat(full) + "☆".repeat(5 - full);
}

function infoValue(key: string, value: string) {
  if (key === "estado") return value === "NOVO" ? "Novo" : value === "USADO" ? "Usado" : value;
  if (key === "estadoProduto") return ESTADOS_PRODUTO.find((e) => e.value === value)?.label ?? value;
  if (key === "harvestDate") return formatDate(`${value}T12:00:00`);
  return value;
}

export default function ClientProductScreen({ navigation, route }: any) {
  const id: string = route?.params?.id;

  const loader = useLoader(
    async () => {
      const [detail, reviews] = await Promise.all([
        getShopProduct(id),
        getProductReviews(id).catch(() => ({ count: 0, average: 0, reviews: [] })),
      ]);
      return { detail, reviews };
    },
    null as any,
    [id]
  );

  const data: any = loader.data;
  const detail: any = data?.detail;
  const reviews: any = data?.reviews;

  const [qty, setQty] = useState(1);
  const [fav, setFav] = useState<boolean | null>(null);
  const [follow, setFollow] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  async function onFavorite() {
    if (!detail) return;
    const before = fav ?? detail.isFavorite;
    setFav(!before);
    try {
      const r = await toggleFavoriteProduct(id);
      setFav(r.favorite);
    } catch (e) {
      setFav(before);
      Alert.alert("Erro", getApiErrorMessage(e, "Não foi possível atualizar os favoritos."));
    }
  }

  async function onFollow() {
    if (!detail) return;
    const before = follow ?? detail.seller.isFavorite;
    setFollow(!before);
    try {
      const r = await toggleFavoriteSeller(detail.seller.id);
      setFollow(r.favorite);
    } catch (e) {
      setFollow(before);
      Alert.alert("Erro", getApiErrorMessage(e, "Não foi possível guardar o vendedor."));
    }
  }

  async function onAdd() {
    setBusy(true);
    try {
      await addToCart(id, qty);
      Alert.alert("Adicionado ao carrinho", `${qty} × ${detail.product.title}`, [
        { text: "Continuar a ver", style: "cancel" },
        { text: "Ver carrinho", onPress: () => navigation.navigate("ClientCart") },
      ]);
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível adicionar ao carrinho."));
    } finally {
      setBusy(false);
    }
  }

  async function onBuyNow() {
    setBusy(true);
    try {
      try {
        await setCartQuantity(id, qty);
      } catch (e) {
        await addToCart(id, qty);
      }
      navigation.navigate("ClientCheckout", { productIds: [id] });
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível iniciar a encomenda."));
    } finally {
      setBusy(false);
    }
  }

  function changeQty(next: number, max: number) {
    setQty(Math.max(1, Math.min(max, next)));
  }

  if (!detail) {
    return (
      <Page loader={loader}>
        <Title>Produto</Title>
        <Empty text="A carregar..." />
      </Page>
    );
  }

  const p = detail.product;
  const seller = detail.seller;
  const isFavorite = fav ?? detail.isFavorite;
  const isFollowing = follow ?? seller.isFavorite;
  const out = !(p.quantity > 0);
  const info = INFO.filter(([key]) => p.details?.[key]);
  const roleLabel = ROLES[seller.role] ?? "Vendedor";

  return (
    <Page loader={loader}>
      {p.imageUrl ? (
        <Image source={{ uri: p.imageUrl }} style={{ width: "100%", height: 240, borderRadius: 10 }} resizeMode="cover" />
      ) : (
        <View style={{ width: "100%", height: 160, borderRadius: 10, backgroundColor: "#EEEEEE", alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontSize: 48 }}>📦</Text>
        </View>
      )}

      {p.videoUrl ? <Btn small kind="outline" label="▶️ Ver vídeo do produto" onPress={() => Linking.openURL(p.videoUrl)} /> : null}

      <View style={[u.between, { marginTop: 10 }]}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Title>{p.title}</Title>
        </View>
        <Btn small kind="outline" label={isFavorite ? "❤️ Guardado" : "🤍 Guardar"} onPress={onFavorite} />
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap" }}>
        <Text style={{ fontSize: 24, fontWeight: "bold", color: colors.primary, marginRight: 8 }}>{money(p.finalPrice)}</Text>
        {p.discountPercent > 0 ? (
          <>
            <Text style={{ color: colors.textSecondary, textDecorationLine: "line-through", marginRight: 8 }}>{money(p.price)}</Text>
            <Badge label={`-${p.discountPercent}%`} color="#C62828" />
          </>
        ) : null}
      </View>
      <Text style={u.muted}>por {p.unit}</Text>

      <Text style={{ marginTop: 6, color: out ? "#C62828" : "#2E7D32", fontWeight: "bold" }}>
        {out ? "Sem stock" : `${p.quantity} ${p.unit} disponível(eis)`}
      </Text>
      {p.location ? <Text style={u.muted}>📍 {p.location}</Text> : null}
      <Text style={u.muted}>{departmentLabel(p.department)}{p.subcategory ? ` · ${p.subcategory}` : ""}</Text>
      {p.sold > 0 ? <Text style={u.muted}>🛍️ {p.sold} vendido(s)</Text> : null}

      {p.description ? (
        <>
          <SubTitle>Descrição</SubTitle>
          <Text style={{ lineHeight: 21 }}>{p.description}</Text>
        </>
      ) : null}

      {info.length > 0 ? (
        <>
          <SubTitle>Informações do produto</SubTitle>
          <Card>
            {info.map(([key, label]) => (
              <View key={key} style={{ marginTop: 4 }}>
                <Text style={u.muted}>{label}</Text>
                <Text>{infoValue(key, p.details[key])}</Text>
              </View>
            ))}
          </Card>
        </>
      ) : null}

      {!detail.isMine && !out ? (
        <Card>
          <Text style={u.strong}>Quantidade</Text>
          <View style={[u.row, { alignItems: "center" }]}>
            <Btn small kind="outline" label="−" onPress={() => changeQty(qty - 1, p.quantity)} />
            <Text style={{ fontSize: 20, fontWeight: "bold", marginHorizontal: 16 }}>{qty}</Text>
            <Btn small kind="outline" label="+" onPress={() => changeQty(qty + 1, p.quantity)} />
          </View>
          <Text style={[u.strong, { marginTop: 8 }]}>Subtotal: {money(p.finalPrice * qty)}</Text>

          <Btn label={busy ? "A processar..." : "🛒 Adicionar ao carrinho"} onPress={onAdd} disabled={busy} />
          <Btn kind="outline" label="⚡ Encomendar agora" onPress={onBuyNow} disabled={busy} />
        </Card>
      ) : null}

      {detail.isMine ? (
        <Card>
          <Text style={u.muted}>Este produto é seu.</Text>
        </Card>
      ) : null}

      <SubTitle>Vendedor</SubTitle>
      <Card>
        <Text style={u.strong}>
          {seller.name} {seller.isVerified ? "✅" : ""}
        </Text>
        <Text style={u.muted}>{roleLabel}</Text>
        {seller.location ? <Text style={u.muted}>📍 {seller.location}</Text> : null}
        <Text style={u.muted}>
          {seller.rating.count > 0
            ? `${stars(seller.rating.average)} ${Number(seller.rating.average).toFixed(1)} (${seller.rating.count} avaliações)`
            : "Ainda sem avaliações"}
        </Text>
        <Text style={u.muted}>
          👥 {seller.followers} seguidor(es) · 📦 {seller.sales} venda(s)
        </Text>

        <View style={u.row}>
          <Btn small label="Ver vendedor" onPress={() => navigation.navigate("ClientSeller", { id: seller.id })} />
          {!detail.isMine ? (
            <>
              <Btn small kind="outline" label={isFollowing ? "✓ A seguir" : "➕ Seguir"} onPress={onFollow} />
              <Btn
                small
                kind="outline"
                label="💬 Contactar"
                onPress={() => navigation.navigate("Chat", { userId: seller.id, userName: seller.name })}
              />
              {seller.phone ? <Btn small kind="outline" label="📞 Ligar" onPress={() => Linking.openURL(`tel:${seller.phone}`)} /> : null}
            </>
          ) : null}
        </View>
      </Card>

      <SubTitle>Avaliações do produto</SubTitle>
      {reviews && reviews.count > 0 ? (
        <>
          <Text style={u.muted}>
            {stars(reviews.average)} {Number(reviews.average).toFixed(1)} ({reviews.count})
          </Text>
          {reviews.reviews.map((r: any) => (
            <Card key={r.id}>
              <View style={u.between}>
                <Text style={u.strong}>{r.authorName}</Text>
                <Text style={{ color: "#F9A825" }}>{stars(r.rating)}</Text>
              </View>
              <Text style={u.muted}>{formatDate(r.createdAt)}</Text>
              {r.comment ? <Text style={{ marginTop: 4 }}>{r.comment}</Text> : null}
              {r.imageUrl ? <Image source={{ uri: r.imageUrl }} style={{ width: 120, height: 120, borderRadius: 8, marginTop: 6 }} /> : null}
            </Card>
          ))}
        </>
      ) : (
        <Text style={u.muted}>Este produto ainda não foi avaliado.</Text>
      )}

      {detail.reviews.length > 0 ? (
        <>
          <SubTitle>O que dizem do vendedor</SubTitle>
          {detail.reviews.map((r: any) => (
            <Card key={r.id}>
              <View style={u.between}>
                <Text style={u.strong}>{r.authorName}</Text>
                <Text style={{ color: "#F9A825" }}>{stars(r.rating)}</Text>
              </View>
              {r.comment ? <Text style={{ marginTop: 4 }}>{r.comment}</Text> : null}
            </Card>
          ))}
        </>
      ) : null}

      {detail.moreFromSeller.length > 0 ? (
        <>
          <SubTitle>Mais deste vendedor</SubTitle>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {detail.moreFromSeller.map((x: any) => (
              <View key={x.id} style={{ marginRight: 10 }}>
                <ClientProductCard product={x} width={150} onPress={() => navigation.push("ClientProduct", { id: x.id })} />
              </View>
            ))}
          </ScrollView>
        </>
      ) : null}

      {detail.similar.length > 0 ? (
        <>
          <SubTitle>Produtos parecidos</SubTitle>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {detail.similar.map((x: any) => (
              <View key={x.id} style={{ marginRight: 10 }}>
                <ClientProductCard product={x} width={150} onPress={() => navigation.push("ClientProduct", { id: x.id })} />
              </View>
            ))}
          </ScrollView>
        </>
      ) : null}
    </Page>
  );
}
