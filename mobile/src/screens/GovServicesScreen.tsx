import React, { useCallback, useEffect, useState } from "react";
import { View, Text } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { Page, Title, Btn, Chip, Empty, Field, useLoader, u } from "../components/ui";
import ChipGroup from "../components/ChipGroup";
import ServiceCard from "../components/gov/ServiceCard";
import { listServices, getMyServices, getGovRegions } from "../api/gov";
import { useGovCatalog } from "../utils/govCatalog";
import { SERVICE_ICON } from "../constants/gov";

// Serviços públicos. Qualquer pessoa consulta. A instituição vê também os seus e gere-os.
export default function GovServicesScreen({ navigation, route }: any) {
  const { user } = useAuth();
  const catalog = useGovCatalog();
  const canManage = user?.role === "GOVERNO" || user?.role === "ADMIN";

  const [tab, setTab] = useState<"all" | "mine">("all");
  const [category, setCategory] = useState<string>(route?.params?.category ?? "");
  const [region, setRegion] = useState("");
  const [status, setStatus] = useState("");
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const [regions, setRegions] = useState<string[]>([]);

  const loader = useLoader(
    async () => {
      if (tab === "mine") {
        const items = await getMyServices();
        return { total: items.length, items };
      }
      return listServices({ category, region, status, q });
    },
    { total: 0, items: [] as any[] },
    [tab, category, region, status, q]
  );
  const d: any = loader.data;

  useEffect(() => {
    getGovRegions()
      .then((list) => setRegions(list.map((r) => r.name)))
      .catch(() => {});
  }, []);

  useFocusEffect(
    useCallback(() => {
      loader.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const items: any[] = tab === "mine" ? d.items.filter((s: any) => (!category || s.category === category) && (!status || s.status === status)) : d.items;

  return (
    <Page loader={loader}>
      <Title>🏛️ Serviços públicos</Title>
      <Text style={u.muted}>Informação sobre os serviços do Estado: o que é preciso, onde pedir, horários e contactos.</Text>

      {canManage ? (
        <>
          <Btn label="➕ Registar serviço" onPress={() => navigation.navigate("GovServiceForm")} />
          <View style={u.row}>
            <Chip label="Todos os serviços" active={tab === "all"} onPress={() => setTab("all")} />
            <Chip label="Os meus serviços" active={tab === "mine"} onPress={() => setTab("mine")} />
          </View>
        </>
      ) : null}

      {tab === "all" ? (
        <Field
          placeholder="Procurar serviço (ex: licença de pesca)"
          value={text}
          onChangeText={setText}
          onSubmitEditing={() => setQ(text.trim())}
          returnKeyType="search"
        />
      ) : null}

      <ChipGroup
        label="Tipo de serviço"
        options={catalog.serviceCategories.map((c) => ({ ...c, icon: SERVICE_ICON[c.value] }))}
        value={category}
        onChange={setCategory}
        allowEmpty
        scroll
      />
      {tab === "all" && regions.length > 0 ? (
        <ChipGroup label="Região" options={regions.map((r) => ({ value: r, label: r }))} value={region} onChange={setRegion} allowEmpty scroll />
      ) : null}
      <ChipGroup label="Estado" options={catalog.serviceStatus} value={status} onChange={setStatus} allowEmpty scroll />

      <Text style={[u.muted, { marginTop: 8 }]}>{loader.loading && items.length === 0 ? "A carregar..." : `${items.length} serviço(s)`}</Text>

      {items.length === 0 && !loader.loading ? (
        <Empty text={tab === "mine" ? "Ainda não registou serviços." : "Nenhum serviço encontrado com estes filtros."} />
      ) : (
        items.map((s) => <ServiceCard key={s.id} service={s} catalog={catalog} onPress={() => navigation.navigate("GovService", { id: s.id })} />)
      )}

      <View style={u.row}>
        <Btn small kind="outline" label="🏗️ Infraestruturas e mercados" onPress={() => navigation.navigate("GovPlaces")} />
        <Btn small kind="outline" label="📍 Ver no mapa" onPress={() => navigation.navigate("GovMap")} />
      </View>
    </Page>
  );
}
