import React, { useCallback } from "react";
import { View, Text } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import TrLayout from "../components/transporter/TrLayout";
import { Page, Title, SubTitle, Card, Badge, Btn, Empty, useLoader, u } from "../components/ui";
import { getTrContactHistory } from "../api/transporterV2";
import { useTrCatalog } from "../utils/transportCatalogV2";
import { labelOf } from "../utils/ngoCatalog";
import { RELATION_TEXT, VIA_ICON } from "../constants/transporterSocial";
import { TR_PHASE_COLOR } from "../constants/transporterV2";
import { formatDateTime } from "../constants/market";

// Histórico de contactos com uma pessoa: chamadas, WhatsApp, mensagens e as entregas em comum
export default function TrContactHistoryScreen({ navigation, route }: any) {
  const userId: string = route?.params?.userId;
  const catalog = useTrCatalog();
  const loader = useLoader(() => getTrContactHistory(userId), null as any, [userId]);
  const d: any = loader.data;

  useFocusEffect(
    useCallback(() => {
      loader.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId])
  );

  if (!d) {
    return (
      <TrLayout active="TrProfile">
        <Page loader={loader}>
          <Title>Histórico de contactos</Title>
          <Empty text="A carregar..." />
        </Page>
      </TrLayout>
    );
  }

  return (
    <TrLayout active="TrProfile">
      <Page loader={loader}>
        <Title>📚 {d.person.name}</Title>
        {d.person.location ? <Text style={u.muted}>📍 {d.person.location}</Text> : null}
        <Btn small kind="outline" label="💬 Enviar mensagem" onPress={() => navigation.navigate("Chat", { userId, userName: d.person.name })} />

        <SubTitle>Entregas em comum ({d.deliveries.length})</SubTitle>
        {d.deliveries.map((x: any) => (
          <Card key={x.id}>
            <View style={u.between}>
              <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>Entrega {x.orderCode}</Text>
              <Badge label={labelOf(catalog.deliveryPhases, x.phase) || x.phase} color={TR_PHASE_COLOR[x.phase] ?? "#757575"} />
            </View>
            <Text style={u.muted}>
              {RELATION_TEXT[x.relation]} · {formatDateTime(x.deliveredAt ?? x.createdAt)}
            </Text>
            <Btn small kind="outline" label="Abrir a entrega" onPress={() => navigation.navigate("TrDelivery", { id: x.id })} />
          </Card>
        ))}

        <SubTitle>Contactos feitos ({d.logs.length})</SubTitle>
        {d.logs.length === 0 ? (
          <Text style={u.muted}>Ainda não ligou nem escreveu a esta pessoa por aqui.</Text>
        ) : (
          d.logs.map((l: any) => (
            <View key={l.id} style={{ marginTop: 6 }}>
              <Text>
                {VIA_ICON[l.via] ?? "•"} {labelOf(catalog.contactVia, l.via) || l.via}
              </Text>
              <Text style={u.muted}>{formatDateTime(l.createdAt)}</Text>
            </View>
          ))
        )}
        <Text style={[u.muted, { marginTop: 8 }]}>Só ficam registados os contactos feitos pelos botões do app.</Text>
      </Page>
    </TrLayout>
  );
}
