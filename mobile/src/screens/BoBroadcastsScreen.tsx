import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import AdminLayout from "../components/admin/AdminLayout";
import { Page, Title, SubTitle, Card, Badge, Btn, Chip, Empty, Field, u } from "../components/ui";
import ChipGroup from "../components/ChipGroup";
import { previewBoBroadcast, sendBoBroadcast, listBoBroadcasts, endBoAlert } from "../api/backoffice";
import { getGovRegions } from "../api/gov";
import { useBoCatalog } from "../utils/boCatalog";
import { adminCan } from "../utils/adminSession";
import { labelOf } from "../utils/ngoCatalog";
import { SEVERITY_BO_COLOR } from "../constants/backoffice";
import { BROADCAST_HELP, BROADCAST_ICON, HOURS_OPTIONS, SEVERITY_ICON, hoursLabel } from "../constants/backofficeComms";
import { formatNumber } from "../utils/format";
import { getApiErrorMessage } from "../api/errorMessage";
import { formatDateTime } from "../constants/market";

type Tab = "send" | "alert" | "history";

const PLAIN_KINDS = ["GERAL", "REGIAO", "PERFIL"];

export default function BoBroadcastsScreen({ navigation, route }: any) {
  const catalog = useBoCatalog();
  const canPlain = adminCan("notify.send");
  const canAlert = adminCan("alerts.manage");

  const initial: Tab = route?.params?.mode === "alert" && canAlert ? "alert" : canPlain ? "send" : canAlert ? "alert" : "history";
  const [tab, setTab] = useState<Tab>(initial);

  const [kind, setKind] = useState<string>(initial === "alert" ? "CLIMA" : "GERAL");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [audiences, setAudiences] = useState<string[]>([]);
  const [regionKeys, setRegionKeys] = useState<string[]>([]);
  const [severity, setSeverity] = useState("ALERTA");
  const [hours, setHours] = useState(24);
  const [regions, setRegions] = useState<{ key: string; name: string }[]>([]);
  const [sending, setSending] = useState(false);
  const [preview, setPreview] = useState<any>(null);
  const [previewing, setPreviewing] = useState(false);

  const [onlyAlerts, setOnlyAlerts] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [endingId, setEndingId] = useState("");
  const requestId = useRef(0);

  useEffect(() => {
    getGovRegions()
      .then((list) => setRegions(list.map((r) => ({ key: r.key, name: r.name }))))
      .catch(() => {});
  }, []);

  function resetForm(nextKind: string) {
    setKind(nextKind);
    setTitle("");
    setMessage("");
    setAudiences(catalog.suggestedAudience[nextKind] ?? []);
    setRegionKeys([]);
    setSeverity(nextKind === "EMERGENCIA" ? "EMERGENCIA" : "ALERTA");
    setHours(24);
    setPreview(null);
  }

  function chooseTab(next: Tab) {
    setTab(next);
    if (next === "send") resetForm("GERAL");
    if (next === "alert") resetForm("CLIMA");
  }

  function chooseKind(next: string) {
    setKind(next);
    setAudiences(catalog.suggestedAudience[next] ?? []);
    setRegionKeys([]);
    setSeverity(next === "EMERGENCIA" ? "EMERGENCIA" : "ALERTA");
    setPreview(null);
  }

  async function loadHistory(reset: boolean) {
    const nextPage = reset ? 1 : page + 1;
    const mine = ++requestId.current;
    setBusy(true);
    setError("");

    try {
      const r = await listBoBroadcasts({ alerts: onlyAlerts ? "true" : "", page: nextPage });
      if (mine !== requestId.current) return;

      setItems((prev) => (reset ? r.items : [...prev, ...r.items]));
      setTotal(r.total);
      setPage(nextPage);
    } catch (e) {
      if (mine === requestId.current) setError(getApiErrorMessage(e, "Não foi possível carregar o histórico."));
    } finally {
      if (mine === requestId.current) setBusy(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      if (tab === "history") loadHistory(true);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tab, onlyAlerts])
  );

  function toggle(list: string[], value: string, set: (v: string[]) => void) {
    set(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);
    setPreview(null);
  }

  function body() {
    return { kind, title: title.trim(), message: message.trim(), audiences, regionKeys, severity, hours };
  }

  function validate(): string | null {
    if (title.trim().length < 3) return "Escreva o título (pelo menos 3 letras).";
    if (message.trim().length < 10) return "Escreva a mensagem (pelo menos 10 letras).";
    if (kind === "REGIAO" && regionKeys.length === 0) return "Escolha pelo menos uma região.";
    if (kind === "PERFIL" && audiences.length === 0) return "Escolha pelo menos um perfil.";
    return null;
  }

  async function count() {
    setPreviewing(true);
    try {
      setPreview(await previewBoBroadcast(body()));
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível contar as pessoas."));
    } finally {
      setPreviewing(false);
    }
  }

  async function send() {
    const problem = validate();
    if (problem) {
      Alert.alert("Atenção", problem);
      return;
    }

    setSending(true);
    try {
      const p = await previewBoBroadcast(body());
      setPreview(p);
      if (p.recipients === 0) {
        Alert.alert("Atenção", "Ninguém corresponde a este público e a estas regiões.");
        return;
      }
      if (p.tooMany) {
        Alert.alert("Público demasiado grande", `Este aviso chega a ${formatNumber(p.recipients)} pessoas e o limite é ${formatNumber(p.max)}. Escolha um público ou regiões mais pequenos.`);
        return;
      }

      const isAlert = tab === "alert";
      Alert.alert(
        kind === "EMERGENCIA" ? "🚨 Enviar alerta de emergência?" : isAlert ? "Enviar o alerta?" : "Enviar o aviso?",
        `Chega a ${formatNumber(p.recipients)} pessoa(s)${isAlert ? ` e fica ativo ${hoursLabel(hours)}` : ""}. Não se pode desfazer.`,
        [
          { text: "Não", style: "cancel" },
          {
            text: "Enviar",
            style: kind === "EMERGENCIA" ? "destructive" : "default",
            onPress: async () => {
              setSending(true);
              try {
                const r = await sendBoBroadcast({ ...body(), confirm: true });
                Alert.alert("Enviado", `${formatNumber(r.sentCount)} pessoa(s) receberam ${isAlert ? "o alerta" : "o aviso"}.`);
                resetForm(kind);
                setTab("history");
              } catch (e) {
                Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível enviar."));
              } finally {
                setSending(false);
              }
            },
          },
        ]
      );
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível preparar o envio."));
    } finally {
      setSending(false);
    }
  }

  function endAlert(b: any) {
    Alert.alert("Terminar o alerta", `"${b.title}" deixa de aparecer na página inicial. Quer avisar as pessoas de que terminou?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Terminar", onPress: () => doEnd(b.id, false) },
      { text: "Terminar e avisar", onPress: () => doEnd(b.id, true) },
    ]);
  }

  async function doEnd(id: string, notify: boolean) {
    setEndingId(id);
    try {
      await endBoAlert(id, notify);
      loadHistory(true);
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível terminar o alerta."));
    } finally {
      setEndingId("");
    }
  }

  const kindOptions = (tab === "alert" ? catalog.alertKinds : PLAIN_KINDS).map((v) => ({
    value: v,
    label: labelOf(catalog.broadcastKinds, v) || v,
    icon: BROADCAST_ICON[v],
  }));
  const audienceOptions = catalog.audiences.filter((a) => a.value !== "TODOS");
  const showAudiences = kind !== "GERAL";
  const showRegions = kind !== "GERAL";

  return (
    <AdminLayout active="BoSystem">
      <Page>
        <Title>📣 Avisos e alertas</Title>
        <Text style={u.muted}>Envie uma notificação às pessoas, ou crie um alerta que também aparece na página inicial. Vê sempre quantas pessoas recebem antes de enviar.</Text>

        <View style={u.row}>
          {canPlain ? <Chip label="📣 Enviar aviso" active={tab === "send"} onPress={() => chooseTab("send")} /> : null}
          {canAlert ? <Chip label="🚨 Criar alerta" active={tab === "alert"} onPress={() => chooseTab("alert")} /> : null}
          <Chip label="📚 Histórico" active={tab === "history"} onPress={() => chooseTab("history")} />
        </View>

        {tab !== "history" ? (
          <>
            <ChipGroup label="Tipo" options={kindOptions} value={kind} onChange={chooseKind} />
            <Text style={u.muted}>{BROADCAST_HELP[kind]}</Text>

            <Field label="Título" value={title} onChangeText={(v) => { setTitle(v); setPreview(null); }} placeholder={tab === "alert" ? "Ex: Chuva forte em Gabú" : "Ex: Feira agrícola no sábado"} />
            <Field
              label="Mensagem (até 300 letras)"
              value={message}
              onChangeText={(v) => { setMessage(v.slice(0, 300)); setPreview(null); }}
              multiline
              placeholder="Escreva de forma curta e clara, para toda a gente perceber."
            />
            <Text style={u.muted}>{message.length}/300</Text>

            {showAudiences ? (
              <>
                <Text style={u.label}>{kind === "PERFIL" ? "Quem recebe (escolha os perfis)" : "Perfis (deixe vazio para todos)"}</Text>
                <View style={u.row}>
                  {audienceOptions.map((a) => (
                    <Chip key={a.value} label={a.label} active={audiences.includes(a.value)} onPress={() => toggle(audiences, a.value, setAudiences)} />
                  ))}
                </View>
              </>
            ) : null}

            {showRegions ? (
              <>
                <Text style={u.label}>{kind === "REGIAO" ? "Regiões (escolha pelo menos uma)" : "Regiões (deixe vazio para todas)"}</Text>
                <View style={u.row}>
                  {regions.map((r) => (
                    <Chip key={r.key} label={r.name} active={regionKeys.includes(r.key)} onPress={() => toggle(regionKeys, r.key, setRegionKeys)} />
                  ))}
                </View>
              </>
            ) : null}

            {tab === "alert" ? (
              <>
                {kind !== "EMERGENCIA" ? (
                  <ChipGroup
                    label="Gravidade"
                    options={catalog.severities.filter((s) => s.value !== "EMERGENCIA").map((s) => ({ ...s, icon: SEVERITY_ICON[s.value] }))}
                    value={severity}
                    onChange={(v) => { setSeverity(v); setPreview(null); }}
                  />
                ) : null}
                <Text style={u.label}>Quanto tempo fica ativo?</Text>
                <View style={u.row}>
                  {HOURS_OPTIONS.map((h) => (
                    <Chip key={h} label={hoursLabel(h)} active={hours === h} onPress={() => setHours(h)} />
                  ))}
                </View>
              </>
            ) : null}

            <Card>
              {preview ? (
                <>
                  <Text style={[u.strong, { color: preview.tooMany ? "#C62828" : undefined }]}>
                    {preview.recipients === 0 ? "Ninguém corresponde a este público." : `Chega a ${formatNumber(preview.recipients)} pessoa(s)`}
                  </Text>
                  {preview.tooMany ? <Text style={{ color: "#C62828" }}>O limite é {formatNumber(preview.max)}. Escolha um público ou regiões mais pequenos.</Text> : null}
                </>
              ) : (
                <Text style={u.muted}>Toque em "Ver quantas pessoas recebem" para saber o alcance antes de enviar.</Text>
              )}
              <Btn small kind="outline" label={previewing ? "A contar..." : "Ver quantas pessoas recebem"} onPress={count} disabled={previewing} />
            </Card>

            <Btn
              kind={kind === "EMERGENCIA" ? "danger" : "primary"}
              label={sending ? "A preparar..." : kind === "EMERGENCIA" ? "🚨 Enviar emergência" : tab === "alert" ? "Enviar alerta" : "Enviar aviso"}
              onPress={send}
              disabled={sending}
            />
          </>
        ) : (
          <>
            <View style={u.row}>
              <Chip label="Todos" active={!onlyAlerts} onPress={() => setOnlyAlerts(false)} />
              <Chip label="Só alertas" active={onlyAlerts} onPress={() => setOnlyAlerts(true)} />
            </View>
            {canAlert ? <Btn small kind="outline" label="🗺️ Ver alertas e regiões afetadas" onPress={() => navigation.navigate("BoAlerts")} /> : null}

            <Text style={[u.muted, { marginTop: 8 }]}>{busy && items.length === 0 ? "A carregar..." : `${formatNumber(total)} envio(s)`}</Text>
            {error ? <Empty text={error} /> : null}
            {!busy && !error && items.length === 0 ? <Empty text="Ainda não enviou avisos." /> : null}

            {items.map((b) => (
              <Card key={b.id}>
                <View style={u.between}>
                  <Text style={[u.strong, { flex: 1, marginRight: 8 }]} numberOfLines={2}>
                    {BROADCAST_ICON[b.kind] ?? "📣"} {b.title}
                  </Text>
                  {b.isAlert ? <Badge label={b.active ? "Ativo" : "Terminado"} color={b.active ? SEVERITY_BO_COLOR[b.severity] ?? "#EF6C00" : "#757575"} /> : null}
                </View>
                <Text style={u.muted}>{labelOf(catalog.broadcastKinds, b.kind) || b.kind}</Text>
                <Text style={{ marginTop: 4, lineHeight: 19 }} numberOfLines={3}>
                  {b.message}
                </Text>
                <Text style={[u.muted, { marginTop: 4 }]}>
                  👥 {formatNumber(b.sentCount)} pessoa(s) · Perfis: {b.audiences.length === 0 ? "todos" : b.audiences.map((a: string) => labelOf(catalog.audiences, a) || a).join(", ")}
                </Text>
                <Text style={u.muted}>Regiões: {b.regions.length === 0 ? "todas" : b.regions.join(", ")}</Text>
                <Text style={u.muted}>
                  {b.authorName} · {formatDateTime(b.createdAt)}
                  {b.isAlert && b.endsAt ? ` · até ${formatDateTime(b.endsAt)}` : ""}
                </Text>
                {b.active && canAlert ? <Btn small kind="outline" label={endingId === b.id ? "..." : "Terminar o alerta"} onPress={() => endAlert(b)} disabled={endingId === b.id} /> : null}
              </Card>
            ))}

            {items.length < total ? <Btn kind="outline" label={busy ? "A carregar..." : "Ver mais"} onPress={() => loadHistory(false)} disabled={busy} /> : null}
          </>
        )}
      </Page>
    </AdminLayout>
  );
}
