import React, { useState } from "react";
import { Alert, Text } from "react-native";
import { Page, Title, Card, Btn, Field } from "../components/ui";
import { colors } from "../theme/colors";
import { changePassword } from "../api/account";

export default function ChangePasswordScreen({ navigation }: any) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function salvar() {
    setError("");
    if (!current) return setError("Escreva a palavra-passe atual.");
    if (next.length < 6) return setError("A nova palavra-passe deve ter pelo menos 6 caracteres.");
    if (next !== again) return setError("As duas palavras-passe novas não são iguais.");
    if (next === current) return setError("A nova palavra-passe deve ser diferente da atual.");

    setBusy(true);
    try {
      await changePassword(current, next);
      Alert.alert("Pronto", "Palavra-passe alterada.", [{ text: "OK", onPress: () => navigation.goBack() }]);
      setCurrent("");
      setNext("");
      setAgain("");
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.response?.data?.message || e?.message || "Não foi possível alterar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page>
      <Title>Mudar palavra-passe</Title>
      <Card>
        <Field label="Palavra-passe atual" value={current} onChangeText={setCurrent} secureTextEntry autoCapitalize="none" />
        <Field label="Nova palavra-passe" value={next} onChangeText={setNext} secureTextEntry autoCapitalize="none" />
        <Field label="Repita a nova palavra-passe" value={again} onChangeText={setAgain} secureTextEntry autoCapitalize="none" />
        {error ? <Text style={{ color: colors.error, fontWeight: "600", marginBottom: 10 }}>{error}</Text> : null}
        <Btn label={busy ? "A guardar..." : "Guardar"} onPress={salvar} disabled={busy} />
      </Card>
    </Page>
  );
}
