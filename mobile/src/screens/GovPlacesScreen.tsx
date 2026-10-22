import React, { useCallback, useEffect, useState } from "react";
import { View, Text } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";
import { Page, Title, Card, Btn, Chip, Empty, Field, useLoader, u } from "../components/ui";
import ChipGroup from "../components/ChipGroup";
import PlaceCard from "../components/gov/PlaceCard";
import { listPlaces, getGovRegions } from "../api/gov";
import { useGovCatalog } from "../utils/govCatalog";
import { PLACE_KIND_ICON } from "../constants/gov";

const EMPTY = {
  total: 0,
  summary: { byKind: {} as Record<string, number>, damaged: 0, operational: 0 },
  items: [] as any[],
};

// Infraestruturas, mercados e zonas de produção. Qualquer pessoa consulta.
export default function GovPlacesScreen({ navigation, route }: any) {
  const { user } = useAuth();
  const catalog = useGovCatalog();
  const canManage = user?.role === "GOVERNO" || user?.role === "ADMIN";

  const [kind, setKind] = useState<string>(route?.params?.kind ?? "");
  const [subtype, setSubtype] = useState("");
  const [region, setRegion] = useState("");
  const [status, setStatus] = useState("");
  const [mine, setMine] = useState(false);
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const [regions, setRegions] = useState<string[]>([]);

  const loader = useLoader(() => listPlaces({ kind, subtype, region, status, q, mine }), EMPTY, [kind, subtype, region, status, q, mine]);
  const d: any = loader.data;

  useEffect(() => {
    getGovRegions()
      .then((list) => setRegions(list.map((r) => r.name)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (route?.params?.kind !== undefined) setKind(route.params.kind ?? "");
  }, [route?.params?.kind]);

  useFocusEffect(
    useCallback(() => {
      loader.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  return (
    <Page loader={loader}>
      <Title>🏗️ Infraestruturas, mercados e zonas</Title>
      <Text style={u.muted}>Onde estão as estradas, os armazéns, os mercados, as lotas e as zonas de produção, e em que estado estão.</Text>

      {canManage ? <Btn label="➕ Registar local" onPress={() => navigation.navigate("GovPlaceForm", { kind: kind || undefined })} /> : null}

      <View style={u.grid}>
        {(
          [
            ["📍 Locais", d.total],
            ["✅ Operacionais", d.summary.operational],
            ["⚠️ Danificados", d.summary.damaged],
          ] as [string, number][]
        ).map(([label, value]) => (
          <View key={label} style={u.tile}>
            <View style={u.tileBox}>
              <Text style={u.tileValue}>{value}</Text>
              <Text style={u.tileLabel}>{label}</Text>
            </View>
          </View>
        ))}
      </View>

      <Field
        placeholder="Procurar local"
        value={text}
        onChangeText={setText}
        onSubmitEditing={() => setQ(text.trim())}
        returnKeyType="search"
      />

      <ChipGroup
        label="Tipo de local"
        options={catalog.placeKinds.map((k) => ({ value: k.value, label: `${k.label} (${d.summary.byKind[k.value] ?? 0})`, icon: PLACE_KIND_ICON[k.value] }))}
        value={kind}
        onChange={(v) => {
          setKind(v);
          setSubtype("");
        }}
        allowEmpty
        scroll
      />
      {kind ? <ChipGroup label="Mais específico" options={catalog.placeSubtypes[kind] ?? []} value={subtype} onChange={setSubtype} allowEmpty scroll /> : null}
      {regions.length > 0 ? (
        <ChipGroup label="Região" options={regions.map((r) => ({ value: r, label: r }))} value={region} onChange={setRegion} allowEmpty scroll />
      ) : null}
      <ChipGroup label="Estado" options={catalog.placeStatus} value={status} onChange={setStatus} allowEmpty scroll />

      {canManage ? (
        <View style={u.row}>
          <Chip label="Só os meus locais" active={mine} onPress={() => setMine(!mine)} />
        </View>
      ) : null}

      {d.summary.damaged > 0 && !status ? (
        <Card>
          <Text style={{ color: "#C62828", fontWeight: "bold" }}>⚠️ {d.summary.damaged} local(is) danificado(s)</Text>
          <Btn small kind="outline" label="Ver só os danificados" onPress={() => setStatus("DANIFICADA")} />
        </Card>
      ) : null}

      {d.items.length === 0 && !loader.loading ? (
        <Empty text="Nenhum local encontrado com estes filtros." />
      ) : (
        d.items.map((p: any) => <PlaceCard key={p.id} place={p} catalog={catalog} onPress={() => navigation.navigate("GovPlace", { id: p.id })} />)
      )}

      <View style={u.row}>
        <Btn small kind="outline" label="🏛️ Serviços públicos" onPress={() => navigation.navigate("GovServices")} />
        <Btn small kind="outline" label="📍 Ver no mapa" onPress={() => navigation.navigate("GovMap")} />
      </View>
    </Page>
  );
}
