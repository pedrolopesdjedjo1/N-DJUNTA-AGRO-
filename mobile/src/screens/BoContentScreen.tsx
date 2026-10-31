import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import AdminLayout from "../components/admin/AdminLayout";
import { Page, Title, SubTitle, Btn, u } from "../components/ui";
import { adminCan } from "../utils/adminSession";
import { CONTENT_HUB } from "../constants/backofficeOrgs";

export default function BoContentScreen({ navigation }: any) {
  const items = CONTENT_HUB.filter((i) => adminCan(...i.perms));

  return (
    <AdminLayout active="BoSystem">
      <Page>
        <Title>📢 Conteúdo</Title>
        <Text style={u.muted}>
          Modere o que as organizações e as pessoas publicam, escolha os destaques e os banners da página inicial, e acompanhe os eventos.
        </Text>

        <View style={u.grid}>
          {items.map((i) => (
            <TouchableOpacity key={`${i.route}-${i.label}`} style={u.tile} onPress={() => navigation.navigate(i.route, i.params)}>
              <View style={u.tileBox}>
                <Text style={{ fontSize: 22 }}>{i.icon}</Text>
                <Text style={[u.strong, { marginTop: 4 }]}>{i.label}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {adminCan("content.manage") ? (
          <>
            <SubTitle>Criar conteúdo</SubTitle>
            <Text style={u.muted}>A equipa também pode publicar. Use as telas que o app já tem:</Text>
            <View style={u.row}>
              <Btn small kind="outline" label="📰 Notícia ou publicação" onPress={() => navigation.navigate("NgoPublicationForm")} />
              <Btn small kind="outline" label="📚 Cursos, guias e vídeos" onPress={() => navigation.navigate("Learning")} />
              <Btn small kind="outline" label="🎪 Eventos" onPress={() => navigation.navigate("Events")} />
            </View>
          </>
        ) : null}

        {adminCan("notify.send", "alerts.manage") ? (
          <View style={u.row}>
            <Btn small kind="outline" label="📣 Enviar um aviso às pessoas" onPress={() => navigation.navigate("BoBroadcasts")} />
          </View>
        ) : null}
      </Page>
    </AdminLayout>
  );
}
