import React, { useCallback, useState } from "react";
import { View, Text, Image, Alert, Linking } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { AgentLayout } from "../components/AgentTabs";
import { Page, Title, SubTitle, Card, Badge, Btn, Empty, Field, useLoader, u } from "../components/ui";
import ChipGroup from "../components/ChipGroup";
import {
  getMyAgentProfile,
  submitAgentProfile,
  addAgentDocument,
  deleteAgentDocument,
  listAgentActivities,
} from "../api/agent";
import { getGovRegions } from "../api/gov";
import { pickImage, uploadImageBase64 } from "../utils/storage";
import { useAgentCatalog } from "../utils/agentCatalog";
import { labelOf } from "../utils/ngoCatalog";
import { ACTIVITY_ICON, AGENT_STATUS_COLOR } from "../constants/agent";
import { whatsappUrl } from "../utils/links";
import { getApiErrorMessage } from "../api/errorMessage";
import { SUPPORT, formatDate, formatDateTime } from "../constants/market";

const EMPTY = { data: null as any, regions: [] as { key: string; name: string }[], activities: [] as any[] };

export default function AgentProfileScreen({ navigation }: any) {
  const { logout } = useAuth();
  const catalog = useAgentCatalog();

  const loader = useLoader(
    async () => {
      const [data, regions, activities] = await Promise.all([
        getMyAgentProfile(),
        getGovRegions().catch(() => [] as any[]),
        listAgentActivities({ limit: 8 }).catch(() => [] as any[]),
      ]);
      return { data, regions: regions.map((r: any) => ({ key: r.key, name: r.name })), activities };
    },
    EMPTY
  );
  const d: any = loader.data;
  const data: any = d.data;

  const [busy, setBusy] = useState(false);
  const [docOpen, setDocOpen] = useState(false);
  const [docKind, setDocKind] = useState("IDENTIFICACAO");
  const [docName, setDocName] = useState("");
  const [docBusy, setDocBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loader.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  if (!data) {
    return (
      <AgentLayout active="AgentProfile">
        <Page loader={loader}>
          <Title>👤 Meu perfil</Title>
          <Empty text="A carregar..." />
        </Page>
      </AgentLayout>
    );
  }

  const p = data.profile;
  const user = data.user;
  const regionNames = (p.regions as string[]).map((k) => d.regions.find((r: any) => r.key === k)?.name ?? k);
  const wa = whatsappUrl(p.whatsapp);
  const canSubmit = (p.status === "RASCUNHO" || p.status === "RECUSADO") && data.checklist.canSubmit;

  function reload(next: any) {
    loader.setData({ ...d, data: next });
  }

  async function submit() {
    setBusy(true);
    try {
      reload(await submitAgentProfile());
      Alert.alert("Enviado", "A equipa do NÔDJUNTA AGRO vai analisar o seu perfil. Receberá um aviso com a resposta.");
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível enviar o perfil."));
    } finally {
      setBusy(false);
    }
  }

  async function addDocument(fromCamera: boolean) {
    if (docName.trim().length < 2) {
      Alert.alert("Atenção", "Escreva primeiro o nome do documento (ex: Bilhete de identidade).");
      return;
    }
    const picked = await pickImage(fromCamera);
    if (!picked) return;

    setDocBusy(true);
    try {
      const url = await uploadImageBase64(picked.base64, "doc-agente-");
      reload(await addAgentDocument({ kind: docKind, name: docName.trim(), url }));
      setDocName("");
      setDocOpen(false);
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível juntar o documento."));
    } finally {
      setDocBusy(false);
    }
  }

  function removeDocument(doc: any) {
    Alert.alert("Apagar documento", `Apagar "${doc.name}"?`, [
      { text: "Não", style: "cancel" },
      {
        text: "Apagar",
        style: "destructive",
        onPress: async () => {
          try {
            reload(await deleteAgentDocument(doc.id));
          } catch (e) {
            Alert.alert("Erro", getApiErrorMessage(e, "Não foi possível apagar."));
          }
        },
      },
    ]);
  }

  return (
    <AgentLayout active="AgentProfile">
      <Page loader={loader}>
        <Title>👤 Meu perfil</Title>

        <View style={[u.row, { alignItems: "center" }]}>
          {user.photoUrl ? (
            <Image source={{ uri: user.photoUrl }} style={[u.photo, { width: 84, height: 84, borderRadius: 42 }]} />
          ) : (
            <View style={[u.photo, { width: 84, height: 84, borderRadius: 42, alignItems: "center", justifyContent: "center" }]}>
              <Text style={{ fontSize: 34 }}>🤝</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: "bold" }}>{user.name}</Text>
            <Text style={u.muted}>{labelOf(catalog.agentTypes, p.agentType)}</Text>
            {user.location ? <Text style={u.muted}>📍 {user.location}</Text> : null}
            <View style={[u.row, { marginTop: 4 }]}>
              <Badge label={labelOf(catalog.agentStatus, p.status) || p.status} color={AGENT_STATUS_COLOR[p.status] ?? "#757575"} />
              {user.isVerified ? (
                <View style={{ marginLeft: 8 }}>
                  <Badge label="Verificado ✅" color="#2E7D32" />
                </View>
              ) : null}
            </View>
            {data.rating.average ? <Text style={[u.muted, { marginTop: 4 }]}>⭐ {data.rating.average} ({data.rating.count} avaliação(ões))</Text> : <Text style={u.muted}>Ainda sem avaliações</Text>}
          </View>
        </View>

        <View style={u.row}>
          <Btn small label="✏️ Editar perfil" onPress={() => navigation.navigate("AgentProfileForm")} />
          <Btn small kind="outline" label="🛡️ Segurança" onPress={() => navigation.navigate("AgentSecurity")} />
          <Btn small kind="outline" label="👁️ Ver como os clientes veem" onPress={() => navigation.navigate("AgentPublic", { id: user.id })} />
        </View>

        {p.status === "PENDENTE" ? (
          <Card>
            <Text style={u.strong}>⏳ Perfil em análise</Text>
            <Text style={u.muted}>A equipa está a analisar os seus dados. Receberá um aviso com a resposta.</Text>
          </Card>
        ) : null}
        {p.status === "APROVADO" ? (
          <Card>
            <Text style={u.strong}>✅ Conta de agente aprovada</Text>
            <Text style={u.muted}>Já pode registar pessoas e ajudar nas contas dos seus clientes.</Text>
          </Card>
        ) : null}
        {p.status === "RECUSADO" || p.status === "SUSPENSO" ? (
          <Card>
            <Text style={{ color: "#C62828", fontWeight: "bold" }}>{p.status === "SUSPENSO" ? "Conta suspensa" : "Perfil recusado"}</Text>
            {p.statusNote ? <Text style={{ marginTop: 4 }}>Motivo: {p.statusNote}</Text> : null}
            <Text style={u.muted}>{p.status === "SUSPENSO" ? "Fale com a equipa do NÔDJUNTA AGRO." : "Corrija o que for preciso e envie de novo."}</Text>
          </Card>
        ) : null}

        {p.status !== "APROVADO" && p.status !== "PENDENTE" && p.status !== "SUSPENSO" ? (
          <>
            <SubTitle>O que falta</SubTitle>
            <Card>
              {data.checklist.items.map((item: any) => (
                <Text key={item.key} style={{ marginTop: 4, color: item.done ? "#2E7D32" : "#C62828" }}>
                  {item.done ? "✓" : "✗"} {item.label}
                </Text>
              ))}
              <Btn
                label={busy ? "A enviar..." : p.status === "RECUSADO" ? "Enviar de novo para verificação" : "Enviar para verificação"}
                onPress={submit}
                disabled={busy || !canSubmit}
              />
              {!canSubmit ? <Text style={u.muted}>Complete o que falta (perfil e documento) para poder enviar.</Text> : null}
            </Card>
          </>
        ) : null}

        <View style={u.grid}>
          {(
            [
              ["👥 Clientes ativos", data.stats.activeClients],
              ["✉️ Convites pendentes", data.stats.pendingInvites],
              ["📋 Total de clientes", data.stats.totalClients],
            ] as [string, number][]
          ).map(([label, value]) => (
            <View key={label} style={u.tile}>
              <View style={u.tileBox}>
                <Text style={u.tileValue}>{value}</Text>
                <Text style={u.tileLabel}>{label}</Text>
              </View>
            </View>
          ))}
        </View>

        <SubTitle>Sobre mim</SubTitle>
        {p.bio ? <Text style={{ lineHeight: 21 }}>{p.bio}</Text> : <Text style={u.muted}>Ainda sem apresentação. Toque em Editar perfil.</Text>}

        <SubTitle>Área de atuação</SubTitle>
        <Card>
          <Text style={u.muted}>Áreas</Text>
          <View style={u.row}>
            {(p.areas as string[]).length === 0 ? <Text style={u.muted}>Ainda não escolheu.</Text> : null}
            {(p.areas as string[]).map((a) => (
              <Badge key={a} label={labelOf(catalog.agentAreas, a)} color="#00838F" />
            ))}
          </View>
          <Text style={[u.muted, { marginTop: 8 }]}>Regiões onde atua</Text>
          <View style={u.row}>
            {regionNames.length === 0 ? <Text style={u.muted}>Ainda não escolheu.</Text> : null}
            {regionNames.map((r) => (
              <Badge key={r} label={r} color="#1565C0" />
            ))}
          </View>
        </Card>

        <SubTitle>Contactos</SubTitle>
        <Card>
          {user.phone ? <Text>📞 {user.phone}</Text> : <Text style={u.muted}>Sem telefone.</Text>}
          {p.whatsapp ? <Text style={u.muted}>WhatsApp: {p.whatsapp}</Text> : null}
          {p.serviceAddress ? <Text style={u.muted}>🏠 Ponto de atendimento: {p.serviceAddress}</Text> : null}
          {p.schedule ? <Text style={u.muted}>🕒 {p.schedule}</Text> : null}
          <View style={u.row}>
            {user.phone ? <Btn small kind="outline" label="📞 Ligar" onPress={() => Linking.openURL(`tel:${user.phone}`)} /> : null}
            {wa ? <Btn small kind="outline" label="WhatsApp" onPress={() => Linking.openURL(wa)} /> : null}
            <Btn small kind="outline" label="🗺️ No mapa" onPress={() => navigation.navigate("AgentMap")} />
          </View>
        </Card>

        <SubTitle>Permissões da conta</SubTitle>
        <Card>
          <Text>{p.canRegister ? "✅" : "⛔"} Registar pessoas novas</Text>
          <Text>{p.canAssist ? "✅" : "⛔"} Ajudar nas contas dos clientes</Text>
          <Text>{p.commissionRate > 0 ? `💰 Comissão de ${p.commissionRate}%` : "💰 Sem comissão"}</Text>
          <Text style={[u.muted, { marginTop: 4 }]}>É a equipa do NÔDJUNTA AGRO que define estas permissões.</Text>
        </Card>

        <SubTitle>Documentos ({data.documents.length})</SubTitle>
        <Text style={u.muted}>Só você e a equipa os veem. Envie fotos legíveis, só o necessário.</Text>
        {data.documents.length === 0 ? (
          <Empty text="Ainda não juntou documentos." />
        ) : (
          data.documents.map((doc: any) => (
            <Card key={doc.id}>
              <Text style={u.strong}>{doc.name}</Text>
              <Text style={u.muted}>
                {labelOf(catalog.documentKinds, doc.kind)} · {formatDate(doc.createdAt)}
              </Text>
              <View style={u.row}>
                <Btn small kind="outline" label="Abrir" onPress={() => Linking.openURL(doc.url)} />
                <Btn small kind="danger" label="Apagar" onPress={() => removeDocument(doc)} />
              </View>
            </Card>
          ))
        )}
        <Btn small kind="outline" label={docOpen ? "Fechar" : "➕ Juntar documento"} onPress={() => setDocOpen(!docOpen)} />
        {docOpen ? (
          <Card>
            <ChipGroup label="Tipo de documento" options={catalog.documentKinds} value={docKind} onChange={setDocKind} />
            <Field label="Nome do documento" value={docName} onChangeText={setDocName} placeholder="Ex: Bilhete de identidade" />
            <View style={u.row}>
              <Btn small kind="outline" label="📷 Foto da galeria" onPress={() => addDocument(false)} disabled={docBusy} />
              <Btn small kind="outline" label="📸 Tirar foto" onPress={() => addDocument(true)} disabled={docBusy} />
            </View>
            {docBusy ? <Text style={u.muted}>A enviar o documento...</Text> : null}
          </Card>
        ) : null}

        <SubTitle>Histórico de atividades</SubTitle>
        {d.activities.length === 0 ? (
          <Empty text="Ainda não há atividade registada." />
        ) : (
          d.activities.map((a: any) => (
            <Card key={a.id}>
              <Text style={u.strong}>
                {ACTIVITY_ICON[a.kind] ?? "•"} {labelOf(catalog.activityKinds, a.kind) || a.kind}
              </Text>
              {a.message ? <Text style={{ marginTop: 2 }}>{a.message}</Text> : null}
              <Text style={u.muted}>
                {a.clientName ? `${a.clientName} · ` : ""}
                {formatDateTime(a.createdAt)}
              </Text>
            </Card>
          ))
        )}
        <Btn small kind="outline" label="Ver todo o histórico" onPress={() => navigation.navigate("AgentActivity")} />

        <SubTitle>Suporte NÔDJUNTA AGRO</SubTitle>
        {SUPPORT.phones.map((phone: string) => (
          <Card key={phone}>
            <Text style={u.strong}>📞 {phone}</Text>
            <View style={u.row}>
              <Btn small label="Ligar" onPress={() => Linking.openURL(`tel:${phone}`)} />
              <Btn small kind="outline" label="💬 WhatsApp" onPress={() => Linking.openURL(`https://wa.me/245${phone}`)} />
            </View>
          </Card>
        ))}
        <Card>
          <Text style={u.strong}>📧 {SUPPORT.email}</Text>
          <Btn small label="Enviar e-mail" onPress={() => Linking.openURL(`mailto:${SUPPORT.email}`)} />
        </Card>

        <View style={u.row}>
          <Btn small kind="outline" label="🆘 Suporte e chamados" onPress={() => navigation.navigate("AgentSupport")} />
          <Btn small kind="outline" label="⚙️ Configurações" onPress={() => navigation.navigate("Settings")} />
          <Btn small kind="outline" label="🌐 Idioma" onPress={() => navigation.navigate("Language")} />
        </View>

        <Btn kind="danger" label="Sair da conta" onPress={logout} />
      </Page>
    </AgentLayout>
  );
}
