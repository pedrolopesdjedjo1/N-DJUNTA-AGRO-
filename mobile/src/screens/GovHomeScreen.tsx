import React, { useCallback } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { GovLayout } from "../components/MerchantTabs";
import { Page, Title, SubTitle, Card, Badge, Btn, useLoader, u } from "../components/ui";
import { getGovHome } from "../api/gov";
import { useNgoCatalog, labelOf } from "../utils/ngoCatalog";
import { useGovCatalog } from "../utils/govCatalog";
import { ALERT_COLOR, VERIFICATION_STATUS } from "../constants/ngo";
import { REPORT_ICON } from "../constants/gov";
import { formatNumber } from "../utils/format";
import { formatDate } from "../constants/market";

const EMPTY = {
  organization: { name: null as string | null, institutionType: null as string | null, verificationStatus: "NAO_ENVIADO", isVerified: false },
  programs: { total: 0, active: 0, inProgress: 0, completed: 0, byStatus: {} as Record<string, number> },
  projects: { total: 0, active: 0, inProgress: 0, completed: 0, byStatus: {} as Record<string, number> },
  communities: { registered: 0, reached: 0 },
  beneficiaries: { total: 0, registrations: 0 },
  requests: { newForMe: 0, open: 0, urgent: 0 },
  opportunities: { open: 0, pendingApplications: 0 },
  needs: { open: 0, urgent: 0 },
  indicators: { farmers: 0, fishers: 0, cooperatives: 0, productsListed: 0, ordersMonth: 0, publicProjects: 0, activeAlerts: 0 },
  alerts: [] as any[],
  recentUpdates: [] as any[],
  recentReports: [] as any[],
  unreadNotifications: 0,
};

type MenuItem = [string, string, string, Record<string, any>?];

const MENU: MenuItem[] = [
  ["📋", "Programas e projetos", "GovProjects"],
  ["🌾", "Agricultura", "GovArea", { area: "AGRICULTURA" }],
  ["🎣", "Pesca", "GovArea", { area: "PESCA" }],
  ["🧺", "Artesanato e pequenos negócios", "GovArea", { area: "ARTESANATO" }],
  ["📢", "Oportunidades públicas", "NgoOpportunities"],
  ["📍", "Mapa do território", "GovMap"],
  ["📊", "Dados e estatísticas", "GovData"],
  ["🌦️", "Clima e alertas", "GovWeather"],
  ["📣", "Comunicação oficial", "GovCommunication"],
  ["🤝", "Parceiros", "NgoPartners"],
  ["📝", "Pedidos e denúncias", "GovReports"],
  ["📚", "Formação", "NgoTrainings"],
  ["🏛️", "Serviços públicos", "GovServices"],
  ["🏗️", "Infraestruturas, mercados e zonas", "GovPlaces"],
  ["🏘️", "Comunidades atendidas", "NgoCommunities"],
  ["💬", "Mensagens", "Conversations"],
  ["🔔", "Notificações", "Notifications"],
  ["🏛️", "Perfil da instituição", "GovProfile"],
  ["✅", "Verificação oficial", "GovVerification"],
  ["🆘", "Suporte", "Support"],
  ["🌐", "Idioma", "Language"],
  ["⚙️", "Configurações", "Settings"],
];

function openTarget(navigation: any, target: { screen: string; id?: string }) {
  switch (target.screen) {
    case "sos":
      return navigation.navigate("RescueSos");
    case "reports":
      return navigation.navigate("GovReports");
    case "project":
      return navigation.navigate("NgoProject", { id: target.id });
    case "program":
      return navigation.navigate("GovProgram", { id: target.id });
    case "alerts":
      return navigation.navigate("GovAlerts");
    case "opportunities":
      return navigation.navigate("NgoOpportunities");
    case "places":
      return navigation.navigate("GovPlaces");
    case "services":
      return navigation.navigate("GovServices");
    case "training":
      return navigation.navigate("NgoTrainings");
    case "verification":
      return navigation.navigate("GovVerification");
    default:
      return undefined;
  }
}

export default function GovHomeScreen({ navigation }: any) {
  const ngo = useNgoCatalog();
  const gov = useGovCatalog();
  const loader = useLoader(getGovHome, EMPTY);
  const d: any = loader.data;

  useFocusEffect(
    useCallback(() => {
      loader.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const verification = VERIFICATION_STATUS[d.organization.verificationStatus] ?? VERIFICATION_STATUS.NAO_ENVIADO;

  const tiles: [string, number, string, Record<string, any>?][] = [
    ["📋 Programas ativos", d.programs.active, "GovProjects"],
    ["🏗️ Projetos ativos", d.projects.active, "GovProjects", { tab: "projects" }],
    ["🏘️ Comunidades atendidas", d.communities.reached, "NgoCommunities"],
    ["👥 Beneficiários", d.beneficiaries.total, "NgoBeneficiaries"],
    ["🙋 Novos pedidos dos cidadãos", d.requests.newForMe, "GovReports"],
    ["📢 Oportunidades abertas", d.opportunities.open, "NgoOpportunities"],
  ];

  const indicators: [string, number][] = [
    ["🌾 Agricultores no app", d.indicators.farmers],
    ["🎣 Pescadores no app", d.indicators.fishers],
    ["🤝 Cooperativas", d.indicators.cooperatives],
    ["📦 Produtos à venda", d.indicators.productsListed],
    ["🛒 Vendas concluídas (30 dias)", d.indicators.ordersMonth],
    ["📋 Projetos públicos", d.indicators.publicProjects],
    ["🚨 Alertas oficiais ativos", d.indicators.activeAlerts],
  ];

  return (
    <GovLayout active="GovHome">
      <Page loader={loader}>
        <Title>🏛️ {d.organization.name ?? "A minha instituição"}</Title>

        <View style={u.row}>
          <Badge label={d.organization.isVerified ? "Instituição verificada ✅" : `Verificação: ${verification.label}`} color={d.organization.isVerified ? "#2E7D32" : verification.color} />
          {d.organization.institutionType ? (
            <View style={{ marginLeft: 8 }}>
              <Badge label={labelOf(gov.institutionTypes, d.organization.institutionType)} color="#00838F" />
            </View>
          ) : null}
          {d.unreadNotifications > 0 ? (
            <View style={{ marginLeft: 8 }}>
              <Badge label={`🔔 ${d.unreadNotifications}`} color="#C62828" />
            </View>
          ) : null}
        </View>

        <View style={u.row}>
          <Btn small label="➕ Criar programa" onPress={() => navigation.navigate("GovProgramForm")} />
          <Btn small kind="outline" label="➕ Criar projeto" onPress={() => navigation.navigate("NgoProjectForm")} />
          <Btn small kind="outline" label="🚨 Criar alerta" onPress={() => navigation.navigate("GovAlertForm")} />
        </View>

        <View style={u.grid}>
          {tiles.map(([label, value, route, routeParams]) => (
            <TouchableOpacity key={label} style={u.tile} onPress={() => navigation.navigate(route, routeParams)}>
              <View style={u.tileBox}>
                <Text style={u.tileValue}>{formatNumber(value)}</Text>
                <Text style={u.tileLabel}>{label}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <SubTitle>⚠️ Alertas importantes</SubTitle>
        {d.alerts.length === 0 ? (
          <Text style={u.muted}>Tudo em dia. Nenhum alerta por agora.</Text>
        ) : (
          d.alerts.map((a: any) => (
            <TouchableOpacity key={a.key} activeOpacity={0.85} onPress={() => openTarget(navigation, a.target)}>
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

        <SubTitle>📋 Resumo dos programas</SubTitle>
        <Card>
          <Text style={u.strong}>
            {d.programs.total} programa(s) · {d.programs.inProgress} em andamento · {d.programs.completed} concluído(s)
          </Text>
          {ngo.projectStatus.map((s) => (
            <View key={s.value} style={[u.between, { marginTop: 4 }]}>
              <Text>{s.label}</Text>
              <Text style={{ fontWeight: "bold" }}>{d.programs.byStatus[s.value] ?? 0}</Text>
            </View>
          ))}
          <View style={u.row}>
            <Btn small kind="outline" label="Ver programas" onPress={() => navigation.navigate("GovProjects")} />
            <Btn small kind="outline" label="Programas públicos" onPress={() => navigation.navigate("GovPublicPrograms")} />
          </View>
        </Card>

        <SubTitle>🙋 Novos pedidos das comunidades</SubTitle>
        {d.recentReports.length === 0 ? (
          <Text style={u.muted}>Não há pedidos novos.</Text>
        ) : (
          d.recentReports.map((r: any) => (
            <TouchableOpacity key={r.id} activeOpacity={0.85} onPress={() => navigation.navigate("GovReport", { id: r.id })}>
              <Card>
                <View style={u.between}>
                  <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>
                    {REPORT_ICON[r.category] ?? "📝"} {r.title}
                  </Text>
                  {r.priority === "URGENTE" ? <Badge label="Urgente" color="#C62828" /> : null}
                </View>
                <Text style={u.muted}>
                  {labelOf(gov.reportCategories, r.category)}
                  {r.region ? ` · 📍 ${r.region}` : ""}
                </Text>
                <Text style={u.muted}>
                  {r.protocol} · {formatDate(r.createdAt)}
                  {r.isOpenRequest ? " · aberto a todas as instituições" : ""}
                </Text>
              </Card>
            </TouchableOpacity>
          ))
        )}
        <Btn small kind="outline" label="📝 Ver todos os pedidos e denúncias" onPress={() => navigation.navigate("GovReports")} />

        <SubTitle>📊 Indicadores principais</SubTitle>
        <View style={u.grid}>
          {indicators.map(([label, value]) => (
            <TouchableOpacity key={label} style={u.tile} onPress={() => navigation.navigate("GovData")}>
              <View style={u.tileBox}>
                <Text style={u.tileValue}>{formatNumber(value)}</Text>
                <Text style={u.tileLabel}>{label}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
        <Btn small kind="outline" label="📊 Ver dados e estatísticas" onPress={() => navigation.navigate("GovData")} />

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
    </GovLayout>
  );
}
