import React, { useEffect, useState } from "react";
import { View, Text, Alert, Switch } from "react-native";
import { Page, Title, Card, Btn, Chip, Field, u } from "../components/ui";
import ChipGroup from "../components/ChipGroup";
import { createPlace, updatePlace, getGovRegions } from "../api/gov";
import { getPosition } from "../utils/location";
import { useGovCatalog } from "../utils/govCatalog";
import { PLACE_KIND_ICON } from "../constants/gov";
import { getApiErrorMessage } from "../api/errorMessage";
import { colors } from "../theme/colors";

const PHONE = /^[+\d][\d\s-]{5,19}$/;

export default function GovPlaceFormScreen({ navigation, route }: any) {
  const editing = route?.params?.place;
  const catalog = useGovCatalog();

  const [kind, setKind] = useState<string>(editing?.kind ?? route?.params?.kind ?? "");
  const [subtype, setSubtype] = useState<string>(editing?.subtype ?? "");
  const [name, setName] = useState<string>(editing?.name ?? "");
  const [description, setDescription] = useState<string>(editing?.description ?? "");
  const [region, setRegion] = useState<string>(editing?.region ?? "");
  const [address, setAddress] = useState<string>(editing?.address ?? "");
  const [status, setStatus] = useState<string>(editing?.status ?? "OPERACIONAL");
  const [schedule, setSchedule] = useState<string>(editing?.schedule ?? "");
  const [phone, setPhone] = useState<string>(editing?.phone ?? "");
  const [capacity, setCapacity] = useState<string>(editing?.capacity ?? "");
  const [products, setProducts] = useState<string>((editing?.products ?? []).join(", "));
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    editing && editing.lat !== null && editing.lng !== null && editing.lat !== undefined ? { lat: editing.lat, lng: editing.lng } : null
  );
  const [isPublic, setIsPublic] = useState<boolean>(editing ? editing.isPublic !== false : true);
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
      Alert.alert("Localização não disponível", "Ative a localização (GPS) e dê permissão ao app. Estando no local, o ponto fica exato no mapa.");
    }
  }

  async function save() {
    if (!kind) {
      Alert.alert("Atenção", "Escolha o tipo de local.");
      return;
    }
    if (!subtype) {
      Alert.alert("Atenção", "Escolha o tipo específico deste local.");
      return;
    }
    if (name.trim().length < 2) {
      Alert.alert("Atenção", "Escreva o nome do local.");
      return;
    }
    if (!region.trim()) {
      Alert.alert("Atenção", "Escreva a região do local.");
      return;
    }
    if (phone.trim() && !PHONE.test(phone.trim())) {
      Alert.alert("Atenção", "Telefone inválido.");
      return;
    }

    setSaving(true);
    try {
      const body: Record<string, any> = {
        kind,
        subtype,
        name: name.trim(),
        description: description.trim(),
        region: region.trim(),
        address: address.trim(),
        status,
        schedule: schedule.trim(),
        phone: phone.trim(),
        capacity: capacity.trim(),
        products: products
          .split(",")
          .map((p) => p.trim())
          .filter(Boolean),
        lat: coords ? coords.lat : null,
        lng: coords ? coords.lng : null,
        isPublic,
      };

      if (editing) {
        await updatePlace(editing.id, body);
        Alert.alert("Pronto", "Local atualizado.");
        navigation.goBack();
      } else {
        const created = await createPlace(body);
        if (created?.id && navigation.replace) navigation.replace("GovPlace", { id: created.id });
        else navigation.goBack();
      }
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível guardar o local."));
    } finally {
      setSaving(false);
    }
  }

  const subtypes = kind ? catalog.placeSubtypes[kind] ?? [] : [];
  const isMarket = kind === "MERCADO";
  const isZone = kind === "ZONA_PRODUCAO";

  return (
    <Page>
      <Title>{editing ? "✏️ Editar local" : "🏗️ Novo local"}</Title>

      <ChipGroup
        label="Tipo de local"
        options={catalog.placeKinds.map((k) => ({ ...k, icon: PLACE_KIND_ICON[k.value] }))}
        value={kind}
        onChange={(v) => {
          setKind(v);
          setSubtype("");
        }}
      />
      {subtypes.length > 0 ? <ChipGroup label="Mais específico" options={subtypes} value={subtype} onChange={setSubtype} /> : null}

      <Field
        label="Nome do local"
        value={name}
        onChangeText={setName}
        placeholder={isMarket ? "Ex: Mercado de Bandim" : isZone ? "Ex: Bolanhas de Cacheu" : "Ex: Ponte de Sonaco"}
      />
      <ChipGroup label="Estado" options={catalog.placeStatus} value={status} onChange={setStatus} />

      <Field label="Descrição (opcional)" value={description} onChangeText={setDescription} multiline />

      <Field label="Região" value={region} onChangeText={setRegion} placeholder="Ex: Bafatá" />
      {regions.length > 0 ? (
        <View style={u.row}>
          {regions.map((r) => (
            <Chip key={r} label={r} active={region === r} onPress={() => setRegion(region === r ? "" : r)} />
          ))}
        </View>
      ) : null}
      <Field label="Endereço ou como chegar (opcional)" value={address} onChangeText={setAddress} multiline />

      <Text style={u.label}>📍 Ponto no mapa</Text>
      <Text style={u.muted}>{coords ? `Guardado: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : "Sem coordenadas. Aparece no centro da região."}</Text>
      <View style={u.row}>
        <Btn small kind="outline" label={locating ? "A procurar o sinal GPS..." : "📡 Usar a minha localização"} onPress={useMyLocation} disabled={locating} />
        {coords ? <Btn small kind="danger" label="Remover" onPress={() => setCoords(null)} /> : null}
      </View>

      {isMarket ? <Field label="Dias e horário (opcional)" value={schedule} onChangeText={setSchedule} placeholder="Ex: Todos os dias, das 6h às 18h" multiline /> : null}
      {kind === "INFRAESTRUTURA" ? <Field label="Horário (opcional)" value={schedule} onChangeText={setSchedule} multiline /> : null}
      <Field label="Telefone (opcional)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <Field
        label={isZone ? "Área ou produção estimada (opcional)" : "Capacidade (opcional)"}
        value={capacity}
        onChangeText={setCapacity}
        placeholder={isZone ? "Ex: 300 hectares" : isMarket ? "Ex: 200 bancas" : "Ex: 50 toneladas"}
      />
      {isMarket || isZone ? (
        <Field
          label={isZone ? "Principais produtos (separe com vírgulas)" : "O que se vende (separe com vírgulas)"}
          value={products}
          onChangeText={setProducts}
          placeholder="Ex: arroz, caju, peixe"
        />
      ) : null}

      <Card>
        <View style={u.between}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={u.strong}>Local público</Text>
            <Text style={u.muted}>{isPublic ? "Todas as pessoas veem este local no app e no mapa." : "Só a sua instituição vê este local."}</Text>
          </View>
          <Switch value={isPublic} onValueChange={setIsPublic} trackColor={{ true: colors.primary, false: "#BDBDBD" }} />
        </View>
      </Card>

      <Btn label={saving ? "A guardar..." : editing ? "Guardar alterações" : "Registar local"} onPress={save} disabled={saving} />
      <Btn kind="outline" label="Cancelar" onPress={() => navigation.goBack()} />
    </Page>
  );
}
