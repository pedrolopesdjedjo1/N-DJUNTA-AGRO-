import React, { useState } from "react";
import { View, Text, Alert } from "react-native";
import { Page, Title, Card, Btn, Chip, Empty, useLoader, u } from "../components/ui";
import { getCustomers, getCustomerHistory, toggleFavoriteCustomer } from "../api/merchant";
import { getApiErrorMessage } from "../api/errorMessage";
import { ORDER_STATUS, money, formatDate } from "../constants/market";

export default function MerchantCustomersScreen({ navigation }: any) {
  const loader = useLoader(getCustomers, [] as any[]);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);

  const customers = loader.data.filter((c: any) => !onlyFavorites || c.isFavorite);

  async function toggleHistory(id: string) {
    if (openId === id) {
      setOpenId(null);
      return;
    }
    try {
      setHistory(await getCustomerHistory(id));
      setOpenId(id);
    } catch (e) {
      Alert.alert("Erro", getApiErrorMessage(e, "Não foi possível carregar o histórico."));
    }
  }

  async function favorite(id: string) {
    try {
      await toggleFavoriteCustomer(id);
      loader.reload();
    } catch (e) {
      Alert.alert("Erro", getApiErrorMessage(e, "Não foi possível atualizar."));
    }
  }

  return (
    <Page loader={loader}>
      <Title>👥 Clientes</Title>

      <View style={u.row}>
        <Chip label="Todos" active={!onlyFavorites} onPress={() => setOnlyFavorites(false)} />
        <Chip label="⭐ Favoritos" active={onlyFavorites} onPress={() => setOnlyFavorites(true)} />
      </View>

      {customers.length === 0 ? (
        <Empty text="Nenhum cliente ainda." />
      ) : (
        customers.map((c: any) => (
          <Card key={c.id}>
            <View style={u.between}>
              <Text style={u.strong}>
                {c.isFavorite ? "⭐ " : ""}
                {c.name}
              </Text>
              <Text style={u.muted}>{c.orders} pedido(s)</Text>
            </View>
            {c.phone ? <Text style={u.muted}>📞 {c.phone}</Text> : null}
            {c.location ? <Text style={u.muted}>📍 {c.location}</Text> : null}
            <Text style={u.muted}>
              Total comprado: {money(c.totalSpent)} · Último pedido: {formatDate(c.lastOrderAt)}
            </Text>

            <View style={u.row}>
              <Btn small kind="outline" label={openId === c.id ? "Esconder histórico" : "Histórico de compras"} onPress={() => toggleHistory(c.id)} />
              <Btn small kind="outline" label="💬 Mensagem" onPress={() => navigation.navigate("Chat", { userId: c.id, userName: c.name })} />
              <Btn small kind="outline" label="⭐ Avaliar" onPress={() => navigation.navigate("Reviews", { userId: c.id, userName: c.name })} />
              <Btn small kind="outline" label={c.isFavorite ? "Tirar dos favoritos" : "Favorito"} onPress={() => favorite(c.id)} />
            </View>

            {openId === c.id && (
              <View style={{ marginTop: 10 }}>
                {history.length === 0 ? (
                  <Text style={u.muted}>Sem compras.</Text>
                ) : (
                  history.map((o: any) => (
                    <View key={o.id} style={{ marginBottom: 8 }}>
                      <Text style={u.strong}>
                        {formatDate(o.createdAt)} · {money(o.total)} · {ORDER_STATUS[o.status]?.label ?? o.status}
                      </Text>
                      {o.items.map((i: any) => (
                        <Text key={i.id} style={u.muted}>
                          {i.quantity} × {i.title}
                        </Text>
                      ))}
                    </View>
                  ))
                )}
              </View>
            )}
          </Card>
        ))
      )}
    </Page>
  );
}
