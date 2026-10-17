import React, { useCallback, useState } from "react";
import { View, Text } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Page, Title, Card, Btn, Chip, Empty, useLoader, u } from "../components/ui";
import ChipGroup from "../components/ChipGroup";
import NeedCard from "../components/ngo/NeedCard";
import { listNeeds } from "../api/ngo";
import { useNgoCatalog } from "../utils/ngoCatalog";

type View_ = "open" | "served" | "all";

export default function NgoNeedsScreen({ navigation, route }: any) {
  const communityId: string | undefined = route?.params?.communityId;
  const catalog = useNgoCatalog();

  const [view, setView] = useState<View_>("open");
  const [priority, setPriority] = useState("");
  const [category, setCategory] = useState("");

  const loader = useLoader(() => listNeeds({ communityId }), [] as any[], [communityId]);
  const all: any[] = loader.data;

  useFocusEffect(
    useCallback(() => {
      loader.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [communityId])
  );

  const open = all.filter((n) => n.status !== "ATENDIDA");
  const served = all.filter((n) => n.status === "ATENDIDA");
  const urgent = open.filter((n) => n.priority === "URGENTE").length;

  const base = view === "open" ? open : view === "served" ? served : all;
  const shown = base.filter((n) => (!priority || n.priority === priority) && (!category || n.category === category));

  return (
    <Page loader={loader}>
      <Title>📍 Necessidades</Title>

      <Card>
        <Text style={u.strong}>{open.length} em aberto</Text>
        <Text style={u.muted}>
          {urgent} urgente(s) · {served.length} atendida(s)
        </Text>
      </Card>

      <Btn label="➕ Identificar necessidade" onPress={() => navigation.navigate("NgoNeedForm", { communityId })} />

      <View style={u.row}>
        <Chip label={`Em aberto (${open.length})`} active={view === "open"} onPress={() => setView("open")} />
        <Chip label={`Atendidas (${served.length})`} active={view === "served"} onPress={() => setView("served")} />
        <Chip label={`Todas (${all.length})`} active={view === "all"} onPress={() => setView("all")} />
      </View>

      <ChipGroup label="Prioridade" options={catalog.needPriority} value={priority} onChange={setPriority} allowEmpty scroll />
      <ChipGroup label="Tipo de necessidade" options={catalog.needCategories} value={category} onChange={setCategory} allowEmpty scroll />

      {shown.length === 0 ? (
        <Empty text={all.length === 0 ? "Ainda não identificou necessidades." : "Nenhuma necessidade com estes filtros."} />
      ) : (
        shown.map((n) => <NeedCard key={n.id} need={n} catalog={catalog} navigation={navigation} onChanged={loader.reload} />)
      )}
    </Page>
  );
}
