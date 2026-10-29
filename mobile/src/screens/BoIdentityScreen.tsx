import React, { useCallback, useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import AdminLayout from "../components/admin/AdminLayout";
import { Page, Title, Card, Badge, Chip, Empty, Field, useLoader, u } from "../components/ui";
import { listBoIdentity } from "../api/backoffice";
import { useBoCatalog } from "../utils/boCatalog";
import { labelOf } from "../utils/ngoCatalog";
import { BO_ROLE_ICON } from "../constants/backoffice";
import { formatDateTime } from "../constants/market";

const EMPTY = { counts: {} as Record<string, number>, page: 1, pageSize: 25, items: [] as any[] };

const STATUS_COLOR: Record<string, string> = { PENDENTE: "#F9A825", APROVADA: "#2E7D32", RECUSADA: "#C62828" };

// Fila de pedidos de verificação de identidade
export default function BoIdentityScreen({ navigation }: any) {
  const catalog = useBoCatalog();
  const [status, setStatus] = useState("PENDENTE");
  const [text, setText] = useState("");
  const [q, setQ] = useState("");

  const loader = useLoader(() => listBoIdentity({ status, q }), EMPTY, [status, q]);
  const d: any = loader.data;

  useFocusEffect(
    useCallback(() => {
      loader.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  return (
    <AdminLayout active="BoUsers">
      <Page loader={loader}>
        <Title>🆔 Verificação de identidade</Title>
        <Text style={u.muted}>Pessoas que enviaram um documento para receber o selo de verificada. Os mais antigos aparecem primeiro.</Text>

        <View style={u.row}>
          {catalog.identityStatus.map((s) => (
            <Chip key={s.value} label={`${s.label} (${d.counts[s.value] ?? 0})`} active={status === s.value} onPress={() => setStatus(s.value)} />
          ))}
        </View>

        <Field
          placeholder="Procurar por nome ou telefone"
          value={text}
          onChangeText={setText}
          onSubmitEditing={() => setQ(text.trim())}
          returnKeyType="search"
        />

        {d.items.length === 0 && !loader.loading ? (
          <Empty text={status === "PENDENTE" ? "Não há pedidos à espera de análise." : "Nenhum pedido com este estado."} />
        ) : (
          d.items.map((i: any) => (
            <TouchableOpacity key={i.id} activeOpacity={0.85} onPress={() => navigation.navigate("BoIdentityReview", { id: i.id })}>
              <Card>
                <View style={u.between}>
                  <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>
                    {BO_ROLE_ICON[String(i.user?.role)] ?? "👤"} {i.user?.name ?? "Utilizador"}
                  </Text>
                  <Badge label={labelOf(catalog.identityStatus, i.status) || i.status} color={STATUS_COLOR[i.status] ?? "#757575"} />
                </View>
                <Text style={u.muted}>{i.user?.roleName ?? ""}{i.user?.location ? ` · 📍 ${i.user.location}` : ""}</Text>
                <Text style={u.muted}>
                  {labelOf(catalog.identityKinds, i.documentKind) || i.documentKind} · enviado em {formatDateTime(i.createdAt)}
                </Text>
                {i.reviewNote ? <Text style={[u.muted, { marginTop: 2 }]}>📝 {i.reviewNote}</Text> : null}
              </Card>
            </TouchableOpacity>
          ))
        )}
      </Page>
    </AdminLayout>
  );
}
