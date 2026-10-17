import React, { useEffect, useState } from "react";
import { View, Text, Alert } from "react-native";
import { Page, Title, Btn, Chip, Field, u } from "../components/ui";
import ChipGroup from "../components/ChipGroup";
import { createCommunity, updateCommunity } from "../api/ngo";
import { getWeatherRegions } from "../api/weather";
import { getPosition } from "../utils/location";
import { useNgoCatalog } from "../utils/ngoCatalog";
import { getApiErrorMessage } from "../api/errorMessage";

export default function NgoCommunityFormScreen({ navigation, route }: any) {
  const editing = route?.params?.community;
  const catalog = useNgoCatalog();

  const [name, setName] = useState<string>(editing?.name ?? "");
  const [region, setRegion] = useState<string>(editing?.region ?? "");
  const [type, setType] = useState<string>(editing?.type ?? "RURAL");
  const [population, setPopulation] = useState<string>(
    editing?.population !== null && editing?.population !== undefined ? String(editing.population) : ""
  );
  const [description, setDescription] = useState<string>(editing?.description ?? "");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    editing && editing.lat !== null && editing.lng !== null && editing.lat !== undefined ? { lat: editing.lat, lng: editing.lng } : null
  );
  const [regions, setRegions] = useState<string[]>([]);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getWeatherRegions()
      .then(setRegions)
      .catch(() => {});
  }, []);

  async function useMyLocation() {
    setLocating(true);
    const position = await getPosition();
    setLocating(false);
    if (position) {
      setCoords(position);
    } else {
      Alert.alert("Localização não disponível", "Ative a localização (GPS) e dê permissão ao app. Pode estar na comunidade para guardar o ponto exato.");
    }
  }

  async function save() {
    if (name.trim().length < 2) {
      Alert.alert("Atenção", "Escreva o nome da comunidade.");
      return;
    }
    if (!region.trim()) {
      Alert.alert("Atenção", "Escreva a região da comunidade.");
      return;
    }

    const pop = population.trim() ? parseInt(population, 10) : null;
    if (pop !== null && (isNaN(pop) || pop < 0)) {
      Alert.alert("Atenção", "A população deve ser um número.");
      return;
    }

    setSaving(true);
    try {
      const body: Record<string, any> = {
        name: name.trim(),
        region: region.trim(),
        type,
        population: pop,
        description: description.trim(),
      };

      if (editing) {
        body.lat = coords ? coords.lat : null;
        body.lng = coords ? coords.lng : null;
        await updateCommunity(editing.id, body);
      } else {
        if (coords) {
          body.lat = coords.lat;
          body.lng = coords.lng;
        }
        await createCommunity(body);
      }

      Alert.alert("Pronto", editing ? "Comunidade atualizada." : "Comunidade registada.");
      navigation.goBack();
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível guardar a comunidade."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Page>
      <Title>{editing ? "✏️ Editar comunidade" : "➕ Nova comunidade"}</Title>

      <Field label="Nome da comunidade" value={name} onChangeText={setName} placeholder="Ex: Sonaco" />

      <ChipGroup label="Tipo de comunidade" options={catalog.communityTypes} value={type} onChange={setType} />

      <Field label="Região" value={region} onChangeText={setRegion} placeholder="Ex: Gabú" />
      {regions.length > 0 ? (
        <View style={u.row}>
          {regions.map((r) => (
            <Chip key={r} label={r} active={region === r} onPress={() => setRegion(r)} />
          ))}
        </View>
      ) : null}

      <Field
        label="Número de habitantes (opcional)"
        value={population}
        onChangeText={(v) => setPopulation(v.replace(/\D/g, ""))}
        keyboardType="numeric"
        placeholder="Ex: 800"
      />

      <Field label="Descrição (opcional)" value={description} onChangeText={setDescription} multiline placeholder="Como vive a comunidade, o que produz, como chegar" />

      <Text style={u.label}>📍 Localização no mapa</Text>
      <Text style={u.muted}>
        {coords ? `Guardada: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : "Sem coordenadas. A comunidade aparece no centro da região."}
      </Text>
      <View style={u.row}>
        <Btn
          small
          kind="outline"
          label={locating ? "A procurar o sinal GPS..." : "📡 Usar a minha localização"}
          onPress={useMyLocation}
          disabled={locating}
        />
        {coords ? <Btn small kind="danger" label="Remover" onPress={() => setCoords(null)} /> : null}
      </View>

      <Btn label={saving ? "A guardar..." : editing ? "Guardar alterações" : "Registar comunidade"} onPress={save} disabled={saving} />
      <Btn kind="outline" label="Cancelar" onPress={() => navigation.goBack()} />
    </Page>
  );
}
