import React, { useState } from "react";
import { View, Text, Image, Alert } from "react-native";
import { ArtisanLayout } from "../components/MerchantTabs";
import { Page, Title, Card, Badge, Btn, Empty, Field, useLoader, u } from "../components/ui";
import { getMyProducts } from "../api/merchant";
import { updateProduct, removeProduct } from "../api/products";
import { markProductSold } from "../api/artisan";
import { getApiErrorMessage } from "../api/errorMessage";
import { money } from "../constants/market";

export default function ArtisanProductsScreen({ navigation }: any) {
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const loader = useLoader(() => getMyProducts({ q, department: "ARTESANATO" }), [] as any[], [q]);
  const products: any[] = loader.data;

  async function run(work: () => Promise<any>, fail: string) {
    try {
      await work();
      loader.reload();
    } catch (e) {
      Alert.alert("Erro", getApiErrorMessage(e, fail));
    }
  }

  function sold(p: any) {
    Alert.alert("Marcar como vendido", `"${p.title}" deixa de aparecer para compra.`, [
      { text: "Não", style: "cancel" },
      { text: "Sim", onPress: () => run(() => markProductSold(p.id), "Não foi possível marcar como vendido.") },
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
    <ArtisanLayout active="ArtisanProducts">
      <Page loader={loader}>
        <Title>🧺 Meus artesanatos</Title>
        <Btn label="➕ Cadastrar produto" onPress={() => navigation.navigate("AddProduct", { department: "ARTESANATO" })} />

        <Field
          placeholder="Pesquisar nos meus artesanatos"
          value={text}
          onChangeText={setText}
          onSubmitEditing={() => setQ(text.trim())}
          returnKeyType="search"
        />

        {products.length === 0 ? (
          <Empty text="Ainda não cadastrou artesanatos." />
        ) : (
          products.map((p) => {
            const d = p.details ?? {};
            return (
              <Card key={p.id}>
                <View style={u.row}>
                  {p.imageUrl ? <Image source={{ uri: p.imageUrl }} style={u.photo} /> : <View style={u.photo} />}
                  <View style={{ flex: 1 }}>
                    <Text style={u.strong}>{p.title}</Text>
                    {p.subcategory ? <Text style={u.muted}>{p.subcategory}</Text> : null}
                    <Text style={u.muted}>{money(p.price)} · Disponível: {p.quantity}</Text>
                  </View>
                  <Badge label={p.isAvailable ? "À venda" : "Indisponível"} color={p.isAvailable ? "#2E7D32" : "#757575"} />
                </View>

                {d.materials ? <Text style={u.muted}>🧵 Materiais: {d.materials}</Text> : null}
                {d.size ? <Text style={u.muted}>📏 Tamanho: {d.size}</Text> : null}
                {d.colors ? <Text style={u.muted}>🎨 Cores: {d.colors}</Text> : null}
                {d.weight ? <Text style={u.muted}>⚖️ Peso: {d.weight}</Text> : null}
                {d.productionTime ? <Text style={u.muted}>⏱️ Produção: {d.productionTime}</Text> : null}
                {p.location ? <Text style={u.muted}>📍 {p.location}</Text> : null}

                <View style={u.row}>
                  <Btn small kind="outline" label="✏️ Atualizar" onPress={() => navigation.navigate("AddProduct", { product: p })} />
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
    </ArtisanLayout>
  );
}
