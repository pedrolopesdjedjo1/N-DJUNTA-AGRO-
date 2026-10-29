import React, { useCallback } from "react";
import { View, Text } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import AdminLayout from "../components/admin/AdminLayout";
import { Page, Title, SubTitle, Card, Btn, Empty, useLoader, u } from "../components/ui";
import { HBars } from "../components/ngo/Charts";
import { getBoRoutes } from "../api/backoffice";
import { kmText } from "../constants/transporter";
import { money } from "../constants/market";

const EMPTY = { sample: 0, routes: [] as any[], origins: [] as any[], destinations: [] as any[], unserved: [] as any[], note: "" };

// Rotas: de onde para onde se entrega, e onde faltam transportadores
export default function BoRoutesScreen({ navigation }: any) {
  const loader = useLoader(getBoRoutes, EMPTY);
  const d: any = loader.data;

  useFocusEffect(
    useCallback(() => {
      loader.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const bars = (list: any[]) => list.map((x) => ({ label: x.name, value: x.count }));

  return (
    <AdminLayout active="BoTransport">
      <Page loader={loader}>
        <Title>🧭 Rotas</Title>
        <Text style={u.muted}>As ligações entre regiões mais usadas nas entregas, e as regiões onde há entregas à espera de transportador.</Text>

        {d.unserved.length > 0 ? (
          <>
            <SubTitle>⚠️ Regiões com entregas por aceitar</SubTitle>
            <Card>
              <HBars data={bars(d.unserved)} color="#EF6C00" />
              <Text style={[u.muted, { marginTop: 6 }]}>Faltam transportadores nestas regiões. Pode enviar um aviso aos transportadores da zona.</Text>
              <Btn small kind="outline" label="📣 Enviar aviso" onPress={() => navigation.navigate("BoBroadcasts")} />
            </Card>
          </>
        ) : null}

        <SubTitle>Rotas mais usadas</SubTitle>
        {d.routes.length === 0 && !loader.loading ? (
          <Empty text="Ainda não há entregas para analisar." />
        ) : (
          d.routes.map((r: any) => (
            <Card key={`${r.from}-${r.to}`}>
              <Text style={u.strong}>
                {r.from} → {r.to}
              </Text>
              <Text style={u.muted}>
                {r.count} entrega(s) · {r.delivered} concluída(s)
              </Text>
              <Text style={u.muted}>
                {r.avgKm !== null ? `📏 ${kmText(r.avgKm, true)} em média` : "Distância por confirmar"}
                {r.avgPayout !== null ? ` · 💰 ${money(r.avgPayout)} em média` : ""}
              </Text>
            </Card>
          ))
        )}

        {d.origins.length > 0 ? (
          <>
            <SubTitle>Regiões de onde mais saem entregas</SubTitle>
            <Card>
              <HBars data={bars(d.origins)} color="#2E7D32" />
            </Card>
          </>
        ) : null}

        {d.destinations.length > 0 ? (
          <>
            <SubTitle>Regiões para onde mais se entrega</SubTitle>
            <Card>
              <HBars data={bars(d.destinations)} color="#1565C0" />
            </Card>
          </>
        ) : null}

        {d.note ? <Text style={[u.muted, { marginTop: 10 }]}>{d.note}</Text> : null}
        <View style={u.row}>
          <Btn small kind="outline" label="🗺️ Mapa de alertas" onPress={() => navigation.navigate("BoAlerts")} />
        </View>
      </Page>
    </AdminLayout>
  );
}
