import React, { useEffect, useState } from "react";
import { View, Text, Image, Alert, Share, Switch } from "react-native";
import { Page, Title, Card, Btn, Chip, Field, useLoader, u } from "../components/ui";
import ChipGroup from "../components/ChipGroup";
import { createReport, listInstitutions, getGovRegions } from "../api/gov";
import { pickImage, uploadImageBase64 } from "../utils/storage";
import { getPosition } from "../utils/location";
import { useGovCatalog } from "../utils/govCatalog";
import { REPORT_ICON } from "../constants/gov";
import { getApiErrorMessage } from "../api/errorMessage";
import { colors } from "../theme/colors";

interface Photo {
  uri: string;
  base64: string;
}

const MAX_PHOTOS = 4;

const HINT: Record<string, string> = {
  PEDIDO_APOIO: "Explique de que apoio precisa e quantas pessoas ajuda. A instituição vai precisar de o contactar.",
  PROBLEMA_AGRICOLA: "Conte o problema: pragas, falta de água, sementes, terra... Diga onde e desde quando.",
  PROBLEMA_PESCA: "Conte o problema: licenças, equipamento, locais de pesca, conflitos... Diga onde e desde quando.",
  INFRAESTRUTURA: "Diga o que está danificado (estrada, ponte, poço, armazém...), onde fica e o que isso causa. Uma foto ajuda muito.",
  MERCADO: "Conte o problema do mercado: preços, taxas, falta de espaço, higiene... Diga qual mercado.",
  DENUNCIA: "Conte o que viu, onde e quando. Pode enviar a denúncia sem dar o seu nome.",
  SUGESTAO: "Conte a sua ideia para melhorar um serviço ou um programa.",
};

// Qualquer pessoa envia um pedido, um problema, uma denúncia ou uma sugestão a uma instituição pública
export default function GovReportFormScreen({ navigation, route }: any) {
  const params = route?.params ?? {};
  const catalog = useGovCatalog();

  const [category, setCategory] = useState<string>(params.category ?? "");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [institutionId, setInstitutionId] = useState<string>(params.institutionId ?? "");
  const [instSearch, setInstSearch] = useState("");
  const [placeId, setPlaceId] = useState<string>(params.placeId ?? "");
  const [region, setRegion] = useState<string>(params.region ?? "");
  const [location, setLocation] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [anonymous, setAnonymous] = useState(false);
  const [regions, setRegions] = useState<string[]>([]);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);

  const loader = useLoader(() => listInstitutions({}), [] as any[]);
  const institutions: any[] = loader.data;

  useEffect(() => {
    getGovRegions()
      .then((list) => setRegions(list.map((r) => r.name)))
      .catch(() => {});
  }, []);

  const search = instSearch.trim().toLowerCase();
  const shown = institutions
    .filter((i) => !search || `${i.name} ${i.acronym ?? ""}`.toLowerCase().includes(search))
    .slice(0, 10);
  const presetMissing = !!params.institutionId && !institutions.some((i) => i.ownerId === params.institutionId);

  async function addPhoto(fromCamera: boolean) {
    if (photos.length >= MAX_PHOTOS) {
      Alert.alert("Atenção", `Pode juntar até ${MAX_PHOTOS} fotos.`);
      return;
    }
    const picked = await pickImage(fromCamera);
    if (picked) setPhotos((prev) => [...prev, { uri: picked.uri, base64: picked.base64 }]);
  }

  async function useMyLocation() {
    setLocating(true);
    const position = await getPosition();
    setLocating(false);
    if (position) {
      setCoords(position);
    } else {
      Alert.alert("Localização não disponível", "Ative a localização (GPS) e dê permissão ao app. Estando no local do problema, o ponto fica exato.");
    }
  }

  async function send() {
    if (!category) {
      Alert.alert("Atenção", "Escolha o tipo de pedido ou de denúncia.");
      return;
    }
    if (title.trim().length < 3) {
      Alert.alert("Atenção", "Escreva um título curto.");
      return;
    }
    if (message.trim().length < 10) {
      Alert.alert("Atenção", "Explique melhor o que se passa (pelo menos 10 letras).");
      return;
    }

    setSaving(true);
    try {
      const imageUrls: string[] = [];
      for (const photo of photos) {
        imageUrls.push(await uploadImageBase64(photo.base64, "pedido-"));
      }

      const result = await createReport({
        category,
        title: title.trim(),
        message: message.trim(),
        anonymous: anonymous && category !== "PEDIDO_APOIO",
        institutionId: institutionId || undefined,
        placeId: placeId || undefined,
        region: region.trim() || undefined,
        location: location.trim() || undefined,
        lat: coords ? coords.lat : undefined,
        lng: coords ? coords.lng : undefined,
        imageUrls,
      });

      Alert.alert(
        "Pedido enviado",
        `Número de protocolo: ${result.protocol}\n\nGuarde este número: serve para acompanhar o pedido. Vai também receber avisos quando houver novidades.`,
        [
          {
            text: "Partilhar protocolo",
            onPress: async () => {
              try {
                await Share.share({ message: `Protocolo do meu pedido no NÔDJUNTA AGRO: ${result.protocol}` });
              } catch (e) {
                // a pessoa fechou a janela de partilha
              }
              navigation.replace("GovMyReport", { id: result.id });
            },
          },
          { text: "Ver o meu pedido", onPress: () => navigation.replace("GovMyReport", { id: result.id }) },
        ]
      );
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível enviar o pedido."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Page loader={loader}>
      <Title>📝 Pedido ou denúncia</Title>
      <Text style={u.muted}>Envie um pedido, um problema, uma denúncia ou uma sugestão a uma instituição pública. Recebe um número de protocolo para acompanhar.</Text>

      <Card>
        <Text style={u.strong}>⚠️ Perigo imediato?</Text>
        <Text style={u.muted}>Este formulário não é um serviço de emergência. Se alguém corre perigo agora, peça ajuda já às autoridades locais.</Text>
      </Card>

      <ChipGroup
        label="O que quer enviar?"
        options={catalog.reportCategories.map((c) => ({ ...c, icon: REPORT_ICON[c.value] }))}
        value={category}
        onChange={setCategory}
      />
      {category && HINT[category] ? <Text style={[u.muted, { marginTop: 6 }]}>{HINT[category]}</Text> : null}

      <Field label="Título" value={title} onChangeText={setTitle} placeholder="Ex: A ponte de Sonaco está partida" />
      <Field label="O que se passa" value={message} onChangeText={setMessage} multiline placeholder="Conte com os detalhes que souber" />

      <Text style={u.label}>Para que instituição?</Text>
      <View style={u.row}>
        <Chip label="Qualquer instituição" active={institutionId === ""} onPress={() => setInstitutionId("")} />
        {presetMissing ? (
          <Chip label={params.institutionName ?? "Instituição escolhida"} active={institutionId === params.institutionId} onPress={() => setInstitutionId(params.institutionId)} />
        ) : null}
        {shown.map((i) => (
          <Chip key={i.ownerId} label={i.acronym || i.name} active={institutionId === i.ownerId} onPress={() => setInstitutionId(institutionId === i.ownerId ? "" : i.ownerId)} />
        ))}
      </View>
      {institutions.length > 10 || search ? (
        <Field placeholder="Procurar instituição" value={instSearch} onChangeText={setInstSearch} />
      ) : null}
      {institutionId === "" ? (
        <Text style={u.muted}>Fica aberto a todas as instituições. A primeira que o assumir responde-lhe.</Text>
      ) : null}

      {placeId ? (
        <Card>
          <Text style={u.strong}>📍 Local ligado: {params.placeName ?? "local escolhido"}</Text>
          <Btn small kind="outline" label="Tirar a ligação" onPress={() => setPlaceId("")} />
        </Card>
      ) : null}

      <Field label="Região" value={region} onChangeText={setRegion} placeholder="Ex: Bafatá" />
      {regions.length > 0 ? (
        <View style={u.row}>
          {regions.map((r) => (
            <Chip key={r} label={r} active={region === r} onPress={() => setRegion(region === r ? "" : r)} />
          ))}
        </View>
      ) : null}

      <Field label="Onde fica (opcional)" value={location} onChangeText={setLocation} placeholder="Ex: Entrada da tabanca de Sonaco, junto ao rio" />
      <Text style={u.muted}>{coords ? `📍 Ponto GPS guardado: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : "Sem ponto GPS."}</Text>
      <View style={u.row}>
        <Btn small kind="outline" label={locating ? "A procurar o sinal GPS..." : "📡 Usar a minha localização"} onPress={useMyLocation} disabled={locating} />
        {coords ? <Btn small kind="danger" label="Remover" onPress={() => setCoords(null)} /> : null}
      </View>

      <Text style={u.label}>📸 Fotos (até {MAX_PHOTOS}, opcional)</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {photos.map((p, i) => (
          <View key={`${p.uri}-${i}`} style={{ marginRight: 10, marginBottom: 10 }}>
            <Image source={{ uri: p.uri }} style={{ width: 80, height: 80, borderRadius: 8 }} />
            <Btn small kind="danger" label="Tirar" onPress={() => setPhotos((prev) => prev.filter((_, idx) => idx !== i))} />
          </View>
        ))}
      </View>
      <View style={u.row}>
        <Btn small kind="outline" label="📷 Da galeria" onPress={() => addPhoto(false)} />
        <Btn small kind="outline" label="📸 Tirar foto" onPress={() => addPhoto(true)} />
      </View>
      <Text style={u.muted}>As fotos ficam no armazenamento do app. Evite mostrar rostos, sobretudo de crianças.</Text>

      {category && category !== "PEDIDO_APOIO" ? (
        <Card>
          <View style={u.between}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={u.strong}>Enviar sem o meu nome</Text>
              <Text style={u.muted}>
                {anonymous
                  ? "A instituição não vê o seu nome nem o seu telefone e não pode falar consigo. Acompanhe pelo número de protocolo."
                  : "A instituição vê o seu nome e pode contactá-lo."}
              </Text>
            </View>
            <Switch value={anonymous} onValueChange={setAnonymous} trackColor={{ true: colors.primary, false: "#BDBDBD" }} />
          </View>
        </Card>
      ) : null}

      <Text style={[u.muted, { marginTop: 8 }]}>Pode ter até 10 pedidos em aberto e enviar até 5 por dia.</Text>

      <Btn label={saving ? "A enviar..." : "Enviar"} onPress={send} disabled={saving} />
      <Btn kind="outline" label="Os meus pedidos" onPress={() => navigation.navigate("GovMyReports")} />
    </Page>
  );
}
