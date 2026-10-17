import React, { useCallback } from "react";
import { View, Text, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Page, Title, Card, Badge, Btn, Empty, useLoader, u } from "../components/ui";
import { getMyRequests, deleteMyRequest } from "../api/ngo";
import { useNgoCatalog, labelOf } from "../utils/ngoCatalog";
import { REQUEST_STATUS_COLOR, colorOf } from "../constants/ngo";
import { getApiErrorMessage } from "../api/errorMessage";
import { formatDate } from "../constants/market";

// Os pedidos de apoio que eu enviei às organizações
export default function NgoMyRequestsScreen({ navigation }: any) {
  const catalog = useNgoCatalog();
  const loader = useLoader(getMyRequests, [] as any[]);
  const items: any[] = loader.data;

  useFocusEffect(
    useCallback(() => {
      loader.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  function remove(r: any) {
    Alert.alert("Apagar pedido", `Apagar "${r.title}"?`, [
      { text: "Não", style: "cancel" },
      {
        text: "Apagar",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteMyRequest(r.id);
            loader.reload();
          } catch (e) {
            Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível apagar."));
          }
        },
      },
    ]);
  }

  return (
    <Page loader={loader}>
      <Title>🙋 Os meus pedidos de apoio</Title>

      <Btn label="➕ Pedir apoio" onPress={() => navigation.navigate("NgoRequestForm")} />

      {items.length === 0 ? (
        <Empty text="Ainda não enviou pedidos de apoio." />
      ) : (
        items.map((r) => (
          <Card key={r.id}>
            <View style={u.between}>
              <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>{r.title}</Text>
              <Badge label={labelOf(catalog.requestStatus, r.status)} color={colorOf(REQUEST_STATUS_COLOR, r.status)} />
            </View>

            <Text style={u.muted}>{labelOf(catalog.needCategories, r.category)}</Text>
            <Text style={{ marginTop: 6, lineHeight: 21 }}>{r.message}</Text>

            <Text style={[u.muted, { marginTop: 6 }]}>
              🏢 {r.organizationName ?? "Aberto a todas as organizações"}
            </Text>
            {r.community || r.region ? <Text style={u.muted}>📍 {[r.community, r.region].filter(Boolean).join(", ")}</Text> : null}
            <Text style={u.muted}>Enviado em {formatDate(r.createdAt)}</Text>

            {r.answer ? (
              <View style={{ marginTop: 8 }}>
                <Text style={u.strong}>Resposta da organização</Text>
                <Text style={{ marginTop: 2, lineHeight: 21 }}>{r.answer}</Text>
              </View>
            ) : null}

            <View style={u.row}>
              {r.organizationId ? (
                <Btn
                  small
                  kind="outline"
                  label="💬 Mensagem"
                  onPress={() => navigation.navigate("Chat", { userId: r.organizationId, userName: r.organizationName ?? "Organização" })}
                />
              ) : null}
              {r.status === "NOVO" ? <Btn small kind="danger" label="Apagar" onPress={() => remove(r)} /> : null}
            </View>
          </Card>
        ))
      )}
    </Page>
  );
}
