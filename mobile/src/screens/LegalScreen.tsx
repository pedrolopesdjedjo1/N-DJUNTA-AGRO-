import React, { useCallback, useState } from "react";
import { Text } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { api } from "../api/client";
import { Page, Title, Card, Empty, u } from "../components/ui";
import { getApiErrorMessage } from "../api/errorMessage";

function textOf(data: any, kind: string): string {
  const key = kind === "privacy" ? "privacy" : "terms";
  return String(data?.legal?.[key] ?? data?.[key] ?? data?.[`legal.${key}`] ?? data?.settings?.[`legal.${key}`] ?? "").trim();
}

// Termos e condições, e política de privacidade, escritos pela equipa nas configurações do sistema
export default function LegalScreen({ route }: any) {
  const kind: string = route?.params?.kind === "privacy" ? "privacy" : "terms";
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const r = (await api.get("/api/platform/settings")).data;
      setText(textOf(r, kind));
    } catch (e) {
      setError(getApiErrorMessage(e, "Não foi possível carregar o texto."));
    }
  }, [kind]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <Page>
      <Title>{kind === "privacy" ? "📜 Política de privacidade" : "📜 Termos e condições"}</Title>
      {error ? <Empty text={error} /> : null}
      {text === null && !error ? <Text style={u.muted}>A carregar...</Text> : null}
      {text === "" ? <Empty text="A equipa ainda não publicou este texto." /> : null}
      {text ? (
        <Card>
          <Text style={{ lineHeight: 22 }}>{text}</Text>
        </Card>
      ) : null}
    </Page>
  );
}
