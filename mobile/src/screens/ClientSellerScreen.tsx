import React, { useState } from "react";
import { View, Text, Image, Alert, Linking, Switch, useWindowDimensions } from "react-native";
import { Page, Title, SubTitle, Card, Badge, Btn, Empty, useLoader, u } from "../components/ui";
import ClientProductCard from "../components/ClientProductCard";
import { useFavoriteIds } from "../utils/favorites";
import { getShopSeller, toggleFavoriteSeller, setSellerNotify } from "../api/shop";
import { getApiErrorMessage } from "../api/errorMessage";
import { formatDate } from "../constants/market";
import { colors } from "../theme/colors";

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

function list(value: any): string {
  return Array.isArray(value) ? value.join(", ") : "";
}

export default function ClientSellerScreen({ navigation, route }: any) {
  const id: string = route?.params?.id;
  const { width } = useWindowDimensions();
  const cardWidth = Math.floor((width - 42) / 2);
  const { ids, toggle } = useFavoriteIds();

  const loader = useLoader(() => getShopSeller(id), null as any, [id]);
  const d: any = loader.data;

  const [follow, setFollow] = useState<boolean | null>(null);
  const [notify, setNotify] = useState<boolean | null>(null);

  if (!d) {
    return (
      <Page loader={loader}>
        <Title>Vendedor</Title>
        <Empty text="A carregar..." />
      </Page>
    );
  }

  const s = d.seller;
  const store = d.store ?? {};
  const isFollowing = follow ?? s.isFavorite;
  const isNotify = notify ?? s.notify;

  async function onFollow() {
    const before = isFollowing;
    setFollow(!before);
    try {
      const r = await toggleFavoriteSeller(id);
      setFollow(r.favorite);
      setNotify(r.notify);
    } catch (e) {
      setFollow(before);
      Alert.alert("Erro", getApiErrorMessage(e, "Não foi possível guardar o vendedor."));
    }
  }

  async function onNotify(value: boolean) {
    const before = isNotify;
    setNotify(value);
    try {
      await setSellerNotify(id, value);
    } catch (e) {
      setNotify(before);
      Alert.alert("Erro", getApiErrorMessage(e, "Não foi possível atualizar os avisos."));
    }
  }

  const extras: [string, string][] = [
    ["Tipo de artesão", store.craftType],
    ["Especialidades", list(store.specialties)],
    ["Tipo de agricultor", store.farmType],
    ["Área cultivada", store.cultivatedArea],
    ["Principais culturas", list(store.mainCrops)],
    ["Tipo de pescador", store.fisherType],
    ["Tipo de barco", store.boatType],
    ["Principais espécies", list(store.mainSpecies)],
  ].filter(([, v]) => !!v) as [string, string][];

  return (
    <Page loader={loader}>
      <View style={u.row}>
        {store.logoUrl ? (
          <Image source={{ uri: store.logoUrl }} style={[u.photo, { width: 80, height: 80, borderRadius: 40 }]} />
        ) : (
          <View style={[u.photo, { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center" }]}>
            <Text style={{ fontSize: 30 }}>👤</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Title>{store.name || s.name}</Title>
          <Text style={u.muted}>
            {ROLES[s.role] ?? "Vendedor"} {s.isVerified ? "✅ verificado" : ""}
          </Text>
          {s.location ? <Text style={u.muted}>📍 {s.location}</Text> : null}
        </View>
      </View>

      <Card>
        <Text style={u.strong}>
          {s.rating.count > 0
            ? `${stars(s.rating.average)} ${Number(s.rating.average).toFixed(1)} (${s.rating.count} avaliações)`
            : "Ainda sem avaliações"}
        </Text>
        <Text style={u.muted}>
          👥 {s.followers} seguidor(es) · 📦 {s.sales} venda(s) · 🗓️ No app desde {formatDate(s.createdAt)}
        </Text>
        {store.description ? <Text style={{ marginTop: 8, lineHeight: 21 }}>{store.description}</Text> : null}
        {extras.map(([label, value]) => (
          <Text key={label} style={[u.muted, { marginTop: 4 }]}>
            {label}: {value}
          </Text>
        ))}
      </Card>

      {!d.isMe ? (
        <>
          <View style={u.row}>
            <Btn small label={isFollowing ? "✓ A seguir" : "➕ Seguir"} onPress={onFollow} />
            <Btn
              small
              kind="outline"
              label="💬 Contactar"
              onPress={() => navigation.navigate("Chat", { userId: s.id, userName: s.name })}
            />
            {s.phone ? <Btn small kind="outline" label="📞 Ligar" onPress={() => Linking.openURL(`tel:${s.phone}`)} /> : null}
          </View>

          {isFollowing ? (
            <View style={[u.between, { marginTop: 8 }]}>
              <Text style={[u.muted, { flex: 1, marginRight: 8 }]}>Receber aviso quando houver novidades</Text>
              <Switch value={!!isNotify} onValueChange={onNotify} trackColor={{ true: colors.primary, false: "#BDBDBD" }} />
            </View>
          ) : null}
        </>
      ) : null}

      <SubTitle>Produtos ({d.products.length})</SubTitle>
      {d.products.length === 0 ? (
        <Empty text="Este vendedor não tem produtos disponíveis." />
      ) : (
        <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }}>
          {d.products.map((p: any) => (
            <ClientProductCard
              key={p.id}
              product={p}
              width={cardWidth}
              favorite={ids.has(p.id)}
              onToggleFavorite={d.isMe ? undefined : () => toggle(p.id)}
              onPress={() => navigation.navigate("ClientProduct", { id: p.id })}
            />
          ))}
        </View>
      )}

      <SubTitle>Avaliações</SubTitle>
      {d.reviews.length === 0 ? (
        <Empty text="Ainda sem avaliações." />
      ) : (
        d.reviews.map((r: any) => (
          <Card key={r.id}>
            <View style={u.between}>
              <Text style={u.strong}>{r.authorName}</Text>
              <Text style={{ color: "#F9A825" }}>{stars(r.rating)}</Text>
            </View>
            <Text style={u.muted}>{formatDate(r.createdAt)}</Text>
            {r.comment ? <Text style={{ marginTop: 4 }}>{r.comment}</Text> : null}
          </Card>
        ))
      )}
    </Page>
  );
}
