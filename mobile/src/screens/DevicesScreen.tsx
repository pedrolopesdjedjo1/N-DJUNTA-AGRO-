import React, { useCallback, useState } from "react";
import { View, Text, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Page, Title, Card, Badge, Btn, Empty, u } from "../components/ui";
import { listDevices, removeDevice } from "../api/transporterV2";
import { getDeviceId } from "../utils/deviceId";
import { getApiErrorMessage } from "../api/errorMessage";
import { formatDateTime } from "../constants/market";

// Os aparelhos que já entraram na conta
export default function DevicesScreen({ navigation }: any) {
  const [items, setItems] = useState<any[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setBusy(true);
    setError("");
    try {
      setItems(await listDevices((await getDeviceId()) ?? undefined));
    } catch (e) {
      setError(getApiErrorMessage(e, "Não foi possível carregar os aparelhos."));
    } finally {
      setBusy(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      load();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  function forget(d: any) {
    Alert.alert("Esquecer este aparelho", "Sai desta lista, mas continua com a sessão aberta nele. Para o desligar de vez, mude a palavra-passe.", [
      { text: "Não", style: "cancel" },
      {
        text: "Esquecer",
        onPress: async () => {
          try {
            await removeDevice(d.id);
            load();
          } catch (e) {
            Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível esquecer o aparelho."));
          }
        },
      },
    ]);
  }

  return (
    <Page>
      <Title>📱 Aparelhos da conta</Title>
      <Text style={u.muted}>Os telemóveis que já usaram a sua conta. Se vir um que não conhece, mude já a palavra-passe e fale com o suporte.</Text>

      {error ? <Empty text={error} /> : null}
      {busy && items.length === 0 ? <Text style={u.muted}>A carregar...</Text> : null}
      {!busy && !error && items.length === 0 ? <Empty text="Ainda não há aparelhos registados." /> : null}

      {items.map((d) => (
        <Card key={d.id}>
          <View style={u.between}>
            <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>{d.label ?? "Aparelho"}</Text>
            {d.isCurrent ? <Badge label="Este aparelho" color="#2E7D32" /> : null}
          </View>
          <Text style={u.muted}>Primeiro acesso: {formatDateTime(d.firstSeenAt)}</Text>
          <Text style={u.muted}>Último acesso: {formatDateTime(d.lastSeenAt)}</Text>
          {!d.isCurrent ? <Btn small kind="outline" label="Esquecer" onPress={() => forget(d)} /> : null}
        </Card>
      ))}

      <Btn kind="outline" label="🔑 Mudar a palavra-passe" onPress={() => navigation.navigate("ChangePassword")} />
      <Btn kind="outline" label="🚩 Denunciar atividade suspeita" onPress={() => navigation.navigate("ReportCreate")} />
    </Page>
  );
}
