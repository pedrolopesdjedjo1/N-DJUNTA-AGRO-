import React, { useState } from "react";
import { Text, Alert } from "react-native";
import AdminLayout from "../components/admin/AdminLayout";
import { Page, Title, Card, Btn, Field, u } from "../components/ui";
import ChipGroup from "../components/ChipGroup";
import { promoteBoAdmin } from "../api/backoffice";
import { useBoCatalog } from "../utils/boCatalog";
import { getApiErrorMessage } from "../api/errorMessage";

// Dar acesso de administrador a uma conta que já existe
export default function BoTeamPromoteScreen({ navigation }: any) {
  const catalog = useBoCatalog();
  const [phone, setPhone] = useState("");
  const [level, setLevel] = useState("");
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);

  const info = catalog.levels.find((l: any) => l.value === level);

  function submit() {
    if (phone.replace(/\D/g, "").length < 7) return Alert.alert("Atenção", "Escreva o telefone da conta.");
    if (!level) return Alert.alert("Atenção", "Escolha o nível.");

    Alert.alert("Dar acesso de administrador", `A conta com o telefone ${phone.trim()} passa a ser ${info?.label ?? "administrador"}. Continuar?`, [
      { text: "Não", style: "cancel" },
      {
        text: "Dar acesso",
        onPress: async () => {
          setSaving(true);
          try {
            const r = await promoteBoAdmin({ phone: phone.trim(), level, title: title.trim() || undefined });
            Alert.alert("Pronto", "A pessoa recebeu o acesso e foi avisada. Peça-lhe para ativar a autenticação de dois fatores.");
            navigation.replace("BoTeamMember", { userId: r.user.id });
          } catch (e) {
            Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível dar o acesso."));
          } finally {
            setSaving(false);
          }
        },
      },
    ]);
  }

  return (
    <AdminLayout active="BoSystem">
      <Page>
        <Title>➕ Dar acesso de administrador</Title>
        <Text style={u.muted}>
          A pessoa tem de ter uma conta no app. Não se cria uma conta nova nem se define palavra-passe aqui: ela continua a entrar com a sua. Se o acesso for retirado, a conta volta ao perfil que tinha.
        </Text>

        <Field label="Telefone da conta" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="Ex: 955000000" />

        <ChipGroup label="Nível" options={catalog.levels.map((l: any) => ({ value: l.value, label: l.label, icon: l.icon }))} value={level} onChange={setLevel} />
        {info ? (
          <Card>
            <Text style={u.strong}>
              {info.icon} {info.label}
            </Text>
            <Text style={u.muted}>{info.description}</Text>
            <Text style={[u.muted, { marginTop: 4 }]}>{(catalog.levelPermissions[level] ?? []).length} permissões. Pode ajustá-las depois, uma a uma.</Text>
          </Card>
        ) : null}

        <Field label="Função (opcional)" value={title} onChangeText={setTitle} placeholder="Ex: Responsável pelo suporte em Bissau" />

        <Btn label={saving ? "A dar acesso..." : "Dar acesso"} onPress={submit} disabled={saving} />
        <Btn kind="outline" label="Cancelar" onPress={() => navigation.goBack()} />
      </Page>
    </AdminLayout>
  );
}
