import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, ScrollView, Linking } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import TrLayout from "../components/transporter/TrLayout";
import { Page, Title, Card, Btn, Chip, Empty, Field, u } from "../components/ui";
import ChipGroup from "../components/ChipGroup";
import { listTrServices } from "../api/transporterV2";
import { getGovRegions } from "../api/gov";
import { useTrCatalog } from "../utils/transportCatalogV2";
import { useMyPosition } from "../utils/trLocation";
import { kmLabel, pointUrl } from "../utils/trMaps";
import { SERVICE_ICON } from "../constants/transporterTools";
import { formatNumber } from "../utils/format";
import { getApiErrorMessage } from "../api/errorMessage";

// Postos de combustível, oficinas, estacionamentos, manutenção e assistência
export default function TrServicesScreen({ navigation, route }: any) {
  const catalog = useTrCatalog();
  const { pos, loading: locating, refresh } = useMyPosition(!!route?.params?.near);

  const [kind, setKind] = useState<string>(route?.params?.kind ?? "");
  const [region, setRegion] = useState("");
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const [regions, setRegions] = useState<{ key: string; name: string }[]>([]);

  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [byKind, setByKind] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const requestId = useRef(0);

  useEffect(() => {
    getGovRegions()
      .then((list) => setRegions(list.map((r) => ({ key: r.key, name: r.name }))))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (route?.params?.kind !== undefined) setKind(route.params.kind ?? "");
  }, [route?.params?.kind]);

  const key = JSON.stringify({ kind, region, q, pos: pos ? [pos.lat, pos.lng] : null });

  async function load(reset: boolean) {
    const nextPage = reset ? 1 : page + 1;
    const mine = ++requestId.current;
    setBusy(true);
    setError("");

    try {
      const r = await listTrServices({ kind, region, q, page: nextPage, lat: pos?.lat, lng: pos?.lng });
      if (mine !== requestId.current) return;

      setItems((prev) => (reset ? r.items : [...prev, ...r.items]));
      setTotal(r.total);
      setByKind(r.byKind);
      setPage(nextPage);
    } catch (e) {
      if (mine === requestId.current) setError(getApiErrorMessage(e, "Não foi possível carregar os locais."));
    } finally {
      if (mine === requestId.current) setBusy(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      load(true);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key])
  );

  const all = Object.values(byKind).reduce((s, n) => s + n, 0);

  return (
    <TrLayout active="TrProfile">
      <Page>
        <Title>⛽ Serviços para o veículo</Title>

        <View style={u.row}>
          <Btn small kind={pos ? "outline" : "primary"} label={locating ? "A localizar..." : pos ? "📍 Ordenados por distância" : "📍 Ordenar por distância"} onPress={() => refresh(true)} disabled={locating} />
          <Btn small kind="outline" label="➕ Sugerir um local" onPress={() => navigation.navigate("TrServiceSuggest")} />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Chip label={`Todos (${all})`} active={kind === ""} onPress={() => setKind("")} />
          {catalog.serviceKinds.map((k) => (
            <Chip key={k.value} label={`${SERVICE_ICON[k.value] ?? ""} ${k.label} (${byKind[k.value] ?? 0})`.trim()} active={kind === k.value} onPress={() => setKind(k.value)} />
          ))}
        </ScrollView>

        <Field placeholder="Procurar por nome ou endereço" value={text} onChangeText={setText} onSubmitEditing={() => setQ(text.trim())} returnKeyType="search" />
        {regions.length > 0 ? (
          <ChipGroup label="Região" options={regions.map((r) => ({ value: r.key, label: r.name }))} value={region} onChange={setRegion} allowEmpty scroll />
        ) : null}

        <Text style={[u.muted, { marginTop: 8 }]}>{busy && items.length === 0 ? "A carregar..." : `${formatNumber(total)} local(is)`}</Text>

        {error ? <Empty text={error} /> : null}
        {!busy && !error && items.length === 0 ? (
          <Card>
            <Text style={u.strong}>Nenhum local encontrado</Text>
            <Text style={u.muted}>Se conhece um que falta, sugira-o. A equipa analisa e publica para todos.</Text>
            <Btn small label="➕ Sugerir um local" onPress={() => navigation.navigate("TrServiceSuggest")} />
          </Card>
        ) : null}

        {items.map((s) => {
          const url = pointUrl(s);
          return (
            <Card key={s.id}>
              <Text style={u.strong}>
                {SERVICE_ICON[s.kind] ?? "📍"} {s.name}
              </Text>
              <Text style={u.muted}>{s.kind ? catalog.serviceKinds.find((k) => k.value === s.kind)?.label : ""}</Text>
              {s.address ? <Text style={{ marginTop: 2 }}>{s.address}</Text> : null}
              <Text style={u.muted}>
                {[s.regionName ? `📍 ${s.regionName}` : "", s.distanceKm !== null && s.distanceKm !== undefined ? `📏 ${kmLabel(s.distanceKm, !s.exact)}` : ""].filter(Boolean).join(" · ")}
              </Text>
              {s.hours ? <Text style={u.muted}>🕒 {s.hours}</Text> : null}
              {s.notes ? <Text style={[u.muted, { marginTop: 2 }]}>{s.notes}</Text> : null}
              <View style={u.row}>
                {url ? <Btn small kind="outline" label="🧭 Abrir no mapa" onPress={() => Linking.openURL(url)} /> : null}
                {s.phone ? <Btn small kind="outline" label="📞 Ligar" onPress={() => Linking.openURL(`tel:${s.phone}`)} /> : null}
              </View>
            </Card>
          );
        })}

        {items.length < total ? <Btn kind="outline" label={busy ? "A carregar..." : "Ver mais"} onPress={() => load(false)} disabled={busy} /> : null}
        {!pos ? <Text style={u.muted}>Sem a sua localização, os locais aparecem por ordem alfabética.</Text> : null}
      </Page>
    </TrLayout>
  );
}
