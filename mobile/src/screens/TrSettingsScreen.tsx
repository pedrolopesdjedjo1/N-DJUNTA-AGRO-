import React, { useCallback, useState } from "react";
import { View, Text, Switch, Alert, Linking } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import TrLayout from "../components/transporter/TrLayout";
import { Page, Title, SubTitle, Card, Btn, useLoader, u } from "../components/ui";
import { getTrSettings, saveTrProfile } from "../api/transporterV2";
import { whatsappUrl } from "../utils/links";
import { getApiErrorMessage } from "../api/errorMessage";
import { colors } from "../theme/colors";

const LANG: Record<string, string> = { pt: "Português", kri: "Crioulo", en: "Inglês", fr: "Francês" };

const EMPTY = {
  preferences: { shareLocation: true, notifyNewLoads: true, isAvailable: false },
  languages: [] as string[],
  support: { email: "", phones: [] as string[] },
  legal: { hasTerms: false, hasPrivacy: false },
};

export default function TrSettingsScreen({ navigation }: any) {
  const { logout } = useAuth();
  const loader = useLoader(getTrSettings, EMPTY);
  const d: any = loader.data;
  const [busy, setBusy] = useState("");

  useFocusEffect(
    useCallback(() => {
      loader.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  async function change(key: "shareLocation" | "notifyNewLoads", value: boolean) {
    setBusy(key);
    try {
      await saveTrProfile({ [key]: value });
      loader.reload();
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível guardar."));
    } finally {
      setBusy("");
    }
  }

  function leave() {
    Alert.alert("Terminar a sessão", "Quer sair da sua conta neste telemóvel?", [
      { text: "Não", style: "cancel" },
      { text: "Sair", style: "destructive", onPress: logout },
    ]);
  }

  const p = d.preferences;

  return (
    <TrLayout active="TrProfile">
      <Page loader={loader}>
        <Title>⚙️ Configurações</Title>

        <SubTitle>Privacidade e localização</SubTitle>
        <Card>
          <View style={u.between}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={u.strong}>Partilhar a localização nas entregas</Text>
              <Text style={u.muted}>{p.shareLocation ? "O comprador e o vendedor veem onde está durante a entrega." : "Ninguém vê onde está. O comprador só sabe quando começa e quando chega."}</Text>
            </View>
            <Switch value={p.shareLocation} onValueChange={(v) => change("shareLocation", v)} disabled={busy === "shareLocation"} trackColor={{ true: colors.primary, false: "#BDBDBD" }} />
          </View>
          <Btn small kind="outline" label="📍 Permissões do telemóvel" onPress={() => Linking.openSettings()} />
        </Card>

        <SubTitle>Notificações</SubTitle>
        <Card>
          <View style={u.between}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={u.strong}>Avisos de cargas novas</Text>
              <Text style={u.muted}>Receba um aviso quando aparece uma carga que serve ao seu veículo e às suas regiões.</Text>
            </View>
            <Switch value={p.notifyNewLoads} onValueChange={(v) => change("notifyNewLoads", v)} disabled={busy === "notifyNewLoads"} trackColor={{ true: colors.primary, false: "#BDBDBD" }} />
          </View>
          <Btn small kind="outline" label="🔔 Ver as notificações" onPress={() => navigation.navigate("Notifications")} />
        </Card>

        <SubTitle>Idioma e conta</SubTitle>
        <Card>
          <Text style={u.muted}>Idiomas disponíveis: {d.languages.map((l: string) => LANG[l] ?? l).join(", ") || "Português"}.</Text>
          <View style={u.row}>
            <Btn small kind="outline" label="🌐 Idioma e opções do app" onPress={() => navigation.navigate("Settings")} />
            <Btn small kind="outline" label="🔑 Mudar a palavra-passe" onPress={() => navigation.navigate("ChangePassword")} />
          </View>
          <Btn small kind="outline" label="🔐 Segurança da conta" onPress={() => navigation.navigate("TrSecurity")} />
        </Card>

        <SubTitle>Termos e política</SubTitle>
        <View style={u.row}>
          <Btn small kind="outline" label="📜 Termos e condições" onPress={() => navigation.navigate("Legal", { kind: "terms" })} />
          <Btn small kind="outline" label="📜 Política de privacidade" onPress={() => navigation.navigate("Legal", { kind: "privacy" })} />
        </View>

        <SubTitle>Ajuda e suporte</SubTitle>
        <Card>
          {d.support.phones.map((ph: string) => (
            <View key={ph} style={[u.between, { marginBottom: 6 }]}>
              <Text style={{ flex: 1, marginRight: 8 }}>📞 {ph}</Text>
              <View style={u.row}>
                <Btn small label="Ligar" onPress={() => Linking.openURL(`tel:${ph}`)} />
                {whatsappUrl(ph) ? <Btn small kind="outline" label="WhatsApp" onPress={() => Linking.openURL(whatsappUrl(ph) as string)} /> : null}
              </View>
            </View>
          ))}
          {d.support.email ? <Btn small kind="outline" label={`📧 ${d.support.email}`} onPress={() => Linking.openURL(`mailto:${d.support.email}`)} /> : null}
          <Btn small kind="outline" label="🎧 Abrir um pedido de ajuda no app" onPress={() => navigation.navigate("Support")} />
        </Card>

        <Btn kind="danger" label="Terminar a sessão" onPress={leave} />
        <Text style={[u.muted, { textAlign: "center", marginTop: 10 }]}>NÔDJUNTA AGRO — Juntos pelo desenvolvimento de todos!</Text>
      </Page>
    </TrLayout>
  );
}
