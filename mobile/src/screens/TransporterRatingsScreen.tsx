import React, { useCallback } from "react";
import { View, Text } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Page, Title, SubTitle, Card, Empty, useLoader, u } from "../components/ui";
import { HBars } from "../components/ngo/Charts";
import { getTransporterRatings } from "../api/transporter";
import { stars } from "../constants/transporter";
import { formatDate } from "../constants/market";

const EMPTY = {
  average: null as number | null,
  count: 0,
  distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<number, number>,
  recent: [] as any[],
};

// Avaliações que o transportador recebeu de quem encomendou
export default function TransporterRatingsScreen() {
  const loader = useLoader(getTransporterRatings, EMPTY);
  const d: any = loader.data;

  useFocusEffect(
    useCallback(() => {
      loader.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const bars = [5, 4, 3, 2, 1].map((n) => ({ label: `${n} ⭐`, value: d.distribution[n] ?? 0 }));

  return (
    <Page loader={loader}>
      <Title>⭐ Avaliações recebidas</Title>
      <Text style={u.muted}>O que as pessoas dizem das suas entregas. Boas avaliações dão-lhe mais confiança e mais entregas.</Text>

      <Card>
        {d.count === 0 ? (
          <>
            <Text style={u.strong}>Ainda sem avaliações</Text>
            <Text style={u.muted}>Elas aparecem depois das primeiras entregas concluídas.</Text>
          </>
        ) : (
          <View style={{ alignItems: "center" }}>
            <Text style={{ fontSize: 40, fontWeight: "bold" }}>{d.average}</Text>
            <Text style={{ fontSize: 20 }}>{stars(d.average ?? 0)}</Text>
            <Text style={u.muted}>{d.count} avaliação(ões)</Text>
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

      <SubTitle>Comentários</SubTitle>
      {d.recent.length === 0 ? (
        <Empty text="Ainda não há comentários." />
      ) : (
        d.recent.map((r: any) => (
          <Card key={r.id}>
            <View style={u.between}>
              <Text style={{ fontSize: 16 }}>{stars(r.rating)}</Text>
              <Text style={u.muted}>{formatDate(r.createdAt)}</Text>
            </View>
            {r.comment ? <Text style={{ marginTop: 4, lineHeight: 20 }}>{r.comment}</Text> : <Text style={[u.muted, { marginTop: 4 }]}>Sem comentário.</Text>}
            <Text style={u.muted}>{r.authorName}</Text>
          </Card>
        ))
      )}

      <Card>
        <Text style={u.strong}>💡 Para ter melhores avaliações</Text>
        <Text style={u.muted}>Partilhe a localização durante a entrega, avise se houver atraso, trate bem os produtos e confirme a entrega no app.</Text>
      </Card>
    </Page>
  );
}
