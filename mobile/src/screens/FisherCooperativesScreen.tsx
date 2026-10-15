import React, { useState } from "react";
import { View, Text, Linking } from "react-native";
import { Page, Title, Card, Badge, Btn, Chip, Empty, Field, useLoader, u } from "../components/ui";
import { getFarmerCooperatives } from "../api/farmer";

export default function FisherCooperativesScreen({ navigation }: any) {
  const [tab, setTab] = useState<"all" | "mine">("all");
  const [text, setText] = useState("");
  const [near, setNear] = useState("");

  const loader = useLoader(() => getFarmerCooperatives(near), [] as any[], [near]);
  const all: any[] = loader.data;
  const list = tab === "mine" ? all.filter((c) => c.joined) : all;

  return (
    <Page loader={loader}>
      <Title>🤝 Cooperativas de pesca</Title>

      <Btn label="🔎 Procurar e entrar em cooperativa" onPress={() => navigation.navigate("Cooperatives")} />

      <View style={u.row}>
        <Chip label="Cooperativas próximas" active={tab === "all"} onPress={() => setTab("all")} />
        <Chip label="As minhas" active={tab === "mine"} onPress={() => setTab("mine")} />
      </View>

      <Field
        placeholder="Perto de... (ex: Bubaque)"
        value={text}
        onChangeText={setText}
        onSubmitEditing={() => setNear(text.trim())}
        returnKeyType="search"
      />

      {list.length === 0 ? (
        <Empty text={tab === "mine" ? "Ainda não participa de nenhuma cooperativa." : "Nenhuma cooperativa encontrada."} />
      ) : (
        list.map((c) => (
          <Card key={c.id}>
            <View style={u.between}>
              <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>{c.name}</Text>
              {c.joined ? <Badge label="Membro" color="#2E7D32" /> : null}
            </View>
            {c.region ? <Text style={u.muted}>📍 {c.region}</Text> : null}
            <Text style={u.muted}>👥 {c.members} membro(s)</Text>
            {c.description ? <Text style={{ marginTop: 4 }}>{c.description}</Text> : null}
            <Text style={u.muted}>Líder: {c.leader?.name}</Text>

            <View style={u.row}>
              <Btn small label="Ver cooperativa" onPress={() => navigation.navigate("FisherCooperative", { id: c.id })} />
              {c.leader?.phone ? (
                <Btn small kind="outline" label="📞 Ligar" onPress={() => Linking.openURL(`tel:${c.leader.phone}`)} />
              ) : null}
              {c.leader ? (
                <Btn
                  small
                  kind="outline"
                  label="💬 Mensagem"
                  onPress={() => navigation.navigate("Chat", { userId: c.leader.id, userName: c.leader.name })}
                />
              ) : null}
            </View>
          </Card>
        ))
      )}
    </Page>
  );
}
