import React, { useCallback, useRef, useState } from "react";
import { View, Text } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import AdminLayout from "../components/admin/AdminLayout";
import BoProductCard from "../components/admin/BoProductCard";
import { Page, Title, Btn, Chip, Empty, u } from "../components/ui";
import { listBoQuality } from "../api/backoffice";
import { useBoCatalog } from "../utils/boCatalog";
import { QUALITY_ICON } from "../constants/backofficeMarket";
import { formatNumber } from "../utils/format";
import { getApiErrorMessage } from "../api/errorMessage";

// Controlo de qualidade: anúncios com problemas que a plataforma detetou sozinha
export default function BoQualityScreen({ navigation }: any) {
  const catalog = useBoCatalog();
  const [flag, setFlag] = useState("");

  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [flagged, setFlagged] = useState(0);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const requestId = useRef(0);

  async function load(reset: boolean) {
    const nextPage = reset ? 1 : page + 1;
    const mine = ++requestId.current;
    setBusy(true);
    setError("");

    try {
      const r = await listBoQuality({ flag, page: nextPage });
      if (mine !== requestId.current) return;

      setItems((prev) => (reset ? r.items : [...prev, ...r.items]));
      setTotal(r.total);
      setFlagged(r.flagged);
      setCounts(r.counts);
      setPage(nextPage);
    } catch (e) {
      if (mine === requestId.current) setError(getApiErrorMessage(e, "Não foi possível carregar os anúncios."));
    } finally {
      if (mine === requestId.current) setBusy(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      load(true);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [flag])
  );

  return (
    <AdminLayout active="BoMarket">
      <Page>
        <Title>🔍 Controlo de qualidade</Title>
        <Text style={u.muted}>
          Anúncios sem foto, sem descrição, sem preço, com preço muito fora do normal, repetidos ou sem quantidade. Abra um anúncio e use "Avisar qualidade" para o vendedor corrigir.
        </Text>

        <View style={u.grid}>
          <View style={u.tile}>
            <View style={u.tileBox}>
              <Text style={u.tileValue}>{formatNumber(flagged)}</Text>
              <Text style={u.tileLabel}>⚠️ Anúncios com problemas</Text>
            </View>
          </View>
        </View>

        <View style={u.row}>
          <Chip label="Todos" active={flag === ""} onPress={() => setFlag("")} />
          {catalog.qualityFlags.map((f) => (
            <Chip key={f.value} label={`${QUALITY_ICON[f.value] ?? ""} ${f.label} (${counts[f.value] ?? 0})`.trim()} active={flag === f.value} onPress={() => setFlag(f.value)} />
          ))}
        </View>

        <Text style={[u.muted, { marginTop: 8 }]}>{busy && items.length === 0 ? "A carregar..." : `${formatNumber(total)} anúncio(s)`}</Text>

        {error ? <Empty text={error} /> : null}
        {!busy && !error && items.length === 0 ? <Empty text="Nenhum anúncio com este problema. Bom trabalho dos vendedores!" /> : null}

        {items.map((p) => (
          <BoProductCard key={p.id} item={p} qualityFlags={catalog.qualityFlags} onPress={() => navigation.navigate("BoProduct", { id: p.id })} />
        ))}

        {items.length < total ? <Btn kind="outline" label={busy ? "A carregar..." : "Ver mais"} onPress={() => load(false)} disabled={busy} /> : null}
        <Text style={[u.muted, { marginTop: 8 }]}>A análise é feita sobre os 5000 anúncios mais recentes e atualiza-se a cada 2 minutos.</Text>
      </Page>
    </AdminLayout>
  );
}
