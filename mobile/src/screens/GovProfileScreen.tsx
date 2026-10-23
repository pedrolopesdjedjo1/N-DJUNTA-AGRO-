import React, { useCallback } from "react";
import { View, Text, Image, Linking } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { GovLayout } from "../components/MerchantTabs";
import { Page, Title, SubTitle, Card, Badge, Btn, Empty, useLoader, u } from "../components/ui";
import GovProgramCard from "../components/gov/ProgramCard";
import { getOrganization, listNgoProjects } from "../api/ngo";
import { listPrograms, getMyServices } from "../api/gov";
import { useNgoCatalog, labelOf } from "../utils/ngoCatalog";
import { useGovCatalog } from "../utils/govCatalog";
import { PROJECT_STATUS_COLOR, VERIFICATION_STATUS, colorOf } from "../constants/ngo";
import { socialUrl, whatsappUrl } from "../utils/links";
import { SUPPORT, formatDate } from "../constants/market";

const EMPTY = { org: null as any, projects: [] as any[], programs: [] as any[], services: [] as any[] };

export default function GovProfileScreen({ navigation }: any) {
  const { logout } = useAuth();
  const ngo = useNgoCatalog();
  const gov = useGovCatalog();

  const loader = useLoader(
    async () => {
      const [org, projects, programs, services] = await Promise.all([
        getOrganization(),
        listNgoProjects(),
        listPrograms({}),
        getMyServices().catch(() => [] as any[]),
      ]);
      return { org, projects: (projects as any).projects, programs: (programs as any).programs, services };
    },
    EMPTY
  );

  useFocusEffect(
    useCallback(() => {
      loader.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const d: any = loader.data;
  const data: any = d.org;

  if (!data) {
    return (
      <GovLayout active="GovProfile">
        <Page loader={loader}>
          <Title>🏛️ Perfil da instituição</Title>
          <Empty text="A carregar..." />
        </Page>
      </GovLayout>
    );
  }

  const o = data.organization;
  const verification = VERIFICATION_STATUS[o.verificationStatus] ?? VERIFICATION_STATUS.NAO_ENVIADO;
  const projects: any[] = d.projects;
  const programs: any[] = d.programs;

  const missing: string[] = [];
  if (!o.logoUrl) missing.push("logo");
  if (!o.institutionType) missing.push("tipo de instituição");
  if (!o.description) missing.push("descrição");
  if (!o.region) missing.push("região");
  if (!o.phone && !o.email) missing.push("contactos");
  if (!o.responsibleName) missing.push("responsável");

  const facebook = socialUrl("facebook", o.facebook);
  const instagram = socialUrl("instagram", o.instagram);
  const whatsapp = whatsappUrl(o.whatsapp);

  return (
    <GovLayout active="GovProfile">
      <Page loader={loader}>
        <Title>🏛️ Perfil da instituição</Title>

        <View style={[u.row, { alignItems: "center" }]}>
          {o.logoUrl ? (
            <Image source={{ uri: o.logoUrl }} style={[u.photo, { width: 84, height: 84, borderRadius: 42 }]} />
          ) : (
            <View style={[u.photo, { width: 84, height: 84, borderRadius: 42, alignItems: "center", justifyContent: "center" }]}>
              <Text style={{ fontSize: 34 }}>🏛️</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: "bold" }}>
              {o.name}
              {o.acronym ? ` (${o.acronym})` : ""}
            </Text>
            {o.institutionType ? <Text style={u.muted}>{labelOf(gov.institutionTypes, o.institutionType)}</Text> : null}
            {o.parentInstitution ? <Text style={u.muted}>Sob a tutela de: {o.parentInstitution}</Text> : null}
            {o.region ? <Text style={u.muted}>📍 {o.region}</Text> : null}
            <View style={{ marginTop: 4 }}>
              <Badge label={data.isVerified ? "Instituição verificada ✅" : `Verificação: ${verification.label}`} color={data.isVerified ? "#2E7D32" : verification.color} />
            </View>
          </View>
        </View>

        <View style={u.row}>
          <Btn small label="✏️ Editar perfil" onPress={() => navigation.navigate("GovProfileForm")} />
          <Btn small kind="outline" label="✅ Verificação oficial" onPress={() => navigation.navigate("GovVerification")} />
          <Btn small kind="outline" label="👁️ Ver como os cidadãos veem" onPress={() => navigation.navigate("NgoPublicOrganization", { id: o.ownerId })} />
        </View>

        {!data.isVerified && o.verificationStatus === "NAO_ENVIADO" ? (
          <Card>
            <Text style={u.strong}>Peça o selo de instituição verificada ✅</Text>
            <Text style={u.muted}>Dá confiança aos cidadãos de que os avisos e os programas são oficiais.</Text>
            <Btn small label="Começar a verificação" onPress={() => navigation.navigate("GovVerification")} />
          </Card>
        ) : null}

        {missing.length > 0 ? (
          <Card>
            <Text style={u.strong}>Complete o perfil</Text>
            <Text style={u.muted}>Falta: {missing.join(", ")}.</Text>
          </Card>
        ) : null}

        <SubTitle>Sobre a instituição</SubTitle>
        {o.description ? <Text style={{ lineHeight: 21 }}>{o.description}</Text> : <Text style={u.muted}>Ainda sem descrição.</Text>}

        <SubTitle>Áreas de atuação</SubTitle>
        {o.areas && o.areas.length > 0 ? (
          <View style={u.row}>
            {o.areas.map((a: string) => (
              <Badge key={a} label={`${ngo.areas.find((x) => x.value === a)?.icon ?? ""} ${labelOf(ngo.areas, a)}`.trim()} color="#00838F" />
            ))}
          </View>
        ) : (
          <Text style={u.muted}>Ainda não escolheu as áreas de atuação.</Text>
        )}

        <SubTitle>Contactos e endereço</SubTitle>
        <Card>
          {o.address ? <Text>📍 {o.address}</Text> : null}
          {o.phone ? <Text style={u.muted}>📞 {o.phone}</Text> : null}
          {o.email ? <Text style={u.muted}>✉️ {o.email}</Text> : null}
          {o.website ? <Text style={u.muted}>🌐 {o.website}</Text> : null}
          {o.facebook ? <Text style={u.muted}>Facebook: {o.facebook}</Text> : null}
          {o.instagram ? <Text style={u.muted}>Instagram: {o.instagram}</Text> : null}
          {o.whatsapp ? <Text style={u.muted}>WhatsApp: {o.whatsapp}</Text> : null}
          {!o.address && !o.phone && !o.email && !o.website && !o.facebook && !o.instagram && !o.whatsapp ? (
            <Text style={u.muted}>Ainda sem contactos. Toque em Editar perfil.</Text>
          ) : null}

          <View style={u.row}>
            {o.phone ? <Btn small kind="outline" label="📞 Ligar" onPress={() => Linking.openURL(`tel:${o.phone}`)} /> : null}
            {o.email ? <Btn small kind="outline" label="✉️ E-mail" onPress={() => Linking.openURL(`mailto:${o.email}`)} /> : null}
            {whatsapp ? <Btn small kind="outline" label="💬 WhatsApp" onPress={() => Linking.openURL(whatsapp)} /> : null}
            {o.website ? <Btn small kind="outline" label="🌐 Website" onPress={() => Linking.openURL(o.website)} /> : null}
            {facebook ? <Btn small kind="outline" label="Facebook" onPress={() => Linking.openURL(facebook)} /> : null}
            {instagram ? <Btn small kind="outline" label="Instagram" onPress={() => Linking.openURL(instagram)} /> : null}
          </View>
        </Card>

        <SubTitle>Responsável</SubTitle>
        <Card>
          {o.responsibleName ? (
            <>
              <Text style={u.strong}>{o.responsibleName}</Text>
              {o.responsibleRole ? <Text style={u.muted}>{o.responsibleRole}</Text> : null}
              {o.responsiblePhone ? <Text style={u.muted}>📞 {o.responsiblePhone}</Text> : null}
              {o.responsibleEmail ? <Text style={u.muted}>✉️ {o.responsibleEmail}</Text> : null}
              <Text style={[u.muted, { marginTop: 4 }]}>Estes dados só aparecem a si e à equipa que faz a verificação.</Text>
            </>
          ) : (
            <Text style={u.muted}>Ainda não indicou o responsável. Preencha na verificação oficial.</Text>
          )}
          <Btn small kind="outline" label="Indicar ou mudar o responsável" onPress={() => navigation.navigate("GovVerification")} />
        </Card>

        <SubTitle>Programas ({programs.length})</SubTitle>
        {programs.length === 0 ? (
          <Empty text="Ainda não criou programas." />
        ) : (
          programs.slice(0, 4).map((p) => <GovProgramCard key={p.id} program={p} catalog={ngo} onPress={() => navigation.navigate("GovProgram", { id: p.id })} />)
        )}
        <View style={u.row}>
          <Btn small kind="outline" label="📋 Ver programas e projetos" onPress={() => navigation.navigate("GovProjects")} />
          <Btn small kind="outline" label="➕ Criar programa" onPress={() => navigation.navigate("GovProgramForm")} />
        </View>

        <SubTitle>Projetos ({data.projectsCount})</SubTitle>
        {projects.length === 0 ? (
          <Empty text="Ainda não criou projetos." />
        ) : (
          projects.slice(0, 4).map((p) => (
            <Card key={p.id}>
              <View style={u.between}>
                <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>{p.name}</Text>
                <Badge label={labelOf(ngo.projectStatus, p.status)} color={colorOf(PROJECT_STATUS_COLOR, p.status)} />
              </View>
              <Text style={u.muted}>
                {labelOf(ngo.areas, p.area)}
                {p.region ? ` · 📍 ${p.region}` : ""}
              </Text>
              <Btn small kind="outline" label="Abrir" onPress={() => navigation.navigate("NgoProject", { id: p.id })} />
            </Card>
          ))
        )}

        <SubTitle>Serviços públicos ({d.services.length})</SubTitle>
        <View style={u.row}>
          <Btn small kind="outline" label="🏛️ Gerir os meus serviços" onPress={() => navigation.navigate("GovServices")} />
          <Btn small kind="outline" label="➕ Registar serviço" onPress={() => navigation.navigate("GovServiceForm")} />
        </View>

        <SubTitle>Documentos oficiais ({data.documents.length})</SubTitle>
        {data.documents.length === 0 ? (
          <Text style={u.muted}>Ainda não juntou documentos da instituição.</Text>
        ) : (
          data.documents.map((doc: any) => (
            <Card key={doc.id}>
              <Text style={u.strong}>{doc.name}</Text>
              <Text style={u.muted}>
                {labelOf([...ngo.documentKinds, ...gov.govDocumentKinds], doc.kind)} · {formatDate(doc.createdAt)}
              </Text>
              <Btn small kind="outline" label="Abrir" onPress={() => Linking.openURL(doc.url)} />
            </Card>
          ))
        )}
        <Btn small kind="outline" label="📄 Gerir documentos" onPress={() => navigation.navigate("GovVerification")} />

        <SubTitle>Comunicação e mensagens</SubTitle>
        <View style={u.row}>
          <Btn small kind="outline" label="📣 Comunicação oficial" onPress={() => navigation.navigate("GovCommunication")} />
          <Btn small kind="outline" label="💬 Mensagens" onPress={() => navigation.navigate("Conversations")} />
          <Btn small kind="outline" label="🔔 Notificações" onPress={() => navigation.navigate("Notifications")} />
        </View>

        <SubTitle>Suporte NÔDJUNTA AGRO</SubTitle>
        {SUPPORT.phones.map((phone) => (
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
          <Btn small kind="outline" label="🆘 Enviar pedido de ajuda" onPress={() => navigation.navigate("Help")} />
          <Btn small kind="outline" label="⚙️ Configurações" onPress={() => navigation.navigate("Settings")} />
          <Btn small kind="outline" label="🌐 Idioma" onPress={() => navigation.navigate("Language")} />
        </View>

        <Btn kind="danger" label="Sair da conta" onPress={logout} />
      </Page>
    </GovLayout>
  );
}
