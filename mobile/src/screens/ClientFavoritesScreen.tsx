import React, { useState } from "react";
import { View, Text, Alert, Switch, useWindowDimensions } from "react-native";
import { Page, Title, Card, Btn, Chip, Empty, useLoader, u } from "../components/ui";
import ClientProductCard from "../components/ClientProductCard";
import { getShopFavorites, toggleFavoriteProduct, toggleFavoriteSeller, setSellerNotify } from "../api/shop";
import { getApiErrorMessage } from "../api/errorMessage";
import { colors } from "../theme/colors";

const ROLES: Record<string, string> = {
  AGRICULTOR: "Agricultor",
  PESCADOR: "Pescador",
  ARTESAO: "Artesão",
  COMERCIANTE: "Comerciante",
  TRANSPORTADOR: "Transportador",
};

export default function ClientFavoritesScreen({ navigation }: any) {
  const { width } = useWindowDimensions();
  const cardWidth = Math.floor((width - 42) / 2);
  const [tab, setTab] = useState<"products" | "sellers">("products");

  const loader = useLoader(getShopFavorites, { products: [] as any[], sellers: [] as any[] });
  const products: any[] = loader.data.products;
  const sellers: any[] = loader.data.sellers;

  async function run(work: () => Promise<any>, fail: string) {
    try {
      await work();
      loader.reload();
    } catch (e) {
      Alert.alert("Erro", getApiErrorMessage(e, fail));
    }
  }

  return (
    <Page loader={loader}>
      <Title>❤️ Favoritos</Title>

      <View style={u.row}>
        <Chip label={`Produtos (${products.length})`} active={tab === "products"} onPress={() => setTab("products")} />
        <Chip label={`Vendedores (${sellers.length})`} active={tab === "sellers"} onPress={() => setTab("sellers")} />
      </View>

      {tab === "products" ? (
        products.length === 0 ? (
          <>
            <Empty text="Ainda não guardou produtos. Toque no coração de um produto para o guardar aqui." />
            <Btn label="🔎 Explorar produtos" onPress={() => navigation.navigate("ClientExplore")} />
          </>
        ) : (
          <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginTop: 8 }}>
            {products.map((p) => (
              <ClientProductCard
                key={p.id}
                product={p}
                width={cardWidth}
                favorite
                onToggleFavorite={() => run(() => toggleFavoriteProduct(p.id), "Não foi possível remover dos favoritos.")}
                onPress={() => navigation.navigate("ClientProduct", { id: p.id })}
              />
            ))}
          </View>
        )
      ) : sellers.length === 0 ? (
        <>
          <Empty text="Ainda não guardou vendedores. Abra um produto e toque em Seguir." />
          <Btn label="🔎 Explorar produtos" onPress={() => navigation.navigate("ClientExplore")} />
        </>
      ) : (
        <>
          <Text style={[u.muted, { marginTop: 8 }]}>
            Com os avisos ligados, recebe uma notificação quando o vendedor publica um produto novo.
          </Text>
          {sellers.map((s) => (
            <Card key={s.id}>
              <Text style={u.strong}>
                {s.name} {s.isVerified ? "✅" : ""}
              </Text>
              <Text style={u.muted}>{ROLES[s.role] ?? "Vendedor"}</Text>
              {s.location ? <Text style={u.muted}>📍 {s.location}</Text> : null}
              <Text style={u.muted}>
                {s.rating.count > 0 ? `★ ${Number(s.rating.average).toFixed(1)} (${s.rating.count})` : "Sem avaliações"} · 📦 {s.productsCount} produto(s)
              </Text>

              <View style={[u.between, { marginTop: 8 }]}>
                <Text style={[u.muted, { flex: 1, marginRight: 8 }]}>Avisar-me das novidades</Text>
                <Switch
                  value={s.notify}
                  onValueChange={(v) => run(() => setSellerNotify(s.id, v), "Não foi possível atualizar os avisos.")}
                  trackColor={{ true: colors.primary, false: "#BDBDBD" }}
                />
              </View>

              <View style={u.row}>
                <Btn small label="Ver vendedor" onPress={() => navigation.navigate("ClientSeller", { id: s.id })} />
                <Btn
                  small
                  kind="outline"
                  label="💬 Contactar"
                  onPress={() => navigation.navigate("Chat", { userId: s.id, userName: s.name })}
                />
                <Btn small kind="danger" label="Deixar de seguir" onPress={() => run(() => toggleFavoriteSeller(s.id), "Não foi possível deixar de seguir.")} />
              </View>
            </Card>
          ))}
        </>
      )}
    </Page>
  );
}
