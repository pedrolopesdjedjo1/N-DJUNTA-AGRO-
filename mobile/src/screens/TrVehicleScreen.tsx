import React, { useCallback, useState } from "react";
import { View, Text, Image, ScrollView, Alert, Linking } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import TrLayout from "../components/transporter/TrLayout";
import { Page, Title, SubTitle, Card, Badge, Btn, Chip, Empty, Field, useLoader, u } from "../components/ui";
import { getTrProfile, setTrVehicleStatus } from "../api/transporterV2";
import { useTrCatalog } from "../utils/transportCatalogV2";
import { labelOf } from "../utils/ngoCatalog";
import { TR_CARGO_ICON, TR_VEHICLE_ICON, TR_VEHICLE_STATUS_COLOR, TR_VEHICLE_STATUS_ICON, trVehicleReasons } from "../constants/transporterV2";
import { getApiErrorMessage } from "../api/errorMessage";
import { formatDate } from "../constants/market";

export default function TrVehicleScreen({ navigation }: any) {
  const catalog = useTrCatalog();
  const loader = useLoader(getTrProfile, null as any);
  const d: any = loader.data;

  const [changing, setChanging] = useState(false);
  const [status, setStatus] = useState("OPERACIONAL");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loader.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  if (!d) {
    return (
      <TrLayout active="TrProfile">
        <Page loader={loader}>
          <Title>🚚 Meu veículo</Title>
          <Empty text="A carregar..." />
        </Page>
      </TrLayout>
    );
  }

  const p = d.profile;
  const reasons = trVehicleReasons(p);
  const docs: any[] = d.vehicleDocuments ?? [];
  const hasVehicle = !!p.vehicleType;

  function openChange() {
    setStatus(p.vehicleStatus);
    setNote(p.vehicleStatusNote ?? "");
    setChanging(!changing);
  }

  async function saveStatus() {
    if (status !== "OPERACIONAL" && note.trim().length < 3) {
      Alert.alert("Atenção", "Explique em poucas palavras o que se passa com o veículo.");
      return;
    }

    setBusy(true);
    try {
      loader.setData(await setTrVehicleStatus(status, note.trim() || undefined));
      setChanging(false);
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível mudar o estado."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <TrLayout active="TrProfile">
      <Page loader={loader}>
        <Title>🚚 Meu veículo</Title>

        {p.vehiclePhotos.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {p.vehiclePhotos.map((uri: string, i: number) => (
              <Image key={`${uri}-${i}`} source={{ uri }} style={{ width: 230, height: 160, borderRadius: 10, marginRight: 10, backgroundColor: "#ECEFF1" }} />
            ))}
          </ScrollView>
        ) : (
          <Card>
            <Text style={u.muted}>Ainda não há fotos do veículo. As fotos dão confiança a quem encomenda e são precisas para a verificação.</Text>
          </Card>
        )}

        <Card>
          <View style={u.between}>
            <Text style={[u.strong, { flex: 1, marginRight: 8, fontSize: 17 }]}>
              {TR_VEHICLE_ICON[p.vehicleType ?? "OUTRO"] ?? "🚚"} {hasVehicle ? labelOf(catalog.vehicleTypes, p.vehicleType) : "Veículo por registar"}
            </Text>
            <Badge label={`${TR_VEHICLE_STATUS_ICON[p.vehicleStatus] ?? ""} ${labelOf(catalog.vehicleStatus, p.vehicleStatus) || p.vehicleStatus}`.trim()} color={TR_VEHICLE_STATUS_COLOR[p.vehicleStatus] ?? "#757575"} />
          </View>
          {hasVehicle ? (
            <>
              {p.vehicleBrand || p.vehicleModel ? (
                <Text style={{ marginTop: 4 }}>
                  {[p.vehicleBrand, p.vehicleModel].filter(Boolean).join(" ")}
                  {p.vehicleYear ? ` (${p.vehicleYear})` : ""}
                </Text>
              ) : null}
              <Text style={u.muted}>{p.plate ? `Matrícula ${p.plate}` : p.vehicleType === "BARCO" ? "Sem matrícula" : "Matrícula por indicar"}</Text>
              <Text style={u.muted}>⚖️ Capacidade: {p.capacityKg ? `${p.capacityKg} kg` : "por indicar"}</Text>
            </>
          ) : null}
          {p.vehicleStatus !== "OPERACIONAL" && p.vehicleStatusNote ? <Text style={{ color: "#EF6C00", marginTop: 4 }}>📝 {p.vehicleStatusNote}</Text> : null}
          <Btn small label={hasVehicle ? "✏️ Editar o veículo" : "➕ Registar o veículo"} onPress={() => navigation.navigate("TrVehicleForm")} />
        </Card>

        <SubTitle>Que produtos pode transportar</SubTitle>
        <Card>
          {p.cargoTypes.length === 0 ? (
            <Text style={u.muted}>Todos os tipos de carga. Se quiser aceitar só alguns (por exemplo, só peixe), escolha-os ao editar o veículo.</Text>
          ) : (
            <View style={u.row}>
              {p.cargoTypes.map((c: string) => (
                <Badge key={c} label={`${TR_CARGO_ICON[c] ?? "📦"} ${labelOf(catalog.cargoTypes, c) || c}`} color="#00838F" />
              ))}
            </View>
          )}
        </Card>

        <SubTitle>Disponibilidade do veículo</SubTitle>
        <Card>
          {reasons.length === 0 ? (
            <Text style={{ color: "#2E7D32", fontWeight: "bold" }}>✅ O veículo está pronto para aceitar entregas.</Text>
          ) : (
            reasons.map((r) => (
              <Text key={r} style={{ color: "#EF6C00", marginBottom: 2 }}>
                ⚠️ {catalog.compatMessages[r] ?? r}
              </Text>
            ))
          )}
          <Text style={[u.muted, { marginTop: 6 }]}>
            Só aceita entregas que servem ao seu veículo e à sua capacidade de carga. Quem aceita a carga errada põe o comprador e o vendedor em risco, por isso o app não deixa.
          </Text>
          <Btn small kind="outline" label={changing ? "Cancelar" : "🔧 Mudar o estado do veículo"} onPress={openChange} />

          {changing ? (
            <View style={{ marginTop: 8 }}>
              <View style={u.row}>
                {catalog.vehicleStatus.map((s) => (
                  <Chip key={s.value} label={`${TR_VEHICLE_STATUS_ICON[s.value] ?? ""} ${s.label}`.trim()} active={status === s.value} onPress={() => setStatus(s.value)} />
                ))}
              </View>
              {status !== "OPERACIONAL" ? (
                <>
                  <Field label="O que se passa? (obrigatório)" value={note} onChangeText={setNote} multiline placeholder="Ex: Avaria no motor, volto na sexta." />
                  <Text style={u.muted}>Ao marcar o veículo como em manutenção ou avariado, fica indisponível e deixa de receber avisos de cargas.</Text>
                </>
              ) : (
                <Text style={u.muted}>Depois de pôr o veículo operacional, ligue a disponibilidade no perfil para voltar a receber entregas.</Text>
              )}
              <Btn label={busy ? "A guardar..." : "Guardar estado"} onPress={saveStatus} disabled={busy} />
            </View>
          ) : null}
        </Card>

        <SubTitle>Documentos do veículo ({docs.length})</SubTitle>
        {docs.length === 0 ? (
          <Text style={u.muted}>Ainda não enviou o livrete, o seguro ou a inspeção do veículo.</Text>
        ) : (
          docs.map((doc) => (
            <Card key={doc.id}>
              <Text style={u.strong}>{doc.name}</Text>
              <Text style={u.muted}>
                {labelOf(catalog.documentKinds, doc.kind)}
                {doc.expiresAt ? ` · válido até ${formatDate(doc.expiresAt)}` : ""}
              </Text>
              {doc.expired ? <Text style={{ color: "#C62828" }}>⛔ Fora do prazo. Renove-o.</Text> : doc.expiringSoon ? <Text style={{ color: "#EF6C00" }}>⚠️ Termina em breve.</Text> : null}
              {doc.url ? <Btn small kind="outline" label="Abrir documento" onPress={() => Linking.openURL(doc.url)} /> : null}
            </Card>
          ))
        )}
        <Btn kind="outline" label="📄 Enviar ou renovar documentos" onPress={() => navigation.navigate("TransporterVerification")} />
      </Page>
    </TrLayout>
  );
}
