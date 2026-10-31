import React, { useCallback } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import AdminLayout from "../components/admin/AdminLayout";
import { Page, Title, SubTitle, useLoader, u } from "../components/ui";
import { getBoGovOverview } from "../api/backoffice";
import { adminCan } from "../utils/adminSession";
import { formatNumber } from "../utils/format";

const EMPTY = {
  institutions: { total: 0, active: 0, verified: 0, withoutProfile: 0 },
  programs: { total: 0 },
  services: { published: 0, hidden: 0 },
  places: [] as any[],
  alerts: { active: 0 },
  publications: { total: 0, communiques: 0 },
  requests: { total: 0, open: 0, stuck: 0, last7Days: 0 },
};

export default function BoGovScreen({ navigation }: any) {
  const loader = useLoader(getBoGovOverview, EMPTY);
  const d: any = loader.data;

  useFocusEffect(
    useCallback(() => {
      loader.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const perms = ["gov.view", "orgs.manage"];
  const menu: [string, string, string, Record<string, any> | undefined, string[]][] = [
    ["🏛️", "Instituições verificadas", "BoOrgs", { kind: "GOV" }, ["orgs.manage", "profiles.view", "gov.view"]],
    ["📋", "Programas", "BoGovList", { kind: "programs" }, perms],
    ["🏢", "Serviços públicos", "BoGovList", { kind: "services" }, perms],
    ["📢", "Publicações e comunicados", "BoGovList", { kind: "publications" }, perms],
    ["📨", "Pedidos das comunidades", "BoGovList", { kind: "requests" }, perms],
    ["🌦️", "Alertas oficiais", "BoAlerts", undefined, ["alerts.manage", "notify.send", "gov.view"]],
  ];

  return (
    <AdminLayout active="BoSystem">
      <Page loader={loader}>
        <Title>🏛️ Governo e serviços públicos</Title>
        <Text style={u.muted}>Acompanhe as instituições públicas, os seus programas, serviços e comunicados, e os pedidos das comunidades.</Text>

        <View style={u.grid}>
          {(
            [
              ["🏛️ Instituições", `${d.institutions.active} de ${d.institutions.total}`],
              ["✅ Verificadas", d.institutions.verified],
              ["📋 Programas", d.programs.total],
              ["🏢 Serviços publicados", d.services.published],
              ["🙈 Serviços escondidos", d.services.hidden],
              ["📢 Comunicados", d.publications.communiques],
              ["📨 Pedidos abertos", d.requests.open],
              ["⏳ Parados há +7 dias", d.requests.stuck],
              ["🚨 Alertas ativos", d.alerts.active],
            ] as [string, any][]
          ).map(([label, value]) => (
            <View key={label} style={u.tile}>
              <View style={u.tileBox}>
                <Text style={[u.tileValue, { fontSize: 15, color: label.includes("Parados") && Number(value) > 0 ? "#C62828" : undefined }]}>
                  {typeof value === "number" ? formatNumber(value) : value}
                </Text>
                <Text style={u.tileLabel}>{label}</Text>
              </View>
            </View>
          ))}
        </View>
        {d.institutions.withoutProfile > 0 ? (
          <Text style={{ color: "#EF6C00" }}>⚠️ {d.institutions.withoutProfile} instituição(ões) ainda sem perfil preenchido.</Text>
        ) : null}

        {d.places.length > 0 ? (
          <Text style={[u.muted, { marginTop: 6 }]}>
            Locais registados: {d.places.map((p: any) => `${p.count} ${String(p.kind).toLowerCase()}`).join(" · ")}
          </Text>
        ) : null}

        <SubTitle>Gestão</SubTitle>
        <View style={u.grid}>
          {menu
            .filter(([, , , , p]) => adminCan(...p))
            .map(([icon, label, route, params]) => (
              <TouchableOpacity key={`${route}-${label}`} style={u.tile} onPress={() => navigation.navigate(route, params)}>
                <View style={u.tileBox}>
                  <Text style={{ fontSize: 22 }}>{icon}</Text>
                  <Text style={[u.strong, { marginTop: 4 }]}>{label}</Text>
                </View>
              </TouchableOpacity>
            ))}
        </View>
      </Page>
    </AdminLayout>
  );
}
