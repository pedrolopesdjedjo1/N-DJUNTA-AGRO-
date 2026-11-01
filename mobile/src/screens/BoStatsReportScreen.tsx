import React, { useState } from "react";
import { Text, Share, Alert, Platform } from "react-native";
import AdminLayout from "../components/admin/AdminLayout";
import DateRangeBar from "../components/admin/DateRangeBar";
import { Page, Title, Card, Btn, Empty, useLoader, u } from "../components/ui";
import { getBoStatsReport } from "../api/backoffice";
import { getApiErrorMessage } from "../api/errorMessage";
import { formatDate } from "../constants/market";

const EMPTY = { report: null as any };
const MONO = Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" });

// Relatório da plataforma em texto, pronto para partilhar
export default function BoStatsReportScreen({ route }: any) {
  const [range, setRange] = useState({ from: route?.params?.from ?? "", to: route?.params?.to ?? "" });
  const loader = useLoader(async () => ({ report: await getBoStatsReport({ from: range.from, to: range.to }) }), EMPTY, [range]);
  const r: any = loader.data.report;

  async function share() {
    if (!r) return;
    try {
      await Share.share({ message: r.text, title: "Relatório da plataforma" });
    } catch (e) {
      Alert.alert("Erro", getApiErrorMessage(e, "Não foi possível partilhar o relatório."));
    }
  }

  return (
    <AdminLayout active="BoStats">
      <Page loader={loader}>
        <Title>📑 Relatório da plataforma</Title>
        <Text style={u.muted}>Resumo em texto, pronto para enviar por mensagem ou por e-mail. Só tem números somados, sem nomes nem contactos.</Text>

        <DateRangeBar from={range.from} to={range.to} onApply={(from, to) => setRange({ from, to })} />

        {!r ? (
          <Empty text="A carregar..." />
        ) : (
          <>
            <Text style={[u.muted, { marginTop: 6 }]}>
              Período: {formatDate(r.from)} a {formatDate(r.to)}
            </Text>
            <Btn label="📤 Partilhar relatório" onPress={share} />
            <Card>
              <Text selectable style={{ fontFamily: MONO, fontSize: 12, lineHeight: 18 }}>
                {r.text}
              </Text>
            </Card>
          </>
        )}
      </Page>
    </AdminLayout>
  );
}
