import React, { useState } from "react";
import { View, Text, Alert, Switch } from "react-native";
import { Page, Title, SubTitle, Card, Badge, Btn, Chip, Empty, Field, useLoader, u } from "../components/ui";
import { getPaymentMethods, createPaymentMethod, updatePaymentMethod, deletePaymentMethod } from "../api/shop";
import { getApiErrorMessage } from "../api/errorMessage";
import { colors } from "../theme/colors";

const KINDS = [
  { value: "DINHEIRO", label: "💵 Dinheiro" },
  { value: "MOBILE_MONEY", label: "📱 Dinheiro móvel" },
  { value: "TRANSFERENCIA", label: "🏦 Transferência bancária" },
];

const KIND_LABEL: Record<string, string> = {
  DINHEIRO: "Dinheiro",
  MOBILE_MONEY: "Dinheiro móvel",
  TRANSFERENCIA: "Transferência bancária",
};

export default function ClientPaymentMethodsScreen() {
  const loader = useLoader(getPaymentMethods, [] as any[]);
  const methods: any[] = loader.data;

  const [editing, setEditing] = useState("");
  const [kind, setKind] = useState("DINHEIRO");
  const [label, setLabel] = useState("");
  const [phone, setPhone] = useState("");
  const [makeDefault, setMakeDefault] = useState(false);
  const [saving, setSaving] = useState(false);

  function openNew() {
    setEditing("new");
    setKind("DINHEIRO");
    setLabel("");
    setPhone("");
    setMakeDefault(methods.length === 0);
  }

  function openEdit(m: any) {
    setEditing(m.id);
    setKind(m.kind);
    setLabel(m.label ?? "");
    setPhone(m.phone ?? "");
    setMakeDefault(m.isDefault);
  }

  async function save() {
    setSaving(true);
    try {
      if (editing === "new") {
        await createPaymentMethod({
          kind,
          label: label.trim() || undefined,
          phone: kind === "MOBILE_MONEY" ? phone.trim() || undefined : undefined,
          isDefault: makeDefault,
        });
      } else {
        await updatePaymentMethod(editing, {
          label: label.trim(),
          phone: kind === "MOBILE_MONEY" ? phone.trim() : undefined,
          isDefault: makeDefault || undefined,
        });
      }
      setEditing("");
      loader.reload();
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível guardar."));
    } finally {
      setSaving(false);
    }
  }

  async function setPrincipal(m: any) {
    try {
      await updatePaymentMethod(m.id, { isDefault: true });
      loader.reload();
    } catch (e) {
      Alert.alert("Erro", getApiErrorMessage(e, "Não foi possível definir como principal."));
    }
  }

  function remove(m: any) {
    Alert.alert("Apagar método", `Apagar "${m.label}"?`, [
      { text: "Não", style: "cancel" },
      {
        text: "Apagar",
        style: "destructive",
        onPress: async () => {
          try {
            await deletePaymentMethod(m.id);
            loader.reload();
          } catch (e) {
            Alert.alert("Erro", getApiErrorMessage(e, "Não foi possível apagar."));
          }
        },
      },
    ]);
  }

  return (
    <Page loader={loader}>
      <Title>💳 Métodos de pagamento</Title>

      <Card>
        <Text style={u.muted}>
          Aqui guarda só a forma de pagamento que prefere (e o telefone do dinheiro móvel). O pagamento é feito diretamente ao vendedor. Nunca escreva números de cartão, de conta bancária nem senhas.
        </Text>
      </Card>

      {editing ? (
        <Card>
          <Text style={u.strong}>{editing === "new" ? "Novo método" : "Editar método"}</Text>

          {editing === "new" ? (
            <View style={[u.row, { marginTop: 8 }]}>
              {KINDS.map((k) => (
                <Chip key={k.value} label={k.label} active={kind === k.value} onPress={() => setKind(k.value)} />
              ))}
            </View>
          ) : (
            <Text style={[u.muted, { marginTop: 6 }]}>{KIND_LABEL[kind]}</Text>
          )}

          <Field label="Nome (opcional)" value={label} onChangeText={setLabel} placeholder={KIND_LABEL[kind]} />
          {kind === "MOBILE_MONEY" ? (
            <Field label="Telefone do dinheiro móvel" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="Ex: 955000000" />
          ) : null}

          <View style={[u.between, { marginTop: 10 }]}>
            <Text style={[u.muted, { flex: 1, marginRight: 8 }]}>Método principal</Text>
            <Switch value={makeDefault} onValueChange={setMakeDefault} trackColor={{ true: colors.primary, false: "#BDBDBD" }} />
          </View>

          <View style={u.row}>
            <Btn label={saving ? "A guardar..." : "Guardar"} onPress={save} disabled={saving} />
            <Btn kind="outline" label="Cancelar" onPress={() => setEditing("")} />
          </View>
        </Card>
      ) : (
        <Btn label="➕ Adicionar método" onPress={openNew} />
      )}

      <SubTitle>Os meus métodos</SubTitle>
      {methods.length === 0 ? (
        <Empty text="Ainda não guardou nenhum método." />
      ) : (
        methods.map((m) => (
          <Card key={m.id}>
            <View style={u.between}>
              <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>{m.label}</Text>
              {m.isDefault ? <Badge label="Principal" color="#2E7D32" /> : null}
            </View>
            <Text style={u.muted}>{KIND_LABEL[m.kind] ?? m.kind}</Text>
            {m.phone ? <Text style={u.muted}>📞 {m.phone}</Text> : null}

            <View style={u.row}>
              {!m.isDefault ? <Btn small label="Tornar principal" onPress={() => setPrincipal(m)} /> : null}
              <Btn small kind="outline" label="✏️ Editar" onPress={() => openEdit(m)} />
              <Btn small kind="danger" label="Apagar" onPress={() => remove(m)} />
            </View>
          </Card>
        ))
      )}
    </Page>
  );
}
