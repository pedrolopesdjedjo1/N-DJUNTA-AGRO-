import React, { useCallback, useState } from "react";
import { View, Text, Image, Switch, Alert, TouchableOpacity } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import TrLayout from "../components/transporter/TrLayout";
import { Page, Title, SubTitle, Card, Badge, Btn, Empty, useLoader, u } from "../components/ui";
import { getTrProfile, setTrAvailability } from "../api/transporterV2";
import { useTrCatalog } from "../utils/transportCatalogV2";
import { labelOf } from "../utils/ngoCatalog";
import {
  TR_BADGE,
  TR_KIND_ICON,
  TR_VEHICLE_ICON,
  TR_VEHICLE_STATUS_COLOR,
  TR_VEHICLE_STATUS_ICON,
  TR_VERIFICATION_COLOR,
  trStars,
  trVehicleReasons,
} from "../constants/transporterV2";
import { getApiErrorMessage } from "../api/errorMessage";
import { colors } from "../theme/colors";

const MENU: [string, string, string, Record<string, any> | undefined][] = [
  ["⭐", "Avaliações e reputação", "TrReputation", undefined],
  ["📚", "Histórico de serviços", "TrDeliveries", { phase: "completed" }],
  ["👥", "Clientes e contactos", "TrContacts", undefined],
  ["🧳", "Cargas e ofertas de transporte", "TrLoads", undefined],
  ["🧰", "Ferramentas e serviços", "TrTools", undefined],
  ["🆘", "Emergência", "TrEmergency", undefined],
  ["🔐", "Segurança", "TrSecurity", undefined],
  ["⚙️", "Configurações", "TrSettings", undefined],
];

export default function TrProfileScreen({ navigation }: any) {
  const catalog = useTrCatalog();
  const loader = useLoader(getTrProfile, null as any);
  const d: any = loader.data;
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
          <Title>👤 Meu perfil</Title>
          <Empty text="A carregar..." />
        </Page>
      </TrLayout>
    );
  }

  const p = d.profile;
  const user = d.user;
  const reasons = trVehicleReasons(p);
  const vehicleOk = d.vehicleReady;
  const missing: string[] = d.checklist?.missing ?? [];

  async function toggleAvailability(value: boolean) {
    setBusy(true);
    try {
      loader.setData(await setTrAvailability(value));
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível mudar a disponibilidade."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <TrLayout active="TrProfile">
      <Page loader={loader}>
        <View style={[u.row, { alignItems: "center" }]}>
          {user.photoUrl ? (
            <Image source={{ uri: user.photoUrl }} style={[u.photo, { width: 76, height: 76, borderRadius: 38 }]} />
          ) : (
            <View style={[u.photo, { width: 76, height: 76, borderRadius: 38, alignItems: "center", justifyContent: "center" }]}>
              <Text style={{ fontSize: 32 }}>{TR_VEHICLE_ICON[p.vehicleType ?? "OUTRO"] ?? "🚚"}</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Title>
              {user.name} {user.isVerified ? "✅" : ""}
            </Title>
            <Text style={u.muted}>
              {TR_KIND_ICON[p.transporterKind] ?? "🧑"} {labelOf(catalog.transporterKinds, p.transporterKind) || "Transportador"}
            </Text>
            <Text style={u.muted}>
              {d.rating.average ? `${trStars(d.rating.average)} ${d.rating.average} (${d.rating.count})` : "Ainda sem avaliações"} · {d.stats.delivered} entrega(s)
            </Text>
          </View>
        </View>

        <Card>
          <View style={u.between}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={u.strong}>{p.isAvailable ? "🟢 Disponível para entregas" : "🔴 Indisponível"}</Text>
              <Text style={u.muted}>
                {!vehicleOk && !p.isAvailable ? "Ponha o veículo pronto para ficar disponível." : p.isAvailable ? "Vê e aceita as cargas que servem ao seu veículo." : "Não recebe avisos de cargas novas."}
              </Text>
            </View>
            <Switch
              value={p.isAvailable}
              onValueChange={toggleAvailability}
              disabled={busy || (!vehicleOk && !p.isAvailable)}
              trackColor={{ true: colors.primary, false: "#BDBDBD" }}
            />
          </View>
        </Card>

        <Card>
          <Text>📞 {user.phone ?? "Sem telefone"}</Text>
          {user.location ? <Text style={u.muted}>📍 {user.location}</Text> : null}
          <Text style={u.muted}>
            🧭 Região de atuação: {p.regions.length > 0 ? p.regions.map((k: string) => k).join(", ") : "ainda não indicou"}
          </Text>
          {p.bio ? <Text style={[u.muted, { marginTop: 4, lineHeight: 19 }]}>{p.bio}</Text> : null}
          <Btn small kind="outline" label="✏️ Editar o perfil" onPress={() => navigation.navigate("TrProfileEdit")} />
        </Card>

        <SubTitle>Meu veículo</SubTitle>
        <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate("TrVehicle")}>
          <Card>
            <View style={u.between}>
              <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>
                {TR_VEHICLE_ICON[p.vehicleType ?? "OUTRO"] ?? "🚚"} {p.vehicleType ? labelOf(catalog.vehicleTypes, p.vehicleType) : "Ainda não registou o veículo"}
              </Text>
              <Badge label={`${TR_VEHICLE_STATUS_ICON[p.vehicleStatus] ?? ""} ${labelOf(catalog.vehicleStatus, p.vehicleStatus) || p.vehicleStatus}`.trim()} color={TR_VEHICLE_STATUS_COLOR[p.vehicleStatus] ?? "#757575"} />
            </View>
            {p.vehicleType ? (
              <Text style={u.muted}>
                {[p.vehicleBrand, p.vehicleModel].filter(Boolean).join(" ")}
                {p.plate ? ` · ${p.plate}` : ""}
                {p.capacityKg ? ` · ${p.capacityKg} kg` : ""}
              </Text>
            ) : null}
            {reasons.length > 0 ? (
              <Text style={{ color: "#EF6C00", marginTop: 4 }}>⚠️ {catalog.compatMessages[reasons[0]] ?? "O veículo ainda não está pronto."}</Text>
            ) : (
              <Text style={{ color: "#2E7D32", marginTop: 4 }}>Pronto para aceitar entregas.</Text>
            )}
          </Card>
        </TouchableOpacity>

        <SubTitle>Verificação</SubTitle>
        <Card>
          <View style={u.between}>
            <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>Documentos e identidade</Text>
            <Badge label={labelOf(catalog.verificationStatus, p.verificationStatus) || p.verificationStatus} color={TR_VERIFICATION_COLOR[p.verificationStatus] ?? "#757575"} />
          </Badge>
          {p.verificationNote ? <Text style={[u.muted, { marginTop: 4 }]}>📝 {p.verificationNote}</Text> : null}
          {missing.length > 0 && p.verificationStatus !== "APROVADO" ? (
            <Text style={[u.muted, { marginTop: 4 }]}>Falta: {missing.join(", ")}.</Text>
          ) : null}
          <Btn small kind="outline" label="📄 Documentos e verificação" onPress={() => navigation.navigate("TransporterVerification")} />
        </Card>

        <SubTitle>Mais</SubTitle>
        <View style={u.grid}>
          {MENU.map(([icon, label, route, params]) => (
            <TouchableOpacity key={route} style={u.tile} onPress={() => navigation.navigate(route, params)}>
              <View style={u.tileBox}>
                <Text style={{ fontSize: 22 }}>{icon}</Text>
                <Text style={[u.strong, { marginTop: 4 }]}>{label}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={u.row}>
          <Btn small kind="outline" label="💬 Mensagens" onPress={() => navigation.navigate("Conversations")} />
          <Btn small kind="outline" label="🔔 Notificações" onPress={() => navigation.navigate("Notifications")} />
        </View>
      </Page>
    </TrLayout>
  );
}
