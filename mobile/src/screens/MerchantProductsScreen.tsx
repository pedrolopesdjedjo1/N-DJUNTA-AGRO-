import React, { useState } from "react";
import { View, Text, Image, ScrollView, Alert } from "react-native";
import { MerchantLayout } from "../components/MerchantTabs";
import { Page, Title, Card, Badge, Btn, Chip, Empty, Field, useLoader, u } from "../components/ui";
import { getMyProducts } from "../api/merchant";
import { updateProduct, removeProduct } from "../api/products";
import { getApiErrorMessage } from "../api/errorMessage";
import { DEPARTMENTS, departmentLabel, money } from "../constants/market";

export default function MerchantProductsScreen({ navigation }: any) {
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const [dept, setDept] = useState("");
  const loader = useLoader(() => getMyProducts({ q, department: dept }), [] as any[], [q, dept]);
  const products: any[] = loader.data;

  async function toggle(p: any) {
    try {
      await updateProduct(p.id, { isAvailable: !p.isAvailable });
      loader.reload();
    } catch (e) {
      Alert.alert("Erro", getApiErrorMessage(e, "Não foi possível atualizar."));
    }
  }

  function remove(p: any) {
    Alert.alert("Apagar produto", `Apagar "${p.title}"?`, [
      { text: "Não", style: "cancel" },
      {
        text: "Apagar",
        style: "destructive",
        onPress: async () => {
          try {
            await removeProduct(p.id);
            loader.reload();
          } catch (e) {
            Alert.alert("Erro", getApiErrorMessage(e, "Não foi possível apagar."));
          }
        },
      },
    ]);
  }

  return (
    <MerchantLayout active="MerchantProducts">
      <Page loader={loader}>
        <Title>📦 Meus produtos</Title>
        <Btn label="➕ Publicar produto" onPress={() => navigation.navigate("AddProduct")} />

        <Field
          placeholder="Pesquisar nos meus produtos"
          value={text}
          onChangeText={setText}
          onSubmitEditing={() => setQ(text.trim())}
          returnKeyType="search"
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
          <Chip label="Todos" active={dept === ""} onPress={() => setDept("")} />
          {DEPARTMENTS.map((d) => (
            <Chip key={d.value} label={`${d.icon} ${d.label}`} active={dept === d.value} onPress={() => setDept(d.value)} />
          ))}
        </ScrollView>

        {products.length === 0 ? (
          <Empty text="Nenhum produto encontrado." />
        ) : (
          products.map((p) => (
            <Card key={p.id}>
              <View style={u.row}>
                {p.imageUrl ? <Image source={{ uri: p.imageUrl }} style={u.photo} /> : <View style={u.photo} />}
                <View style={{ flex: 1 }}>
                  <Text style={u.strong}>{p.title}</Text>
                  <Text style={u.muted}>
                    {departmentLabel(p.department)}
                    {p.subcategory ? ` · ${p.subcategory}` : ""}
                  </Text>
                  {p.promotion ? (
                    <Text style={u.muted}>
                      <Text style={{ textDecorationLine: "line-through" }}>{money(p.price)}</Text> {money(p.finalPrice)}
                    </Text>
                  ) : (
                    <Text style={u.muted}>{money(p.price)}</Text>
                  )}
                  <Text style={u.muted}>
                    Estoque: {p.quantity} {p.unit}
                  </Text>
                </View>
                <Badge label={p.isAvailable ? "Disponível" : "Pausado"} color={p.isAvailable ? "#2E7D32" : "#757575"} />
              </View>
              <View style={u.row}>
                <Btn small kind="outline" label={p.isAvailable ? "Pausar" : "Ativar"} onPress={() => toggle(p)} />
                <Btn small kind="danger" label="Apagar" onPress={() => remove(p)} />
              </View>
            </Card>
          ))
        )}
      </Page>
    </MerchantLayout>
  );
}
