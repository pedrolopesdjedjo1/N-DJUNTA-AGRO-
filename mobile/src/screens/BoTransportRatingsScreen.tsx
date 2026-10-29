import React, { useCallback } from "react";
import { View, Text } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import AdminLayout from "../components/admin/AdminLayout";
import { Page, Title, SubTitle, Card, Btn, Empty, useLoader, u } from "../components/ui";
import { HBars } from "../components/ngo/Charts";
import { getBoTransportRatings } from "../api/backoffice";
import { stars } from "../constants/transporter";
import { formatDate } from "../constants/market";

const EMPTY = {
  average: null as number | null,
  count: 0,
  distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<number, number>,
  best: [] as any[],
  worst: [] as any[],
  low: [] as any[],
};

// Avaliações de todos os transportadores
export default function BoTransportRatingsScreen({ navigation }: any) {
  const loader = useLoader(getBoTransportRatings, EMPTY);
  const d: any = loader.data;

  useFocusEffect(
    useCallback(() => {
      loader.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const bars = [5, 4, 3, 2, 1].map((n) => ({ label: `${n} ⭐`, value: d.distribution[n] ?? 0 }));

  function ranking(title: string, list: any[]) {
    if (list.length === 0) return null;
    return (
      <>
        <SubTitle>{title}</SubTitle>
        {list.map((t: any) => (
          <Card key={t.id}>
            <Text style={u.strong}>{t.name}</Text>
            <Text style={u.muted}>
              {stars(t.average)} {t.average} · {t.count} avaliações
            </Text>
            <View style={u.row}>
              <Btn small kind="outline" label="Ver a ficha" onPress={() => navigation.navigate("BoUser", { id: t.id })} />
              <Btn small kind="outline" label="📦 Entregas" onPress={() => navigation.navigate("BoDeliveries", { transporterId: t.id })} />
            </View>
          </Card>
        ))}
      </>
    );
  }

  return (
    <AdminLayout active="BoTransport">
      <Page loader={loader}>
        <Title>⭐ Avaliações dos transportadores</Title>

        <Card>
          {d.count === 0 ? (
            <Text style={u.muted}>Ainda não há avaliações.</Text>
          ) : (
            <View style={{ alignItems: "center" }}>
              <Text style={{ fontSize: 40, fontWeight: "bold" }}>{d.average}</Text>
              <Text style={{ fontSize: 20 }}>{stars(d.average ?? 0)}</Text>
              <Text style={u.muted}>{d.count} avaliação(ões) no total</Text>
            </View>
          )}
        </Card>

        {d.count > 0 ? (
          <>
            <SubTitle>Como se distribuem</SubTitle>
            <Card>
              <HBars data={bars} color="#F9A825" />
            </Card>
          </>
        ) : null}

        {ranking("🏆 Melhor avaliados (pelo menos 3 avaliações)", d.best)}
        {ranking("⚠️ Pior avaliados (pelo menos 3 avaliações)", d.worst)}

        <SubTitle>Avaliações baixas (1 e 2 estrelas)</SubTitle>
        {d.low.length === 0 ? (
          <Empty text="Não há avaliações baixas." />
        ) : (
          d.low.map((r: any) => (
            <Card key={r.id}>
              <View style={u.between}>
                <Text style={{ fontSize: 16 }}>{stars(r.rating)}</Text>
                <Text style={u.muted}>{formatDate(r.createdAt)}</Text>
              </View>
              {r.comment ? <Text style={{ marginTop: 4, lineHeight: 20 }}>{r.comment}</Text> : <Text style={[u.muted, { marginTop: 4 }]}>Sem comentário.</Text>}
              <Text style={u.muted}>
                🚛 {r.transporter.name} · de {r.authorName}
              </Text>
              <Btn small kind="outline" label="Ver o transportador" onPress={() => navigation.navigate("BoUser", { id: r.transporter.id })} />
            </Card>
          ))
        )}
      </Page>
    </AdminLayout>
  );
}
