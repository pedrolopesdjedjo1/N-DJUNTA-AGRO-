import React, { useEffect, useState } from "react";
import { Text, Alert } from "react-native";
import { Page, Title, Card, Btn, Field, u } from "../components/ui";
import ChipGroup from "../components/ChipGroup";
import ClientChooser from "../components/agent/ClientChooser";
import { createAgentCase, getAgentClient } from "../api/agent";
import { useAgentCatalog } from "../utils/agentCatalog";
import { CASE_ICON } from "../constants/agentSupport";
import { shortId } from "../constants/agentOps";
import { getApiErrorMessage } from "../api/errorMessage";

// Abrir um chamado: um problema de uma encomenda, transporte, pagamento, produto ou conta
export default function AgentCaseFormScreen({ navigation, route }: any) {
  const params = route?.params ?? {};
  const catalog = useAgentCatalog();

  const [category, setCategory] = useState<string>(params.category ?? "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [linkId, setLinkId] = useState<string>(params.linkId ?? "");
  const [clientName, setClientName] = useState<string>(params.clientName ?? "");
  const [saving, setSaving] = useState(false);

  const orderId: string | undefined = params.orderId;

  useEffect(() => {
    if (linkId && !clientName) {
      getAgentClient(linkId)
        .then((r: any) => setClientName(r.client?.name ?? ""))
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save() {
    if (!category) {
      Alert.alert("Atenção", "Escolha o tipo de problema.");
      return;
    }
    if (title.trim().length < 3) {
      Alert.alert("Atenção", "Escreva um título curto.");
      return;
    }
    if (description.trim().length < 10) {
      Alert.alert("Atenção", "Explique o problema (pelo menos 10 letras).");
      return;
    }

    setSaving(true);
    try {
      const created = await createAgentCase({
        category,
        title: title.trim(),
        description: description.trim(),
        linkId: linkId || undefined,
        orderId: orderId || undefined,
      });
      if (created?.id && navigation.replace) navigation.replace("AgentCase", { id: created.id });
      else navigation.goBack();
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível abrir o chamado."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Page>
      <Title>🆘 Abrir chamado</Title>
      <Text style={u.muted}>Descreva o problema. Se não o conseguir resolver, pode passá-lo à equipa do NÔDJUNTA AGRO.</Text>

      <ChipGroup
        label="Tipo de problema"
        options={catalog.caseCategories.map((k) => ({ ...k, icon: CASE_ICON[k.value] }))}
        value={category}
        onChange={setCategory}
      />

      <Field label="Título" value={title} onChangeText={setTitle} placeholder="Ex: O comprador não recebeu o arroz" />
      <Field
        label="O que se passa"
        value={description}
        onChangeText={setDescription}
        multiline
        placeholder="Conte o que aconteceu, quando e o que já tentou"
      />

      {orderId ? (
        <Card>
          <Text style={u.strong}>📦 Ligado à encomenda {shortId(orderId)}</Text>
          <Text style={u.muted}>O cliente da encomenda fica ligado ao chamado.</Text>
        </Card>
      ) : null}

      <ClientChooser
        label="Cliente a que se refere (opcional)"
        linkId={linkId}
        clientName={clientName}
        onChange={(id, name) => {
          setLinkId(id);
          setClientName(name);
        }}
      />

      <Btn label={saving ? "A abrir..." : "Abrir chamado"} onPress={save} disabled={saving} />
      <Btn kind="outline" label="Cancelar" onPress={() => navigation.goBack()} />
    </Page>
  );
}
