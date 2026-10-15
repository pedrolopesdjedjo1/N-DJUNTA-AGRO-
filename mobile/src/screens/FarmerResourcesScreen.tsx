import React, { useState } from "react";
import { View, Text, ScrollView, Linking } from "react-native";
import { useAuth } from "../context/AuthContext";
import { Page, Title, Card, Btn, Chip, Empty, Field, useLoader, u } from "../components/ui";
import BuyModal from "../components/BuyModal";
import { fetchProducts } from "../api/products";
import { materialPrices } from "../api/prices";
import { money } from "../constants/market";

const GROUPS = ["Sementes", "Fertilizantes", "Ferramentas", "Máquinas agrícolas", "Equipamentos"];

export default function FarmerResourcesScreen({ navigation }: any) {
  const { user } = useAuth();
  const [tab, setTab] = useState<"items" | "suppliers" | "prices">("items");
  const [group, setGroup] = useState("");
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const [near, setNear] = useState("");
  const [location, setLocation] = useState("");
  const [cheapest, setCheapest] = useState(false);
  const [buying, setBuying] = useState<any | null>(null);

  const loader = useLoader(
    async () => {
      const lists = await Promise.all(
        ["MATERIAL", "FERRAMENTA"].map((tipo) =>
          fetchProducts({ department: "AGRICULTURA", tipo, subcategory: group, q, location })
        )
      );
      let items = ([] as any[]).concat(...lists);
      if (cheapest) items = items.sort((a, b) => (a.finalPrice ?? a.price) - (b.finalPrice ?? b.price));
      const prices = await materialPrices("AGRICULTURA");
      return { items, prices };
    },
    { items: [] as any[], prices: [] as any[] },
    [group, q, location, cheapest]
  );

  const items: any[] = loader.data.items;
  const prices: any[] = loader.data.prices;

  const suppliers = Array.from(
    items
      .reduce((map, p) => {
        const current = map.get(p.ownerId) ?? {
          id: p.ownerId,
          name: p.owner?.name ?? "Fornecedor",
          phone: p.owner?.phone ?? "",
          verified: !!p.owner?.isVerified,
          location: p.location ?? "",
          count: 0,
          min: Infinity,
        };
        current.count += 1;
        current.min = Math.min(current.min, p.finalPrice ?? p.price);
        map.set(p.ownerId, current);
        return map;
      }, new Map<string, any>())
      .values()
  );

  return (
    <>
      <Page loader={loader}>
        <Title>🧑‍🌾 Recursos agrícolas</Title>

        <View style={u.row}>
          <Chip label="Produtos" active={tab === "items"} onPress={() => setTab("items")} />
          <Chip label="Fornecedores próximos" active={tab === "suppliers"} onPress={() => setTab("suppliers")} />
          <Chip label="Preços dos materiais" active={tab === "prices"} onPress={() => setTab("prices")} />
        </View>

        {tab !== "prices" && (
          <>
            <Field
              placeholder="Procurar (ex: sementes de arroz)"
              value={text}
              onChangeText={setText}
              onSubmitEditing={() => setQ(text.trim())}
              returnKeyType="search"
            />
            <Field
              placeholder="Perto de... (ex: Bafatá)"
              value={near}
              onChangeText={setNear}
              onSubmitEditing={() => setLocation(near.trim())}
              returnKeyType="search"
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
              <Chip label="Todos" active={group === ""} onPress={() => setGroup("")} />
              {GROUPS.map((g) => (
                <Chip key={g} label={g} active={group === g} onPress={() => setGroup(g)} />
              ))}
              <Chip label="💲 Mais baratos" active={cheapest} onPress={() => setCheapest(!cheapest)} />
            </ScrollView>
          </>
        )}

        {tab === "items" &&
          (items.length === 0 ? (
            <Empty text="Nenhum produto encontrado." />
          ) : (
            items.map((p) => (
              <Card key={p.id}>
                <Text style={u.strong}>{p.title}</Text>
                {p.subcategory ? <Text style={u.muted}>{p.subcategory}</Text> : null}
                <Text style={u.muted}>
                  {money(p.finalPrice ?? p.price)} / {p.unit} · {p.quantity} disponível(eis)
                </Text>
                <Text style={u.muted}>
                  {p.owner?.name ?? "Fornecedor"} {p.owner?.isVerified ? "✅" : ""}
                  {p.location ? ` · 📍 ${p.location}` : ""}
                </Text>
                {p.description ? <Text style={{ marginTop: 4 }}>{p.description}</Text> : null}
                {p.ownerId !== user?.id && (
                  <View style={u.row}>
                    {p.quantity > 0 && <Btn small label="🛒 Comprar" onPress={() => setBuying(p)} />}
                    <Btn
                      small
                      kind="outline"
                      label="💬 Mensagem"
                      onPress={() => navigation.navigate("Chat", { userId: p.ownerId, userName: p.owner?.name ?? "Fornecedor" })}
                    />
                    <Btn
                      small
                      kind="outline"
                      label="⭐ Avaliar"
                      onPress={() => navigation.navigate("Reviews", { userId: p.ownerId, userName: p.owner?.name ?? "Fornecedor" })}
                    />
                  </View>
                )}
              </Card>
            ))
          ))}

        {tab === "suppliers" &&
          (suppliers.length === 0 ? (
            <Empty text="Nenhum fornecedor encontrado." />
          ) : (
            suppliers.map((s: any) => (
              <Card key={s.id}>
                <Text style={u.strong}>
                  {s.name} {s.verified ? "✅" : ""}
                </Text>
                {s.location ? <Text style={u.muted}>📍 {s.location}</Text> : null}
                <Text style={u.muted}>
                  {s.count} item(ns) · a partir de {money(s.min)}
                </Text>
                {s.id !== user?.id && (
                  <View style={u.row}>
                    <Btn small kind="outline" label="💬 Mensagem" onPress={() => navigation.navigate("Chat", { userId: s.id, userName: s.name })} />
                    {s.phone ? <Btn small kind="outline" label="📞 Ligar" onPress={() => Linking.openURL(`tel:${s.phone}`)} /> : null}
                    <Btn small kind="outline" label="⭐ Avaliar" onPress={() => navigation.navigate("Reviews", { userId: s.id, userName: s.name })} />
                  </View>
                )}
              </Card>
            ))
          ))}

        {tab === "prices" &&
          (prices.length === 0 ? (
            <Empty text="Ainda não há materiais publicados para mostrar preços." />
          ) : (
            prices.map((p) => (
              <Card key={p.subcategory}>
                <Text style={u.strong}>{p.subcategory}</Text>
                <Text style={u.muted}>
                  Média {money(p.avg)} · de {money(p.min)} a {money(p.max)} · {p.count} produto(s)
                </Text>
              </Card>
            ))
          ))}
      </Page>

      <BuyModal
        product={buying}
        onClose={() => setBuying(null)}
        onDone={() => {
          setBuying(null);
          loader.reload();
        }}
      />
    </>
  );
}
