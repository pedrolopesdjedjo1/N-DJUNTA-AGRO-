import React from "react";
import { View, Text, Image } from "react-native";
import { Page, Title, SubTitle, Card, Badge, Btn, Empty, useLoader, u } from "../components/ui";
import ProgressBar from "../components/ProgressBar";
import MediaGallery from "../components/ngo/MediaGallery";
import { getPublicProject } from "../api/ngo";
import { useNgoCatalog, iconOf, labelOf } from "../utils/ngoCatalog";
import { PROJECT_STATUS_COLOR, colorOf } from "../constants/ngo";
import { formatNumber } from "../utils/format";
import { formatDate, formatDateTime } from "../constants/market";

// Projeto de uma organização, visto por qualquer pessoa (sem o orçamento)
export default function NgoPublicProjectScreen({ navigation, route }: any) {
  const id: string = route?.params?.id;
  const catalog = useNgoCatalog();
  const loader = useLoader(() => getPublicProject(id), null as any, [id]);
  const bundle: any = loader.data;

  if (!bundle) {
    return (
      <Page loader={loader}>
        <Title>Projeto</Title>
        <Empty text="A carregar..." />
      </Page>
    );
  }

  const p = bundle.project;
  const org = bundle.organization;
  const orgName = org?.name ?? "Organização";

  return (
    <Page loader={loader}>
      {p.coverUrl ? <Image source={{ uri: p.coverUrl }} style={{ width: "100%", height: 170, borderRadius: 10 }} /> : null}

      <View style={[u.between, { marginTop: 8 }]}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Title>{p.name}</Title>
        </View>
        <Badge label={labelOf(catalog.projectStatus, p.status)} color={colorOf(PROJECT_STATUS_COLOR, p.status)} />
      </View>

      <Text style={u.muted}>
        {iconOf(catalog.areas, p.area)} {labelOf(catalog.areas, p.area)}
        {p.focus ? ` · ${labelOf(catalog.focus[p.area] ?? [], p.focus)}` : ""}
      </Text>

      <Card>
        <View style={u.row}>
          {org?.logoUrl ? <Image source={{ uri: org.logoUrl }} style={[u.photo, { width: 48, height: 48, borderRadius: 24 }]} /> : null}
          <View style={{ flex: 1 }}>
            <Text style={u.muted}>Organização</Text>
            <Text style={u.strong}>{orgName}</Text>
          </View>
        </View>
        <View style={u.row}>
          <Btn small label="Ver organização" onPress={() => navigation.navigate("NgoPublicOrganization", { id: p.ownerId })} />
          <Btn
            small
            kind="outline"
            label="💬 Contactar"
            onPress={() => navigation.navigate("Chat", { userId: p.ownerId, userName: orgName })}
          />
          <Btn
            small
            kind="outline"
            label="🙋 Pedir apoio"
            onPress={() => navigation.navigate("NgoRequestForm", { organizationId: p.ownerId, organizationName: orgName })}
          />
        </View>
      </Card>

      <Card>
        {p.region ? <Text>📍 {p.region}</Text> : null}
        {p.communities?.length > 0 ? <Text style={u.muted}>🏘️ Comunidades: {p.communities.join(", ")}</Text> : null}
        {p.startDate || p.endDate ? (
          <Text style={u.muted}>
            🗓️ {p.startDate ? formatDate(p.startDate) : "—"} a {p.endDate ? formatDate(p.endDate) : "—"}
          </Text>
        ) : null}
        <Text style={[u.muted, { marginTop: 4 }]}>
          👥 {p.beneficiaries}
          {p.targetBeneficiaries ? ` de ${p.targetBeneficiaries}` : ""} pessoa(s) apoiada(s)
        </Text>
        {p.progress !== null && p.progress !== undefined ? (
          <View style={{ marginTop: 8 }}>
            <Text style={u.muted}>Progresso: {p.progress}%</Text>
            <ProgressBar percent={p.progress} color="#2E7D32" />
          </View>
        ) : null}
      </Card>

      {p.description ? (
        <>
          <SubTitle>Sobre o projeto</SubTitle>
          <Text style={{ lineHeight: 21 }}>{p.description}</Text>
        </>
      ) : null}

      {p.objectives ? (
        <>
          <SubTitle>Objetivos</SubTitle>
          <Text style={{ lineHeight: 21 }}>{p.objectives}</Text>
        </>
      ) : null}

      {bundle.results.length > 0 ? (
        <>
          <SubTitle>Resultados</SubTitle>
          <Card>
            {bundle.results.map((r: any) => (
              <View key={r.id} style={[u.between, { marginTop: 4 }]}>
                <Text style={{ flex: 1, marginRight: 8 }}>{r.indicatorLabel}</Text>
                <Text style={{ fontWeight: "bold" }}>
                  {formatNumber(r.value)} {r.unit ?? ""}
                </Text>
              </View>
            ))}
          </Card>
        </>
      ) : null}

      {bundle.media.length > 0 ? (
        <>
          <SubTitle>Fotos e vídeos</SubTitle>
          <MediaGallery media={bundle.media} />
        </>
      ) : null}

      {bundle.updates.length > 0 ? (
        <>
          <SubTitle>Atualizações</SubTitle>
          {bundle.updates.map((x: any) => (
            <Card key={x.id}>
              <Text style={u.strong}>{x.title}</Text>
              <Text style={u.muted}>{formatDateTime(x.createdAt)}</Text>
              {x.body ? <Text style={{ marginTop: 6, lineHeight: 21 }}>{x.body}</Text> : null}
            </Card>
          ))}
        </>
      ) : null}
    </Page>
  );
}
