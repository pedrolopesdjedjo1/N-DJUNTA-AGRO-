import React, { useEffect, useState } from "react";
import { Text, View, Alert } from "react-native";
import AdminLayout from "../components/admin/AdminLayout";
import { Page, Title, Card, Btn, Chip, Field, u } from "../components/ui";
import ChipGroup from "../components/ChipGroup";
import { registerAccount } from "../api/agentRegister";
import { getGovRegions } from "../api/gov";
import { useBoCatalog } from "../utils/boCatalog";
import { creatableRoles } from "../utils/boRoles";
import { getApiErrorMessage } from "../api/errorMessage";

const PHONE = /^\+?\d{7,15}$/;

// Criar uma conta de utilizador (usa o registo normal do app)
export default function BoUserCreateScreen({ navigation }: any) {
  const catalog = useBoCatalog();
  const [role, setRole] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [location, setLocation] = useState("");
  const [regions, setRegions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getGovRegions()
      .then((list) => setRegions(list.map((r) => r.name)))
      .catch(() => {});
  }, []);

  async function save() {
    const cleanPhone = phone.replace(/[\s-]/g, "");
    if (!role) return Alert.alert("Atenção", "Escolha o perfil.");
    if (name.trim().length < 2) return Alert.alert("Atenção", "Escreva o nome.");
    if (!PHONE.test(cleanPhone)) return Alert.alert("Atenção", "Escreva um telefone válido.");
    if (password.length < 6) return Alert.alert("Atenção", "A palavra-passe deve ter pelo menos 6 letras ou números.");
    if (!location.trim()) return Alert.alert("Atenção", "Escreva onde a pessoa vive ou trabalha.");

    setSaving(true);
    try {
      const r = await registerAccount({ name: name.trim(), phone: cleanPhone, password, role, location: location.trim() });
      Alert.alert(
        "Conta criada",
        "Diga à pessoa para mudar a palavra-passe na primeira entrada. Não guarde palavras-passe de outras pessoas.",
        r.userId ? [{ text: "Abrir a ficha", onPress: () => navigation.replace("BoUser", { id: r.userId }) }] : [{ text: "OK", onPress: () => navigation.goBack() }]
      );
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível criar a conta."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminLayout active="BoUsers">
      <Page>
        <Title>➕ Criar utilizador</Title>
        <Text style={u.muted}>Cria a conta como se a pessoa se registasse. Para dar acesso de administrador, use a equipa de administradores.</Text>

        <ChipGroup label="Perfil" options={creatableRoles(catalog.roles)} value={role} onChange={setRole} />

        <Field label="Nome completo" value={name} onChangeText={setName} placeholder="Ex: Maria Gomes" />
        <Field label="Telefone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="Ex: 955000000" />
        <Field label="Palavra-passe inicial" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" />
        <Field label="Onde vive ou trabalha" value={location} onChangeText={setLocation} placeholder="Ex: Bafatá" />
        {regions.length > 0 ? (
          <View style={u.row}>
            {regions.map((r) => (
              <Chip key={r} label={r} active={location === r} onPress={() => setLocation(r)} />
            ))}
          </View>
        ) : null}

        <Card>
          <Text style={u.muted}>Se o perfil escolhido for ONG ou instituição pública, a pessoa ainda tem de preencher o perfil da organização e pedir a verificação.</Text>
        </Card>

        <Btn label={saving ? "A criar..." : "Criar conta"} onPress={save} disabled={saving} />
        <Btn kind="outline" label="Cancelar" onPress={() => navigation.goBack()} />
      </Page>
    </AdminLayout>
  );
}
