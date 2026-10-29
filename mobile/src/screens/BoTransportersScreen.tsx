import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, Image, Alert, Linking } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import AdminLayout from "../components/admin/AdminLayout";
import { Page, Title, Card, Badge, Btn, Chip, Empty, Field, u } from "../components/ui";
import ChipGroup from "../components/ChipGroup";
import { listBoTransporters, warnBoTransporter } from "../api/backoffice";
import { getGovRegions } from "../api/gov";
import { useBoCatalog } from "../utils/boCatalog";
import { useTransportCatalog } from "../utils/transportCatalog";
import { adminCan } from "../utils/adminSession";
import { labelOf } from "../utils/ngoCatalog";
import { VEHICLE_ICON, VERIFICATION_COLOR, stars } from "../constants/transporter";
import { SANCTION_COLOR } from "../constants/backoffice";
import { whatsappUrl } from "../utils/links";
import { formatNumber } from "../utils/format";
import { getApiErrorMessage } from "../api/errorMessage";

const AVAILABLE_OPTIONS = [
  { value: "yes", label: "Disponíveis agora" },
  { value: "no", label: "Indisponíveis" },
];

export default function BoTransportersScreen({ navigation, route }: any) {
  const catalog = useBoCatalog();
  const tcatalog = useTransportCatalog();
  const canManage = adminCan("transport.manage");

  const [verification, setVerification] = useState<string>(route?.params?.verification ?? "");
  const [available, setAvailable] = useState("");
  const [region, setRegion] = useState("");
  const [sort, setSort] = useState("");
  const [text, setText] = useState("");
  const [q, setQ] = useState("");
  const [regions, setRegions] = useState<{ key: string; name: string }[]>([]);

  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const requestId = useRef(0);

  const [warnId, setWarnId] = useState("");
  const [warnText, setWarnText] = useState("");
  const [warning, setWarning] = useState(false);

  useEffect(() => {
    getGovRegions()
      .then((list) => setRegions(list.map((r) => ({ key: r.key, name: r.name }))))
      .catch(() => {});
  }, []);

  const key = JSON.stringify({ verification, available, region, sort, q });

  async function load(reset: boolean) {
    const nextPage = reset ? 1 : page + 1;
    const mine = ++requestId.current;
    setBusy(true);
    setError("");

    try {
      const r = await listBoTransporters({ verification, available, region, sort, q, page: nextPage });
      if (mine !== requestId.current) return;

      setItems((prev) => (reset ? r.items : [...prev, ...r.items]));
      setTotal(r.total);
      setPage(nextPage);
    } catch (e) {
      if (mine === requestId.current) setError(getApiErrorMessage(e, "Não foi possível carregar os transportadores."));
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

  async function sendWarning(t: any) {
    if (warnText.trim().length < 5) {
      Alert.alert("Atenção", "Escreva o aviso (pelo menos 5 letras).");
      return;
    }

    setWarning(true);
    try {
      await warnBoTransporter(t.id, warnText.trim());
      Alert.alert("Aviso enviado", `${t.name} recebeu o aviso como notificação.`);
      setWarnId("");
      setWarnText("");
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível enviar o aviso."));
    } finally {
      setWarning(false);
    }
  }

  return (
    <AdminLayout active="BoTransport">
      <Page>
        <Title>🚛 Transportadores</Title>

        <Field
          placeholder="Procurar por nome, telefone ou matrícula"
          value={text}
          onChangeText={setText}
          onSubmitEditing={() => setQ(text.trim())}
          returnKeyType="search"
        />

        <ChipGroup
          label="Verificação"
          options={tcatalog.verificationStatus.map((s) => ({ value: s.value, label: s.label }))}
          value={verification}
          onChange={setVerification}
          allowEmpty
          scroll
        />
        <ChipGroup label="Disponibilidade" options={AVAILABLE_OPTIONS} value={available} onChange={setAvailable} allowEmpty scroll />
        {regions.length > 0 ? (
          <ChipGroup label="Região onde trabalha" options={regions.map((r) => ({ value: r.key, label: r.name }))} value={region} onChange={setRegion} allowEmpty scroll />
        ) : null}
        <ChipGroup label="Ordenar por" options={catalog.transporterSorts} value={sort} onChange={setSort} allowEmpty emptyLabel="Mais entregas" scroll />

        <Text style={[u.muted, { marginTop: 8 }]}>{busy && items.length === 0 ? "A carregar..." : `${formatNumber(total)} transportador(es)`}</Text>

        {error ? <Empty text={error} /> : null}
        {!busy && !error && items.length === 0 ? <Empty text="Nenhum transportador com estes filtros." /> : null}

        {items.map((t) => {
          const wa = whatsappUrl(t.phone);
          return (
            <Card key={t.id}>
              <View style={[u.row, { alignItems: "center" }]}>
                {t.photoUrl ? (
                  <Image source={{ uri: t.photoUrl }} style={[u.photo, { width: 44, height: 44, borderRadius: 22 }]} />
                ) : (
                  <View style={[u.photo, { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" }]}>
                    <Text style={{ fontSize: 20 }}>{VEHICLE_ICON[t.vehicleType ?? "OUTRO"] ?? "🚚"}</Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={u.strong} numberOfLines={1}>
                    {t.name} {t.isVerified ? "✅" : ""}
                  </Text>
                  <Text style={u.muted} numberOfLines={1}>
                    {t.vehicleType ? labelOf(tcatalog.vehicleTypes, t.vehicleType) : "Sem veículo"}
                    {t.plate ? ` · ${t.plate}` : ""}
                    {t.capacityKg ? ` · ${t.capacityKg} kg` : ""}
                  </Text>
                </View>
                {!t.isActive ? <Badge label="Conta inativa" color={SANCTION_COLOR.BLOQUEIO} /> : null}
              </View>

              <View style={[u.row, { marginTop: 6 }]}>
                <Badge label={labelOf(tcatalog.verificationStatus, t.verificationStatus) || t.verificationStatus} color={VERIFICATION_COLOR[t.verificationStatus] ?? "#757575"} />
                <View style={{ marginLeft: 6 }}>
                  <Badge label={t.isAvailable ? "🟢 Disponível" : "🔴 Indisponível"} color={t.isAvailable ? "#2E7D32" : "#757575"} />
                </View>
              </View>

              {t.location ? <Text style={[u.muted, { marginTop: 4 }]}>📍 {t.location}</Text> : null}
              <Text style={u.muted}>
                {t.rating.average ? `${stars(t.rating.average)} ${t.rating.average} (${t.rating.count})` : "Sem avaliações"}
              </Text>
              <Text style={u.muted}>
                ✅ {t.delivered} entregue(s) · 🚚 {t.activeDeliveries} em curso · ↩️ {t.released} devolvida(s) ·{" "}
                <Text style={{ color: t.problems > 0 ? "#EF6C00" : undefined }}>⚠️ {t.problems} problema(s)</Text>
              </Text>

              <View style={u.row}>
                <Btn small kind="outline" label="Ver a ficha" onPress={() => navigation.navigate("BoUser", { id: t.id })} />
                <Btn small kind="outline" label="📦 Entregas" onPress={() => navigation.navigate("BoDeliveries", { transporterId: t.id })} />
                <Btn small kind="outline" label="💬 Mensagem" onPress={() => navigation.navigate("Chat", { userId: t.id, userName: t.name })} />
                {t.phone ? <Btn small kind="outline" label="📞 Ligar" onPress={() => Linking.openURL(`tel:${t.phone}`)} /> : null}
                {wa ? <Btn small kind="outline" label="WhatsApp" onPress={() => Linking.openURL(wa)} /> : null}
                {canManage ? <Btn small kind="outline" label={warnId === t.id ? "Fechar" : "⚠️ Avisar"} onPress={() => { setWarnId(warnId === t.id ? "" : t.id); setWarnText(""); }} /> : null}
              </View>

              {warnId === t.id ? (
                <View style={{ marginTop: 8 }}>
                  <Field label="Aviso da equipa (recebe como notificação)" value={warnText} onChangeText={setWarnText} multiline placeholder="Ex: Lembramos que deve partilhar a localização durante a entrega." />
                  <Btn label={warning ? "A enviar..." : "Enviar aviso"} onPress={() => sendWarning(t)} disabled={warning} />
                </View>
              ) : null}
            </Card>
          );
        })}

        {items.length < total ? <Btn kind="outline" label={busy ? "A carregar..." : "Ver mais"} onPress={() => load(false)} disabled={busy} /> : null}
      </Page>
    </AdminLayout>
  );
}
