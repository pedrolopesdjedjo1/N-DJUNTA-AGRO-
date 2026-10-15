import React, { useState } from "react";
import { View, Text, TouchableOpacity, Linking } from "react-native";
import { Page, Title, SubTitle, Card, Badge, Btn, Chip, Empty, useLoader, u } from "../components/ui";
import { listLearning } from "../api/community";
import { LEARNING_CATEGORIES } from "../constants/market";

const RULES = [
  "Arrefeça o peixe o mais depressa possível: o calor estraga-o em poucas horas.",
  "Mantenha o peixe à sombra, em caixas limpas e de preferência isoladas.",
  "Use gelo limpo e suficiente: cerca de uma parte de gelo para uma de peixe, e mais em dias muito quentes.",
  "Alterne camadas de gelo e peixe, deixe escorrer a água e renove o gelo quando derreter.",
  "Lave as mãos, as facas e as caixas. Nunca ponha o peixe no chão.",
  "Venda ou entregue o mais depressa possível: quanto mais fresco, melhor o preço.",
];

const TIMES = [
  "Sem gelo e ao calor: poucas horas. Venda ou conserve logo.",
  "Em gelo, à sombra e com o gelo renovado: alguns dias, mas a qualidade desce de dia para dia.",
  "Congelado: mantenha sempre congelado e não volte a congelar peixe que já descongelou.",
  "Salgado, seco ou defumado: dura mais tempo se ficar bem seco e protegido da humidade e dos insetos.",
];

export default function FisherConservationScreen({ navigation }: any) {
  const [tab, setTab] = useState<"" | "CONSERVACAO" | "MANUSEAMENTO">("");
  const [openId, setOpenId] = useState<string | null>(null);

  const loader = useLoader(
    async () => {
      const [a, b] = await Promise.all([
        listLearning({ area: "PESCA", category: "CONSERVACAO" }),
        listLearning({ area: "PESCA", category: "MANUSEAMENTO" }),
      ]);
      return [...(a as any[]), ...(b as any[])];
    },
    [] as any[]
  );

  const items: any[] = (loader.data as any[]).filter((i) => !tab || i.category === tab);

  return (
    <Page loader={loader}>
      <Title>🧊 Conservação do pescado</Title>

      <SubTitle>Regras de ouro</SubTitle>
      <Card>
        {RULES.map((r, index) => (
          <Text key={index} style={{ marginTop: index === 0 ? 0 : 6, lineHeight: 21 }}>
            {index + 1}. {r}
          </Text>
        ))}
      </Card>

      <SubTitle>⏳ Tempo de conservação (orientação)</SubTitle>
      <Card>
        {TIMES.map((t, index) => (
          <Text key={index} style={{ marginTop: index === 0 ? 0 : 6, lineHeight: 21 }}>
            • {t}
          </Text>
        ))}
        <Text style={[u.muted, { marginTop: 8 }]}>
          Os tempos variam com a espécie, o calor e o cuidado no manuseamento. Na dúvida, não venda nem coma.
        </Text>
      </Card>

      <SubTitle>Guias detalhados</SubTitle>
      <View style={u.row}>
        <Chip label="Todos" active={tab === ""} onPress={() => setTab("")} />
        <Chip label="Conservação" active={tab === "CONSERVACAO"} onPress={() => setTab("CONSERVACAO")} />
        <Chip label="Manuseamento e higiene" active={tab === "MANUSEAMENTO"} onPress={() => setTab("MANUSEAMENTO")} />
      </View>

      {items.length === 0 ? (
        <Empty text="Nenhum guia por agora." />
      ) : (
        items.map((item) => {
          const open = openId === item.id;
          const label = LEARNING_CATEGORIES.find((c) => c.value === item.category)?.label ?? item.category;
          return (
            <Card key={item.id}>
              <TouchableOpacity onPress={() => setOpenId(open ? null : item.id)}>
                <View style={u.between}>
                  <Text style={[u.strong, { flex: 1, marginRight: 8 }]}>{item.title}</Text>
                  <Badge label={label} color="#00838F" />
                </View>
                {!open && item.body ? (
                  <Text style={u.muted} numberOfLines={2}>
                    {item.body}
                  </Text>
                ) : null}
              </TouchableOpacity>

              {open && item.body ? <Text style={{ marginTop: 8, lineHeight: 21 }}>{item.body}</Text> : null}

              <View style={u.row}>
                {item.videoUrl ? <Btn small label="▶️ Ver vídeo" onPress={() => Linking.openURL(item.videoUrl)} /> : null}
                <Btn small kind="outline" label={open ? "Fechar" : "Ler mais"} onPress={() => setOpenId(open ? null : item.id)} />
              </View>
            </Card>
          );
        })
      )}

      <Btn kind="outline" label="📚 Ver todos os conteúdos de Aprender" onPress={() => navigation.navigate("Learning")} />
    </Page>
  );
}
