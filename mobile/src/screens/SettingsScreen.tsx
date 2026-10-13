import React, { useEffect, useState } from "react";
import { View, Text, Switch, Alert } from "react-native";
import { Page, Title, SubTitle, Card, Btn, Field, useLoader, u } from "../components/ui";
import { getSettings, updateSettings, changePassword, changePhone } from "../api/account";
import { getApiErrorMessage } from "../api/errorMessage";
import { colors } from "../theme/colors";

const FLAGS: [string, string][] = [
  ["notifyOrders", "Novos pedidos"],
  ["notifyMessages", "Mensagens"],
  ["notifyPayments", "Pagamentos"],
  ["notifyDeliveries", "Entregas"],
  ["notifyEvents", "Eventos"],
  ["notifyOpportunities", "Oportunidades"],
];

const PRIVACY =
  "Guardamos o seu nome, telefone, localização e as fotos e vídeos que publica, só para o funcionamento do NÔDJUNTA AGRO. O seu telefone pode aparecer a compradores e vendedores com quem negocia. Nunca partilhe a sua senha com ninguém.";

const TERMS =
  "Ao usar o NÔDJUNTA AGRO você aceita: publicar apenas produtos permitidos e reais; tratar com respeito compradores, vendedores e transportadores; cumprir os pedidos aceites; não usar a plataforma para fraude. Contas com denúncias confirmadas podem ser suspensas. Em caso de dúvida, fale com o suporte.";

export default function SettingsScreen({ navigation }: any) {
  const loader = useLoader(getSettings, null as any);
  const settings: any = loader.data;

  const [flags, setFlags] = useState<Record<string, boolean>>({});
  const [location, setLocation] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [phonePassword, setPhonePassword] = useState("");
  const [busy, setBusy] = useState("");
  const [showText, setShowText] = useState("");

  useEffect(() => {
    if (settings) {
      setFlags(settings.notifications ?? {});
      setLocation(settings.user?.location ?? "");
    }
  }, [loader.loading]);

  const phoneUser = settings ? settings.user.email === "" : true;

  function digits(value: string) {
    return value.replace(/\D/g, "").slice(0, 6);
  }

  async function toggleFlag(key: string, value: boolean) {
    const before = flags;
    setFlags({ ...flags, [key]: value });
    try {
      await updateSettings({ [key]: value });
    } catch (e) {
      setFlags(before);
      Alert.alert("Erro", getApiErrorMessage(e, "Não foi possível guardar."));
    }
  }

  async function saveLocation() {
    setBusy("location");
    try {
      await updateSettings({ location: location.trim() });
      Alert.alert("Pronto", "Localização guardada.");
    } catch (e) {
      Alert.alert("Erro", getApiErrorMessage(e, "Não foi possível guardar."));
    } finally {
      setBusy("");
    }
  }

  async function savePassword() {
    if (!currentPassword || !newPassword) {
      Alert.alert("Atenção", "Preencha a senha atual e a nova senha.");
      return;
    }
    if (newPassword !== repeatPassword) {
      Alert.alert("Atenção", "As senhas novas não são iguais.");
      return;
    }
    setBusy("password");
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setRepeatPassword("");
      Alert.alert("Pronto", "Senha alterada.");
    } catch (e) {
      Alert.alert("Erro", getApiErrorMessage(e, "Não foi possível alterar a senha."));
    } finally {
      setBusy("");
    }
  }

  async function savePhone() {
    if (!newPhone.trim() || !phonePassword) {
      Alert.alert("Atenção", "Preencha o novo número e a senha.");
      return;
    }
    setBusy("phone");
    try {
      const result = await changePhone(newPhone.trim(), phonePassword);
      setNewPhone("");
      setPhonePassword("");
      Alert.alert("Pronto", `Número alterado para ${result.phone}. Na próxima vez, entre com o número novo.`);
      loader.reload();
    } catch (e) {
      Alert.alert("Erro", getApiErrorMessage(e, "Não foi possível alterar o número."));
    } finally {
      setBusy("");
    }
  }

  return (
    <Page loader={loader}>
      <Title>⚙️ Configurações</Title>

      <SubTitle>🔒 Segurança</SubTitle>
      <Card>
        <Text style={u.strong}>Alterar senha</Text>
        <Field
          label="Senha atual"
          value={currentPassword}
          onChangeText={(v) => setCurrentPassword(phoneUser ? digits(v) : v)}
          secureTextEntry
          keyboardType={phoneUser ? "number-pad" : "default"}
        />
        <Field
          label={phoneUser ? "Senha nova (4 a 6 números)" : "Senha nova"}
          value={newPassword}
          onChangeText={(v) => setNewPassword(phoneUser ? digits(v) : v)}
          secureTextEntry
          keyboardType={phoneUser ? "number-pad" : "default"}
        />
        <Field
          label="Repita a senha nova"
          value={repeatPassword}
          onChangeText={(v) => setRepeatPassword(phoneUser ? digits(v) : v)}
          secureTextEntry
          keyboardType={phoneUser ? "number-pad" : "default"}
        />
        <Btn label={busy === "password" ? "A guardar..." : "Alterar senha"} onPress={savePassword} disabled={busy !== ""} />
      </Card>

      <SubTitle>📞 Telefone</SubTitle>
      <Card>
        <Text style={u.muted}>Número atual: {settings?.user?.phone || "—"}</Text>
        <Field label="Novo número" value={newPhone} onChangeText={setNewPhone} keyboardType="phone-pad" />
        <Field
          label="A sua senha"
          value={phonePassword}
          onChangeText={(v) => setPhonePassword(phoneUser ? digits(v) : v)}
          secureTextEntry
          keyboardType={phoneUser ? "number-pad" : "default"}
        />
        <Btn label={busy === "phone" ? "A guardar..." : "Alterar número"} onPress={savePhone} disabled={busy !== ""} />
      </Card>

      <SubTitle>🔔 Notificações</SubTitle>
      <Card>
        {FLAGS.map(([key, label]) => (
          <View key={key} style={[u.between, { paddingVertical: 6 }]}>
            <Text style={u.strong}>{label}</Text>
            <Switch
              value={flags[key] !== false}
              onValueChange={(v) => toggleFlag(key, v)}
              trackColor={{ true: colors.primary, false: "#BDBDBD" }}
            />
          </View>
        ))}
      </Card>

      <SubTitle>📍 Localização</SubTitle>
      <Card>
        <Field label="Onde você está" value={location} onChangeText={setLocation} placeholder="Ex: Bissau" />
        <Btn label={busy === "location" ? "A guardar..." : "Guardar localização"} onPress={saveLocation} disabled={busy !== ""} />
      </Card>

      <SubTitle>🌐 Idioma</SubTitle>
      <Btn kind="outline" label="Mudar idioma" onPress={() => navigation.navigate("Language")} />

      <SubTitle>🛡️ Privacidade, termos e ajuda</SubTitle>
      <Card>
        <View style={u.row}>
          <Btn small kind="outline" label="Privacidade" onPress={() => setShowText(showText === "privacy" ? "" : "privacy")} />
          <Btn small kind="outline" label="Termos e condições" onPress={() => setShowText(showText === "terms" ? "" : "terms")} />
          <Btn small kind="outline" label="🆘 Ajuda" onPress={() => navigation.navigate("Help")} />
        </View>
        {showText === "privacy" ? <Text style={{ marginTop: 10, lineHeight: 21 }}>{PRIVACY}</Text> : null}
        {showText === "terms" ? <Text style={{ marginTop: 10, lineHeight: 21 }}>{TERMS}</Text> : null}
      </Card>
    </Page>
  );
}
