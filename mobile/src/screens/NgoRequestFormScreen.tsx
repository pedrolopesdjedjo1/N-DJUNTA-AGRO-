import React, { useEffect, useState } from "react";
import { View, Text, Alert } from "react-native";
import { Page, Title, Card, Btn, Chip, Field, useLoader, u } from "../components/ui";
import ChipGroup from "../components/ChipGroup";
import { createSupportRequest, listOrganizations } from "../api/ngo";
import { getWeatherRegions } from "../api/weather";
import { useNgoCatalog } from "../utils/ngoCatalog";
import { getApiErrorMessage } from "../api/errorMessage";

// Qualquer pessoa (agricultor, pescador, artesão, cooperativa...) pede apoio a uma organização
export default function NgoRequestFormScreen({ navigation, route }: any) {
  const presetId: string = route?.params?.organizationId ?? "";
  const presetName: string = route?.params?.organizationName ?? "";
  const catalog = useNgoCatalog();

  const [target, setTarget] = useState<string>(presetId);
  const [category, setCategory] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [region, setRegion] = useState("");
  const [community, setCommunity] = useState("");
  const [regions, setRegions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const loader = useLoader(() => listOrganizations({}), [] as any[]);

  useEffect(() => {
    getWeatherRegions()
      .then(setRegions)
      .catch(() => {});
  }, []);

  const orgs: any[] = (loader.data as any[]).slice(0, 12);
  const listed = orgs.some((o) => o.ownerId === presetId);

  async function send() {
    if (!category) {
      Alert.alert("Atenção", "Escolha o tipo de apoio que precisa.");
      return;
    }
    if (title.trim().length < 3) {
      Alert.alert("Atenção", "Escreva um título curto para o pedido.");
      return;
    }
    if (message.trim().length < 10) {
      Alert.alert("Atenção", "Explique melhor o que precisa (pelo menos 10 letras).");
      return;
    }

    setSaving(true);
    try {
      await createSupportRequest({
        organizationId: target || undefined,
        category,
        title: title.trim(),
        message: message.trim(),
        region: region.trim() || undefined,
        community: community.trim() || undefined,
      });
      Alert.alert("Pedido enviado", "Vai receber um aviso quando a organização responder.", [
        { text: "Ver os meus pedidos", onPress: () => navigation.replace("NgoMyRequests") },
      ]);
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível enviar o pedido."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Page>
      <Title>🙋 Pedir apoio</Title>
      <Text style={u.muted}>Explique do que precisa. A organização responde aqui no app.</Text>

      <Text style={u.label}>Para quem?</Text>
      <View style={u.row}>
        <Chip label="Qualquer organização" active={target === ""} onPress={() => setTarget("")} />
        {presetId && !listed ? <Chip label={presetName || "Organização escolhida"} active={target === presetId} onPress={() => setTarget(presetId)} /> : null}
        {orgs.map((o) => (
          <Chip key={o.ownerId} label={o.name} active={target === o.ownerId} onPress={() => setTarget(target === o.ownerId ? "" : o.ownerId)} />
        ))}
      </View>
      <Btn small kind="outline" label="Ver todas as organizações" onPress={() => navigation.navigate("NgoOrganizations")} />

      {target === "" ? (
        <Card>
          <Text style={u.muted}>O pedido fica aberto a todas as organizações. A primeira que o assumir responde-lhe.</Text>
        </Card>
      ) : null}

      <ChipGroup label="Tipo de apoio" options={catalog.needCategories} value={category} onChange={setCategory} />

      <Field label="Título" value={title} onChangeText={setTitle} placeholder="Ex: Sementes de arroz para a nossa tabanca" />
      <Field
        label="O que precisa e porquê"
        value={message}
        onChangeText={setMessage}
        multiline
        placeholder="Quantas pessoas ajuda, o que já tentou, quando precisa"
      />

      <Field label="Região" value={region} onChangeText={setRegion} placeholder="Ex: Gabú" />
      {regions.length > 0 ? (
        <View style={u.row}>
          {regions.map((r) => (
            <Chip key={r} label={r} active={region === r} onPress={() => setRegion(region === r ? "" : r)} />
          ))}
        </View>
      ) : null}
      <Field label="Comunidade ou tabanca (opcional)" value={community} onChangeText={setCommunity} placeholder="Ex: Sonaco" />

      <Text style={[u.muted, { marginTop: 8 }]}>Pode ter até 5 pedidos em aberto ao mesmo tempo.</Text>

      <Btn label={saving ? "A enviar..." : "Enviar pedido"} onPress={send} disabled={saving} />
      <Btn kind="outline" label="Os meus pedidos" onPress={() => navigation.navigate("NgoMyRequests")} />
    </Page>
  );
}
