import React, { useCallback, useState } from "react";
import { View, Text, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import TrLayout from "../components/transporter/TrLayout";
import TrDeliveryCard from "../components/transporter/TrDeliveryCard";
import { Page, Title, SubTitle, Card, Badge, Btn, Empty, useLoader, u } from "../components/ui";
import { combineTrDeliveries, acceptTrDelivery } from "../api/transporterV2";
import { useTrCatalog } from "../utils/transportCatalogV2";
import { trPlaceLabel, trWeightText } from "../constants/transporterV2";
import { getApiErrorMessage } from "../api/errorMessage";
import { money } from "../constants/market";

// Combinar entregas: outras cargas que seguem o mesmo caminho e ainda cabem no veículo
export default function TrCombineScreen({ navigation, route }: any) {
  const id: string = route?.params?.id;
  const catalog = useTrCatalog();
  const loader = useLoader(() => combineTrDeliveries(id), null as any, [id]);
  const d: any = loader.data;
  const [actingId, setActingId] = useState("");

  useFocusEffect(
    useCallback(() => {
      loader.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id])
  );

  if (!d) {
    return (
      <TrLayout active="TrDeliveries">
        <Page loader={loader}>
          <Title>🔗 Combinar entregas</Title>
          <Empty text="A carregar..." />
        </Page>
      </TrLayout>
    );
  }

  const usedPercent = d.capacityKg ? Math.min(100, Math.round((d.usedKg / d.capacityKg) * 100)) : null;

  function accept(c: any) {
    Alert.alert("Aceitar a entrega", `Vai transportar também a encomenda ${c.orderCode}${c.payout ? ` por ${money(c.payout)}` : ""}. Continuar?`, [
      { text: "Não", style: "cancel" },
      {
        text: "Aceitar",
        onPress: async () => {
          setActingId(c.id);
          try {
            await acceptTrDelivery(c.id);
            Alert.alert("Pronto", "A entrega é sua. Combine a recolha com o vendedor.");
            loader.reload();
          } catch (e) {
            Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível aceitar a entrega."));
            loader.reload();
          } finally {
            setActingId("");
          }
        },
      },
    ]);
  }

  return (
    <TrLayout active="TrDeliveries">
      <Page loader={loader}>
        <Title>🔗 Combinar entregas</Title>
        <Text style={u.muted}>Cargas que saem do mesmo sítio ou vão para o mesmo destino, que servem ao seu veículo e cabem no que lhe resta de capacidade.</Text>

        <Card>
          <Text style={u.strong}>Entrega {d.base.orderCode}</Text>
          <Text style={u.muted} numberOfLines={1}>
            📍 {trPlaceLabel(d.base.pickup, "Recolha")} → 🏁 {trPlaceLabel(d.base.destination, "Destino")}
          </Text>
          <Text style={u.muted}>⚖️ {trWeightText(d.base.weightKg) ?? "peso por confirmar"}</Text>
        </Card>

        <SubTitle>Capacidade do veículo</SubTitle>
        <Card>
          {d.capacityKg ? (
            <>
              <View style={{ height: 14, borderRadius: 7, backgroundColor: "#ECEFF1", overflow: "hidden" }}>
                <View style={{ width: `${usedPercent}%`, height: 14, backgroundColor: usedPercent && usedPercent > 90 ? "#EF6C00" : "#2E7D32" }} />
              </View>
              <Text style={{ marginTop: 6 }}>
                Carga já combinada: <Text style={{ fontWeight: "bold" }}>{d.usedKg} kg</Text> de {d.capacityKg} kg
              </Text>
              <Text style={u.muted}>Ainda cabem {d.leftKg} kg.</Text>
            </>
          ) : (
            <Text style={{ color: "#EF6C00" }}>Indique a capacidade de carga do veículo para ver o que ainda cabe.</Text>
          )}
        </Card>

        <SubTitle>Cargas que pode juntar ({d.suggestions.length})</SubTitle>
        {d.suggestions.length === 0 ? (
          <Empty text="Não há outras cargas que sigam o mesmo caminho e caibam no veículo." />
        ) : (
          d.suggestions.map((c: any) => (
            <TrDeliveryCard key={c.id} item={c} catalog={catalog} onPress={() => navigation.navigate("TrDelivery", { id: c.id })}>
              <View style={[u.row, { marginTop: 4 }]}>
                {c.samePickup && c.sameDestination ? <Badge label="Mesmo caminho" color="#2E7D32" /> : c.samePickup ? <Badge label="Mesma recolha" color="#1565C0" /> : <Badge label="Mesmo destino" color="#1565C0" />}
              </View>
              <View style={u.row}>
                <Btn small label={actingId === c.id ? "..." : "✅ Aceitar também"} onPress={() => accept(c)} disabled={actingId === c.id} />
              </View>
            </TrDeliveryCard>
          ))
        )}
      </Page>
    </TrLayout>
  );
}
