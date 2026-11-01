import React, { useCallback, useState } from "react";
import { View, Text, Image, TouchableOpacity } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import AdminLayout from "../components/admin/AdminLayout";
import { Page, Title, Card, Badge, Btn, Empty, Field, useLoader, u } from "../components/ui";
import ChipGroup from "../components/ChipGroup";
import { listBoTeam } from "../api/backoffice";
import { useBoCatalog } from "../utils/boCatalog";
import { adminCan } from "../utils/adminSession";
import { LEVEL_COLOR } from "../constants/backoffice";
import { formatDateTime } from "../constants/market";

const EMPTY = { total: 0, withoutTwoFactor: 0, items: [] as any[] };

const STATUS_OPTIONS = [
  { value: "ATIVO", label: "Ativos" },
  { value: "SUSPENSO", label: "Suspensos" },
];

// A equipa de administradores
export default function BoTeamScreen({ navigation }: any) {
  const catalog = useBoCatalog();
  const [level, setLevel] = useState("");
  const [status, setStatus] = useState("");
  const [text, setText] = useState("");
  const [q, setQ] = useState("");

  const loader = useLoader(() => listBoTeam({ level, status, q }), EMPTY, [level, status, q]);
  const d: any = loader.data;

  useFocusEffect(
    useCallback(() => {
      loader.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  if (!adminCan("team.manage")) {
    return (
      <AdminLayout active="BoSystem">
        <Page>
          <Title>👨‍💼 Equipa de administradores</Title>
          <Empty text="Só os Super administradores gerem a equipa." />
        </Page>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout active="BoSystem">
      <Page loader={loader}>
        <Title>👨‍💼 Equipa de administradores</Title>
        <Text style={u.muted}>Quem tem acesso à administração, com que nível e com que permissões. Cada pessoa só vê e faz o que o seu nível permite.</Text>

        <View style={u.row}>
          <Btn small label="➕ Dar acesso a uma pessoa" onPress={() => navigation.navigate("BoTeamPromote")} />
          <Btn small kind="outline" label="🧾 Atividade da equipa" onPress={() => navigation.navigate("BoAudit", { all: true })} />
        </View>

        {d.withoutTwoFactor > 0 ? (
          <Card>
            <Text style={{ color: "#EF6C00", fontWeight: "bold" }}>🔐 {d.withoutTwoFactor} administrador(es) ativo(s) sem autenticação de dois fatores</Text>
            <Text style={u.muted}>Peça-lhes que a ativem na área de segurança, ou exija-a a todos nas configurações.</Text>
          </Card>
        ) : null}

        <Field placeholder="Procurar por nome, telefone ou função" value={text} onChangeText={setText} onSubmitEditing={() => setQ(text.trim())} returnKeyType="search" />
        <ChipGroup label="Nível" options={catalog.levels.map((l: any) => ({ value: l.value, label: l.label, icon: l.icon }))} value={level} onChange={setLevel} allowEmpty scroll />
        <ChipGroup label="Estado" options={STATUS_OPTIONS} value={status} onChange={setStatus} allowEmpty scroll />

        <Text style={[u.muted, { marginTop: 8 }]}>{loader.loading && d.items.length === 0 ? "A carregar..." : `${d.total} administrador(es)`}</Text>

        {d.items.length === 0 && !loader.loading ? (
          <Empty text="Nenhum administrador com estes filtros." />
        ) : (
          d.items.map((a: any) => (
            <TouchableOpacity key={a.userId} activeOpacity={0.85} onPress={() => navigation.navigate("BoTeamMember", { userId: a.userId })}>
              <Card>
                <View style={[u.row, { alignItems: "center" }]}>
                  {a.photoUrl ? (
                    <Image source={{ uri: a.photoUrl }} style={[u.photo, { width: 44, height: 44, borderRadius: 22 }]} />
                  ) : (
                    <View style={[u.photo, { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" }]}>
                      <Text style={{ fontSize: 20 }}>🛡️</Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={u.strong} numberOfLines={1}>
                      {a.name}
                    </Text>
                    <Text style={u.muted} numberOfLines={1}>
                      {a.title ?? a.phone}
                    </Text>
                  </View>
                  <Badge label={a.levelLabel} color={LEVEL_COLOR[a.level] ?? "#1565C0"} />
                </View>

                <View style={[u.row, { marginTop: 6 }]}>
                  <Badge label={a.status === "ATIVO" ? "Ativo" : "Suspenso"} color={a.status === "ATIVO" ? "#2E7D32" : "#C62828"} />
                  <View style={{ marginLeft: 6 }}>
                    <Badge label={a.twoFactorEnabled ? "🔐 2FA" : "Sem 2FA"} color={a.twoFactorEnabled ? "#2E7D32" : "#EF6C00"} />
                  </View>
                  {a.locked ? (
                    <View style={{ marginLeft: 6 }}>
                      <Badge label="🔒 Bloqueado" color="#C62828" />
                    </View>
                  ) : null}
                  {a.legacy ? (
                    <View style={{ marginLeft: 6 }}>
                      <Badge label="Conta antiga" color="#757575" />
                    </View>
                  ) : null}
                </View>
                <Text style={[u.muted, { marginTop: 4 }]}>
                  {a.lastLoginAt ? `Último acesso: ${formatDateTime(a.lastLoginAt)}` : "Ainda não confirmou o acesso"} · {a.activeSessions} sessão(ões) aberta(s)
                </Text>
              </Card>
            </TouchableOpacity>
          ))
        )}
      </Page>
    </AdminLayout>
  );
}
