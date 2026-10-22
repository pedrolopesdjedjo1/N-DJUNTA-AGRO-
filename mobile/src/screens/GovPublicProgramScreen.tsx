import React from "react";
import { View, Text, Image } from "react-native";
import { useAuth } from "../context/AuthContext";
import { Page, Title, SubTitle, Card, Badge, Btn, Empty, useLoader, u } from "../components/ui";
import ProgressBar from "../components/ProgressBar";
import { getPublicProgram } from "../api/gov";
import { useNgoCatalog, iconOf, labelOf } from "../utils/ngoCatalog";
import { PROJECT_STATUS_COLOR, colorOf } from "../constants/ngo";
import { formatNumber } from "../utils/format";
import { formatDate } from "../constants/market";

// Programa do Governo, visto por qualquer pessoa (sem o orçamento)
export default function GovPublicProgramScreen({ navigation, route }: any) {
  const id: string = route?.params?.id;
  const { user } = useAuth();
  const catalog = useNgoCatalog();
  const loader = useLoader(() => getPublicProgram(id), null as any, [id]);
  const d: any = loader.data;

  if (!d) {
    return (
      <Page loader={loader}>
        <Title>Programa</Title>
        <Empty text="A carregar..." />
      </Page>
    );
  }

  const p = d.program;
  const org = d.organization;
  const orgName = org?.name ?? "Instituição";
  const isMe = user?.id === p.ownerId;
  const hasTarget = !!p.targetBeneficiaries && p.targetBeneficiaries > 0;
  const percent = hasTarget ? Math.min(100, Math.round(((p.beneficiaries ?? 0) / p.targetBeneficiaries) * 100)) : null;

  return (
    <Page loader={loader}>
      <View style={u.between}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Title>{p.name}</Title>
        </View>
        <Badge label={labelOf(catalog.projectStatus, p.status)} color={colorOf(PROJECT_STATUS_COLOR, p.status)} />
      </View>
      <Text style={u.muted}>
        {iconOf(catalog.areas, p.area)} {labelOf(catalog.areas, p.area)}
      </Text>

      <Card>
        <View style={[u.row, { alignItems: "center" }]}>
          {org?.logoUrl ? <Image source={{ uri: org.logoUrl }} style={{ width: 44, height: 44, borderRadius: 22, marginRight: 10 }} /> : null}
          <View style={{ flex: 1 }}>
            <Text style={u.muted}>Instituição responsável</Text>
            <Text style={u.strong}>
              {orgName} {org?.isVerified ? "✅" : ""}
            </Text>
          </View>
        </View>
        <View style={u.row}>
          <Btn small kind="outline" label="Ver instituição" onPress={() => navigation.navigate("NgoPublicOrganization", { id: p.ownerId })} />
          {!isMe ? (
            <>
              <Btn small kind="outline" label="💬 Contactar" onPress={() => navigation.navigate("Chat", { userId: p.ownerId, userName: orgName })} />
              <Btn
                small
                kind="outline"
                label="🙋 Pedir apoio"
                onPress={() => navigation.navigate("GovReportForm", { institutionId: p.ownerId, institutionName: orgName, category: "PEDIDO_APOIO" })}
              />
            </>
          ) : null}
        </View>
      </Card>

      <Card>
        <Text>📍 {p.regions && p.regions.length > 0 ? p.regions.join(", ") : "Todo o país"}</Text>
        {p.startDate || p.endDate ? (
          <Text style={u.muted}>
            🗓️ {p.startDate ? formatDate(p.startDate) : "—"} a {p.endDate ? formatDate(p.endDate) : "—"}
          </Text>
        ) : null}
        <Text style={[u.muted, { marginTop: 4 }]}>
          📋 {p.projectsCount} projeto(s) · 👥 {formatNumber(p.beneficiaries)}
          {hasTarget ? ` de ${formatNumber(p.targetBeneficiaries)}` : ""} pessoa(s) apoiada(s)
        </Text>
        {percent !== null ? <ProgressBar percent={percent} /> : null}
      </Card>

      {p.description ? (
        <>
          <SubTitle>Sobre o programa</SubTitle>
          <Text style={{ lineHeight: 21 }}>{p.description}</Text>
        </>
      ) : null}
      {p.objectives ? (
        <>
          <SubTitle>Objetivos</SubTitle>
          <Text style={{ lineHeight: 21 }}>{p.objectives}</Text>
        </>
      ) : null}

      {d.results.length > 0 ? (
        <>
          <SubTitle>Resultados</SubTitle>
          <Card>
            {d.results.map((r: any) => (
              <View key={`${r.indicator}-${r.label}`} style={[u.between, { marginTop: 4 }]}>
                <Text style={{ flex: 1, marginRight: 8 }}>{r.label}</Text>
                <Text style={{ fontWeight: "bold" }}>
                  {formatNumber(r.value)} {r.unit}
                </Text>
              </View>
            ))}
          </Card>
        </>
      ) : null}

      <SubTitle>Projetos do programa ({d.projects.length})</SubTitle>
      {d.projects.length === 0 ? (
        <Empty text="Ainda não há projetos públicos neste programa." />
      ) : (
        d.projects.map((pr: any) => (
          <Card key={pr.id}>
            <View style={u.between}>
              <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>{pr.name}</Text>
              <Badge label={labelOf(catalog.projectStatus, pr.status)} color={colorOf(PROJECT_STATUS_COLOR, pr.status)} />
            </View>
            <Text style={u.muted}>
              {labelOf(catalog.areas, pr.area)}
              {pr.region ? ` · 📍 ${pr.region}` : ""} · 👥 {pr.beneficiaries}
            </Text>
            <Btn small kind="outline" label="Ver projeto" onPress={() => navigation.navigate(isMe ? "NgoProject" : "NgoPublicProject", { id: pr.id })} />
          </Card>
        ))
      )}
    </Page>
  );
}
