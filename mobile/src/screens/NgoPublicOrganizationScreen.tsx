import React, { useState } from "react";
import { View, Text, Image, Alert, Linking } from "react-native";
import { useAuth } from "../context/AuthContext";
import { Page, Title, SubTitle, Card, Badge, Btn, Empty, useLoader, u } from "../components/ui";
import PublicationCard from "../components/ngo/PublicationCard";
import { getPublicOrganization, listPublications } from "../api/ngo";
import { getShopSeller, toggleFavoriteSeller } from "../api/shop";
import { useNgoCatalog, labelOf } from "../utils/ngoCatalog";
import { PROJECT_STATUS_COLOR, colorOf } from "../constants/ngo";
import { socialUrl, whatsappUrl } from "../utils/links";
import { getApiErrorMessage } from "../api/errorMessage";

// Perfil de uma organização, visto por qualquer pessoa
export default function NgoPublicOrganizationScreen({ navigation, route }: any) {
  const id: string = route?.params?.id;
  const { user } = useAuth();
  const catalog = useNgoCatalog();

  const loader = useLoader(
    async () => {
      const [org, publications, seller] = await Promise.all([
        getPublicOrganization(id),
        listPublications({ ownerId: id }).catch(() => ({ items: [] as any[], total: 0 })),
        getShopSeller(id).catch(() => null),
      ]);
      return { org, publications, seller };
    },
    null as any,
    [id]
  );
  const d: any = loader.data;

  const [follow, setFollow] = useState<boolean | null>(null);

  if (!d) {
    return (
      <Page loader={loader}>
        <Title>Organização</Title>
        <Empty text="A carregar..." />
      </Page>
    );
  }

  const o = d.org.organization;
  const isMe = user?.id === o.ownerId;
  const isFollowing = follow ?? !!d.seller?.seller?.isFavorite;
  const followers = d.seller?.seller?.followers;
  const facebook = socialUrl("facebook", o.facebook);
  const instagram = socialUrl("instagram", o.instagram);
  const whatsapp = whatsappUrl(o.whatsapp);

  async function toggleFollow() {
    const before = isFollowing;
    setFollow(!before);
    try {
      const result = await toggleFavoriteSeller(id);
      setFollow(result.favorite);
    } catch (e) {
      setFollow(before);
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível seguir a organização."));
    }
  }

  return (
    <Page loader={loader}>
      <View style={[u.row, { alignItems: "center" }]}>
        {o.logoUrl ? (
          <Image source={{ uri: o.logoUrl }} style={[u.photo, { width: 84, height: 84, borderRadius: 42 }]} />
        ) : (
          <View style={[u.photo, { width: 84, height: 84, borderRadius: 42, alignItems: "center", justifyContent: "center" }]}>
            <Text style={{ fontSize: 34 }}>🏢</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: "bold" }}>
            {o.name}
            {o.acronym ? ` (${o.acronym})` : ""}
          </Text>
          {o.region ? <Text style={u.muted}>📍 {o.region}</Text> : null}
          {o.foundedYear ? <Text style={u.muted}>Fundada em {o.foundedYear}</Text> : null}
          <View style={{ marginTop: 4 }}>
            <Badge label={d.org.isVerified ? "ONG verificada ✅" : "Ainda não verificada"} color={d.org.isVerified ? "#2E7D32" : "#757575"} />
          </View>
          {typeof followers === "number" ? <Text style={u.muted}>👥 {followers} seguidor(es)</Text> : null}
        </View>
      </View>

      {isMe ? (
        <View style={u.row}>
          <Btn small label="✏️ Editar perfil" onPress={() => navigation.navigate("NgoProfileForm")} />
          <Text style={[u.muted, { alignSelf: "center" }]}>É assim que os outros veem a sua organização.</Text>
        </View>
      ) : (
        <View style={u.row}>
          <Btn small kind={isFollowing ? "outline" : "primary"} label={isFollowing ? "✓ A seguir" : "➕ Seguir"} onPress={toggleFollow} />
          <Btn small kind="outline" label="💬 Mensagem" onPress={() => navigation.navigate("Chat", { userId: o.ownerId, userName: o.name })} />
          <Btn
            small
            kind="outline"
            label="🙋 Pedir apoio"
            onPress={() => navigation.navigate("NgoRequestForm", { organizationId: o.ownerId, organizationName: o.name })}
          />
        </View>
      )}
      {!isMe && isFollowing ? <Text style={u.muted}>Recebe um aviso quando a organização publicar novidades.</Text> : null}

      {o.description ? (
        <>
          <SubTitle>Sobre a organização</SubTitle>
          <Text style={{ lineHeight: 21 }}>{o.description}</Text>
        </>
      ) : null}

      {o.areas && o.areas.length > 0 ? (
        <>
          <SubTitle>Áreas de atuação</SubTitle>
          <View style={u.row}>
            {o.areas.map((a: string) => (
              <Badge key={a} label={`${catalog.areas.find((x) => x.value === a)?.icon ?? ""} ${labelOf(catalog.areas, a)}`.trim()} color="#00838F" />
            ))}
          </View>
        </>
      ) : null}

      {o.phone || o.email || o.website || facebook || instagram || whatsapp ? (
        <>
          <SubTitle>Contactos</SubTitle>
          <Card>
            {o.phone ? <Text>📞 {o.phone}</Text> : null}
            {o.email ? <Text style={u.muted}>✉️ {o.email}</Text> : null}
            {o.website ? <Text style={u.muted}>🌐 {o.website}</Text> : null}
            <View style={u.row}>
              {o.phone ? <Btn small kind="outline" label="📞 Ligar" onPress={() => Linking.openURL(`tel:${o.phone}`)} /> : null}
              {o.email ? <Btn small kind="outline" label="✉️ E-mail" onPress={() => Linking.openURL(`mailto:${o.email}`)} /> : null}
              {whatsapp ? <Btn small kind="outline" label="💬 WhatsApp" onPress={() => Linking.openURL(whatsapp)} /> : null}
              {o.website ? <Btn small kind="outline" label="🌐 Website" onPress={() => Linking.openURL(o.website)} /> : null}
              {facebook ? <Btn small kind="outline" label="Facebook" onPress={() => Linking.openURL(facebook)} /> : null}
              {instagram ? <Btn small kind="outline" label="Instagram" onPress={() => Linking.openURL(instagram)} /> : null}
            </View>
          </Card>
        </>
      ) : null}

      <SubTitle>Projetos ({d.org.projects.length})</SubTitle>
      {d.org.projects.length === 0 ? (
        <Empty text="Esta organização ainda não tem projetos públicos." />
      ) : (
        d.org.projects.map((p: any) => (
          <Card key={p.id}>
            <View style={u.between}>
              <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>{p.name}</Text>
              <Badge label={labelOf(catalog.projectStatus, p.status)} color={colorOf(PROJECT_STATUS_COLOR, p.status)} />
            </View>
            <Text style={u.muted}>
              {labelOf(catalog.areas, p.area)}
              {p.region ? ` · 📍 ${p.region}` : ""}
            </Text>
            <Btn small kind="outline" label="Ver projeto" onPress={() => navigation.navigate(isMe ? "NgoProject" : "NgoPublicProject", { id: p.id })} />
          </Card>
        ))
      )}

      <SubTitle>Publicações ({d.publications.total})</SubTitle>
      {d.publications.items.length === 0 ? (
        <Empty text="Ainda não há publicações." />
      ) : (
        d.publications.items.slice(0, 5).map((p: any) => (
          <PublicationCard key={p.id} item={p} catalog={catalog} onPress={() => navigation.navigate("NgoPublication", { id: p.id })} />
        ))
      )}
      {d.publications.total > 5 ? (
        <Btn kind="outline" label="Ver todas as publicações" onPress={() => navigation.navigate("NgoPublications")} />
      ) : null}
    </Page>
  );
}
