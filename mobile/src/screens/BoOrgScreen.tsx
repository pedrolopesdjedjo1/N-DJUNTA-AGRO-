import React, { useCallback, useState } from "react";
import { View, Text, Alert, Linking } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import AdminLayout from "../components/admin/AdminLayout";
import HideControl from "../components/admin/HideControl";
import { Page, Title, SubTitle, Card, Badge, Btn, Chip, Empty, Field, useLoader, u } from "../components/ui";
import { getBoOrg, suspendBoOrg, reactivateBoOrg, notifyBoOrg, hideBoOrgContent, restoreBoOrgContent } from "../api/backoffice";
import { useBoCatalog } from "../utils/boCatalog";
import { adminCan } from "../utils/adminSession";
import { labelOf } from "../utils/ngoCatalog";
import { CONTENT_KIND_ICON, ORG_STATUS_COLOR, orgStatusLabel } from "../constants/backofficeOrgs";
import { SANCTION_COLOR } from "../constants/backoffice";
import { whatsappUrl } from "../utils/links";
import { getApiErrorMessage } from "../api/errorMessage";
import { formatDate, formatDateTime } from "../constants/market";

type Panel = "" | "suspend" | "reactivate" | "notify";

const DAY_OPTIONS = [3, 7, 15, 30, 90];

export default function BoOrgScreen({ navigation, route }: any) {
  const userId: string = route?.params?.userId;
  const catalog = useBoCatalog();
  const loader = useLoader(() => getBoOrg(userId), null as any, [userId]);
  const d: any = loader.data;
  const canManage = adminCan("orgs.manage");

  const [panel, setPanel] = useState<Panel>("");
  const [days, setDays] = useState(7);
  const [permanent, setPermanent] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loader.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId])
  );

  if (!d) {
    return (
      <AdminLayout active="BoSystem">
        <Page loader={loader}>
          <Title>Organização</Title>
          <Empty text="A carregar..." />
        </Page>
      </AdminLayout>
    );
  }

  const user = d.user;
  const org = d.organization;
  const sanction = d.activeSanction;
  const isGov = String(user.role) === "GOVERNO";
  const wa = whatsappUrl(user.phone);

  function open(next: Panel) {
    setPanel(panel === next ? "" : next);
    setText("");
    setDays(7);
    setPermanent(false);
  }

  async function run(work: () => Promise<any>, fail: string, done?: string) {
    setBusy(true);
    try {
      const r = await work();
      if (r?.user) loader.setData(r);
      else loader.reload();
      setPanel("");
      setText("");
      if (done) Alert.alert("Pronto", done);
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, fail));
    } finally {
      setBusy(false);
    }
  }

  function submit() {
    const note = text.trim();

    if (panel === "notify") {
      if (note.length < 5) return Alert.alert("Atenção", "Escreva a mensagem (pelo menos 5 letras).");
      return run(() => notifyBoOrg(userId, note), "Não foi possível enviar o aviso.", "A organização recebeu o aviso como notificação.");
    }
    if (panel === "reactivate") {
      if (note.length < 3) return Alert.alert("Atenção", "Explique porque o acesso volta.");
      return run(() => reactivateBoOrg(userId, { note }), "Não foi possível reativar o acesso.");
    }

    if (note.length < 5) return Alert.alert("Atenção", "Explique o motivo (pelo menos 5 letras). A organização vê.");
    return Alert.alert(
      permanent ? "Bloquear o acesso" : "Suspender o acesso",
      `${org?.name ?? user.name} deixa de poder usar o app${permanent ? " sem prazo" : ` durante ${days} dias`}. Continuar?`,
      [
        { text: "Não", style: "cancel" },
        { text: "Continuar", style: "destructive", onPress: () => run(() => suspendBoOrg(userId, { reason: note, permanent, days: permanent ? undefined : days }), "Não foi possível suspender o acesso.") },
      ]
    );
  }

  function contentBlock(title: string, kind: string, list: any[]) {
    return (
      <>
        <SubTitle>
          {CONTENT_KIND_ICON[kind]} {title} ({list.length})
        </SubTitle>
        {list.length === 0 ? (
          <Text style={u.muted}>Nada publicado.</Text>
        ) : (
          list.map((c: any) => (
            <Card key={c.id}>
              <View style={u.between}>
                <Text style={[u.strong, { flex: 1, marginRight: 8 }]} numberOfLines={2}>
                  {c.title}
                </Text>
                {c.hidden ? <Badge label="Escondido" color="#C62828" /> : null}
              </View>
              <Text style={u.muted}>
                {c.type ? `${c.type} · ` : ""}
                {c.status ? `${c.status} · ` : ""}
                {formatDate(c.createdAt)}
              </Text>
              {canManage || adminCan("content.manage") ? (
                <HideControl
                  hidden={c.hidden}
                  onHide={(reason) => hideBoOrgContent({ kind, refId: c.id, reason })}
                  onRestore={(reason) => restoreBoOrgContent({ kind, refId: c.id, reason })}
                  onDone={() => loader.reload()}
                />
              ) : null}
            </Card>
          ))
        )}
      </>
    );
  }

  return (
    <AdminLayout active="BoSystem">
      <Page loader={loader}>
        <View style={u.between}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Title>
              {isGov ? "🏛️" : "🌍"} {org?.name ?? user.name}
            </Title>
          </View>
          <Badge label={sanction ? "Suspensa" : org ? orgStatusLabel(org.status) : "Sem perfil"} color={sanction ? SANCTION_COLOR[sanction.kind] ?? "#C62828" : ORG_STATUS_COLOR[org?.status ?? "SEM_PERFIL"] ?? "#757575"} />
        </View>
        {org?.acronym ? <Text style={u.muted}>{org.acronym}</Text> : null}

        {sanction ? (
          <Card>
            <Text style={{ color: "#C62828", fontWeight: "bold" }}>{sanction.kind === "BLOQUEIO" ? "⛔ Acesso bloqueado" : "⏳ Acesso suspenso"}</Text>
            <Text style={{ marginTop: 4 }}>Motivo: {sanction.reason}</Text>
            <Text style={u.muted}>
              Desde {formatDateTime(sanction.startsAt)}
              {sanction.endsAt ? ` · termina em ${formatDateTime(sanction.endsAt)}` : " · sem prazo"}
            </Text>
          </Card>
        ) : null}

        <Card>
          <Text style={u.strong}>{user.name}</Text>
          <Text style={u.muted}>Responsável pela conta</Text>
          {user.location ? <Text style={u.muted}>📍 {user.location}</Text> : null}
          {user.phone ? <Text style={u.muted}>📞 {user.phone}</Text> : null}
          <Text style={u.muted}>Conta criada em {formatDate(user.createdAt)}</Text>
          {org?.region ? <Text style={u.muted}>Região: {org.region}</Text> : null}
          {org?.institutionType ? <Text style={u.muted}>Tipo: {org.institutionType}</Text> : null}
          {org?.note ? <Text style={[u.muted, { marginTop: 4 }]}>📝 {org.note}</Text> : null}
          <View style={u.row}>
            <Btn small kind="outline" label="Ver a ficha da conta" onPress={() => navigation.navigate("BoUser", { id: userId })} />
            <Btn small kind="outline" label="💬 Mensagem" onPress={() => navigation.navigate("Chat", { userId, userName: user.name })} />
            {user.phone ? <Btn small kind="outline" label="📞 Ligar" onPress={() => Linking.openURL(`tel:${user.phone}`)} /> : null}
            {wa ? <Btn small kind="outline" label="WhatsApp" onPress={() => Linking.openURL(wa)} /> : null}
          </View>
        </Card>

        {org?.description ? (
          <>
            <SubTitle>Sobre a organização</SubTitle>
            <Text style={{ lineHeight: 21 }}>{org.description}</Text>
          </>
        ) : null}

        {canManage ? (
          <>
            <SubTitle>Ações</SubTitle>
            <View style={u.row}>
              <Btn small kind="outline" label="🆔 Verificar documentos" onPress={() => navigation.navigate("NgoAdminVerifications")} />
              <Btn small kind="outline" label="📣 Avisar" onPress={() => open("notify")} />
              {!sanction ? <Btn small kind="danger" label="⛔ Suspender o acesso" onPress={() => open("suspend")} /> : <Btn small label="🔓 Reativar o acesso" onPress={() => open("reactivate")} />}
            </View>
          </>
        ) : null}

        {panel ? (
          <Card>
            <Text style={u.strong}>{panel === "suspend" ? "Suspender o acesso" : panel === "reactivate" ? "Reativar o acesso" : "Avisar a organização"}</Text>

            {panel === "suspend" ? (
              <>
                <View style={u.row}>
                  <Chip label="Com prazo" active={!permanent} onPress={() => setPermanent(false)} />
                  <Chip label="Sem prazo (bloqueio)" active={permanent} onPress={() => setPermanent(true)} />
                </View>
                {!permanent ? (
                  <View style={u.row}>
                    {DAY_OPTIONS.map((n) => (
                      <Chip key={n} label={`${n} dias`} active={days === n} onPress={() => setDays(n)} />
                    ))}
                  </View>
                ) : null}
                <Text style={u.muted}>A conta deixa de funcionar e os produtos à venda ficam escondidos.</Text>
              </>
            ) : null}

            <Field
              label={panel === "notify" ? "Mensagem (recebe como notificação)" : panel === "reactivate" ? "Porque o acesso volta" : "Motivo (a organização vê)"}
              value={text}
              onChangeText={setText}
              multiline
            />
            <View style={u.row}>
              <Btn kind={panel === "suspend" ? "danger" : "primary"} label={busy ? "A guardar..." : "Confirmar"} onPress={submit} disabled={busy} />
              <Btn kind="outline" label="Cancelar" onPress={() => setPanel("")} />
            </View>
          </Card>
        ) : null}

        <SubTitle>📄 Documentos ({d.documents.length})</SubTitle>
        {d.documents.length === 0 ? (
          <Text style={u.muted}>Sem documentos.</Text>
        ) : (
          d.documents.map((doc: any) => (
            <Card key={doc.id}>
              <Text style={u.strong}>{doc.name}</Text>
              <Text style={u.muted}>
                {doc.kind ?? "Documento"} · {formatDate(doc.createdAt)}
              </Text>
              {doc.url ? <Btn small kind="outline" label="Abrir documento" onPress={() => Linking.openURL(doc.url)} /> : null}
            </Card>
          ))
        )}

        {contentBlock("Projetos", "PROJECT", d.projects)}
        {contentBlock("Publicações", "PUBLICATION", d.publications)}
        {contentBlock("Oportunidades", "OPPORTUNITY", d.opportunities)}

        <SubTitle>Sanções ({d.sanctions.length})</SubTitle>
        {d.sanctions.length === 0 ? (
          <Text style={u.muted}>Nunca foi suspensa.</Text>
        ) : (
          d.sanctions.map((x: any) => (
            <Card key={x.id}>
              <View style={u.between}>
                <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>{x.kind === "BLOQUEIO" ? "Bloqueio" : "Suspensão"}</Text>
                <Badge label={x.status === "ATIVA" ? "Ativa" : "Terminada"} color={x.status === "ATIVA" ? SANCTION_COLOR[x.kind] ?? "#C62828" : "#757575"} />
              </View>
              <Text style={{ marginTop: 2 }}>{x.reason}</Text>
              <Text style={u.muted}>{formatDateTime(x.startsAt)}</Text>
            </Card>
          ))
        )}

        <SubTitle>Histórico de decisões</SubTitle>
        {d.history.length === 0 ? (
          <Text style={u.muted}>A equipa ainda não tomou decisões sobre esta conta.</Text>
        ) : (
          d.history.map((h: any) => (
            <Card key={h.id}>
              <Text style={u.strong}>{labelOf(catalog.auditActions, h.action) || h.action}</Text>
              <Text style={{ marginTop: 2 }}>{h.summary}</Text>
              <Text style={u.muted}>
                {h.adminName} · {formatDateTime(h.createdAt)}
              </Text>
            </Card>
          ))
        )}
        {d.note ? <Text style={[u.muted, { marginTop: 10 }]}>{d.note}</Text> : null}
      </Page>
    </AdminLayout>
  );
}
