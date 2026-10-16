import React, { useCallback, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { ClientLayout } from "../components/MerchantTabs";
import { Page, Title, SubTitle, Btn, Empty, Field, useLoader, u } from "../components/ui";
import ClientProductCard from "../components/ClientProductCard";
import { useFavoriteIds } from "../utils/favorites";
import { getShopHome, getNearbyOffers } from "../api/shop";
import { colors } from "../theme/colors";

const EMPTY = {
  region: "",
  unreadNotifications: 0,
  featured: [] as any[],
  nearby: [] as any[],
  bestSelling: [] as any[],
  newest: [] as any[],
  promotions: [] as any[],
  recommendations: [] as any[],
  recommendationsFromHistory: false,
  categories: [] as any[],
};

export default function ClientHomeScreen({ navigation }: any) {
  const { user } = useAuth();
  const loader = useLoader(getShopHome, EMPTY);
  const d: any = loader.data;
  const { ids, toggle } = useFavoriteIds();
  const [text, setText] = useState("");

  // Ao abrir o início, procura ofertas perto do cliente (e avisa nas notificações)
  useFocusEffect(
    useCallback(() => {
      getNearbyOffers().catch(() => {});
    }, [])
  );

  function explore(params: Record<string, any> = {}) {
    navigation.navigate("ClientExplore", { ...params, t: Date.now() });
  }

  function search() {
    explore({ q: text.trim() });
  }

  function row(title: string, items: any[], seeAll?: Record<string, any>) {
    if (!items || items.length === 0) return null;
    return (
      <View key={title}>
        <View style={[u.between, { marginTop: 4 }]}>
          <SubTitle>{title}</SubTitle>
          {seeAll ? <Btn small kind="outline" label="Ver todos" onPress={() => explore(seeAll)} /> : null}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {items.map((p) => (
            <View key={p.id} style={{ marginRight: 10 }}>
              <ClientProductCard
                product={p}
                width={150}
                favorite={ids.has(p.id)}
                onToggleFavorite={() => toggle(p.id)}
                onPress={() => navigation.navigate("ClientProduct", { id: p.id })}
              />
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  const nothing =
    d.featured.length === 0 &&
    d.newest.length === 0 &&
    d.promotions.length === 0 &&
    d.bestSelling.length === 0 &&
    d.recommendations.length === 0;

  return (
    <ClientLayout active="ClientHome">
      <Page loader={loader}>
        <Title>🛒 Olá, {user?.name}</Title>

        <TouchableOpacity onPress={() => navigation.navigate("ClientAddresses")}>
          <Text style={{ color: colors.primary, marginBottom: 8 }}>
            📍 {d.region ? `Entregas em ${d.region}` : "Definir a minha localização"}
          </Text>
        </TouchableOpacity>

        <Field
          placeholder="Pesquisar produtos (ex: arroz, peixe, cesto)"
          value={text}
          onChangeText={setText}
          onSubmitEditing={search}
          returnKeyType="search"
        />
        <Btn small label="🔍 Pesquisar" onPress={search} />

        <SubTitle>Categorias</SubTitle>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {d.categories.map((c: any) => (
            <TouchableOpacity key={c.key} onPress={() => explore({ category: c.key })} style={{ alignItems: "center", marginRight: 14, width: 78 }}>
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  borderWidth: 1,
                  borderColor: colors.border,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text style={{ fontSize: 26 }}>{c.icon}</Text>
              </View>
              <Text style={{ fontSize: 11, textAlign: "center", marginTop: 4 }} numberOfLines={2}>
                {c.label}
              </Text>
              <Text style={{ fontSize: 10, color: colors.textSecondary }}>{c.count}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {nothing ? <Empty text="Ainda não há produtos disponíveis. Volte daqui a pouco." /> : null}

        {row("🔥 Promoções", d.promotions, { onlyPromo: true })}
        {row("⭐ Produtos em destaque", d.featured)}

        {d.region ? (
          row("📍 Produtos próximos", d.nearby, { near: true })
        ) : (
          <View>
            <SubTitle>📍 Produtos próximos</SubTitle>
            <Text style={u.muted}>Defina a sua localização para ver produtos perto de si.</Text>
            <Btn small kind="outline" label="Definir localização" onPress={() => navigation.navigate("ClientAddresses")} />
          </View>
        )}

        {row("🏆 Mais vendidos", d.bestSelling, { sort: "sold" })}
        {row("🆕 Novos produtos", d.newest, { sort: "recent" })}
        {row(d.recommendationsFromHistory ? "💡 Recomendado para si" : "💡 Sugestões", d.recommendations)}
      </Page>
    </ClientLayout>
  );
}
