import React, { useCallback, useState } from "react";
import { View, Text, Alert, Linking } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import AdminLayout from "../components/admin/AdminLayout";
import { Page, Title, SubTitle, Card, Badge, Btn, Chip, Empty, Field, useLoader, u } from "../components/ui";
import ChipGroup from "../components/ChipGroup";
import { getBoReport, assignBoReport, noteBoReport, decideBoReport } from "../api/backoffice";
import { useBoCatalog } from "../utils/boCatalog";
import { adminCan } from "../utils/adminSession";
import { labelOf } from "../utils/ngoCatalog";
import {
  DECISION_HELP,
  DECISION_ICON,
  PRIORITY_COLOR,
  PRIORITY_LABEL,
  REPORT_CATEGORY_ICON,
  REPORT_EVENT_ICON,
  REPORT_STATUS_COLOR,
  REPORT_TARGET_ICON,
  reportTargetRoute,
} from "../constants/backofficeModeration";
import { SANCTION_COLOR } from "../constants/backoffice";
import { whatsappUrl } from "../utils/links";
import { getApiErrorMessage } from "../api/errorMessage";
import { formatDate, formatDateTime } from "../constants/market";

type Panel = "" | "note" | "decide";

const DAY_OPTIONS = [1, 3, 7, 15, 30, 90];
const OPEN = ["ABERTA", "EM_ANALISE"];

export default function BoReportScreen({ navigation, route }: any) {
  const id: string = route?.params?.id;
  const catalog = useBoCatalog();
  const loader = useLoader(() => getBoReport(id), null as any, [id]);
  const d: any = loader.data;

  const [panel, setPanel] = useState<Panel>("");
  const [decision, setDecision] = useState("");
  const [days, setDays] = useState(7);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loader.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id])
  );

  if (!d) {
    return (
      <AdminLayout active="BoSystem">
        <Page loader={loader}>
          <Title>Denúncia</Title>
          <Empty text="A carregar..." />
        </Page>
      </AdminLayout>
    );
  }

  const r = d.report;
  const reported = d.reported;
  const canModerate = adminCan("reports.moderate");
  const targetRoute = reportTargetRoute(r.targetType, r.targetId);
  const similarOpen = (d.otherReports as any[]).filter((o) => OPEN.includes(o.status)).length;
  const reportedWa = whatsappUrl(reported?.phone);

  // Só aparecem as decisões que fazem sentido para esta denúncia
  const decisions = catalog.reportDecisions.filter((x) => {
    if (["AVISO", "SUSPENDER", "BLOQUEAR"].includes(x.value) && !reported) return false;
    if (x.value === "REMOVER_PRODUTO" && r.targetType !== "PRODUCT") return false;
    return true;
  });

  function open(next: Panel) {
    setPanel(panel === next ? "" : next);
    setText("");
    setDecision("");
    setDays(7);
  }

  async function run(work: () => Promise<any>, fail: string) {
    setBusy(true);
    try {
      loader.setData(await work());
      setPanel("");
      setText("");
      setDecision("");
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, fail));
    } finally {
      setBusy(false);
    }
  }

  function saveNote() {
    if (text.trim().length < 3) {
      Alert.alert("Atenção", "Escreva a nota.");
      return;
    }
    run(() => noteBoReport(id, text.trim()), "Não foi possível guardar a nota.");
  }

  function decide() {
    if (!decision) {
      Alert.alert("Atenção", "Escolha a decisão.");
      return;
    }
    if (text.trim().length < 3) {
      Alert.alert("Atenção", "Explique a decisão. Fica no histórico e a pessoa denunciada pode vê-la.");
      return;
    }

    const body: Record<string, any> = { decision, note: text.trim() };
    if (decision === "SUSPENDER") body.days = days;

    const label = labelOf(catalog.reportDecisions, decision);
    const lines = [DECISION_HELP[decision]];
    if (similarOpen > 0) lines.push(`Também fecha ${similarOpen} denúncia(s) aberta(s) sobre o mesmo.`);
    lines.push("Quem denunciou é avisado de que o caso foi analisado.");

    const go = () => run(() => decideBoReport(id, body), "Não foi possível guardar a decisão.");

    if (["SUSPENDER", "BLOQUEAR", "REMOVER_PRODUTO"].includes(decision)) {
      Alert.alert(`${label}?`, lines.join("\n\n"), [
        { text: "Não", style: "cancel" },
        { text: "Confirmar", style: decision === "BLOQUEAR" ? "destructive" : "default", onPress: go },
      ]);
    } else {
      go();
    }
  }

  return (
    <AdminLayout active="BoSystem">
      <Page loader={loader}>
        <View style={u.between}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Title>
              {REPORT_CATEGORY_ICON[r.category] ?? "📝"} {labelOf(catalog.reportCategories, r.category) || r.category}
            </Title>
          </View>
          <Badge label={labelOf(catalog.reportStatus, r.status) || r.status} color={REPORT_STATUS_COLOR[r.status] ?? "#757575"} />
        </View>

        <View style={u.row}>
          {OPEN.includes(r.status) && r.priority !== "NORMAL" ? <Badge label={PRIORITY_LABEL[r.priority] ?? r.priority} color={PRIORITY_COLOR[r.priority] ?? "#757575"} /> : null}
          {r.assignedName ? (
            <View style={{ marginLeft: 8 }}>
              <Badge label={`🙋 ${r.assignedName}`} color="#00838F" />
            </View>
          ) : null}
        </View>
        <Text style={u.muted}>
          Recebida em {formatDateTime(r.createdAt)} · {labelOf(catalog.reportTargets, r.targetType)}
        </Text>

        {similarOpen > 0 ? (
          <Card>
            <Text style={{ color: "#6A1B9A", fontWeight: "bold" }}>📚 Há mais {similarOpen} denúncia(s) abertas sobre o mesmo</Text>
            <Text style={u.muted}>Uma decisão aqui fecha-as todas e avisa quem denunciou.</Text>
          </Card>
        ) : null}

        <SubTitle>{REPORT_TARGET_ICON[r.targetType] ?? "📝"} O que foi denunciado</SubTitle>
        <Card>
          <Text style={u.strong}>{d.target?.label ?? "—"}</Text>
          {d.target?.detail ? <Text style={u.muted}>{d.target.detail}</Text> : null}
          {targetRoute ? <Btn small kind="outline" label="Ver e analisar" onPress={() => navigation.navigate(targetRoute[0], targetRoute[1])} /> : null}
        </Card>

        <SubTitle>O que a pessoa escreveu</SubTitle>
        <Card>
          <Text style={{ lineHeight: 21 }}>{r.description}</Text>
        </Card>

        <SubTitle>Quem denunciou</SubTitle>
        <Card>
          {d.reporter ? (
            <>
              <Text style={u.strong}>{d.reporter.name}</Text>
              <Text style={u.muted}>{d.reporter.roleName}</Text>
              <View style={u.row}>
                <Btn small kind="outline" label="Ver a ficha" onPress={() => navigation.navigate("BoUser", { id: d.reporter.id })} />
                <Btn small kind="outline" label="💬 Mensagem" onPress={() => navigation.navigate("Chat", { userId: d.reporter.id, userName: d.reporter.name })} />
              </View>
            </>
          ) : (
            <Text style={u.muted}>Conta removida.</Text>
          )}
          <Text style={[u.muted, { marginTop: 6 }]}>🔒 Nunca diga à pessoa denunciada quem denunciou.</Text>
        </Card>

        {reported ? (
          <>
            <SubTitle>Pessoa denunciada</SubTitle>
            <Card>
              <View style={u.between}>
                <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>{reported.name}</Text>
                {!reported.isActive ? <Badge label="Conta inativa" color="#C62828" /> : null}
              </View>
              <Text style={u.muted}>{reported.roleName}</Text>
              <View style={u.row}>
                <Btn small kind="outline" label="Ver a ficha" onPress={() => navigation.navigate("BoUser", { id: reported.id })} />
                <Btn small kind="outline" label="💬 Mensagem" onPress={() => navigation.navigate("Chat", { userId: reported.id, userName: reported.name })} />
                {reported.phone ? <Btn small kind="outline" label="📞 Ligar" onPress={() => Linking.openURL(`tel:${reported.phone}`)} /> : null}
                {reportedWa ? <Btn small kind="outline" label="WhatsApp" onPress={() => Linking.openURL(reportedWa)} /> : null}
              </View>
            </Card>

            {d.sanctionHistory.length > 0 ? (
              <>
                <Text style={[u.strong, { marginTop: 8 }]}>Sanções anteriores ({d.sanctionHistory.length})</Text>
                {d.sanctionHistory.map((s: any) => (
                  <Card key={s.id}>
                    <View style={u.between}>
                      <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>{s.kind === "BLOQUEIO" ? "Bloqueio" : "Suspensão"}</Text>
                      <Badge label={s.status === "ATIVA" ? "Ativa" : "Terminada"} color={s.status === "ATIVA" ? SANCTION_COLOR[s.kind] ?? "#C62828" : "#757575"} />
                    </View>
                    <Text style={{ marginTop: 2 }}>{s.reason}</Text>
                    <Text style={u.muted}>{formatDate(s.startsAt)}</Text>
                  </Card>
                ))}
              </>
            ) : null}
          </>
        ) : null}

        {d.otherReports.length > 0 ? (
          <>
            <SubTitle>Outras denúncias sobre o mesmo ({d.otherReports.length})</SubTitle>
            {d.otherReports.map((o: any) => (
              <Card key={o.id}>
                <View style={u.between}>
                  <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>{labelOf(catalog.reportCategories, o.category) || o.category}</Text>
                  <Badge label={labelOf(catalog.reportStatus, o.status) || o.status} color={REPORT_STATUS_COLOR[o.status] ?? "#757575"} />
                </View>
                <Text style={{ marginTop: 2 }} numberOfLines={2}>
                  {o.description}
                </Text>
                <Text style={u.muted}>
                  {o.reporterName} · {formatDate(o.createdAt)}
                </Text>
                <Btn small kind="outline" label="Abrir" onPress={() => navigation.push("BoReport", { id: o.id })} />
              </Card>
            ))}
          </>
        ) : null}

        {!canModerate && OPEN.includes(r.status) ? (
          <Card>
            <Text style={u.muted}>Pode ver esta denúncia, mas só quem tem a permissão de moderar a pode decidir.</Text>
          </Card>
        ) : null}

        {canModerate && d.canDecide ? (
          <>
            <SubTitle>Ações</SubTitle>
            <View style={u.row}>
              {!r.assignedName || r.status === "ABERTA" ? <Btn small label="🙋 Assumir" onPress={() => run(() => assignBoReport(id), "Não foi possível assumir a denúncia.")} disabled={busy} /> : null}
              <Btn small kind="outline" label="📝 Juntar nota" onPress={() => open("note")} />
              <Btn small label="⚖️ Decidir" onPress={() => open("decide")} />
            </View>
          </>
        ) : null}

        {canModerate && !d.canDecide ? (
          <View style={u.row}>
            <Btn small kind="outline" label="📝 Juntar nota" onPress={() => open("note")} />
          </View>
        ) : null}

        {panel === "note" ? (
          <Card>
            <Field label="Nota interna (só a equipa vê)" value={text} onChangeText={setText} multiline placeholder="Ex: Falei com o vendedor e confirmou que o preço estava errado." />
            <View style={u.row}>
              <Btn label={busy ? "A guardar..." : "Guardar nota"} onPress={saveNote} disabled={busy} />
              <Btn kind="outline" label="Cancelar" onPress={() => setPanel("")} />
            </View>
          </Card>
        ) : null}

        {panel === "decide" ? (
          <Card>
            <Text style={u.strong}>Decidir esta denúncia</Text>
            <ChipGroup
              label="Decisão"
              options={decisions.map((x) => ({ ...x, icon: DECISION_ICON[x.value] }))}
              value={decision}
              onChange={setDecision}
            />
            {decision ? <Text style={[u.muted, { marginTop: 4 }]}>{DECISION_HELP[decision]}</Text> : null}

            {decision === "SUSPENDER" ? (
              <>
                <Text style={u.label}>Por quantos dias?</Text>
                <View style={u.row}>
                  {DAY_OPTIONS.map((n) => (
                    <Chip key={n} label={`${n} dia${n > 1 ? "s" : ""}`} active={days === n} onPress={() => setDays(n)} />
                  ))}
                </View>
              </>
            ) : null}

            <Field
              label="Explicação (fica no histórico)"
              value={text}
              onChangeText={setText}
              multiline
              placeholder="Ex: O produto vende uma substância proibida. Removido conforme as regras."
            />
            <View style={u.row}>
              <Btn kind={decision === "BLOQUEAR" ? "danger" : "primary"} label={busy ? "A guardar..." : "Confirmar decisão"} onPress={decide} disabled={busy} />
              <Btn kind="outline" label="Cancelar" onPress={() => setPanel("")} />
            </View>
          </Card>
        ) : null}

        {!d.canDecide ? (
          <Card>
            <Text style={u.strong}>
              ⚖️ {labelOf(catalog.reportDecisions, r.decision) || "Decidida"}
              {r.decidedName ? ` por ${r.decidedName}` : ""}
            </Text>
            {r.decisionNote ? <Text style={{ marginTop: 4 }}>{r.decisionNote}</Text> : null}
            {r.decidedAt ? <Text style={u.muted}>{formatDateTime(r.decidedAt)}</Text> : null}
          </Card>
        ) : null}

        <SubTitle>Andamento ({d.events.length})</SubTitle>
        {d.events.length === 0 ? (
          <Text style={u.muted}>Ainda ninguém mexeu nesta denúncia.</Text>
        ) : (
          d.events.map((e: any) => (
            <Card key={e.id}>
              <Text style={u.strong}>
                {REPORT_EVENT_ICON[e.kind] ?? "•"} {e.authorName}
              </Text>
              {e.message ? <Text style={{ marginTop: 2, lineHeight: 20 }}>{e.message}</Text> : null}
              <Text style={u.muted}>{formatDateTime(e.createdAt)}</Text>
            </Card>
          ))
        )}
      </Page>
    </AdminLayout>
  );
}
