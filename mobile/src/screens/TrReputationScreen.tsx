import React, { useCallback } from "react";
import { View, Text } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import TrLayout from "../components/transporter/TrLayout";
import { Page, Title, SubTitle, Card, Badge, Btn, Empty, useLoader, u } from "../components/ui";
import { HBars } from "../components/ngo/Charts";
import { getTrReputation, listTrToRate, listTrComplaints } from "../api/transporterV2";
import { useTrCatalog } from "../utils/transportCatalogV2";
import { TR_BADGE, trStars } from "../constants/transporterV2";
import { nextBadgeStep, REPORT_STATUS_TEXT } from "../constants/transporterSocial";
import { labelOf } from "../utils/ngoCatalog";
import { formatNumber } from "../utils/format";
import { formatDate } from "../constants/market";

const EMPTY = {
  average: null as number | null,
  count: 0,
  distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<number, number>,
  recent: [] as any[],
  delivered: 0,
  onTimeRate: null as number | null,
  cancelRate: null as number | null,
  badge: "NOVO",
  toRate: 0,
};

export default function TrReputationScreen({ navigation }: any) {
  const catalog = useTrCatalog();
  const loader = useLoader(getTrReputation, EMPTY);
  const toRate = useLoader(listTrToRate, [] as any[]);
  const complaints = useLoader(listTrComplaints, { open: 0, items: [] as any[] });
  const d: any = loader.data;
  const c: any = complaints.data;

  useFocusEffect(
    useCallback(() => {
      loader.reload();
      toRate.reload();
      complaints.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const badge = TR_BADGE[d.badge] ?? TR_BADGE.NOVO;
  const bars = [5, 4, 3, 2, 1].map((n) => ({ label: `${n} ★`, value: d.distribution[n] ?? 0 }));
  const pendingRate = (toRate.data as any[]).filter((e) => (e.parties as any[]).some((p) => !p.rated));

  return (
    <TrLayout active="TrProfile">
      <Page loader={loader}>
        <Title>⭐ Avaliações e reputação</Title>

        <Card>
          <View style={{ alignItems: "center" }}>
            <Text style={{ fontSize: 34 }}>{badge.icon}</Text>
            <Text style={{ fontSize: 18, fontWeight: "bold", color: badge.color }}>{labelOf(catalog.badges, d.badge) || "Transportador"}</Text>
            {d.average ? (
              <Text style={{ fontSize: 20, marginTop: 4 }}>
                {trStars(d.average)} <Text style={{ fontWeight: "bold" }}>{d.average}</Text>
              </Text>
            ) : (
              <Text style={u.muted}>Ainda sem avaliações</Text>
            )}
            <Text style={u.muted}>{formatNumber(d.count)} avaliação(ões)</Text>
          </View>
          <Text style={[u.muted, { marginTop: 8, textAlign: "center" }]}>{nextBadgeStep(d.delivered, d.average, d.badge)}</Text>
        </Card>

        <View style={u.grid}>
          {(
            [
              ["🚚 Entregas feitas", formatNumber(d.delivered)],
              ["⏱️ Pontualidade", d.onTimeRate !== null ? `${d.onTimeRate}%` : "—"],
              ["🚫 Cancelamentos", d.cancelRate !== null ? `${d.cancelRate}%` : "—"],
            ] as [string, string][]
          ).map(([label, value]) => (
            <View key={label} style={u.tile}>
              <View style={u.tileBox}>
                <Text style={u.tileValue}>{value}</Text>
                <Text style={u.tileLabel}>{label}</Text>
              </View>
            </View>
          ))}
        </View>
        <Text style={u.muted}>
          A pontualidade conta as entregas feitas até à data pretendida (só as que têm data). Os cancelamentos são as entregas aceites que abandonou.
        </Text>

        {d.count > 0 ? (
          <>
            <SubTitle>Como se distribuem</SubTitle>
            <Card>
              <HBars data={bars} color="#F9A825" />
            </Card>
          </>
        ) : null}

        <SubTitle>Entregas por avaliar ({pendingRate.length})</SubTitle>
        {pendingRate.length === 0 ? (
          <Text style={u.muted}>Não tem entregas por avaliar. Depois de entregar, avalie o comprador e o vendedor: ajuda toda a comunidade.</Text>
        ) : (
          pendingRate.map((e: any) => (
            <Card key={e.deliveryId}>
              <Text style={u.strong}>Entrega {e.orderCode}</Text>
              <Text style={u.muted}>
                {(e.parties as any[]).filter((p) => !p.rated).map((p) => `${p.party === "BUYER" ? "🛒" : "🏪"} ${p.name}`).join(" · ")}
              </Text>
              <Text style={u.muted}>Concluída em {formatDate(e.deliveredAt)}</Text>
              <Btn small label="Avaliar" onPress={() => navigation.navigate("TrDelivery", { id: e.deliveryId })} />
            </Card>
          ))
        )}

        <SubTitle>Comentários recebidos</SubTitle>
        {d.recent.length === 0 ? (
          <Empty text="Ainda não recebeu comentários." />
        ) : (
          d.recent.map((r: any) => (
            <Card key={r.id}>
              <View style={u.between}>
                <Text style={{ fontSize: 16 }}>{trStars(r.rating)}</Text>
                <Text style={u.muted}>{formatDate(r.createdAt)}</Text>
              </View>
              {r.comment ? <Text style={{ marginTop: 4, lineHeight: 20 }}>{r.comment}</Text> : <Text style={[u.muted, { marginTop: 4 }]}>Sem comentário.</Text>}
              <Text style={u.muted}>{r.authorName}</Text>
            </Card>
          ))
        )}

        <SubTitle>Reclamações sobre si ({c.items.length})</SubTitle>
        {c.items.length === 0 ? (
          <Text style={u.muted}>Nenhuma reclamação. Bom trabalho!</Text>
        ) : (
          <>
            {c.open > 0 ? <Text style={{ color: "#EF6C00" }}>{c.open} reclamação(ões) em análise pela equipa.</Text> : null}
            {c.items.map((x: any) => (
              <Card key={x.id}>
                <View style={u.between}>
                  <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>{x.categoryLabel}</Text>
                  <Badge label={REPORT_STATUS_TEXT[x.status]?.label ?? x.status} color={REPORT_STATUS_TEXT[x.status]?.color ?? "#757575"} />
                </View>
                <Text style={u.muted}>
                  {x.orderCode ? `Entrega ${x.orderCode} · ` : ""}
                  {formatDate(x.createdAt)}
                </Text>
                {x.decision ? <Text style={{ marginTop: 2 }}>Decisão: {x.decision}</Text> : null}
              </Card>
            ))}
            <Text style={u.muted}>Por proteção de quem reclama, nunca se mostra quem foi.</Text>
          </>
        )}

        <View style={u.row}>
          <Btn small kind="outline" label="🚩 Denunciar um problema" onPress={() => navigation.navigate("ReportCreate")} />
          <Btn small kind="outline" label="📋 As minhas denúncias" onPress={() => navigation.navigate("MyReports")} />
        </View>
      </Page>
    </TrLayout>
  );
}
