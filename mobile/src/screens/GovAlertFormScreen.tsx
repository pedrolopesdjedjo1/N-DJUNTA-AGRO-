import React, { useEffect, useState } from "react";
import { View, Text, Alert, Switch } from "react-native";
import { Page, Title, Card, Btn, Chip, Field, u } from "../components/ui";
import ChipGroup from "../components/ChipGroup";
import { createAlert, updateAlert, getGovRegions } from "../api/gov";
import { useGovCatalog } from "../utils/govCatalog";
import { AUDIENCE_TEXT, DURATIONS } from "../utils/govRegions";
import { dateToIso, isDateText, isTimeText, isoToDateText, isoToTimeText, todayText } from "../utils/dates";
import { ALERT_KIND_ICON, SEVERITY_ICON } from "../constants/gov";
import { labelOf } from "../utils/ngoCatalog";
import { getApiErrorMessage } from "../api/errorMessage";
import { colors } from "../theme/colors";

export default function GovAlertFormScreen({ navigation, route }: any) {
  const params = route?.params ?? {};
  const editing = params.alert;
  const catalog = useGovCatalog();

  const [kind, setKind] = useState<string>(editing?.kind ?? params.kind ?? "");
  const [severity, setSeverity] = useState<string>(editing?.severity ?? params.severity ?? "ATENCAO");
  const [title, setTitle] = useState<string>(editing?.title ?? params.title ?? "");
  const [message, setMessage] = useState<string>(editing?.message ?? params.message ?? "");
  const [advice, setAdvice] = useState<string>(editing?.advice ?? params.advice ?? "");
  const [regions, setRegions] = useState<string[]>(editing?.regions ?? params.regions ?? []);
  const [choice, setChoice] = useState<string>(editing ? "keep" : "auto");
  const [customDate, setCustomDate] = useState<string>(isoToDateText(editing?.expiresAt) || todayText(3));
  const [customTime, setCustomTime] = useState<string>(isoToTimeText(editing?.expiresAt) || "18:00");
  const [notify, setNotify] = useState<boolean | null>(null);
  const [audienceAll, setAudienceAll] = useState<boolean>(editing?.audience === "TODOS");
  const [regionList, setRegionList] = useState<{ key: string; name: string }[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getGovRegions()
      .then((list) => setRegionList(list.map((r) => ({ key: r.key, name: r.name }))))
      .catch(() => {});
  }, []);

  const emergency = severity === "EMERGENCIA" || kind === "EMERGENCIA";
  const notifyOn = notify ?? severity !== "INFO";
  const audience = AUDIENCE_TEXT[kind] ?? "";
  const durationOptions = editing ? [{ key: "keep", label: "Manter" }, ...DURATIONS.filter((d) => d.key !== "auto")] : DURATIONS;

  function toggleRegion(key: string) {
    setRegions((prev) => (prev.includes(key) ? prev.filter((r) => r !== key) : [...prev, key]));
  }

  async function save() {
    if (!kind) {
      Alert.alert("Atenção", "Escolha o tipo de alerta.");
      return;
    }
    if (title.trim().length < 3) {
      Alert.alert("Atenção", "Escreva o título do alerta.");
      return;
    }
    if (message.trim().length < 10) {
      Alert.alert("Atenção", "Explique o que se passa (pelo menos 10 letras).");
      return;
    }

    let expiresAt: string | undefined;
    if (choice === "none") {
      expiresAt = "";
    } else if (choice === "custom") {
      if (!isDateText(customDate.trim()) || !isTimeText(customTime.trim())) {
        Alert.alert("Atenção", "Escreva a data assim: AAAA-MM-DD (ex: 2026-11-05) e a hora assim: HH:MM (ex: 18:00).");
        return;
      }
      const iso = dateToIso(customDate.trim(), customTime.trim());
      if (new Date(iso).getTime() <= Date.now()) {
        Alert.alert("Atenção", "O fim do alerta deve ser no futuro.");
        return;
      }
      expiresAt = iso;
    } else if (choice !== "auto" && choice !== "keep") {
      const hours = DURATIONS.find((d) => d.key === choice)?.hours;
      if (hours) expiresAt = new Date(Date.now() + hours * 3600000).toISOString();
    }

    const finish = async (run: () => Promise<any>, okMessage: (r: any) => string) => {
      setSaving(true);
      try {
        const r = await run();
        Alert.alert("Pronto", okMessage(r));
        if (r?.alert?.id && !editing && navigation.replace) navigation.replace("GovAlert", { id: r.alert.id });
        else navigation.goBack();
      } catch (e) {
        Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível guardar o alerta."));
      } finally {
        setSaving(false);
      }
    };

    if (editing) {
      const body: Record<string, any> = { severity, title: title.trim(), message: message.trim(), advice: advice.trim(), regions };
      if (expiresAt !== undefined) body.expiresAt = expiresAt;
      if (notify === true) body.renotify = true;

      await finish(
        () => updateAlert(editing.id, body),
        (r) => (r.notified ? `Alerta atualizado. ${r.notified} pessoa(s) avisada(s).` : "Alerta atualizado.")
      );
      return;
    }

    const body: Record<string, any> = {
      kind,
      severity,
      title: title.trim(),
      message: message.trim(),
      advice: advice.trim(),
      regions,
      audience: audienceAll || emergency ? "TODOS" : "AUTO",
      notify: notifyOn,
    };
    if (expiresAt !== undefined) body.expiresAt = expiresAt;

    const send = () =>
      finish(
        () => createAlert(body),
        (r) => (notifyOn ? `Alerta criado. ${r.notified} pessoa(s) avisada(s).` : "Alerta criado, sem aviso às pessoas.")
      );

    if (notifyOn && (emergency || severity === "ALERTA")) {
      Alert.alert(
        "Enviar o alerta",
        `O alerta ${regions.length ? "das regiões escolhidas" : "de todo o país"} vai chegar por notificação a ${emergency || audienceAll ? "toda a gente" : audience}. Enviar agora?`,
        [
          { text: "Não", style: "cancel" },
          { text: "Enviar", onPress: send },
        ]
      );
    } else {
      await send();
    }
  }

  return (
    <Page>
      <Title>{editing ? "✏️ Editar alerta" : "🚨 Novo alerta oficial"}</Title>

      {editing ? (
        <Card>
          <Text style={u.muted}>Tipo de alerta</Text>
          <Text style={u.strong}>
            {ALERT_KIND_ICON[kind] ?? "📢"} {labelOf(catalog.alertKinds, kind)}
          </Text>
          <Text style={u.muted}>O tipo não se muda. Para outro tipo, termine este alerta e crie um novo.</Text>
        </Card>
      ) : (
        <ChipGroup
          label="Tipo de alerta"
          options={catalog.alertKinds.map((k) => ({ ...k, icon: ALERT_KIND_ICON[k.value] }))}
          value={kind}
          onChange={(v) => {
            setKind(v);
            if (v === "EMERGENCIA") setSeverity("EMERGENCIA");
          }}
        />
      )}

      <ChipGroup
        label="Gravidade"
        options={catalog.alertSeverity.map((s) => ({ ...s, icon: SEVERITY_ICON[s.value] }))}
        value={severity}
        onChange={setSeverity}
      />

      <Field label="Título" value={title} onChangeText={setTitle} placeholder="Ex: Chuva forte em Bafatá e Gabú" />
      <Field label="O que se passa" value={message} onChangeText={setMessage} multiline placeholder="Descreva o perigo, a zona e quando se espera" />
      <Field label="O que as pessoas devem fazer (opcional)" value={advice} onChangeText={setAdvice} multiline placeholder="Ex: Guarde as colheitas em local seco e evite atravessar rios" />

      <Text style={u.label}>Regiões afetadas (vazio = todo o país)</Text>
      <View style={u.row}>
        <Chip label="Todo o país" active={regions.length === 0} onPress={() => setRegions([])} />
        {regionList.map((r) => (
          <Chip key={r.key} label={r.name} active={regions.includes(r.key)} onPress={() => toggleRegion(r.key)} />
        ))}
      </View>

      <Text style={u.label}>Duração do alerta</Text>
      <View style={u.row}>
        {durationOptions.map((d) => (
          <Chip key={d.key} label={d.label} active={choice === d.key} onPress={() => setChoice(d.key)} />
        ))}
      </View>
      {choice === "auto" ? <Text style={u.muted}>O alerta termina sozinho: 2 dias para emergências, 3 dias para alertas e atenção, 7 dias para informação e 30 dias para a seca.</Text> : null}
      {choice === "custom" ? (
        <View>
          <Field label="Data de fim (AAAA-MM-DD)" value={customDate} onChangeText={setCustomDate} placeholder="2026-11-05" />
          <Field label="Hora de fim (HH:MM)" value={customTime} onChangeText={setCustomTime} placeholder="18:00" />
        </View>
      ) : null}

      <Card>
        <View style={u.between}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={u.strong}>{editing ? "Avisar de novo as pessoas" : "Avisar já as pessoas"}</Text>
            <Text style={u.muted}>
              {kind
                ? `Recebem a notificação: ${emergency || audienceAll ? "toda a gente" : audience}${regions.length ? " das regiões escolhidas" : " de todo o país"}.`
                : "Escolha primeiro o tipo de alerta."}
            </Text>
            {!editing && severity === "INFO" ? <Text style={u.muted}>Alertas de informação não avisam por defeito.</Text> : null}
          </View>
          <Switch
            value={editing ? notify === true : notifyOn}
            onValueChange={(v) => setNotify(v)}
            trackColor={{ true: colors.primary, false: "#BDBDBD" }}
          />
        </View>
      </Card>

      {!editing ? (
        <Card>
          <View style={u.between}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={u.strong}>Avisar toda a gente da região</Text>
              <Text style={u.muted}>
                {emergency ? "As emergências avisam sempre toda a gente." : `Desligado: só ${audience || "as pessoas a quem interessa"}.`}
              </Text>
            </View>
            <Switch
              value={emergency || audienceAll}
              disabled={emergency}
              onValueChange={setAudienceAll}
              trackColor={{ true: colors.primary, false: "#BDBDBD" }}
            />
          </View>
        </Card>
      ) : null}

      <Text style={[u.muted, { marginTop: 8 }]}>
        Use os alertas só quando é preciso: as pessoas recebem uma notificação. Pode criar até 20 alertas por dia.
      </Text>

      <Btn label={saving ? "A guardar..." : editing ? "Guardar alterações" : notifyOn ? "Criar e avisar" : "Criar alerta"} onPress={save} disabled={saving} />
      <Btn kind="outline" label="Cancelar" onPress={() => navigation.goBack()} />
    </Page>
  );
}
