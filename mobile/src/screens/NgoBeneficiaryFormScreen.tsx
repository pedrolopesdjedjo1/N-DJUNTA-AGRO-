import React, { useEffect, useState } from "react";
import { View, Text, Alert } from "react-native";
import { Page, Title, Card, Btn, Chip, Field, useLoader, u } from "../components/ui";
import ChipGroup from "../components/ChipGroup";
import { createBeneficiary, createBeneficiariesBulk, updateBeneficiary, listNgoProjects, listCommunities } from "../api/ngo";
import { getWeatherRegions } from "../api/weather";
import { useNgoCatalog } from "../utils/ngoCatalog";
import { getApiErrorMessage } from "../api/errorMessage";

const PHONE = /^[+\d][\d\s-]{5,19}$/;
const MAX_BULK = 50;
const EMPTY = { projects: [] as any[], communities: [] as any[] };

interface Line {
  line: string;
  name: string;
  phone?: string;
  gender?: string;
  birthYear?: number;
}

// Cada linha: nome, telefone, F ou M, ano de nascimento (a ordem não importa, só o nome é obrigatório)
function parseLines(text: string): Line[] {
  const out: Line[] = [];
  text.split("\n").forEach((raw) => {
    const line = raw.trim();
    if (!line) return;

    const item: Line = { line, name: "" };
    line
      .split(/[;,]/)
      .map((p) => p.trim())
      .filter(Boolean)
      .forEach((part) => {
        const lower = part.toLowerCase();
        if (!item.phone && PHONE.test(part)) item.phone = part;
        else if (!item.gender && (lower === "f" || lower === "mulher")) item.gender = "F";
        else if (!item.gender && (lower === "m" || lower === "homem")) item.gender = "M";
        else if (!item.birthYear && /^(19|20)\d{2}$/.test(part)) item.birthYear = Number(part);
        else if (!item.name) item.name = part;
      });
    out.push(item);
  });
  return out;
}

export default function NgoBeneficiaryFormScreen({ navigation, route }: any) {
  const editing = route?.params?.beneficiary;
  const preset = route?.params ?? {};
  const catalog = useNgoCatalog();

  const [name, setName] = useState<string>(editing?.name ?? preset.name ?? "");
  const [phone, setPhone] = useState<string>(editing?.phone ?? preset.phone ?? "");
  const [gender, setGender] = useState<string>(editing?.gender ?? "");
  const [birthYear, setBirthYear] = useState<string>(
    editing?.birthYear !== null && editing?.birthYear !== undefined ? String(editing.birthYear) : ""
  );
  const [sector, setSector] = useState<string>(editing?.sector ?? preset.sector ?? "OUTRO");
  const [projectId, setProjectId] = useState<string>(editing?.projectId ?? preset.projectId ?? "");
  const [communityId, setCommunityId] = useState<string>(editing?.communityId ?? preset.communityId ?? "");
  const [region, setRegion] = useState<string>(editing?.region ?? preset.region ?? "");
  const [supportGiven, setSupportGiven] = useState<string>(editing?.supportGiven ?? "");
  const [notes, setNotes] = useState<string>(editing?.notes ?? "");
  const [bulk, setBulk] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [regions, setRegions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const linkedUserId: string | undefined = preset.userId ?? editing?.userId ?? undefined;

  const loader = useLoader(
    async () => {
      const [projects, communities] = await Promise.all([listNgoProjects(), listCommunities()]);
      return { projects: (projects as any).projects, communities };
    },
    EMPTY
  );

  useEffect(() => {
    getWeatherRegions()
      .then(setRegions)
      .catch(() => {});
  }, []);

  const projects: any[] = loader.data.projects;
  const communities: any[] = loader.data.communities;

  function readYear(): number | null | "invalid" {
    if (!birthYear.trim()) return null;
    const year = parseInt(birthYear, 10);
    if (birthYear.trim().length !== 4 || isNaN(year) || year < 1900 || year > new Date().getFullYear()) return "invalid";
    return year;
  }

  async function saveOne() {
    if (name.trim().length < 2) {
      Alert.alert("Atenção", "Escreva o nome do beneficiário.");
      return;
    }
    if (phone.trim() && !PHONE.test(phone.trim())) {
      Alert.alert("Atenção", "Telefone inválido.");
      return;
    }
    const year = readYear();
    if (year === "invalid") {
      Alert.alert("Atenção", "Escreva o ano de nascimento com 4 números (ex: 1995).");
      return;
    }

    // Ao editar, os campos vazios limpam o registo; ao criar, ficam de fora
    const empty = editing ? null : undefined;
    const body: Record<string, any> = {
      name: name.trim(),
      phone: phone.trim() || (editing ? "" : undefined),
      gender: gender || empty,
      birthYear: year ?? empty,
      sector,
      projectId: projectId || empty,
      communityId: communityId || empty,
      region: region.trim() || (editing ? "" : undefined),
      supportGiven: supportGiven.trim() || (editing ? "" : undefined),
      notes: notes.trim() || (editing ? "" : undefined),
    };
    if (!editing && linkedUserId) body.userId = linkedUserId;

    setSaving(true);
    try {
      if (editing) await updateBeneficiary(editing.id, body);
      else await createBeneficiary(body);

      Alert.alert("Pronto", editing ? "Beneficiário atualizado." : "Beneficiário registado.");
      navigation.goBack();
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível guardar."));
    } finally {
      setSaving(false);
    }
  }

  async function saveBulk() {
    const lines = parseLines(bulkText);
    if (lines.length === 0) {
      Alert.alert("Atenção", "Escreva pelo menos um beneficiário (um por linha).");
      return;
    }
    if (lines.length > MAX_BULK) {
      Alert.alert("Atenção", `Registe até ${MAX_BULK} pessoas de cada vez.`);
      return;
    }

    setSaving(true);
    try {
      const result = await createBeneficiariesBulk({
        items: lines.map((l) => ({ name: l.name, phone: l.phone, gender: l.gender, birthYear: l.birthYear })),
        projectId: projectId || undefined,
        communityId: communityId || undefined,
        sector,
        region: region.trim() || undefined,
      });

      if (result.failed === 0) {
        Alert.alert("Pronto", `${result.created} beneficiário(s) registado(s).`);
        navigation.goBack();
        return;
      }

      // Deixa só as linhas com erro, para corrigir e tentar de novo
      const failed: number[] = result.errors.map((e: any) => e.index);
      setBulkText(lines.filter((_, i) => failed.includes(i)).map((l) => l.line).join("\n"));
      const details = result.errors
        .slice(0, 4)
        .map((e: any) => `Linha ${e.index + 1}${e.name ? ` (${e.name})` : ""}: ${e.error}`)
        .join("\n");
      Alert.alert(
        "Registo parcial",
        `Registados: ${result.created}. Com erro: ${result.failed}.\n\n${details}\n\nAs linhas com erro ficaram na caixa para corrigir.`
      );
    } catch (e) {
      Alert.alert("Atenção", getApiErrorMessage(e, "Não foi possível registar."));
    } finally {
      setSaving(false);
    }
  }

  const preview = bulk ? parseLines(bulkText) : [];

  return (
    <Page loader={loader}>
      <Title>{editing ? "✏️ Editar beneficiário" : "👥 Registar beneficiário"}</Title>

      {linkedUserId ? (
        <Card>
          <Text style={u.strong}>✅ Pessoa com conta no app</Text>
          <Text style={u.muted}>Ela recebe um aviso a dizer que foi registada, e as novidades do projeto.</Text>
        </Card>
      ) : null}

      {!editing && !linkedUserId ? (
        <View style={u.row}>
          <Chip label="Uma pessoa" active={!bulk} onPress={() => setBulk(false)} />
          <Chip label="Várias de uma vez" active={bulk} onPress={() => setBulk(true)} />
        </View>
      ) : null}

      {bulk ? (
        <>
          <Field
            label="Uma pessoa por linha"
            value={bulkText}
            onChangeText={setBulkText}
            multiline
            placeholder={"Maria Gomes, 955000000, F, 1990\nAlfa Camará, M, 1998\nBraima Sanhá"}
          />
          <Text style={u.muted}>
            Em cada linha escreva o nome e, se quiser, o telefone, F ou M e o ano de nascimento, separados por vírgulas. Só o nome é obrigatório. Até {MAX_BULK} pessoas.
          </Text>
          <Text style={[u.strong, { marginTop: 6 }]}>{preview.length} pessoa(s) na lista</Text>
        </>
      ) : (
        <>
          <Field label="Nome" value={name} onChangeText={setName} placeholder="Nome da pessoa" />
          <Field label="Telefone (opcional)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <ChipGroup label="Género" options={catalog.genders} value={gender} onChange={setGender} allowEmpty emptyLabel="Não indicar" />
          <Field
            label="Ano de nascimento (opcional)"
            value={birthYear}
            onChangeText={(v) => setBirthYear(v.replace(/\D/g, "").slice(0, 4))}
            keyboardType="numeric"
            placeholder="Ex: 1995"
          />
        </>
      )}

      <ChipGroup label={bulk ? "Tipo (para todos)" : "Tipo de beneficiário"} options={catalog.sectors} value={sector} onChange={setSector} />

      {projects.length > 0 ? (
        <>
          <Text style={u.label}>Projeto</Text>
          <View style={u.row}>
            <Chip label="Nenhum" active={projectId === ""} onPress={() => setProjectId("")} />
            {projects.map((p) => (
              <Chip key={p.id} label={p.name} active={projectId === p.id} onPress={() => setProjectId(projectId === p.id ? "" : p.id)} />
            ))}
          </View>
        </>
      ) : null}

      {communities.length > 0 ? (
        <>
          <Text style={u.label}>Comunidade</Text>
          <View style={u.row}>
            <Chip label="Nenhuma" active={communityId === ""} onPress={() => setCommunityId("")} />
            {communities.map((c) => (
              <Chip
                key={c.id}
                label={c.name}
                active={communityId === c.id}
                onPress={() => {
                  setCommunityId(communityId === c.id ? "" : c.id);
                  if (communityId !== c.id && !region.trim()) setRegion(c.region);
                }}
              />
            ))}
          </View>
        </>
      ) : (
        <Btn small kind="outline" label="➕ Registar uma comunidade" onPress={() => navigation.navigate("NgoCommunityForm")} />
      )}

      <Field label="Região" value={region} onChangeText={setRegion} placeholder="Ex: Gabú" />
      {regions.length > 0 ? (
        <View style={u.row}>
          {regions.map((r) => (
            <Chip key={r} label={r} active={region === r} onPress={() => setRegion(r)} />
          ))}
        </View>
      ) : null}

      {!bulk ? (
        <>
          <Field label="Apoio recebido (opcional)" value={supportGiven} onChangeText={setSupportGiven} placeholder="Ex: 20 kg de sementes de arroz" />
          <Field label="Notas (opcional)" value={notes} onChangeText={setNotes} multiline />
        </>
      ) : null}

      <Btn
        label={saving ? "A guardar..." : bulk ? `Registar ${preview.length || ""} pessoa(s)` : editing ? "Guardar alterações" : "Registar beneficiário"}
        onPress={bulk ? saveBulk : saveOne}
        disabled={saving}
      />
      <Btn kind="outline" label="Cancelar" onPress={() => navigation.goBack()} />
    </Page>
  );
}
