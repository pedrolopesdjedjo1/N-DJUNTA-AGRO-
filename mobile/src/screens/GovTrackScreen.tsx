import React, { useCallback, useEffect, useState } from "react";
import { View, Text } from "react-native";
import { Page, Title, SubTitle, Card, Badge, Btn, Empty, Field, u } from "../components/ui";
import ReportTimeline from "../components/gov/ReportTimeline";
import { trackProtocol } from "../api/gov";
import { useGovCatalog } from "../utils/govCatalog";
import { labelOf } from "../utils/ngoCatalog";
import { REPORT_ICON, REPORT_STATUS_COLOR } from "../constants/gov";
import { getApiErrorMessage } from "../api/errorMessage";
import { formatDate } from "../constants/market";

// Acompanhar um pedido só com o número de protocolo (mostra o estado e as respostas da instituição)
export default function GovTrackScreen({ route }: any) {
  const catalog = useGovCatalog();
  const [protocol, setProtocol] = useState<string>(route?.params?.protocol ?? "");
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const search = useCallback(
    async (value: string) => {
      const code = value.trim().toUpperCase();
      if (code.length < 6) {
        setError("Escreva o número de protocolo (ex: PRO-2026-ABC123).");
        setResult(null);
        return;
      }

      setBusy(true);
      setError("");
      try {
        setResult(await trackProtocol(code));
      } catch (e) {
        setResult(null);
        setError(getApiErrorMessage(e, "Protocolo não encontrado. Confira o número."));
      } finally {
        setBusy(false);
      }
    },
    []
  );

  useEffect(() => {
    if (route?.params?.protocol) search(route.params.protocol);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Page>
      <Title>🔎 Acompanhar pedido</Title>
      <Text style={u.muted}>Escreva o número de protocolo que recebeu ao enviar o pedido.</Text>

      <Field
        label="Número de protocolo"
        value={protocol}
        onChangeText={setProtocol}
        autoCapitalize="characters"
        placeholder="PRO-2026-ABC123"
        onSubmitEditing={() => search(protocol)}
        returnKeyType="search"
      />
      <Btn label={busy ? "A consultar..." : "Consultar"} onPress={() => search(protocol)} disabled={busy} />

      {error ? <Empty text={error} /> : null}

      {result ? (
        <>
          <Card>
            <View style={u.between}>
              <Text style={{ fontSize: 18, fontWeight: "bold", letterSpacing: 1 }}>{result.protocol}</Text>
              <Badge label={labelOf(catalog.reportStatus, result.status)} color={REPORT_STATUS_COLOR[result.status] ?? "#757575"} />
            </View>
            <Text style={u.muted}>
              {REPORT_ICON[result.category] ?? "📝"} {labelOf(catalog.reportCategories, result.category)}
              {result.region ? ` · 📍 ${result.region}` : ""}
            </Text>
            <Text style={u.muted}>Enviado em {formatDate(result.createdAt)}</Text>
            <Text style={u.muted}>🏛️ {result.institution ?? "Ainda sem instituição responsável"}</Text>
          </Card>

          {result.answer ? (
            <>
              <SubTitle>Última resposta</SubTitle>
              <Card>
                <Text style={{ lineHeight: 21 }}>{result.answer}</Text>
              </Card>
            </>
          ) : null}

          <SubTitle>Acompanhamento</SubTitle>
          <ReportTimeline events={result.events} catalog={catalog} />

          <Text style={[u.muted, { marginTop: 8 }]}>
            Por privacidade, aqui não aparece o conteúdo do pedido. Quem o enviou vê todos os detalhes em Os meus pedidos.
          </Text>
        </>
      ) : null}
    </Page>
  );
}
