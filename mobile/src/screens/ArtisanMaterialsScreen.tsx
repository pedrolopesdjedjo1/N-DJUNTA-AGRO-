import React, { useState } from "react";
import { View, Text, ScrollView, Linking } from "react-native";
import { Page, Title, Card, Btn, Chip, Empty, Field, useLoader, u } from "../components/ui";
import BuyModal from "../components/BuyModal";
import { fetchProducts } from "../api/products";
import { money } from "../constants/market";

const TYPES = [
  { key: "", label: "Todos" },
  { key: "MATERIAL", label: "Materiais" },
  { key: "FERRAMENTA", label: "Ferramentas" },
  { key: "TRADICIONAL", label: "Materiais tradicionais" },
];

export default function ArtisanMaterialsScreen({ navigation }: any) {
  const [tab, setTab] = useState<"items" | "suppliers">("items");
  const [type, setType] = useState("");
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const [near, setNear] = useState("");
  const [location, setLocation] = useState("");
  const [cheapest, setCheapest] = useState(false);
  const [buying, setBuying] = useState<any | null>(null);

  const loader = useLoader(
    async () => {
      const tipos = type === "MATERIAL" || type === "FERRAMENTA" ? [type] : ["MATERIAL", "FERRAMENTA"];
      const search = type === "TRADICIONAL" ? (q ? `${q} tradicional` : "tradicional") : q;
      const lists = await Promise.all(
        tipos.map((tipo) => fetchProducts({ tipo, q: search, location, sort: cheapest ? "price_asc" : "" }))
      );
      const merged = ([] as any[]).concat(...lists);
      if (cheapest) merged.sort((a, b) => (a.finalPrice ?? a.price) - (b.finalPrice ?? b.price));
      return merged;
    },
    [] as any[],
    [type, q, location, cheapest]
  );
  const items: any[] = loader.data;

  const suppliers = Array.from(
    items
      .reduce((map, p) => {
        const id = p.ownerId;
        const current = map.get(id) ?? {
          id,
          name: p.owner?.name ?? "Fornecedor",
          phone: p.owner?.phone ?? "",
          verified: !!p.owner?.isVerified,
          location: p.location ?? "",
          count: 0,
          min: Infinity,
        };
        current.count += 1;
        current.min = Math.min(current.min, p.finalPrice ?? p.price);
        map.set(id, current);
        return map;
      }, new Map<string, any>())
      .values()
  );

  return (
    <>
      <Page loader={loader}>
        <Title>🛒 Materiais e fornecedores</Title>

        <View style={u.row}>
          <Chip label="Materiais" active={tab === "items"} onPress={() => setTab("items")} />
          <Chip label="Fornecedores próximos" active={tab === "suppliers"} onPress={() => setTab("suppliers")} />
        </View>

        <Field
          placeholder="Procurar materiais"
          value={text}
          onChangeText={setText}
          onSubmitEditing={() => setQ(text.trim())}
          returnKeyType="search"
        />
        <Field
          placeholder="Perto de... (ex: Bissau)"
          value={near}
          onChangeText={setNear}
          onSubmitEditing={() => setLocation(near.trim())}
          returnKeyType="search"
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
          {TYPES.map((t) => (
            <Chip key={t.key} label={t.label} active={type === t.key} onPress={() => setType(t.key)} />
          ))}
          <Chip label="💲 Mais baratos" active={cheapest} onPress={() => setCheapest(!cheapest)} />
        </ScrollView>

        {tab === "items" ? (
          items.length === 0 ? (
            <Empty text="Nenhum material encontrado." />
          ) : (
            items.map((p) => (
              <Card key={p.id}>
                <Text style={u.strong}>{p.title}</Text>
                <Text style={u.muted}>
                  {money(p.finalPrice ?? p.price)} / {p.unit} · {p.quantity} disponível(eis)
                </Text>
                <Text style={u.muted}>
                  {p.owner?.name ?? "Fornecedor"} {p.owner?.isVerified ? "✅" : ""}
                  {p.location ? ` · 📍 ${p.location}` : ""}
                </Text>
                {p.description ? <Text style={{ marginTop: 4 }}>{p.description}</Text> : null}
                <View style={u.row}>
                  {p.quantity > 0 && <Btn small label="🛒 Comprar materiais" onPress={() => setBuying(p)} />}
                  <Btn
                    small
                    kind="outline"
                    label="💬 Mensagem"
                    onPress={() => navigation.navigate("Chat", { userId: p.ownerId, userName: p.owner?.name ?? "Fornecedor" })}
                  />
                  <Btn
                    small
                    kind="outline"
                    label="⭐ Avaliar fornecedor"
                    onPress={() => navigation.navigate("Reviews", { userId: p.ownerId, userName: p.owner?.name ?? "Fornecedor" })}
                  />
                </View>
              </Card>
            ))
          )
        ) : suppliers.length === 0 ? (
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
              <View style={u.row}>
                <Btn small kind="outline" label="💬 Mensagem" onPress={() => navigation.navigate("Chat", { userId: s.id, userName: s.name })} />
                {s.phone ? <Btn small kind="outline" label="📞 Ligar" onPress={() => Linking.openURL(`tel:${s.phone}`)} /> : null}
                <Btn small kind="outline" label="⭐ Avaliar" onPress={() => navigation.navigate("Reviews", { userId: s.id, userName: s.name })} />
              </View>
            </Card>
          ))
        )}
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
