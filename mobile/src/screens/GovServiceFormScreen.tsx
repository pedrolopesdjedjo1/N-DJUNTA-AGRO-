import React, { useEffect, useState } from "react";
import { View, Text, Alert, Switch } from "react-native";
import { Page, Title, Card, Btn, Chip, Field, u } from "../components/ui";
import ChipGroup from "../components/ChipGroup";
import { createService, updateService, getGovRegions } from "../api/gov";
import { getPosition } from "../utils/location";
import { useGovCatalog } from "../utils/govCatalog";
import { SERVICE_ICON } from "../constants/gov";
import { getApiErrorMessage } from "../api/errorMessage";
import { colors } from "../theme/colors";

const PHONE = /^[+\d][\d\s-]{5,19}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function GovServiceFormScreen({ navigation, route }: any) {
  const editing = route?.params?.service;
  const catalog = useGovCatalog();

  const [name, setName] = useState<string>(editing?.name ?? "");
  const [category, setCategory] = useState<string>(editing?.category ?? "");
  const [description, setDescription] = useState<string>(editing?.description ?? "");
  const [documents, setDocuments] = useState<string>((editing?.requiredDocuments ?? []).join("\n"));
  const [howToRequest, setHowToRequest] = useState<string>(editing?.howToRequest ?? "");
  const [fee, setFee] = useState<string>(editing?.fee ?? "");
  const [processingTime, setProcessingTime] = useState<string>(editing?.processingTime ?? "");
  const [address, setAddress] = useState<string>(editing?.address ?? "");
  const [region, setRegion] = useState<string>(editing?.region ?? "");
  const [schedule, setSchedule] = useState<string>(editing?.schedule ?? "");
  const [phone, setPhone] = useState<string>(editing?.phone ?? "");
  const [email, setEmail] = useState<string>(editing?.email ?? "");
  const [website, setWebsite] = useState<string>(editing?.website ?? "");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    editing && editing.lat !== null && editing.lng !== null && editing.lat !== undefined ? { lat: editing.lat, lng: editing.lng } : null
  );
  const [isPublished, setIsPublished] = useState<boolean>(editing ? editing.isPublished !== false : true);
  const [regions, setRegions] = useState<string[]>([]);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getGovRegions()
      .then((list) => setRegions(list.map((r) => r.name)))
      .catch(() => {});
  }, []);

  async function useMyLocation() {
    setLocating(true);
    const position = await getPosition();
    setLocating(false);
    if (position) {
      setCoords(position);
    } else {
      Alert.alert("Localização não disponível", "Ative a localização (GPS) e dê permissão ao app. Estando no local do serviço, o ponto fica exato no mapa.");
    }
  }

  async function save() {
    if (name.trim().length < 3) {
      Alert.alert("Atenção", "Escreva o nome do serviço.");
      return;
    }
    if (!category) {
      Alert.alert("Atenção", "Escolha o tipo de serviço.");
      return;
    }
    if (!region.trim() && !address.trim()) {
      Alert.alert("Atenção", "Indique a região ou o endereço do serviço.");
      return;
    }
    if (phone.trim() && !PHONE.test(phone.trim())) {
      Alert.alert("Atenção", "Telefone inválido.");
      return;
    }
    if (email.trim() && !EMAIL.test(email.trim())) {
      Alert.alert("Atenção", "E-mail inválido.");
      return;
    }

    setSaving(true);
    try {
      const body: Record<string, any> = {
        name: name.trim(),
        category,
        description: description.trim(),
        requiredDocuments: documents
          .split("\n")
          .map((d) => d.trim())
          .filter(Boolean),
        howToRequest: howToRequest.trim(),
        fee: fee.trim(),
        processingTime: processingTime.trim(),
        address: address.trim(),
        region: region.trim(),
        schedule: schedule.trim(),
        phone: phone.trim(),
        email: email.trim(),
        website: website.trim(),
        lat: coords ? coords.lat : null,
        lng: coords ? coords.lng : null,
        isPublished,
      };

      if (editing) {
        await updateService(editing.id, body);
        Alert.alert("Pronto", "Serviço atualizado.");
        navigation.goBack();
      } else {
        const created = await createService(body);
        if (created?.id && navigation.replace) navigation.replace("GovService", { id: created.id });
        else navigation.goBack();
      }
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível guardar o serviço."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Page>
      <Title>{editing ? "✏️ Editar serviço" : "🏛️ Novo serviço público"}</Title>

      <Field label="Nome do serviço" value={name} onChangeText={setName} placeholder="Ex: Licença de pesca artesanal" />
      <ChipGroup
        label="Tipo de serviço"
        options={catalog.serviceCategories.map((c) => ({ ...c, icon: SERVICE_ICON[c.value] }))}
        value={category}
        onChange={setCategory}
      />

      <Field label="Descrição" value={description} onChangeText={setDescription} multiline placeholder="O que é o serviço e para quem é" />
      <Field
        label="Documentos necessários (um por linha)"
        value={documents}
        onChangeText={setDocuments}
        multiline
        placeholder={"Bilhete de identidade\nFotografia\nComprovativo de morada"}
      />
      <Field label="Onde e como pedir" value={howToRequest} onChangeText={setHowToRequest} multiline placeholder="Passos para fazer o pedido" />
      <Field label="Custo (opcional)" value={fee} onChangeText={setFee} placeholder="Ex: 5 000 FCFA, ou gratuito" />
      <Field label="Prazo de resposta (opcional)" value={processingTime} onChangeText={setProcessingTime} placeholder="Ex: 5 dias úteis" />

      <Field label="Endereço" value={address} onChangeText={setAddress} multiline placeholder="Ex: Avenida Amílcar Cabral, Bissau" />
      <Field label="Região" value={region} onChangeText={setRegion} placeholder="Ex: Bissau (SAB)" />
      {regions.length > 0 ? (
        <View style={u.row}>
          {regions.map((r) => (
            <Chip key={r} label={r} active={region === r} onPress={() => setRegion(region === r ? "" : r)} />
          ))}
        </View>
      ) : null}

      <Text style={u.label}>📍 Ponto no mapa</Text>
      <Text style={u.muted}>{coords ? `Guardado: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : "Sem coordenadas. Aparece no centro da região."}</Text>
      <View style={u.row}>
        <Btn small kind="outline" label={locating ? "A procurar o sinal GPS..." : "📡 Usar a minha localização"} onPress={useMyLocation} disabled={locating} />
        {coords ? <Btn small kind="danger" label="Remover" onPress={() => setCoords(null)} /> : null}
      </View>

      <Field label="Horário (opcional)" value={schedule} onChangeText={setSchedule} multiline placeholder="Ex: Segunda a sexta, das 8h às 15h" />
      <Field label="Telefone (opcional)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <Field label="E-mail (opcional)" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      <Field label="Website (opcional)" value={website} onChangeText={setWebsite} autoCapitalize="none" placeholder="www.exemplo.gov" />

      <Card>
        <View style={u.between}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={u.strong}>{isPublished ? "Publicado" : "Rascunho"}</Text>
            <Text style={u.muted}>{isPublished ? "Todas as pessoas veem este serviço no app." : "Só a sua instituição vê. Pode publicar mais tarde."}</Text>
          </View>
          <Switch value={isPublished} onValueChange={setIsPublished} trackColor={{ true: colors.primary, false: "#BDBDBD" }} />
        </View>
      </Card>

      <Text style={[u.muted, { marginTop: 8 }]}>O estado (disponível, só com marcação, indisponível) muda-se na página do serviço, depois de o guardar.</Text>

      <Btn label={saving ? "A guardar..." : editing ? "Guardar alterações" : "Registar serviço"} onPress={save} disabled={saving} />
      <Btn kind="outline" label="Cancelar" onPress={() => navigation.goBack()} />
    </Page>
  );
}
