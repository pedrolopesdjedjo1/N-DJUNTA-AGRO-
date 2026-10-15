import React, { useState } from "react";
import { View, Text, Image, Alert } from "react-native";
import { FisherLayout } from "../components/MerchantTabs";
import { Page, Title, SubTitle, Card, Badge, Btn, Empty, Field, useLoader, u } from "../components/ui";
import { getOrders, setOrderStatus } from "../api/orders";
import { getMyProducts } from "../api/merchant";
import { updateProduct } from "../api/products";
import { updateQuantity } from "../api/farmer";
import { getBestSelling } from "../api/artisan";
import { getApiErrorMessage } from "../api/errorMessage";
import { ESTADOS_PRODUTO, money, formatDate } from "../constants/market";

function isFish(p: any) {
  const tipo = p.details?.tipo;
  return tipo !== "MATERIAL" && tipo !== "FERRAMENTA";
}

export default function FisherSellScreen({ navigation }: any) {
  const loader = useLoader(
    async () => {
      const [fresh, shipped, products, best] = await Promise.all([
        getOrders("seller", "NOVO"),
        getOrders("seller", "ENVIADO"),
        getMyProducts({ department: "PESCA" }),
        getBestSelling(),
      ]);
      return { fresh, shipped, products: (products as any[]).filter(isFish), best };
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

  async function toggleAvailability(p: any) {
    try {
      await updateProduct(p.id, { isAvailable: !p.isAvailable });
      loader.reload();
    } catch (e) {
      Alert.alert("Erro", getApiErrorMessage(e, "Não foi possível atualizar."));
    }
  }

  return (
    <FisherLayout active="FisherSell">
      <Page loader={loader}>
        <Title>🐟 Vender pescado</Title>

        <Btn label="🎣 Publicar a partir de uma pesca registada" onPress={() => navigation.navigate("FisherCatches")} />
        <Btn kind="outline" label="➕ Publicar pescado diretamente" onPress={() => navigation.navigate("AddProduct", { department: "PESCA" })} />

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

        <SubTitle>O meu pescado à venda</SubTitle>
        {loader.data.products.length === 0 ? (
          <Empty text="Ainda não publicou pescado." />
        ) : (
          loader.data.products.map((p: any) => {
            const edit = edits[p.id] ?? {};
            const d = p.details ?? {};
            const state = ESTADOS_PRODUTO.find((e) => e.value === d.estadoProduto)?.label;
            return (
              <Card key={p.id}>
                <View style={u.row}>
                  {p.imageUrl ? <Image source={{ uri: p.imageUrl }} style={u.photo} /> : <View style={u.photo} />}
                  <View style={{ flex: 1 }}>
                    <Text style={u.strong}>{p.title}</Text>
                    <Text style={u.muted}>
                      {money(p.price)} / {p.unit} · {p.quantity} disponível(eis)
                    </Text>
                    {d.weight ? <Text style={u.muted}>⚖️ {d.weight}</Text> : null}
                    {state ? <Text style={u.muted}>🧊 {state}</Text> : null}
                    {p.location ? <Text style={u.muted}>📍 {p.location}</Text> : null}
                  </View>
                  <Badge label={p.isAvailable ? "À venda" : "Pausado"} color={p.isAvailable ? "#2E7D32" : "#757575"} />
                </View>

                <View style={u.row}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Field label="Novo preço" value={edit.price ?? ""} onChangeText={(v) => setEdit(p.id, "price", v)} keyboardType="numeric" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field label="Nova quantidade" value={edit.quantity ?? ""} onChangeText={(v) => setEdit(p.id, "quantity", v.replace(/\D/g, ""))} keyboardType="numeric" />
                  </View>
                </View>

                <View style={u.row}>
                  <Btn small label="Guardar" onPress={() => saveProduct(p)} />
                  <Btn small kind="outline" label={p.isAvailable ? "Pausar" : "Ativar"} onPress={() => toggleAvailability(p)} />
                  <Btn small kind="outline" label="✏️ Editar" onPress={() => navigation.navigate("AddProduct", { product: p })} />
                </View>
              </Card>
            );
          })
        )}

        <SubTitle>⭐ Mais vendidos</SubTitle>
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
    </FisherLayout>
  );
}
