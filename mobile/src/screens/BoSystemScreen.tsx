import React from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import { useAuth } from "../context/AuthContext";
import AdminLayout from "../components/admin/AdminLayout";
import { Page, Title, SubTitle, Card, Badge, Btn, u } from "../components/ui";
import { boSessionEnd } from "../api/backoffice";
import { adminCan, clearAdminSession, getAdminMeCache, setAdminBlocked } from "../utils/adminSession";
import { LEVEL_COLOR } from "../constants/backoffice";
import { getApiErrorMessage } from "../api/errorMessage";

type Item = [string, string, string, string[]];

const SECTIONS: { title: string; items: Item[] }[] = [
  {
    title: "Utilizadores e perfis",
    items: [
      ["👥", "Utilizadores", "BoUsers", ["users.view"]],
      ["🏷️", "Perfis por tipo", "BoProfiles", ["profiles.view"]],
      ["🆔", "Verificação de identidade", "BoIdentity", ["users.verify"]],
      ["🤝", "Agentes", "AdminAgents", ["users.manage"]],
      ["🚩", "Denúncias e moderação", "BoReports", ["reports.view"]],
    ],
  },
  {
    title: "Mercado e operações",
    items: [
      ["🛒", "Mercado e produtos", "BoMarket", ["market.view"]],
      ["📦", "Encomendas", "BoOrders", ["orders.view"]],
      ["⚖️", "Disputas", "BoDisputes", ["orders.view"]],
      ["🚚", "Transportes e entregas", "BoTransport", ["transport.view"]],
      ["✅", "Verificar transportadores", "BoTransportVerification", ["transport.manage"]],
    ],
  },
  {
    title: "Financeiro",
    items: [
      ["💰", "Vendas e pagamentos", "BoFinance", ["finance.view"]],
      ["↩️", "Reembolsos", "BoRefunds", ["finance.view"]],
    ],
  },
  {
    title: "Organizações",
    items: [
      ["🤲", "Cooperativas", "BoCoops", ["coops.manage", "profiles.view"]],
      ["🌍", "ONGs e instituições", "BoOrgs", ["orgs.manage", "profiles.view", "gov.view"]],
      ["🏛️", "Governo e serviços públicos", "BoGov", ["gov.view", "orgs.manage"]],
    ],
  },
  {
    title: "Conteúdo e comunicação",
    items: [
      ["📢", "Conteúdo e destaques", "BoContent", ["content.manage"]],
      ["🎪", "Eventos", "BoEvents", ["events.manage", "content.manage"]],
      ["📣", "Avisos às pessoas", "BoBroadcasts", ["notify.send", "alerts.manage"]],
      ["🌦️", "Clima e alertas", "BoAlerts", ["alerts.manage", "notify.send", "gov.view"]],
      ["🎧", "Suporte", "BoSupport", ["support.view"]],
    ],
  },
  {
    title: "Relatórios",
    items: [["📊", "Relatórios e estatísticas", "BoStats", ["stats.view"]]],
  },
  {
    title: "Segurança e sistema",
    items: [
      ["🔐", "A minha segurança", "BoSecurity", []],
      ["🧾", "Registo de atividades", "BoAudit", []],
      ["👨‍💼", "Equipa de administradores", "BoTeam", ["team.manage"]],
      ["⚙️", "Configurações do sistema", "BoSettings", []],
    ],
  },
];

export default function BoSystemScreen({ navigation }: any) {
  const { logout } = useAuth();
  const me = getAdminMeCache();

  async function endSession() {
    try {
      await boSessionEnd();
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível terminar a sessão no servidor. Ela termina sozinha."));
    } finally {
      clearAdminSession();
      // Com o 2FA ativo, a próxima tela volta a pedir o código
      if (me?.twoFactorEnabled) setAdminBlocked("SESSION");
    }
  }

  return (
    <AdminLayout active="BoSystem">
      <Page>
        <Title>⚙️ Sistema</Title>

        {me ? (
          <Card>
            <View style={u.between}>
              <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>
                {me.levelIcon} {me.name}
              </Text>
              <Badge label={me.levelLabel} color={LEVEL_COLOR[me.level] ?? "#1565C0"} />
            </View>
            {me.title ? <Text style={u.muted}>{me.title}</Text> : null}
            <Text style={u.muted}>
              {me.twoFactorEnabled ? "🔐 Autenticação de dois fatores ativa" : "⚠️ Sem autenticação de dois fatores"}
              {me.legacy ? " · conta antiga com controlo total" : ""}
            </Text>
          </Card>
        ) : null}

        {SECTIONS.map((section) => {
          const items = section.items.filter(([, , , perms]) => adminCan(...perms));
          if (items.length === 0) return null;

          return (
            <View key={section.title}>
              <SubTitle>{section.title}</SubTitle>
              <View style={u.grid}>
                {items.map(([icon, label, route]) => (
                  <TouchableOpacity key={route} style={u.tile} onPress={() => navigation.navigate(route)}>
                    <View style={u.tileBox}>
                      <Text style={{ fontSize: 22 }}>{icon}</Text>
                      <Text style={[u.strong, { marginTop: 4 }]}>{label}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          );
        })}

        <SubTitle>Sessão</SubTitle>
        <View style={u.row}>
          <Btn small kind="outline" label="Terminar a sessão de administrador" onPress={endSession} />
          <Btn small kind="outline" label="⬅️ Voltar ao app" onPress={() => navigation.goBack()} />
        </View>
        <Btn kind="danger" label="Sair da conta" onPress={logout} />
      </Page>
    </AdminLayout>
  );
}
