import React, { useCallback, useState } from "react";
import { View, Text, Alert, Linking } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import TrLayout from "../components/transporter/TrLayout";
import { Page, Title, Card, Badge, Btn, Empty, Field, useLoader, u } from "../components/ui";
import { getTrIncident, resolveTrIncident } from "../api/transporterV2";
import { useTrCatalog } from "../utils/transportCatalogV2";
import { labelOf } from "../utils/ngoCatalog";
import { getApiErrorMessage } from "../api/errorMessage";
import { formatDateTime } from "../constants/market";

const STATUS_COLOR: Record<string, string> = { ABERTA: "#F9A825", EM_ATENDIMENTO: "#1565C0", RESOLVIDA: "#2E7D32" };

export default function TrIncidentScreen({ navigation, route }: any) {
  const id: string = route?.params?.id;
  const catalog = useTrCatalog();
  const loader = useLoader(() => getTrIncident(id), null as any, [id]);
  const d: any = loader.data;

  const [closing, setClosing] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loader.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id])
  );

  if (!d) {
    return (
      <TrLayout active="TrProfile">
        <Page loader={loader}>
          <Title>Ocorrência</Title>
          <Empty text="A carregar..." />
        </Page>
      </TrLayout>
    );
  }

  async function close() {
    setBusy(true);
    try {
      loader.setData(await resolveTrIncident(id, note.trim() || undefined));
      setClosing(false);
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível fechar a ocorrência."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <TrLayout active="TrProfile">
      <Page loader={loader}>
        <View style={u.between}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Title>{d.kindLabel}</Title>
          </View>
          <Badge label={labelOf(catalog.incidentStatus, d.status) || d.status} color={STATUS_COLOR[d.status] ?? "#757575"} />
        </View>
        <Text style={u.muted}>Registada em {formatDateTime(d.createdAt)}</Text>

        {d.description ? (
          <Card>
            <Text style={{ lineHeight: 21 }}>{d.description}</Text>
          </Card>
        ) : null}

        <Card>
          <Text style={u.strong}>{d.locationShared ? "📍 A localização foi partilhada com a equipa" : "Sem localização partilhada"}</Text>
          {d.mapUrl ? <Btn small kind="outline" label="Ver no mapa" onPress={() => Linking.openURL(d.mapUrl)} /> : null}
        </Card>

        {d.adminNote ? (
          <Card>
            <Text style={u.strong}>💬 Resposta da equipa</Text>
            <Text style={{ marginTop: 2 }}>{d.adminNote}</Text>
          </Card>
        ) : null}

        {d.resolvedAt ? <Text style={{ color: "#2E7D32" }}>Resolvida em {formatDateTime(d.resolvedAt)}</Text> : null}

        {d.status !== "RESOLVIDA" ? (
          <>
            <Btn kind="outline" label={closing ? "Cancelar" : "✅ Já estou bem, fechar a ocorrência"} onPress={() => setClosing(!closing)} />
            {closing ? (
              <Card>
                <Field label="Nota (opcional)" value={note} onChangeText={setNote} multiline placeholder="Ex: Já consegui reparar e segui viagem." />
                <Btn label={busy ? "A fechar..." : "Fechar a ocorrência"} onPress={close} disabled={busy} />
              </Card>
            ) : null}
          </>
        ) : null}

        {d.deliveryId ? <Btn small kind="outline" label="Abrir a entrega" onPress={() => navigation.navigate("TrDelivery", { id: d.deliveryId })} /> : null}
        <Btn small kind="outline" label="🆘 Voltar à emergência" onPress={() => navigation.navigate("TrEmergency")} />
      </Page>
    </TrLayout>
  );
}
