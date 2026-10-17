import React, { useCallback } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { NgoLayout } from "../components/MerchantTabs";
import { Page, Title, SubTitle, Card, Badge, Btn, useLoader, u } from "../components/ui";
import { getNgoHome } from "../api/ngo";
import { ALERT_COLOR, VERIFICATION_STATUS } from "../constants/ngo";
import { formatDate } from "../constants/market";

const EMPTY = {
  organization: { name: null as string | null, verificationStatus: "NAO_ENVIADO", isVerified: false },
  projects: { total: 0, active: 0, inProgress: 0, completed: 0, byStatus: {} as Record<string, number> },
  communities: { registered: 0, reached: 0 },
  beneficiaries: { total: 0, registrations: 0 },
  opportunities: { open: 0, pendingApplications: 0 },
  requests: { newForMe: 0, open: 0 },
  needs: { open: 0, urgent: 0 },
  alerts: [] as any[],
  recentUpdates: [] as any[],
  unreadNotifications: 0,
};

type MenuItem = [string, string, string, Record<string, any>?];

const MENU: MenuItem[] = [
  ["📋", "Meus projetos", "NgoProjects"],
  ["🤝", "Apoio às comunidades", "NgoCommunities"],
  ["🌾", "Projetos agrícolas", "NgoAreaProjects", { area: "AGRICULTURA" }],
  ["🎣", "Projetos de pesca", "NgoAreaProjects", { area: "PESCA" }],
  ["🧺", "Artesanato e empreendedorismo", "NgoAreaProjects", { area: "ARTESANATO" }],
  ["📢", "Oportunidades", "NgoOpportunities"],
  ["💰", "Financiamento", "NgoFunding"],
  ["📊", "Monitoramento e resultados", "NgoMonitoring"],
  ["📍", "Mapa", "NgoMap"],
  ["🤝", "Parceiros", "NgoPartners"],
  ["📚", "Formação", "NgoTrainings"],
  ["📰", "Publicações", "NgoPublications"],
  ["💬", "Mensagens", "Conversations"],
  ["🔔", "Notificações", "Notifications"],
  ["🏢", "Perfil da ONG", "NgoProfile"],
  ["✅", "Verificação da organização", "NgoVerification"],
  ["🆘", "Suporte", "Support"],
  ["🌐", "Idioma", "Language"],
  ["⚙️", "Configurações", "Settings"],
];

function openAlert(navigation: any, target: { screen: string; id?: string }) {
  switch (target.screen) {
    case "verification":
      return navigation.navigate("NgoVerification");
    case "needs":
      return navigation.navigate("NgoNeeds");
    case "project":
      return navigation.navigate("NgoProject", { id: target.id });
    case "requests":
      return navigation.navigate("NgoRequests");
    case "opportunities":
      return navigation.navigate("NgoOpportunities");
    case "training":
      return navigation.navigate("NgoTrainings");
    case "funding":
      return navigation.navigate("NgoFunding");
    default:
      return undefined;
  }
}

export default function NgoHomeScreen({ navigation }: any) {
  const loader = useLoader(getNgoHome, EMPTY);
  const d: any = loader.data;

  useFocusEffect(
    useCallback(() => {
      loader.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const verification = VERIFICATION_STATUS[d.organization.verificationStatus] ?? VERIFICATION_STATUS.NAO_ENVIADO;

  const tiles: [string, string][] = [
    ["📋 Projetos ativos", String(d.projects.active)],
    ["▶️ Em andamento", String(d.projects.inProgress)],
    ["🏘️ Comunidades apoiadas", String(d.communities.reached)],
    ["👥 Beneficiários", String(d.beneficiaries.total)],
    ["📢 Oportunidades abertas", String(d.opportunities.open)],
    ["🙋 Novos pedidos de apoio", String(d.requests.newForMe)],
  ];

  return (
    <NgoLayout active="NgoHome">
      <Page loader={loader}>
        <Title>🌍 {d.organization.name ?? "A minha organização"}</Title>

        <View style={u.row}>
          <Badge label={verification.label} color={verification.color} />
          {d.unreadNotifications > 0 ? (
            <View style={{ marginLeft: 8 }}>
              <Badge label={`🔔 ${d.unreadNotifications}`} color="#C62828" />
            </View>
          ) : null}
        </View>

        <Btn label="➕ Criar projeto" onPress={() => navigation.navigate("NgoProjectForm")} />

        <View style={u.grid}>
          {tiles.map(([label, value]) => (
            <View key={label} style={u.tile}>
              <View style={u.tileBox}>
                <Text style={u.tileValue}>{value}</Text>
                <Text style={u.tileLabel}>{label}</Text>
              </View>
            </View>
          ))}
        </View>

        {d.requests.open > 0 ? (
          <Card>
            <Text style={u.strong}>🙋 {d.requests.open} pedido(s) de apoio aberto(s) a todas as organizações</Text>
            <Btn small kind="outline" label="Ver pedidos" onPress={() => navigation.navigate("NgoRequests")} />
          </Card>
        ) : null}

        <SubTitle>⚠️ Alertas importantes</SubTitle>
        {d.alerts.length === 0 ? (
          <Text style={u.muted}>Tudo em dia. Nenhum alerta por agora.</Text>
        ) : (
          d.alerts.map((a: any) => (
            <TouchableOpacity key={a.key} activeOpacity={0.85} onPress={() => openAlert(navigation, a.target)}>
              <Card>
                <View style={u.between}>
                  <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>{a.title}</Text>
                  <Badge label={a.level === "ALTA" ? "Urgente" : a.level === "MEDIA" ? "Atenção" : "Info"} color={ALERT_COLOR[a.level] ?? "#757575"} />
                </View>
                <Text style={u.muted}>{a.detail}</Text>
              </Card>
            </TouchableOpacity>
          ))
        )}

        <SubTitle>📝 Últimas atualizações de projetos</SubTitle>
        {d.recentUpdates.length === 0 ? (
          <Text style={u.muted}>Ainda não publicou atualizações.</Text>
        ) : (
          d.recentUpdates.map((x: any) => (
            <Card key={x.id}>
              <Text style={u.strong}>{x.title}</Text>
              <Text style={u.muted}>
                {x.projectName} · {formatDate(x.createdAt)}
                {x.progress !== null && x.progress !== undefined ? ` · ${x.progress}%` : ""}
              </Text>
              <Btn small kind="outline" label="Abrir projeto" onPress={() => navigation.navigate("NgoProject", { id: x.projectId })} />
            </Card>
          ))
        )}

        <SubTitle>Menu</SubTitle>
        <View style={u.grid}>
          {MENU.map(([icon, label, route, routeParams]) => (
            <TouchableOpacity key={`${route}-${label}`} style={u.tile} onPress={() => navigation.navigate(route, routeParams)}>
              <View style={u.tileBox}>
                <Text style={{ fontSize: 22 }}>{icon}</Text>
                <Text style={[u.strong, { marginTop: 4 }]}>{label}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </Page>
    </NgoLayout>
  );
}
