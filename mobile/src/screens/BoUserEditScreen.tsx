import React, { useEffect, useState } from "react";
import { Text, View, Alert } from "react-native";
import AdminLayout from "../components/admin/AdminLayout";
import { Page, Title, Card, Btn, Chip, Field, useLoader, u } from "../components/ui";
import ChipGroup from "../components/ChipGroup";
import { getBoUser, editBoUser } from "../api/backoffice";
import { getGovRegions } from "../api/gov";
import { useBoCatalog } from "../utils/boCatalog";
import { creatableRoles } from "../utils/boRoles";
import { getApiErrorMessage } from "../api/errorMessage";

const PHONE = /^\+?\d{7,15}$/;

export default function BoUserEditScreen({ navigation, route }: any) {
  const id: string = route?.params?.id;
  const catalog = useBoCatalog();
  const loader = useLoader(() => getBoUser(id), null as any, [id]);

  const [filled, setFilled] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [role, setRole] = useState("");
  const [originalRole, setOriginalRole] = useState("");
  const [regions, setRegions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getGovRegions()
      .then((list) => setRegions(list.map((r) => r.name)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (filled || loader.loading || !loader.data) return;
    const u0 = loader.data.user;
    setName(u0.name ?? "");
    setPhone(u0.phone ?? "");
    setLocation(u0.location ?? "");
    setRole(String(u0.role));
    setOriginalRole(String(u0.role));
    setFilled(true);
  }, [loader.loading, loader.data]);

  const roles = creatableRoles(catalog.roles);
  const sameGroup = (a: string, b: string) => a === b || (roleLabel(a) === roleLabel(b) && roleLabel(a) === "Cliente");

  function roleLabel(value: string) {
    return catalog.roles.find((r) => r.value === value)?.label ?? value;
  }

  function submit() {
    if (name.trim().length < 2) return Alert.alert("Atenção", "Escreva o nome.");
    const cleanPhone = phone.replace(/[\s-]/g, "");
    if (!PHONE.test(cleanPhone)) return Alert.alert("Atenção", "Telefone inválido.");

    const roleChanged = !sameGroup(role, originalRole);
    const body: Record<string, any> = { name: name.trim(), phone: cleanPhone, location: location.trim() };
    if (roleChanged) body.role = role;

    const save = async () => {
      setSaving(true);
      try {
        await editBoUser(id, body);
        Alert.alert("Pronto", "Conta atualizada. Fica registado no histórico.");
        navigation.goBack();
      } catch (e) {
        Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível guardar."));
      } finally {
        setSaving(false);
      }
    };

    if (roleChanged) {
      return Alert.alert("Mudar o perfil", `A conta passa de ${roleLabel(originalRole)} para ${roleLabel(role)}. As telas e os dados da pessoa mudam. Continuar?`, [
        { text: "Não", style: "cancel" },
        { text: "Mudar", onPress: save },
      ]);
    }
    return save();
  }

  return (
    <AdminLayout active="BoUsers">
      <Page loader={loader}>
        <Title>✏️ Editar utilizador</Title>
        <Text style={u.muted}>Corrija os dados da conta. Cada alteração fica no histórico, com o que mudou.</Text>

        <Field label="Nome" value={name} onChangeText={setName} />
        <Field label="Telefone (é com ele que a pessoa entra)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <Field label="Onde vive ou trabalha" value={location} onChangeText={setLocation} placeholder="Ex: Gabú" />
        {regions.length > 0 ? (
          <View style={u.row}>
            {regions.map((r) => (
              <Chip key={r} label={r} active={location === r} onPress={() => setLocation(r)} />
            ))}
          </View>
        ) : null}

        <ChipGroup label="Perfil" options={roles} value={sameGroup(role, "") ? role : role} onChange={setRole} />
        {!sameGroup(role, originalRole) ? (
          <Card>
            <Text style={{ color: "#EF6C00", fontWeight: "bold" }}>⚠️ Está a mudar o perfil da conta</Text>
            <Text style={u.muted}>Só faça isto se a pessoa se registou com o perfil errado. A pessoa é avisada.</Text>
          </Card>
        ) : null}

        <Btn label={saving ? "A guardar..." : "Guardar alterações"} onPress={submit} disabled={saving} />
        <Btn kind="outline" label="Cancelar" onPress={() => navigation.goBack()} />
      </Page>
    </AdminLayout>
  );
}
