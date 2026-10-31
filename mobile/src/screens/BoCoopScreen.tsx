import React, { useCallback, useEffect, useState } from "react";
import { View, Text, Alert, Linking } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import AdminLayout from "../components/admin/AdminLayout";
import { Page, Title, SubTitle, Card, Badge, Btn, Chip, Empty, Field, useLoader, u } from "../components/ui";
import { getBoCoop, editBoCoop, reviewBoCoop } from "../api/backoffice";
import { getGovRegions } from "../api/gov";
import { useBoCatalog } from "../utils/boCatalog";
import { adminCan } from "../utils/adminSession";
import { labelOf } from "../utils/ngoCatalog";
import { COOP_STATUS_COLOR } from "../constants/backofficeOrgs";
import { BO_ROLE_ICON } from "../constants/backoffice";
import { whatsappUrl } from "../utils/links";
import { getApiErrorMessage } from "../api/errorMessage";
import { money, formatDate, formatDateTime } from "../constants/market";

type Panel = "" | "APROVAR" | "RECUSAR" | "SUSPENDER" | "REATIVAR" | "edit";

const TITLE: Record<string, string> = {
  APROVAR: "Aprovar a cooperativa",
  RECUSAR: "Recusar a cooperativa",
  SUSPENDER: "Suspender a cooperativa",
  REATIVAR: "Reativar a cooperativa",
  edit: "Editar as informações",
};

export default function BoCoopScreen({ navigation, route }: any) {
  const id: string = route?.params?.id;
  const catalog = useBoCatalog();
  const loader = useLoader(() => getBoCoop(id), null as any, [id]);
  const d: any = loader.data;
  const canManage = adminCan("coops.manage");

  const [panel, setPanel] = useState<Panel>("");
  const [note, setNote] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [region, setRegion] = useState("");
  const [regions, setRegions] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getGovRegions()
      .then((list) => setRegions(list.map((r) => r.name)))
      .catch(() => {});
  }, []);

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
          <Title>Cooperativa</Title>
          <Empty text="A carregar..." />
        </Page>
      </AdminLayout>
    );
  }

  const c = d.cooperative;
  const leader = d.leader;
  const status = c.status;
  const leaderWa = whatsappUrl(leader?.phone);

  function open(next: Panel) {
    if (next === "edit") {
      setName(c.name);
      setDescription(c.description ?? "");
      setRegion(c.region ?? "");
    }
    setPanel(panel === next ? "" : next);
    setNote("");
  }

  async function run(work: () => Promise<any>, fail: string) {
    setBusy(true);
    try {
      loader.setData(await work());
      setPanel("");
      setNote("");
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, fail));
    } finally {
      setBusy(false);
    }
  }

  function submit() {
    if (panel === "edit") {
      if (name.trim().length < 3) return Alert.alert("Atenção", "Escreva o nome da cooperativa.");
      return run(() => editBoCoop(id, { name: name.trim(), description: description.trim(), region: region.trim() }), "Não foi possível guardar.");
    }

    const needsNote = panel === "RECUSAR" || panel === "SUSPENDER";
    if (needsNote && note.trim().length < 3) return Alert.alert("Atenção", "Explique o motivo. O líder vê.");
    return run(() => reviewBoCoop(id, { decision: panel, note: note.trim() || undefined }), "Não foi possível guardar a decisão.");
  }

  return (
    <AdminLayout active="BoSystem">
      <Page loader={loader}>
        <View style={u.between}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Title>🤲 {c.name}</Title>
          </View>
          <Badge label={labelOf(catalog.coopStatus, status) || status} color={COOP_STATUS_COLOR[status] ?? "#757575"} />
        </View>
        {c.region ? <Text style={u.muted}>📍 {c.region}</Text> : null}
        {c.createdAt ? <Text style={u.muted}>Criada em {formatDate(c.createdAt)}</Text> : null}

        {c.note ? (
          <Card>
            <Text style={u.strong}>Nota da equipa</Text>
            <Text style={{ marginTop: 2 }}>{c.note}</Text>
            {c.reviewedAt ? <Text style={u.muted}>{formatDateTime(c.reviewedAt)}</Text> : null}
          </Card>
        ) : null}

        {c.description ? (
          <>
            <SubTitle>Sobre a cooperativa</SubTitle>
            <Text style={{ lineHeight: 21 }}>{c.description}</Text>
          </>
        ) : null}

        <SubTitle>Líder</SubTitle>
        <Card>
          {leader ? (
            <>
              <Text style={u.strong}>
                {leader.name} {leader.isVerified ? "✅" : ""}
              </Text>
              {leader.location ? <Text style={u.muted}>📍 {leader.location}</Text> : null}
              {!leader.isActive ? <Text style={{ color: "#C62828" }}>Conta inativa</Text> : null}
              <View style={u.row}>
                <Btn small kind="outline" label="Ver a ficha" onPress={() => navigation.navigate("BoUser", { id: leader.id })} />
                <Btn small kind="outline" label="💬 Mensagem" onPress={() => navigation.navigate("Chat", { userId: leader.id, userName: leader.name })} />
                {leader.phone ? <Btn small kind="outline" label="📞 Ligar" onPress={() => Linking.openURL(`tel:${leader.phone}`)} /> : null}
                {leaderWa ? <Btn small kind="outline" label="WhatsApp" onPress={() => Linking.openURL(leaderWa)} /> : null}
              </View>
            </>
          ) : (
            <Text style={u.muted}>Esta cooperativa não tem líder indicado.</Text>
          )}
        </Card>

        {canManage ? (
          <>
            <SubTitle>Decisão e edição</SubTitle>
            <View style={u.row}>
              {status !== "APROVADA" ? <Btn small label="✅ Aprovar" onPress={() => open("APROVAR")} /> : null}
              {status === "SEM_ANALISE" ? <Btn small kind="outline" label="Recusar" onPress={() => open("RECUSAR")} /> : null}
              {status !== "SUSPENSA" ? <Btn small kind="danger" label="⛔ Suspender" onPress={() => open("SUSPENDER")} /> : null}
              {status === "SUSPENSA" ? <Btn small label="🔓 Reativar" onPress={() => open("REATIVAR")} /> : null}
              <Btn small kind="outline" label="✏️ Editar" onPress={() => open("edit")} />
            </View>
            <Text style={u.muted}>O líder recebe uma notificação com cada decisão.</Text>
          </>
        ) : null}

        {panel ? (
          <Card>
            <Text style={u.strong}>{TITLE[panel]}</Text>

            {panel === "edit" ? (
              <>
                <Field label="Nome" value={name} onChangeText={setName} />
                <Field label="Descrição" value={description} onChangeText={setDescription} multiline />
                <Field label="Região" value={region} onChangeText={setRegion} placeholder="Ex: Gabú" />
                {regions.length > 0 ? (
                  <View style={u.row}>
                    {regions.map((r) => (
                      <Chip key={r} label={r} active={region === r} onPress={() => setRegion(r)} />
                    ))}
                  </View>
                ) : null}
              </>
            ) : (
              <Field
                label={panel === "RECUSAR" || panel === "SUSPENDER" ? "Motivo (o líder vê)" : "Nota (opcional)"}
                value={note}
                onChangeText={setNote}
                multiline
              />
            )}

            <View style={u.row}>
              <Btn kind={panel === "SUSPENDER" ? "danger" : "primary"} label={busy ? "A guardar..." : "Confirmar"} onPress={submit} disabled={busy} />
              <Btn kind="outline" label="Cancelar" onPress={() => setPanel("")} />
            </View>
          </Card>
        ) : null}

        <SubTitle>Atividade (últimos 30 dias)</SubTitle>
        <View style={u.grid}>
          {(
            [
              ["👥 Membros", c.members],
              ["🛍️ Produtos à venda", d.activity.products],
              ["🧾 Vendas", d.activity.sales30],
              ["💰 Valor vendido", money(d.activity.value30)],
            ] as [string, any][]
          ).map(([label, value]) => (
            <View key={label} style={u.tile}>
              <View style={u.tileBox}>
                <Text style={[u.tileValue, { fontSize: 15 }]}>{value}</Text>
                <Text style={u.tileLabel}>{label}</Text>
              </View>
            </View>
          ))}
        </View>
        <Text style={u.muted}>Conta os produtos e as vendas do líder e dos membros.</Text>

        <SubTitle>Membros ({d.memberList.length})</SubTitle>
        {d.memberList.length === 0 ? (
          <Text style={u.muted}>Sem membros registados.</Text>
        ) : (
          d.memberList.map((m: any) => (
            <Card key={m.id}>
              <View style={u.between}>
                <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>
                  {BO_ROLE_ICON[m.role ?? ""] ?? "👤"} {m.name} {m.isVerified ? "✅" : ""}
                </Text>
              </View>
              {m.location ? <Text style={u.muted}>📍 {m.location}</Text> : null}
              {m.joinedAt ? <Text style={u.muted}>Membro desde {formatDate(m.joinedAt)}</Text> : null}
              {m.userId ? <Btn small kind="outline" label="Ver a ficha" onPress={() => navigation.navigate("BoUser", { id: m.userId })} /> : null}
            </Card>
          ))
        )}

        {d.regionProjects.length > 0 ? (
          <>
            <SubTitle>Projetos de ONGs e do governo na região</SubTitle>
            {d.regionProjects.map((p: any) => (
              <Card key={p.id}>
                <Text style={u.strong}>📋 {p.title}</Text>
                {p.status ? <Text style={u.muted}>{p.status}</Text> : null}
              </Card>
            ))}
            <Text style={u.muted}>As cooperativas ainda não estão ligadas diretamente a projetos: mostramos os da mesma região.</Text>
          </>
        ) : null}

        <SubTitle>Histórico de decisões</SubTitle>
        {d.history.length === 0 ? (
          <Text style={u.muted}>A equipa ainda não tomou decisões sobre esta cooperativa.</Text>
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
      </Page>
    </AdminLayout>
  );
}
