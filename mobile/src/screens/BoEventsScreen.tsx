import React, { useCallback, useRef, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import AdminLayout from "../components/admin/AdminLayout";
import { Page, Title, Card, Badge, Btn, Chip, Empty, Field, u } from "../components/ui";
import { listBoEvents } from "../api/backoffice";
import { useBoCatalog } from "../utils/boCatalog";
import { adminCan } from "../utils/adminSession";
import { EVENT_GROUP_ICON } from "../constants/backofficeOrgs";
import { formatNumber } from "../utils/format";
import { getApiErrorMessage } from "../api/errorMessage";
import { formatDate } from "../constants/market";

const EMPTY_SUMMARY = { all: 0, upcoming: 0, hidden: 0, participants: 0 };

export default function BoEventsScreen({ navigation }: any) {
  const catalog = useBoCatalog();

  const [group, setGroup] = useState("");
  const [when, setWhen] = useState("upcoming");
  const [status, setStatus] = useState("");
  const [text, setText] = useState("");
  const [q, setQ] = useState("");

  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [groups, setGroups] = useState<Record<string, number>>({});
  const [available, setAvailable] = useState(true);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const requestId = useRef(0);

  const key = JSON.stringify({ group, when, status, q });

  async function load(reset: boolean) {
    const nextPage = reset ? 1 : page + 1;
    const mine = ++requestId.current;
    setBusy(true);
    setError("");

    try {
      const r = await listBoEvents({ group, when, status, q, page: nextPage });
      if (mine !== requestId.current) return;

      setItems((prev) => (reset ? r.items : [...prev, ...r.items]));
      setTotal(r.total);
      setSummary(r.summary);
      setGroups(r.groups);
      setAvailable(r.available);
      setPage(nextPage);
    } catch (e) {
      if (mine === requestId.current) setError(getApiErrorMessage(e, "Não foi possível carregar os eventos."));
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

  return (
    <AdminLayout active="BoSystem">
      <Page>
        <Title>🎪 Eventos</Title>
        <Text style={u.muted}>Feiras, formações e campanhas das organizações. A equipa acompanha os participantes e pode cancelar um evento.</Text>

        {!available ? (
          <Card>
            <Text style={{ color: "#EF6C00", fontWeight: "bold" }}>Os eventos não foram encontrados nesta versão do servidor.</Text>
            <Text style={u.muted}>Na ligação final confirmo o nome da tabela e a lista passa a aparecer.</Text>
          </Card>
        ) : null}

        <View style={u.grid}>
          {(
            [
              ["🎪 Eventos", summary.all],
              ["📅 Próximos", summary.upcoming],
              ["🙈 Cancelados", summary.hidden],
              ["👥 Inscrições", summary.participants],
            ] as [string, number][]
          ).map(([label, value]) => (
            <View key={label} style={u.tile}>
              <View style={u.tileBox}>
                <Text style={u.tileValue}>{formatNumber(value)}</Text>
                <Text style={u.tileLabel}>{label}</Text>
              </View>
            </View>
          ))}
        </View>

        {adminCan("events.manage", "content.manage") ? (
          <Btn small kind="outline" label="➕ Criar ou editar eventos (tela de eventos)" onPress={() => navigation.navigate("Events")} />
        ) : null}

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Chip label="Todos os tipos" active={group === ""} onPress={() => setGroup("")} />
          {catalog.eventGroups.map((g) => (
            <Chip key={g.value} label={`${EVENT_GROUP_ICON[g.value] ?? ""} ${g.label} (${groups[g.value] ?? 0})`.trim()} active={group === g.value} onPress={() => setGroup(g.value)} />
          ))}
        </ScrollView>
        <View style={u.row}>
          <Chip label="Próximos" active={when === "upcoming"} onPress={() => setWhen("upcoming")} />
          <Chip label="Passados" active={when === "past"} onPress={() => setWhen("past")} />
          <Chip label="Todos" active={when === ""} onPress={() => setWhen("")} />
          <Chip label="Só cancelados" active={status === "hidden"} onPress={() => setStatus(status === "hidden" ? "" : "hidden")} />
        </View>

        <Field
          placeholder="Procurar por título, local ou organizador"
          value={text}
          onChangeText={setText}
          onSubmitEditing={() => setQ(text.trim())}
          returnKeyType="search"
        />

        <Text style={[u.muted, { marginTop: 8 }]}>{busy && items.length === 0 ? "A carregar..." : `${formatNumber(total)} evento(s)`}</Text>

        {error ? <Empty text={error} /> : null}
        {!busy && !error && available && items.length === 0 ? <Empty text="Nenhum evento com estes filtros." /> : null}

        {items.map((e) => (
          <TouchableOpacity key={e.id} activeOpacity={0.85} onPress={() => navigation.navigate("BoEvent", { id: e.id })}>
            <Card>
              <View style={u.between}>
                <Text style={[u.strong, { flex: 1, marginRight: 8 }]} numberOfLines={2}>
                  {EVENT_GROUP_ICON[e.group] ?? "📌"} {e.title}
                </Text>
                {e.hidden ? <Badge label="Cancelado" color="#C62828" /> : e.upcoming ? <Badge label="Próximo" color="#2E7D32" /> : <Badge label="Passado" color="#757575" />}
              </View>
              <Text style={u.muted}>{e.date ? `📅 ${formatDate(e.date)}` : "Sem data"}</Text>
              {e.location || e.region ? <Text style={u.muted}>📍 {[e.location, e.region].filter(Boolean).join(", ")}</Text> : null}
              <Text style={u.muted}>
                👥 {e.participants}
                {e.capacity ? ` de ${e.capacity}` : ""} inscrito(s){e.organizer ? ` · ${e.organizer}` : ""}
              </Text>
              {e.hidden && e.hiddenReason ? <Text style={{ color: "#C62828", marginTop: 2 }}>🙈 {e.hiddenReason}</Text> : null}
            </Card>
          </TouchableOpacity>
        ))}

        {items.length < total ? <Btn kind="outline" label={busy ? "A carregar..." : "Ver mais"} onPress={() => load(false)} disabled={busy} /> : null}
      </Page>
    </AdminLayout>
  );
}
