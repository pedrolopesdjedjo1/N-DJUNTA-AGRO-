import React, { useEffect, useState } from "react";
import { View, Text, Alert } from "react-native";
import { Page, Title, Card, Btn, Chip, Field, u } from "../components/ui";
import ChipGroup from "../components/ChipGroup";
import { linkRegisteredClient, inviteClient } from "../api/agent";
import { registerAccount } from "../api/agentRegister";
import { getGovRegions } from "../api/gov";
import { useAgentCatalog } from "../utils/agentCatalog";
import { ROLE_ICON } from "../constants/agent";
import { getApiErrorMessage } from "../api/errorMessage";

const PHONE = /^[+\d][\d\s-]{5,19}$/;

// Registar uma pessoa nova (com ela ao lado): cria a conta e liga-a à carteira do agente
export default function AgentClientFormScreen({ navigation, route }: any) {
  const catalog = useAgentCatalog();

  const [kind, setKind] = useState<string>(route?.params?.kind ?? "");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [regions, setRegions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getGovRegions()
      .then((list) => setRegions(list.map((r) => r.name)))
      .catch(() => {});
  }, []);

  async function save() {
    if (!kind) {
      Alert.alert("Atenção", "Escolha o tipo de pessoa.");
      return;
    }
    if (name.trim().length < 2) {
      Alert.alert("Atenção", "Escreva o nome da pessoa.");
      return;
    }
    if (!PHONE.test(phone.trim())) {
      Alert.alert("Atenção", "Escreva um telefone válido. A pessoa vai entrar com ele.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Atenção", "A palavra-passe deve ter pelo menos 6 letras ou números.");
      return;
    }
    if (!location.trim()) {
      Alert.alert("Atenção", "Escreva onde a pessoa vive ou trabalha.");
      return;
    }

    setSaving(true);
    try {
      const reg = await registerAccount({ name: name.trim(), phone: phone.trim(), password, role: kind, location: location.trim() });

      let linkId: string | null = null;
      let invited = false;

      if (reg.userId) {
        try {
          const r = await linkRegisteredClient({ userId: reg.userId, phone: phone.trim(), notes: notes.trim() || undefined });
          linkId = r.id;
        } catch (e) {
          linkId = null;
        }
      }

      // Se não deu para ligar logo, envia um convite à conta recém-criada
      if (!linkId) {
        try {
          const r = await inviteClient({ phone: phone.trim(), notes: notes.trim() || undefined });
          linkId = r.id;
          invited = true;
        } catch (e) {
          throw new Error("A conta foi criada, mas não foi possível ligá-la à sua carteira. Envie-lhe um convite em Clientes.");
        }
      }

      Alert.alert(
        "Conta criada",
        invited
          ? "A conta foi criada e a pessoa recebeu um convite. Peça-lhe para o aceitar em Configurações, Os meus agentes."
          : "A conta foi criada e já está na sua carteira. Diga à pessoa para mudar a palavra-passe e nunca guarde as palavras-passe dos seus clientes.",
        [{ text: "Abrir a ficha", onPress: () => navigation.replace("AgentClient", { id: linkId }) }]
      );
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível registar a pessoa."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Page>
      <Title>➕ Registar pessoa nova</Title>
      <Text style={u.muted}>Faça o registo com a pessoa ao lado. Fica com conta própria e na sua carteira de clientes.</Text>

      <ChipGroup
        label="Quem vai registar?"
        options={catalog.clientKinds.map((k) => ({ ...k, icon: ROLE_ICON[k.value] }))}
        value={kind}
        onChange={setKind}
      />

      <Field label="Nome completo" value={name} onChangeText={setName} placeholder="Ex: Maria Gomes" />
      <Field label="Telefone (para a pessoa entrar)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="Ex: 955000000" />
      <Field label="Palavra-passe inicial" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" />
      <Text style={u.muted}>Escolha-a com a pessoa e diga-lhe para a mudar depois. Não a guarde.</Text>

      <Field label="Onde vive ou trabalha" value={location} onChangeText={setLocation} placeholder="Ex: Sonaco, Gabú" />
      {regions.length > 0 ? (
        <View style={u.row}>
          {regions.map((r) => (
            <Chip key={r} label={r} active={location === r} onPress={() => setLocation(r)} />
          ))}
        </View>
      ) : null}

      <Field label="Notas (opcional)" value={notes} onChangeText={setNotes} multiline placeholder="Ex: Produz arroz e caju, tem 2 hectares" />

      <Card>
        <Text style={u.strong}>🔒 Como protegemos a pessoa</Text>
        <Text style={u.muted}>
          Ela recebe um aviso no app a dizer que foi registada por si e pode retirar-lhe o acesso quando quiser. Cada sessão de ajuda dura 30 minutos e fica registada.
        </Text>
      </Card>

      <Btn label={saving ? "A registar..." : "Registar pessoa"} onPress={save} disabled={saving} />
      <Btn kind="outline" label="Cancelar" onPress={() => navigation.goBack()} />
    </Page>
  );
}
