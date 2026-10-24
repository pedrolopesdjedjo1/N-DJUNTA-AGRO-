import React, { useCallback, useState } from "react";
import { View, Text, TouchableOpacity, Linking, Image } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { AgentLayout } from "../components/AgentTabs";
import { Page, Title, Card, Badge, Btn, Chip, Empty, Field, useLoader, u } from "../components/ui";
import ChipGroup from "../components/ChipGroup";
import { listAgentClients } from "../api/agent";
import { useAgentCatalog } from "../utils/agentCatalog";
import { LINK_STATUS_COLOR, ROLE_ICON, ROLE_NAME } from "../constants/agent";
import { whatsappUrl } from "../utils/links";
import { formatDate } from "../constants/market";

const EMPTY = {
  counts: { ATIVO: 0, PENDENTE_ACEITACAO: 0, REVOGADO: 0, RECUSADO: 0, total: 0 } as Record<string, number>,
  byKind: {} as Record<string, number>,
  items: [] as any[],
};

type Tab = "ATIVO" | "PENDENTE_ACEITACAO" | "REVOGADO";

export default function AgentClientsScreen({ navigation }: any) {
  const catalog = useAgentCatalog();
  const [tab, setTab] = useState<Tab>("ATIVO");
  const [kind, setKind] = useState("");
  const [text, setText] = useState("");
  const [q, setQ] = useState("");

  const loader = useLoader(() => listAgentClients({ status: tab, kind, q }), EMPTY, [tab, kind, q]);
  const d: any = loader.data;

  useFocusEffect(
    useCallback(() => {
      loader.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  return (
    <AgentLayout active="AgentClients">
      <Page loader={loader}>
        <Title>👥 Clientes e utilizadores</Title>
        <Text style={u.muted}>As pessoas que acompanha: clientes, agricultores, pescadores, artesãos e comerciantes.</Text>

        <View style={u.row}>
          <Btn small label="➕ Registar pessoa nova" onPress={() => navigation.navigate("AgentClientForm")} />
          <Btn small kind="outline" label="✉️ Convidar quem já tem conta" onPress={() => navigation.navigate("AgentInvite")} />
        </View>
        <View style={u.row}>
          <Btn small kind="outline" label="🌱 Produtores da plataforma" onPress={() => navigation.navigate("AgentProducers")} />
          <Btn small kind="outline" label="🤝 Sessões de ajuda" onPress={() => navigation.navigate("AgentSessions")} />
        </View>

        <View style={u.row}>
          <Chip label={`Ativos (${d.counts.ATIVO ?? 0})`} active={tab === "ATIVO"} onPress={() => setTab("ATIVO")} />
          <Chip label={`Convites (${d.counts.PENDENTE_ACEITACAO ?? 0})`} active={tab === "PENDENTE_ACEITACAO"} onPress={() => setTab("PENDENTE_ACEITACAO")} />
          <Chip label={`Retirados (${d.counts.REVOGADO ?? 0})`} active={tab === "REVOGADO"} onPress={() => setTab("REVOGADO")} />
        </View>

        <Field
          placeholder="Procurar por nome, telefone ou localidade"
          value={text}
          onChangeText={setText}
          onSubmitEditing={() => setQ(text.trim())}
          returnKeyType="search"
        />

        <ChipGroup
          label="Tipo de pessoa"
          options={catalog.clientKinds.map((k) => ({ value: k.value, label: `${ROLE_ICON[k.value] ?? ""} ${k.label} (${d.byKind[k.value] ?? 0})`.trim() }))}
          value={kind}
          onChange={setKind}
          allowEmpty
          scroll
        />

        {d.items.length === 0 && !loader.loading ? (
          <Empty
            text={
              d.counts.total === 0
                ? "Ainda não tem clientes. Registe a primeira pessoa ou envie um convite."
                : "Ninguém com estes filtros."
            }
          />
        ) : (
          d.items.map((c: any) => {
            const wa = whatsappUrl(c.client.phone);
            return (
              <TouchableOpacity key={c.id} activeOpacity={0.85} onPress={() => navigation.navigate("AgentClient", { id: c.id })}>
                <Card>
                  <View style={[u.row, { alignItems: "center" }]}>
                    {c.client.photoUrl ? (
                      <Image source={{ uri: c.client.photoUrl }} style={[u.photo, { width: 44, height: 44, borderRadius: 22 }]} />
                    ) : (
                      <View style={[u.photo, { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" }]}>
                        <Text style={{ fontSize: 20 }}>{ROLE_ICON[c.client.role] ?? "👤"}</Text>
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={u.strong}>
                        {c.client.name} {c.client.isVerified ? "✅" : ""}
                      </Text>
                      <Text style={u.muted}>{ROLE_NAME[c.client.role] ?? c.client.role}</Text>
                    </View>
                    <Badge label={tab === "ATIVO" ? "Ativo" : tab === "PENDENTE_ACEITACAO" ? "Convite" : "Retirado"} color={LINK_STATUS_COLOR[c.status] ?? "#757575"} />
                  </View>

                  {c.client.location ? <Text style={[u.muted, { marginTop: 4 }]}>📍 {c.client.location}</Text> : null}
                  {c.client.phone ? <Text style={u.muted}>📞 {c.client.phone}</Text> : null}
                  <Text style={u.muted}>
                    {c.lastContactAt ? `Último contacto: ${formatDate(c.lastContactAt)}` : "Sem contactos registados"}
                  </Text>

                  <View style={[u.row, { marginTop: 4 }]}>
                    {c.openOrders > 0 ? <Badge label={`📦 ${c.openOrders} encomenda(s) em aberto`} color="#EF6C00" /> : null}
                  </View>

                  {tab === "ATIVO" ? (
                    <View style={u.row}>
                      <Btn small kind="outline" label="💬 Mensagem" onPress={() => navigation.navigate("Chat", { userId: c.client.id, userName: c.client.name })} />
                      {c.client.phone ? <Btn small kind="outline" label="📞 Ligar" onPress={() => Linking.openURL(`tel:${c.client.phone}`)} /> : null}
                      {wa ? <Btn small kind="outline" label="WhatsApp" onPress={() => Linking.openURL(wa)} /> : null}
                    </View>
                  ) : null}
                </Card>
              </TouchableOpacity>
            );
          })
        )}
      </Page>
    </AgentLayout>
  );
}
