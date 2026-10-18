import React, { useCallback, useState } from "react";
import { View, Text, Linking } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Page, Title, SubTitle, Card, Badge, Btn, Empty, Field, useLoader, u } from "../components/ui";
import ChipGroup from "../components/ChipGroup";
import { listPartners } from "../api/ngo";
import { useNgoCatalog, labelOf } from "../utils/ngoCatalog";
import { PARTNER_STATUS_COLOR, colorOf } from "../constants/ngo";

export default function NgoPartnersScreen({ navigation, route }: any) {
  const catalog = useNgoCatalog();
  const [type, setType] = useState<string>(route?.params?.type ?? "");
  const [status, setStatus] = useState("");
  const [text, setText] = useState("");
  const [q, setQ] = useState("");

  const loader = useLoader(() => listPartners({ q }), [] as any[], [q]);
  const all: any[] = loader.data;

  useFocusEffect(
    useCallback(() => {
      loader.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const countOf = (value: string) => all.filter((p) => p.type === value).length;
  const shown = all.filter((p) => (!type || p.type === type) && (!status || p.status === status));

  return (
    <Page loader={loader}>
      <Title>🤝 Parceiros</Title>

      <Btn label="➕ Novo parceiro" onPress={() => navigation.navigate("NgoPartnerForm", { type: type || undefined })} />
      <View style={u.row}>
        <Btn small kind="outline" label="🔎 Procurar cooperativas" onPress={() => navigation.navigate("NgoDiscover")} />
        <Btn small kind="outline" label="🌍 Procurar organizações" onPress={() => navigation.navigate("NgoOrganizations")} />
      </View>

      <Field
        placeholder="Procurar parceiro"
        value={text}
        onChangeText={setText}
        onSubmitEditing={() => setQ(text.trim())}
        returnKeyType="search"
      />

      <ChipGroup
        label="Tipo de parceiro"
        options={catalog.partnerTypes.map((t) => ({ value: t.value, label: `${t.label} (${countOf(t.value)})` }))}
        value={type}
        onChange={setType}
        allowEmpty
        emptyLabel={`Todos (${all.length})`}
        scroll
      />
      <ChipGroup label="Estado" options={catalog.partnerStatus} value={status} onChange={setStatus} allowEmpty scroll />

      <SubTitle>{type ? labelOf(catalog.partnerTypes, type) : "Todos os parceiros"}</SubTitle>
      {shown.length === 0 ? (
        <Empty text={all.length === 0 ? "Ainda não registou parceiros. Registe outras ONGs, cooperativas, empresas, instituições e financiadores." : "Nenhum parceiro com estes filtros."} />
      ) : (
        shown.map((p) => (
          <Card key={p.id}>
            <View style={u.between}>
              <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>{p.name}</Text>
              <Badge label={labelOf(catalog.partnerStatus, p.status)} color={colorOf(PARTNER_STATUS_COLOR, p.status)} />
            </View>

            <Text style={u.muted}>{labelOf(catalog.partnerTypes, p.type)}</Text>
            {p.contactName ? <Text style={u.muted}>👤 {p.contactName}</Text> : null}
            {p.region ? <Text style={u.muted}>📍 {p.region}</Text> : null}
            {p.linkedUserId ? <Text style={u.muted}>✅ Tem conta no app</Text> : null}
            <Text style={u.muted}>📋 {p.projectsCount} projeto(s)</Text>

            <View style={u.row}>
              <Btn small label="Ver" onPress={() => navigation.navigate("NgoPartner", { id: p.id })} />
              {p.phone ? <Btn small kind="outline" label="📞 Ligar" onPress={() => Linking.openURL(`tel:${p.phone}`)} /> : null}
              {p.linkedUserId ? (
                <Btn small kind="outline" label="💬 Mensagem" onPress={() => navigation.navigate("Chat", { userId: p.linkedUserId, userName: p.name })} />
              ) : null}
              <Btn small kind="outline" label="✏️ Editar" onPress={() => navigation.navigate("NgoPartnerForm", { partner: p })} />
            </View>
          </Card>
        ))
      )}
    </Page>
  );
}
