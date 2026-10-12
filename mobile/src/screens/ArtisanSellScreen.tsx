import React, { useState } from "react";
import { View, Text, Alert } from "react-native";
import { ArtisanLayout } from "../components/MerchantTabs";
import { Page, Title, SubTitle, Card, Btn, Empty, Field, useLoader, u } from "../components/ui";
import { getOrders, setOrderStatus } from "../api/orders";
import { getMyProducts } from "../api/merchant";
import { updateProduct } from "../api/products";
import { getBestSelling } from "../api/artisan";
import { getApiErrorMessage } from "../api/errorMessage";
import { money, formatDate } from "../constants/market";

export default function ArtisanSellScreen({ navigation }: any) {
  const loader = useLoader(
    async () => {
      const [orders, products, best] = await Promise.all([
        getOrders("seller", "NOVO"),
        getMyProducts({}),
        getBestSelling(),
      ]);
      return { orders, products, best };
    },
    { orders: [] as any[], products: [] as any[], best: [] as any[] }
  );

  const [edits, setEdits] = useState<Record<string, { price?: string; quantity?: string }>>({});

  function setEdit(id: string, key: "price" | "quantity", value: string) {
    setEdits((prev) => ({ ...prev, [id]: { ...prev[id], [key]: value } }));
  }

  async function answer(order: any, status: string) {
    try {
      await setOrderStatus(order.id, status);
      loader.reload();
    } catch (e) {
      Alert.alert("Erro", getApiErrorMessage(e, "Não foi possível responder ao pedido."));
    }
  }

  async function saveProduct(p: any) {
    const edit = edits[p.id] ?? {};
    const body: Record<string, any> = {};

    if (edit.price !== undefined && edit.price.trim()) {
      const price = Number(edit.price.replace(",", "."));
      if (isNaN(price) || price <= 0) {
        Alert.alert("Atenção", "Preço inválido.");
        return;
      }
      body.price = price;
    }
    if (edit.quantity !== undefined && edit.quantity.trim()) {
      const quantity = parseInt(edit.quantity, 10);
      if (isNaN(quantity) || quantity < 0) {
        Alert.alert("Atenção", "Quantidade inválida.");
        return;
      }
      body.quantity = quantity;
      body.isAvailable = quantity > 0;
    }
    if (Object.keys(body).length === 0) return;

    try {
      await updateProduct(p.id, body);
      setEdits((prev) => ({ ...prev, [p.id]: {} }));
      loader.reload();
    } catch (e) {
      Alert.alert("Erro", getApiErrorMessage(e, "Não foi possível guardar."));
    }
  }

  return (
    <ArtisanLayout active="ArtisanSell">
      <Page loader={loader}>
        <Title>🛍️ Vender</Title>

        <Btn label="➕ Publicar artesanato" onPress={() => navigation.navigate("AddProduct", { department: "ARTESANATO" })} />

        <SubTitle>Pedidos novos</SubTitle>
        {loader.data.orders.length === 0 ? (
          <Empty text="Nenhum pedido novo." />
        ) : (
          loader.data.orders.map((o: any) => (
            <Card key={o.id}>
              <Text style={u.strong}>
                #{o.id.slice(0, 6).toUpperCase()} · {o.buyer?.name ?? "Cliente"}
              </Text>
              <Text style={u.muted}>
                {formatDate(o.createdAt)} · {money(o.total)}
              </Text>
              {o.items.map((i: any) => (
                <Text key={i.id}>
                  {i.quantity} × {i.title}
                </Text>
              ))}
              <View style={u.row}>
                <Btn small label="Aceitar pedido" onPress={() => answer(o, "ACEITO")} />
                <Btn small kind="danger" label="Recusar" onPress={() => answer(o, "CANCELADO")} />
              </View>
            </Card>
          ))
        )}

        <SubTitle>Preço e quantidade</SubTitle>
        {loader.data.products.length === 0 ? (
          <Empty text="Ainda não tem produtos." />
        ) : (
          loader.data.products.map((p: any) => {
            const edit = edits[p.id] ?? {};
            return (
              <Card key={p.id}>
                <Text style={u.strong}>{p.title}</Text>
                <Text style={u.muted}>
                  Agora: {money(p.price)} · {p.quantity} {p.unit}
                </Text>
                <View style={u.row}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Field label="Novo preço" value={edit.price ?? ""} onChangeText={(v) => setEdit(p.id, "price", v)} keyboardType="numeric" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field label="Nova quantidade" value={edit.quantity ?? ""} onChangeText={(v) => setEdit(p.id, "quantity", v)} keyboardType="numeric" />
                  </View>
                </View>
                <Btn small label="Guardar" onPress={() => saveProduct(p)} />
              </Card>
            );
          })
        )}

        <SubTitle>⭐ Produtos mais vendidos</SubTitle>
        {loader.data.best.length === 0 ? (
          <Empty text="Ainda não há vendas concluídas." />
        ) : (
          loader.data.best.map((b: any, index: number) => (
            <Card key={`${b.productId ?? b.title}-${index}`}>
              <Text style={u.strong}>
                {index + 1}. {b.title}
              </Text>
              <Text style={u.muted}>
                {b.quantity} vendido(s) · {money(b.revenue)}
              </Text>
            </Card>
          ))
        )}

        <SubTitle>Histórico de vendas</SubTitle>
        <Btn kind="outline" label="💰 Ver vendas e ganhos" onPress={() => navigation.navigate("MerchantSales")} />
      </Page>
    </ArtisanLayout>
  );
}
