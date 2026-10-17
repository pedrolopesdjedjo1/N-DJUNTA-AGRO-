import React from "react";
import { View, Text, Alert } from "react-native";
import { Card, Badge, Btn, u } from "../ui";
import { NgoCatalog, labelOf } from "../../utils/ngoCatalog";
import { NEED_STATUS_COLOR, PRIORITY_COLOR, colorOf } from "../../constants/ngo";
import { updateNeed, deleteNeed } from "../../api/ngo";
import { getApiErrorMessage } from "../../api/errorMessage";
import { formatDate } from "../../constants/market";

interface Props {
  need: any;
  catalog: NgoCatalog;
  navigation: any;
  onChanged: () => void;
}

export default function NeedCard({ need: n, catalog, navigation, onChanged }: Props) {
  async function setStatus(status: string) {
    try {
      await updateNeed(n.id, { status });
      onChanged();
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível mudar o estado."));
    }
  }

  function remove() {
    Alert.alert("Apagar necessidade", "Apagar esta necessidade?", [
      { text: "Não", style: "cancel" },
      {
        text: "Apagar",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteNeed(n.id);
            onChanged();
          } catch (e) {
            Alert.alert("Erro", getApiErrorMessage(e, "Não foi possível apagar."));
          }
        },
      },
    ]);
  }

  const served = n.status === "ATENDIDA";

  return (
    <Card>
      <View style={u.between}>
        <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>{labelOf(catalog.needCategories, n.category)}</Text>
        <Badge label={labelOf(catalog.needPriority, n.priority)} color={colorOf(PRIORITY_COLOR, n.priority)} />
      </View>

      <View style={[u.row, { marginTop: 4 }]}>
        <Badge label={labelOf(catalog.needStatus, n.status)} color={colorOf(NEED_STATUS_COLOR, n.status)} />
      </View>

      <Text style={{ marginTop: 8, lineHeight: 21 }}>{n.description}</Text>

      {n.communityName ? <Text style={[u.muted, { marginTop: 6 }]}>🏘️ {n.communityName}</Text> : null}
      {n.region ? <Text style={u.muted}>📍 {n.region}</Text> : null}
      {n.peopleAffected ? <Text style={u.muted}>👥 {n.peopleAffected} pessoa(s) afetada(s)</Text> : null}
      <Text style={u.muted}>Identificada em {formatDate(n.createdAt)}</Text>

      <View style={u.row}>
        {!served && n.status !== "EM_APOIO" ? <Btn small label="▶️ Em apoio" onPress={() => setStatus("EM_APOIO")} /> : null}
        {!served ? <Btn small kind="outline" label="✅ Atendida" onPress={() => setStatus("ATENDIDA")} /> : null}
        {served ? <Btn small kind="outline" label="Reabrir" onPress={() => setStatus("IDENTIFICADA")} /> : null}
        <Btn small kind="outline" label="✏️ Editar" onPress={() => navigation.navigate("NgoNeedForm", { need: n })} />
        <Btn small kind="danger" label="Apagar" onPress={remove} />
      </View>
    </Card>
  );
}
