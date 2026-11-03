import React, { useCallback } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import TrLayout from "../components/transporter/TrLayout";
import { Page, Title, SubTitle, Card, Btn, useLoader, u } from "../components/ui";
import { listTrServices } from "../api/transporterV2";
import { TOOLS_MENU } from "../constants/transporterTools";
import { useTrCatalog } from "../utils/transportCatalogV2";
import { labelOf } from "../utils/ngoCatalog";
import { SERVICE_ICON } from "../constants/transporterTools";
import { formatNumber } from "../utils/format";

const EMPTY = { byKind: {} as Record<string, number>, total: 0 };

export default function TrToolsScreen({ navigation }: any) {
  const catalog = useTrCatalog();
  const loader = useLoader(() => listTrServices({ page: 1 }), EMPTY);
  const d: any = loader.data;

  useFocusEffect(
    useCallback(() => {
      loader.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  return (
    <TrLayout active="TrProfile">
      <Page loader={loader}>
        <Title>🧰 Ferramentas e serviços</Title>
        <Text style={u.muted}>Postos, oficinas, estacionamentos, manutenção, despesas do veículo, dicas de segurança e assistência.</Text>

        <View style={u.grid}>
          {TOOLS_MENU.map((t) => {
            const count = t.params?.kind ? d.byKind[t.params.kind] ?? 0 : null;
            return (
              <TouchableOpacity key={t.label} style={u.tile} onPress={() => navigation.navigate(t.route, t.params)}>
                <View style={u.tileBox}>
                  <Text style={{ fontSize: 22 }}>{t.icon}</Text>
                  <Text style={[u.strong, { marginTop: 4 }]}>{t.label}</Text>
                  {count !== null ? <Text style={u.muted}>{formatNumber(count)} local(is)</Text> : null}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {d.total === 0 && !loader.loading ? (
          <Card>
            <Text style={u.strong}>Ainda não há locais publicados</Text>
            <Text style={u.muted}>Os postos e oficinas são publicados pela equipa NÔDJUNTA. Se conhece algum, sugira-o: depois de analisado, aparece para todos os transportadores.</Text>
            <Btn small label="➕ Sugerir um local" onPress={() => navigation.navigate("TrServiceSuggest")} />
          </Card>
        ) : null}

        <SubTitle>Perto de si</SubTitle>
        <View style={u.row}>
          {catalog.serviceKinds.slice(0, 3).map((k) => (
            <Btn key={k.value} small kind="outline" label={`${SERVICE_ICON[k.value] ?? ""} ${labelOf(catalog.serviceKinds, k.value)}`.trim()} onPress={() => navigation.navigate("TrServices", { kind: k.value, near: true })} />
          ))}
        </View>
      </Page>
    </TrLayout>
  );
}
