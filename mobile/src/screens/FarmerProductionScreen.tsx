import React, { useState } from "react";
import { View, Text, Image, Alert } from "react-native";
import { FarmerLayout } from "../components/MerchantTabs";
import { Page, Title, Card, Badge, Btn, Empty, Field, useLoader, u } from "../components/ui";
import { getMyProducts } from "../api/merchant";
import { updateProduct, removeProduct } from "../api/products";
import { updateQuantity, markSold } from "../api/farmer";
import { getApiErrorMessage } from "../api/errorMessage";
import { ESTADOS_PRODUTO, money, formatDate } from "../constants/market";

export default function FarmerProductionScreen({ navigation }: any) {
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const [edits, setEdits] = useState<Record<string, string>>({});

  const loader = useLoader(() => getMyProducts({ q, department: "AGRICULTURA" }), [] as any[], [q]);
  const products: any[] = loader.data;

  const available = products.filter((p) => p.isAvailable);
  const totals = Array.from(
    available
      .reduce((map, p) => map.set(p.unit, (map.get(p.unit) ?? 0) + p.quantity), new Map<string, number>())
      .entries()
  );

  async function run(work: () => Promise<any>, fail: string) {
    try {
      await work();
      loader.reload();
    } catch (e) {
      Alert.alert("Erro", getApiErrorMessage(e, fail));
    }
  }

  function saveQuantity(p: any) {
    const raw = edits[p.id];
    const value = parseInt(raw ?? "", 10);
    if (isNaN(value) || value < 0) {
      Alert.alert("Atenção", "Escreva uma quantidade válida.");
      return;
    }
    run(async () => {
      await updateQuantity(p.id, value);
      setEdits((prev) => ({ ...prev, [p.id]: "" }));
    }, "Não foi possível atualizar a quantidade.");
  }

  function sold(p: any) {
    Alert.alert("Marcar como vendido", `"${p.title}" deixa de aparecer para compra.`, [
      { text: "Não", style: "cancel" },
      { text: "Sim", onPress: () => run(() => markSold(p.id), "Não foi possível marcar como vendido.") },
    ]);
  }

  function remove(p: any) {
    Alert.alert("Apagar produto", `Apagar "${p.title}"?`, [
      { text: "Não", style: "cancel" },
      {
        text: "Apagar",
        style: "destructive",
        onPress: () => run(() => removeProduct(p.id), "Não foi possível apagar."),
      },
    ]);
  }

  return (
    <FarmerLayout active="FarmerProduction">
      <Page loader={loader}>
        <Title>🌱 Minha produção</Title>

        <Card>
          <Text style={u.strong}>
            {products.length} produto(s) · {available.length} disponível(eis)
          </Text>
          {totals.map(([unit, quantity]) => (
            <Text key={unit} style={u.muted}>
              {quantity} {unit}
            </Text>
          ))}
        </Card>

        <Btn label="➕ Cadastrar produção" onPress={() => navigation.navigate("AddProduct", { department: "AGRICULTURA" })} />

        <Field
          placeholder="Pesquisar na minha produção"
          value={text}
          onChangeText={setText}
          onSubmitEditing={() => setQ(text.trim())}
          returnKeyType="search"
        />

        {products.length === 0 ? (
          <Empty text="Ainda não cadastrou produção." />
        ) : (
          products.map((p) => {
            const d = p.details ?? {};
            const stateLabel = ESTADOS_PRODUTO.find((e) => e.value === d.estadoProduto)?.label;
            return (
              <Card key={p.id}>
                <View style={u.row}>
                  {p.imageUrl ? <Image source={{ uri: p.imageUrl }} style={u.photo} /> : <View style={u.photo} />}
                  <View style={{ flex: 1 }}>
                    <Text style={u.strong}>{p.title}</Text>
                    {p.subcategory ? <Text style={u.muted}>{p.subcategory}</Text> : null}
                    <Text style={u.muted}>
                      {money(p.price)} / {p.unit}
                    </Text>
                    <Text style={u.muted}>
                      Disponível: {p.quantity} {p.unit}
                    </Text>
                  </View>
                  <Badge label={p.isAvailable ? "À venda" : "Indisponível"} color={p.isAvailable ? "#2E7D32" : "#757575"} />
                </View>

                {d.harvestDate ? <Text style={u.muted}>🌾 Colheita: {formatDate(`${d.harvestDate}T12:00:00`)}</Text> : null}
                {stateLabel ? <Text style={u.muted}>📋 Estado: {stateLabel}</Text> : null}
                {p.location ? <Text style={u.muted}>📍 {p.location}</Text> : null}

                <View style={[u.row, { alignItems: "flex-end" }]}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Field
                      label="Nova quantidade"
                      value={edits[p.id] ?? ""}
                      onChangeText={(v) => setEdits((prev) => ({ ...prev, [p.id]: v.replace(/\D/g, "") }))}
                      keyboardType="numeric"
                      placeholder={String(p.quantity)}
                    />
                  </View>
                  <Btn small label="Atualizar" onPress={() => saveQuantity(p)} />
                </View>

                <View style={u.row}>
                  <Btn small kind="outline" label="✏️ Editar" onPress={() => navigation.navigate("AddProduct", { product: p })} />
                  {p.isAvailable ? <Btn small label="Marcar como vendido" onPress={() => sold(p)} /> : null}
                  <Btn
                    small
                    kind="outline"
                    label={p.isAvailable ? "Pausar" : "Ativar"}
                    onPress={() => run(() => updateProduct(p.id, { isAvailable: !p.isAvailable }), "Não foi possível atualizar.")}
                  />
                  <Btn small kind="danger" label="Apagar" onPress={() => remove(p)} />
                </View>
              </Card>
            );
          })
        )}
      </Page>
    </FarmerLayout>
  );
}
