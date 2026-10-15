import React, { useState } from "react";
import { View, Text, Alert } from "react-native";
import { FarmerLayout } from "../components/MerchantTabs";
import { Page, Title, SubTitle, Card, Btn, Empty, Field, useLoader, u } from "../components/ui";
import { getOrders, setOrderStatus } from "../api/orders";
import { getMyProducts } from "../api/merchant";
import { updateProduct } from "../api/products";
import { updateQuantity } from "../api/farmer";
import { getBestSelling } from "../api/artisan";
import { getApiErrorMessage } from "../api/errorMessage";
import { money, formatDate } from "../constants/market";

export default function FarmerSellScreen({ navigation }: any) {
  const loader = useLoader(
    async () => {
      const [fresh, shipped, products, best] = await Promise.all([
        getOrders("seller", "NOVO"),
        getOrders("seller", "ENVIADO"),
        getMyProducts({ department: "AGRICULTURA" }),
        getBestSelling(),
      ]);
      return { fresh, shipped, products, best };
    },
    { fresh: [] as any[], shipped: [] as any[], products: [] as any[], best: [] as any[] }
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
      Alert.alert("Erro", getApiErrorMessage(e, "Não foi possível atualizar o pedido."));
    }
  }

  async function saveProduct(p: any) {
    const edit = edits[p.id] ?? {};
    let changed = false;

    try {
      if (edit.price !== undefined && edit.price.trim()) {
        const price = Number(edit.price.replace(",", "."));
        if (isNaN(price) || price <= 0) {
          Alert.alert("Atenção", "Preço inválido.");
          return;
        }
        await updateProduct(p.id, { price });
        changed = true;
      }
      if (edit.quantity !== undefined && edit.quantity.trim()) {
        const quantity = parseInt(edit.quantity, 10);
        if (isNaN(quantity) || quantity < 0) {
          Alert.alert("Atenção", "Quantidade inválida.");
          return;
        }
        await updateQuantity(p.id, quantity);
        changed = true;
      }
      if (changed) {
        setEdits((prev) => ({ ...prev, [p.id]: {} }));
        loader.reload();
      }
    } catch (e) {
      Alert.alert("Erro", getApiErrorMessage(e, "Não foi possível guardar."));
    }
  }

  return (
    <FarmerLayout active="FarmerSell">
      <Page loader={loader}>
        <Title>🛒 Vender produtos</Title>

        <Btn label="➕ Publicar produto" onPress={() => navigation.navigate("AddProduct", { department: "AGRICULTURA" })} />

        <SubTitle>Pedidos novos</SubTitle>
        {loader.data.fresh.length === 0 ? (
          <Empty text="Nenhum pedido novo." />
        ) : (
          loader.data.fresh.map((o: any) => (
            <Card key={o.id}>
              <Text style={u.strong}>
                #{o.id.slice(0, 6).toUpperCase()} · {o.buyer?.name ?? "Comprador"}
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

        <SubTitle>Confirmar venda</SubTitle>
        {loader.data.shipped.length === 0 ? (
          <Empty text="Nenhum pedido enviado à espera de confirmação." />
        ) : (
          loader.data.shipped.map((o: any) => (
            <Card key={o.id}>
              <Text style={u.strong}>
                #{o.id.slice(0, 6).toUpperCase()} · {o.buyer?.name ?? "Comprador"}
              </Text>
              <Text style={u.muted}>
                {money(o.total)} · {o.paid ? "Pago" : "Por pagar"}
              </Text>
              <Btn small label="✅ Confirmar venda" onPress={() => answer(o, "CONCLUIDO")} />
            </Card>
          ))
        )}

        <SubTitle>Preço e quantidade</SubTitle>
        {loader.data.products.length === 0 ? (
          <Empty text="Ainda não tem produção cadastrada." />
        ) : (
          loader.data.products.map((p: any) => {
            const edit = edits[p.id] ?? {};
            return (
              <Card key={p.id}>
                <Text style={u.strong}>{p.title}</Text>
                <Text style={u.muted}>
                  Agora: {money(p.price)} / {p.unit} · {p.quantity} disponível(eis)
                </Text>
                <View style={u.row}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Field label="Novo preço" value={edit.price ?? ""} onChangeText={(v) => setEdit(p.id, "price", v)} keyboardType="numeric" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field label="Nova quantidade" value={edit.quantity ?? ""} onChangeText={(v) => setEdit(p.id, "quantity", v.replace(/\D/g, ""))} keyboardType="numeric" />
                  </View>
                </View>
                <Btn small label="Guardar" onPress={() => saveProduct(p)} />
              </Card>
            );
          })
        )}

        <SubTitle>⭐ Produtos vendidos</SubTitle>
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
    </FarmerLayout>
  );
}
