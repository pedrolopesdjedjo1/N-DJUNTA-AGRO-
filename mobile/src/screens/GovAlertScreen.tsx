import React, { useCallback, useState } from "react";
import { View, Text, Alert, Share } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Page, Title, SubTitle, Card, Badge, Btn, Empty, useLoader, u } from "../components/ui";
import { getAlert, updateAlert, endAlert, deleteAlert } from "../api/gov";
import { useGovCatalog } from "../utils/govCatalog";
import { labelOf } from "../utils/ngoCatalog";
import { hoursText } from "../utils/govRegions";
import { ALERT_KIND_ICON, ALERT_STATE, SEVERITY_COLOR, SEVERITY_ICON } from "../constants/gov";
import { getApiErrorMessage } from "../api/errorMessage";
import { formatDateTime } from "../constants/market";

export default function GovAlertScreen({ navigation, route }: any) {
  const id: string = route?.params?.id;
  const catalog = useGovCatalog();
  const loader = useLoader(() => getAlert(id), null as any, [id]);
  const a: any = loader.data;
  const [busy, setBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loader.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id])
  );

  if (!a) {
    return (
      <Page loader={loader}>
        <Title>Alerta</Title>
        <Empty text="A carregar..." />
      </Page>
    );
  }

  const color = SEVERITY_COLOR[a.severity] ?? "#757575";
  const state = ALERT_STATE[a.state];
  const ended = a.state === "TERMINADO";

  async function share() {
    const text = [
      `${SEVERITY_ICON[a.severity] ?? "⚠️"} ${a.title}`,
      `${labelOf(catalog.alertKinds, a.kind)} · ${a.regionNames}`,
      `\n${a.message}`,
      a.advice ? `\nO que fazer: ${a.advice}` : "",
      `\n${a.organization?.name ?? "Instituição"} · NÔDJUNTA AGRO`,
    ];
    try {
      await Share.share({ message: text.filter(Boolean).join("\n") });
    } catch (e) {
      Alert.alert("Erro", getApiErrorMessage(e, "Não foi possível partilhar."));
    }
  }

  async function run(work: () => Promise<any>, fail: string, ok?: (r: any) => void) {
    setBusy(true);
    try {
      const r = await work();
      if (r?.alert) loader.setData(r.alert);
      if (ok) ok(r);
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, fail));
    } finally {
      setBusy(false);
    }
  }

  function renotify() {
    Alert.alert("Avisar de novo", "As pessoas da região recebem outra notificação com este alerta. Avisar?", [
      { text: "Não", style: "cancel" },
      {
        text: "Avisar",
        onPress: () =>
          run(
            () => updateAlert(id, { renotify: true }),
            "Não foi possível avisar de novo.",
            (r) => Alert.alert("Aviso enviado", `${r.notified} pessoa(s) avisada(s).`)
          ),
      },
    ]);
  }

  function prolong(hours: number) {
    const current = a.expiresAt ? new Date(a.expiresAt).getTime() : 0;
    const base = current > Date.now() ? current : Date.now();
    run(() => updateAlert(id, { expiresAt: new Date(base + hours * 3600000).toISOString() }), "Não foi possível prolongar o alerta.");
  }

  function finish() {
    Alert.alert("Terminar o alerta", "Quer avisar as pessoas de que o perigo passou?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Terminar sem avisar",
        onPress: () => run(() => endAlert(id, false), "Não foi possível terminar o alerta."),
      },
      {
        text: "Terminar e avisar",
        onPress: () =>
          run(
            () => endAlert(id, true),
            "Não foi possível terminar o alerta.",
            (r) => Alert.alert("Alerta terminado", `${r.notified} pessoa(s) avisada(s).`)
          ),
      },
    ]);
  }

  function remove() {
    Alert.alert("Apagar alerta", "O alerta deixa de existir. Para o encerrar sem o apagar, use Terminar. Apagar?", [
      { text: "Não", style: "cancel" },
      {
        text: "Apagar",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteAlert(id);
            navigation.goBack();
          } catch (e) {
            Alert.alert("Erro", getApiErrorMessage(e, "Não foi possível apagar."));
          }
        },
      },
    ]);
  }

  return (
    <Page loader={loader}>
      <View style={{ borderLeftWidth: 6, borderLeftColor: color, paddingLeft: 12 }}>
        <View style={u.row}>
          <Badge label={`${SEVERITY_ICON[a.severity] ?? "⚠️"} ${labelOf(catalog.alertSeverity, a.severity)}`} color={color} />
          {state ? (
            <View style={{ marginLeft: 8 }}>
              <Badge label={state.label} color={state.color} />
            </View>
          ) : null}
        </View>
        <Title>
          {ALERT_KIND_ICON[a.kind] ?? "📢"} {a.title}
        </Title>
        <Text style={u.muted}>{labelOf(catalog.alertKinds, a.kind)}</Text>
      </View>

      <Card>
        <Text style={{ lineHeight: 22 }}>{a.message}</Text>
      </Card>

      {a.advice ? (
        <>
          <SubTitle>O que fazer</SubTitle>
          <Card>
            <Text style={{ lineHeight: 22 }}>{a.advice}</Text>
          </Card>
        </>
      ) : null}

      <Card>
        <Text>📍 {a.regionNames}</Text>
        <Text style={u.muted}>🕒 Começou em {formatDateTime(a.startsAt)}</Text>
        {a.expiresAt ? (
          <Text style={u.muted}>
            ⏳ Termina em {formatDateTime(a.expiresAt)}
            {a.state === "ATIVO" && a.hoursLeft !== null ? ` (daqui a ${hoursText(a.hoursLeft)})` : ""}
          </Text>
        ) : (
          <Text style={u.muted}>⏳ Sem data de fim</Text>
        )}
        <Text style={[u.muted, { marginTop: 6 }]}>
          Publicado por {a.organization?.name ?? "Instituição"} {a.organization?.isVerified ? "✅" : ""}
        </Text>
        <View style={u.row}>
          <Btn small kind="outline" label="Ver instituição" onPress={() => navigation.navigate("NgoPublicOrganization", { id: a.ownerId })} />
          <Btn small kind="outline" label="📤 Partilhar" onPress={share} />
        </View>
      </Card>

      {a.kind === "EMERGENCIA" || a.severity === "EMERGENCIA" ? (
        <Card>
          <Text style={u.strong}>🆘 Em perigo agora?</Text>
          <Text style={u.muted}>Peça ajuda às autoridades locais e a quem está perto. Este alerta é só informação.</Text>
        </Card>
      ) : null}

      {a.isMine ? (
        <>
          <SubTitle>Gerir este alerta</SubTitle>
          <Text style={u.muted}>🔔 {a.notifiedCount ?? 0} pessoa(s) já avisada(s) por este alerta.</Text>

          {!ended ? (
            <>
              <View style={u.row}>
                <Btn small label="✏️ Editar" onPress={() => navigation.navigate("GovAlertForm", { alert: a })} />
                <Btn small kind="outline" label="🔔 Avisar de novo" onPress={renotify} disabled={busy} />
                <Btn small kind="outline" label="✅ Terminar" onPress={finish} disabled={busy} />
              </View>

              <Text style={[u.label, { marginTop: 10 }]}>Prolongar o alerta</Text>
              <View style={u.row}>
                <Btn small kind="outline" label="+ 6 horas" onPress={() => prolong(6)} disabled={busy} />
                <Btn small kind="outline" label="+ 24 horas" onPress={() => prolong(24)} disabled={busy} />
                <Btn small kind="outline" label="+ 3 dias" onPress={() => prolong(72)} disabled={busy} />
                <Btn small kind="outline" label="+ 7 dias" onPress={() => prolong(168)} disabled={busy} />
              </View>
            </>
          ) : (
            <Text style={u.muted}>Este alerta já terminou. Para avisar de novo, crie um alerta novo.</Text>
          )}

          <View style={u.row}>
            <Btn small kind="outline" label="➕ Criar alerta parecido" onPress={() => navigation.navigate("GovAlertForm", { kind: a.kind, severity: a.severity, title: a.title, message: a.message, advice: a.advice ?? undefined, regions: a.regions })} />
            <Btn small kind="danger" label="Apagar" onPress={remove} disabled={busy} />
          </View>
        </>
      ) : null}
    </Page>
  );
}
