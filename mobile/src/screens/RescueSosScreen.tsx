import React, { useEffect, useState } from "react";
import { View, Text, Alert, Linking } from "react-native";
import { useAuth } from "../context/AuthContext";
import { Page, Title, Card, Badge, Btn, Chip, Empty, useLoader, u } from "../components/ui";
import { getActiveSos, setSosStatus } from "../api/sos";
import { getApiErrorMessage } from "../api/errorMessage";
import { mapsLink } from "../utils/location";
import { SOS_KINDS, SOS_STATUS, formatDateTime } from "../constants/market";

const RESCUE = ["ADMIN", "GOVERNO"];

function ago(minutes: number) {
  if (minutes < 1) return "agora mesmo";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  return `há ${Math.floor(hours / 24)} dia(s)`;
}

export default function RescueSosScreen({ navigation }: any) {
  const { user } = useAuth();
  const allowed = RESCUE.includes(user?.role ?? "");
  const [tab, setTab] = useState("");

  const loader = useLoader(() => (allowed ? getActiveSos(tab || undefined) : Promise.resolve([])), [] as any[], [tab]);
  const alerts: any[] = loader.data;

  useEffect(() => {
    if (!allowed || tab) return;
    const timer = setInterval(() => loader.reload(), 30000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed, tab]);

  async function change(a: any, status: "EM_RESGATE" | "RESOLVIDO" | "CANCELADO") {
    try {
      await setSosStatus(a.id, status);
      loader.reload();
    } catch (e) {
      Alert.alert("Erro", getApiErrorMessage(e, "Não foi possível atualizar o pedido."));
    }
  }

  if (!allowed) {
    return (
      <Page>
        <Title>🆘 Pedidos de socorro</Title>
        <Empty text="Acesso restrito à equipa de resgate." />
      </Page>
    );
  }

  return (
    <Page loader={loader}>
      <Title>🆘 Pedidos de socorro</Title>

      <View style={u.row}>
        <Chip label="Ativos" active={tab === ""} onPress={() => setTab("")} />
        <Chip label="Resolvidos" active={tab === "RESOLVIDO"} onPress={() => setTab("RESOLVIDO")} />
        <Chip label="Cancelados" active={tab === "CANCELADO"} onPress={() => setTab("CANCELADO")} />
      </View>

      {tab === "" ? <Text style={u.muted}>Esta lista atualiza sozinha a cada 30 segundos.</Text> : null}

      {alerts.length === 0 ? (
        <Empty text={tab === "" ? "Nenhum pedido de socorro ativo." : "Nenhum pedido encontrado."} />
      ) : (
        alerts.map((a) => {
          const st = SOS_STATUS[a.status];
          const kindLabel = SOS_KINDS.find((k) => k.value === a.kind)?.label ?? a.kind;
          const hasCoords = a.lat !== null && a.lng !== null;
          const isActive = ["ABERTO", "EM_RESGATE"].includes(a.status);
          return (
            <Card key={a.id}>
              <View style={u.between}>
                <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>{kindLabel}</Text>
                <Badge label={st?.label ?? a.status} color={st?.color ?? "#757575"} />
              </View>
              <Text style={u.strong}>{a.user?.name ?? "Pescador"}</Text>
              {a.user?.phone || a.contactPhone ? <Text style={u.muted}>📞 {a.user?.phone ?? a.contactPhone}</Text> : null}
              <Text style={u.muted}>
                {formatDateTime(a.createdAt)} · {ago(a.minutesAgo)}
              </Text>
              {a.message ? <Text style={{ marginTop: 6 }}>{a.message}</Text> : null}
              <Text style={[u.muted, { marginTop: 6 }]}>
                📍 {a.locationText || (hasCoords ? `${Number(a.lat).toFixed(4)}, ${Number(a.lng).toFixed(4)}` : "Localização não enviada")}
              </Text>
              {a.locationUpdatedAt ? <Text style={u.muted}>Localização atualizada: {formatDateTime(a.locationUpdatedAt)}</Text> : null}

              <View style={u.row}>
                {hasCoords ? (
                  <Btn small label="🗺️ Abrir no mapa" onPress={() => Linking.openURL(mapsLink(a.lat, a.lng))} />
                ) : null}
                {a.user?.phone || a.contactPhone ? (
                  <Btn small kind="outline" label="📞 Ligar" onPress={() => Linking.openURL(`tel:${a.user?.phone ?? a.contactPhone}`)} />
                ) : null}
                {a.user ? (
                  <Btn
                    small
                    kind="outline"
                    label="💬 Mensagem"
                    onPress={() => navigation.navigate("Chat", { userId: a.user.id, userName: a.user.name })}
                  />
                ) : null}
              </View>

              {isActive && (
                <View style={u.row}>
                  {a.status === "ABERTO" ? <Btn small label="Assumir (em resgate)" onPress={() => change(a, "EM_RESGATE")} /> : null}
                  <Btn small kind="outline" label="✅ Resolvido" onPress={() => change(a, "RESOLVIDO")} />
                  <Btn small kind="danger" label="Cancelar" onPress={() => change(a, "CANCELADO")} />
                </View>
              )}
            </Card>
          );
        })
      )}
    </Page>
  );
}
