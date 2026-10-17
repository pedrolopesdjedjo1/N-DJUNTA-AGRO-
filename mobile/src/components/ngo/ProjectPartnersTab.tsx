import React, { useState } from "react";
import { Text, Alert, Linking, View } from "react-native";
import { Card, Btn, Chip, Empty, Field, useLoader, u } from "../ui";
import { getProjectPartners, listPartners, linkProjectPartner, unlinkProjectPartner } from "../../api/ngo";
import { getApiErrorMessage } from "../../api/errorMessage";
import { useNgoCatalog, labelOf } from "../../utils/ngoCatalog";

interface Props {
  projectId: string;
  navigation: any;
}

const EMPTY = { linked: [] as any[], all: [] as any[] };

export default function ProjectPartnersTab({ projectId, navigation }: Props) {
  const catalog = useNgoCatalog();
  const loader = useLoader(
    async () => {
      const [linked, all] = await Promise.all([getProjectPartners(projectId), listPartners()]);
      return { linked, all };
    },
    EMPTY,
    [projectId]
  );

  const linked: any[] = loader.data.linked;
  const all: any[] = loader.data.all;
  const available = all.filter((p) => p.status !== "ENCERRADO" && !linked.some((l) => l.partner.id === p.id));

  const [picked, setPicked] = useState("");
  const [role, setRole] = useState("");
  const [saving, setSaving] = useState(false);

  async function link() {
    if (!picked) {
      Alert.alert("Atenção", "Escolha o parceiro.");
      return;
    }
    setSaving(true);
    try {
      const list = await linkProjectPartner(projectId, { partnerId: picked, role: role.trim() || undefined });
      loader.setData({ ...loader.data, linked: list });
      setPicked("");
      setRole("");
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível ligar o parceiro."));
    } finally {
      setSaving(false);
    }
  }

  function unlink(item: any) {
    Alert.alert("Tirar parceiro", `Tirar "${item.partner.name}" deste projeto?`, [
      { text: "Não", style: "cancel" },
      {
        text: "Tirar",
        style: "destructive",
        onPress: async () => {
          try {
            const list = await unlinkProjectPartner(projectId, item.partner.id);
            loader.setData({ ...loader.data, linked: list });
          } catch (e) {
            Alert.alert("Erro", getApiErrorMessage(e, "Não foi possível tirar o parceiro."));
          }
        },
      },
    ]);
  }

  if (loader.loading && all.length === 0 && linked.length === 0) {
    return <Text style={u.muted}>A carregar...</Text>;
  }

  return (
    <View>
      {linked.length === 0 ? (
        <Empty text="Este projeto ainda não tem parceiros." />
      ) : (
        linked.map((l) => (
          <Card key={l.linkId}>
            <Text style={u.strong}>{l.partner.name}</Text>
            <Text style={u.muted}>{labelOf(catalog.partnerTypes, l.partner.type)}</Text>
            {l.role ? <Text style={u.muted}>Papel no projeto: {l.role}</Text> : null}
            {l.partner.region ? <Text style={u.muted}>📍 {l.partner.region}</Text> : null}
            <View style={u.row}>
              {l.partner.phone ? <Btn small kind="outline" label="📞 Ligar" onPress={() => Linking.openURL(`tel:${l.partner.phone}`)} /> : null}
              {l.partner.linkedUserId ? (
                <Btn
                  small
                  kind="outline"
                  label="💬 Mensagem"
                  onPress={() => navigation.navigate("Chat", { userId: l.partner.linkedUserId, userName: l.partner.name })}
                />
              ) : null}
              <Btn small kind="danger" label="Tirar do projeto" onPress={() => unlink(l)} />
            </View>
          </Card>
        ))
      )}

      <Card>
        <Text style={u.strong}>Ligar um parceiro ao projeto</Text>

        {all.length === 0 ? (
          <>
            <Text style={u.muted}>Ainda não registou parceiros.</Text>
            <Btn small label="Registar parceiros" onPress={() => navigation.navigate("NgoPartners")} />
          </>
        ) : available.length === 0 ? (
          <Text style={u.muted}>Todos os seus parceiros já estão ligados a este projeto.</Text>
        ) : (
          <>
            <View style={u.row}>
              {available.map((p) => (
                <Chip key={p.id} label={p.name} active={picked === p.id} onPress={() => setPicked(picked === p.id ? "" : p.id)} />
              ))}
            </View>
            <Field label="Papel no projeto (opcional)" value={role} onChangeText={setRole} placeholder="Ex: Financia as sementes" />
            <Btn label={saving ? "A ligar..." : "Ligar ao projeto"} onPress={link} disabled={saving} />
          </>
        )}

        <Btn small kind="outline" label="Gerir os meus parceiros" onPress={() => navigation.navigate("NgoPartners")} />
      </Card>
    </View>
  );
}
