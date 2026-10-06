// mobile/src/components/ModuloAgro.tsx
// Tela genérica usada pelos perfis: menu (com grupos) e, para cada funcionalidade, lista + formulário.
// Funciona com os módulos do backend criados com agroEngine (rota /api/<modulo>/<rota>).
// Modo offline: ao guardar sem internet, o registo fica no aparelho e é enviado depois.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Image, Linking, Modal, SafeAreaView, ScrollView, Share,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAparencia } from '../context/AparenciaContext';

const API_BASE = 'https://n-djunta-agro.onrender.com/api';
const FILA = '@nodjuntaagro:filaModulos';

export type Campo = { k: string; r: string; tipo?: 'texto' | 'numero' | 'longo' | 'bool' | 'foto'; obrig?: boolean; dica?: string };
export type Acao = {
  r: string;
  patch?: any; // altera o item (PATCH)
  post?: string; // ou chama um caminho do servidor (POST). ":id" vira o id do item
  se?: (i: any, meu: boolean) => boolean; // só mostra o botão quando for verdadeiro
  confirmar?: string; // pergunta antes de executar
  pedir?: { rotulo: string; numero?: boolean }; // pede um valor antes (enviado como "valor")
};
// Item fixo (sem servidor): atalho, ligação, localização ou texto informativo
export type Fixo = {
  titulo: string; linhas?: string[]; url?: string; tel?: string; tela?: string;
  especial?: 'enviar_localizacao' | 'abrir_mapa_aqui' | 'abrir_definicoes';
  msg?: string; botao?: string;
};
export type Secao = {
  id: string; icone: string; nome: string; desc: string; rota: string; modulo?: string;
  campos: Campo[]; filtros?: string[]; fixo?: any; dono?: string;
  titulo: (i: any) => string; linhas: (i: any) => string[];
  tel?: string; url?: string; mapa?: boolean; acoes?: Acao[]; botaoNovo?: string;
  rotaMapa?: { de: string; ate: string };
  rotaAcao?: string; // caminho usado nos botões de alterar e apagar (padrão: o mesmo de rota)
  compartilhar?: boolean;
  whatsapp?: (i: any) => string;
  chat?: { id: string; nome?: string }; // botão de mensagem para o utilizador do campo "id"
  filho?: { sec: Secao; pai: string; rotulo: string };
  verificar?: { rota: string; rotulo: string; vazio: string };
  grupo?: string; // título do grupo no menu
  tela?: string; params?: any; // no menu, abre outra tela do app
  perfis?: string[]; // só aparece para estes perfis (ADMIN vê tudo)
  fixos?: Fixo[]; // lista fixa em vez de buscar no servidor
};

async function chamar(modulo: string, caminho: string, metodo = 'GET', corpo?: any) {
  const token = await AsyncStorage.getItem('@nodjuntaagro:token');
  const r = await fetch(`${API_BASE}/${modulo}/${caminho}`, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const j: any = await r.json().catch(() => ({}));
  if (!r.ok) {
    const e: any = new Error(j.erro || `Erro ${r.status}`);
    e.http = true;
    throw e;
  }
  return j;
}
export const chamarApi = chamar;

async function guardarNaFila(modulo: string, rota: string, corpo: any) {
  const f = JSON.parse((await AsyncStorage.getItem(FILA)) || '[]');
  f.push({ modulo, rota, corpo });
  await AsyncStorage.setItem(FILA, JSON.stringify(f));
}

export async function sincronizarFila(): Promise<number> {
  const f: any[] = JSON.parse((await AsyncStorage.getItem(FILA)) || '[]');
  if (!f.length) return 0;
  const resto: any[] = [];
  for (const it of f) {
    try {
      await chamar(it.modulo, it.rota, 'POST', it.corpo);
    } catch (e: any) {
      if (!e.http) resto.push(it); // sem internet: tenta depois
    }
  }
  await AsyncStorage.setItem(FILA, JSON.stringify(resto));
  return resto.length;
}

function falar(texto: string) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Speech = require('expo-speech');
    Speech.stop();
    Speech.speak(texto, { language: 'pt-PT' });
  } catch {
    /* expo-speech não instalado: sem leitura por voz */
  }
}

// Localização atual (precisa do pacote expo-location)
async function obterLocalizacao(): Promise<{ lat: number; lng: number } | null> {
  let L: any = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    L = require('expo-location');
  } catch {
    /* pacote não instalado */
  }
  if (!L) {
    Alert.alert('Localização', 'Falta instalar o pacote de localização: cd mobile && npx expo install expo-location');
    return null;
  }
  try {
    const p = await L.requestForegroundPermissionsAsync();
    if (p.status !== 'granted') {
      Alert.alert('Localização', 'Permita o acesso à localização nas configurações do celular.');
      return null;
    }
    const pos = await L.getCurrentPositionAsync({});
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  } catch {
    Alert.alert('Localização', 'Não foi possível obter a sua localização. Tente de novo.');
    return null;
  }
}

function useEstilos() {
  const { cores, escala, leituraVoz } = useAparencia();
  const estilos = useMemo(() => StyleSheet.create({
    tela: { flex: 1, backgroundColor: cores.fundo, padding: 16, paddingTop: 40 },
    voltar: { color: cores.verde, fontSize: 16 * escala, marginBottom: 8 },
    h1: { fontSize: 22 * escala, fontWeight: 'bold', color: cores.verde, marginBottom: 6 },
    desc: { color: cores.suave, marginBottom: 10, fontSize: 14 * escala },
    aviso: { backgroundColor: cores.aviso, padding: 8, borderRadius: 8, marginBottom: 8, color: cores.texto, fontSize: 13 * escala },
    grupo: { fontSize: 15 * escala, fontWeight: 'bold', color: cores.verde, marginTop: 14, marginBottom: 6 },
    menuItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: cores.borda, marginBottom: 8, backgroundColor: cores.card },
    menuIcone: { fontSize: 26 * escala, marginRight: 12 },
    card: { padding: 12, borderRadius: 12, borderWidth: 1, borderColor: cores.borda, marginBottom: 8, backgroundColor: cores.card },
    titulo: { fontWeight: 'bold', fontSize: 15 * escala, color: cores.texto },
    linha: { color: cores.texto, marginTop: 2, fontSize: 14 * escala },
    mini: { color: cores.suave, fontSize: 12 * escala, marginTop: 2 },
    vazio: { textAlign: 'center', color: cores.suave, marginTop: 24, fontSize: 14 * escala },
    input: { borderWidth: 1, borderColor: cores.borda, borderRadius: 8, padding: 10, marginBottom: 8, backgroundColor: cores.fundo, color: cores.texto, fontSize: 14 * escala },
    form: { maxHeight: 420, marginBottom: 8 },
    linhaBtns: { flexDirection: 'row', gap: 8, marginBottom: 8, alignItems: 'center', flexWrap: 'wrap' },
    acoes: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
    btn: { backgroundColor: cores.verde, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, alignItems: 'center' },
    btnPeq: { backgroundColor: cores.verde, paddingVertical: 8 * escala, paddingHorizontal: 10, borderRadius: 8 },
    btnApagar: { backgroundColor: '#c62828', paddingVertical: 8 * escala, paddingHorizontal: 10, borderRadius: 8 },
    btnTxt: { color: '#fff', fontWeight: 'bold', fontSize: 14 * escala },
    btnClaro: { borderWidth: 1, borderColor: cores.verde, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8 },
    btnClaroTxt: { color: cores.verde, fontWeight: 'bold', fontSize: 14 * escala },
    fotoPrev: { width: '100%', height: 160, borderRadius: 8, marginBottom: 6, backgroundColor: '#ddd' },
    fundoModal: { flex: 1, backgroundColor: '#0008', justifyContent: 'center', padding: 24 },
  }), [cores, escala]);
  return { s: estilos, cores, leituraVoz };
}

// ---------- tela de uma funcionalidade ----------
function TelaSecao({ modulo: moduloPadrao, cfg, userId, voltar, extraFixo, navigation }: {
  modulo: string; cfg: Secao; userId: string; voltar: () => void; extraFixo?: any; navigation?: any;
}) {
  const modulo = cfg.modulo ?? moduloPadrao;
  const { s, cores, leituraVoz } = useEstilos();
  const [itens, setItens] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [offline, setOffline] = useState(false);
  const [filtro, setFiltro] = useState<any>({});
  const [aplicado, setAplicado] = useState<any>({});
  const [novo, setNovo] = useState(false);
  const [form, setForm] = useState<any>({});
  const [aberto, setAberto] = useState<any>(null);
  const [pedido, setPedido] = useState<{ item: any; a: Acao } | null>(null);
  const [entrada, setEntrada] = useState('');
  const [enviandoFoto, setEnviandoFoto] = useState(false);

  const fixoTotal = useMemo(() => ({ ...(cfg.fixo || {}), ...(extraFixo || {}) }), [cfg, extraFixo]);

  const carregar = useCallback(async () => {
    if (cfg.fixos) {
      setItens(cfg.fixos as any[]);
      setCarregando(false);
      return;
    }
    setCarregando(true);
    const params = { ...aplicado, ...fixoTotal };
    const qs = Object.entries(params).filter(([, v]) => v).map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&');
    const chave = `@nodjuntaagro:cache:${modulo}:${cfg.id}:${JSON.stringify(extraFixo || {})}`;
    try {
      const d = await chamar(modulo, cfg.rota + (qs ? `?${qs}` : ''));
      setItens(Array.isArray(d) ? d : []);
      setOffline(false);
      AsyncStorage.setItem(chave, JSON.stringify(d));
    } catch (e: any) {
      if (e.http) {
        Alert.alert('Erro', e.message);
      } else {
        setOffline(true);
        const c = await AsyncStorage.getItem(chave);
        setItens(c ? JSON.parse(c) : []);
      }
    }
    setCarregando(false);
  }, [aplicado, fixoTotal, cfg, modulo, extraFixo]);

  useEffect(() => {
    if (cfg.fixos) { carregar(); return; }
    sincronizarFila().finally(carregar);
  }, [carregar, cfg.fixos]);

  async function salvar() {
    for (const c of cfg.campos) {
      if (c.obrig !== false && c.tipo !== 'bool' && !String(form[c.k] ?? '').trim()) {
        Alert.alert('Falta preencher', c.r);
        return;
      }
    }
    if (enviandoFoto) {
      Alert.alert('Aguarde', 'A foto ainda está sendo enviada.');
      return;
    }
    const corpo = { ...form, ...fixoTotal };
    try {
      await chamar(modulo, cfg.rota, 'POST', corpo);
      setNovo(false);
      setForm({});
      carregar();
    } catch (e: any) {
      if (e.http) {
        Alert.alert('Erro', e.message);
      } else {
        await guardarNaFila(modulo, cfg.rota, corpo);
        Alert.alert('Sem internet', 'Guardado no aparelho. Será enviado quando a conexão voltar.');
        setNovo(false);
        setForm({});
      }
    }
  }

  // Foto dentro do formulário: escolhe, reduz e envia logo para o Supabase; o campo guarda o link
  async function escolherFotoCampo(k: string, camera: boolean) {
    const perm = camera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permissão', camera ? 'Permita o acesso à câmera.' : 'Permita o acesso à galeria.');
      return;
    }
    const opcoes: any = { mediaTypes: ['images'], quality: 0.5, base64: true };
    const r = camera
      ? await ImagePicker.launchCameraAsync(opcoes)
      : await ImagePicker.launchImageLibraryAsync(opcoes);
    if (r.canceled) return;
    let M: any = null;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      M = require('../utils/midia');
    } catch (e) {
      M = null;
    }
    if (!M) {
      Alert.alert('Foto', 'Falta o arquivo mobile/src/utils/midia.ts.');
      return;
    }
    setEnviandoFoto(true);
    try {
      const a = r.assets[0];
      const red = await M.reduzirFoto(a.uri, a.base64 ?? null);
      if (!red.base64) throw new Error('A foto não foi lida corretamente.');
      const url = await M.enviarFoto(red.base64);
      setForm((f: any) => ({ ...f, [k]: url }));
    } catch (e: any) {
      Alert.alert('Erro', e?.message || 'Não foi possível enviar a foto.');
    }
    setEnviandoFoto(false);
  }

  async function executarAcao(i: any, a: Acao, extra?: any) {
    try {
      if (a.post) {
        await chamar(modulo, a.post.replace(':id', String(i.id)), 'POST', extra || {});
      } else {
        await chamar(modulo, `${cfg.rotaAcao || cfg.rota}/${i.id}`, 'PATCH', { ...(a.patch || {}), ...(extra || {}) });
      }
      carregar();
    } catch (e: any) {
      Alert.alert('Erro', e.http ? e.message : 'Sem internet. Tente de novo.');
    }
  }

  function aplicarAcao(i: any, a: Acao) {
    if (a.pedir) {
      setEntrada('');
      setPedido({ item: i, a });
      return;
    }
    if (a.confirmar) {
      Alert.alert(a.r, a.confirmar, [
        { text: 'Não', style: 'cancel' },
        { text: 'Sim', onPress: () => executarAcao(i, a) },
      ]);
      return;
    }
    executarAcao(i, a);
  }

  function confirmarPedido() {
    if (!pedido) return;
    const { item, a } = pedido;
    if (!entrada.trim()) {
      Alert.alert('', 'Preencha o valor.');
      return;
    }
    setPedido(null);
    executarAcao(item, a, { valor: entrada.trim() });
  }

  function apagar(i: any) {
    Alert.alert('Apagar', 'Quer apagar este item?', [
      { text: 'Não', style: 'cancel' },
      {
        text: 'Apagar', style: 'destructive', onPress: async () => {
          try { await chamar(modulo, `${cfg.rotaAcao || cfg.rota}/${i.id}`, 'DELETE'); carregar(); }
          catch (e: any) { Alert.alert('Erro', e.http ? e.message : 'Sem internet. Tente de novo.'); }
        },
      },
    ]);
  }

  async function verificar() {
    if (!cfg.verificar) return;
    try {
      const d = await chamar(modulo, cfg.verificar.rota);
      if (!d.length) Alert.alert(cfg.verificar.rotulo, cfg.verificar.vazio);
      else Alert.alert(cfg.verificar.rotulo, d.map((x: any) => `${x.rotulo}: ${x.valor}`).join('\n'));
    } catch (e: any) {
      Alert.alert('Erro', e.http ? e.message : 'Sem internet.');
    }
  }

  function partilhar() {
    const texto = `${cfg.nome}\n` + itens.map((i) => `• ${cfg.titulo(i)} ${cfg.linhas(i).filter(Boolean).join(' | ')}`).join('\n');
    Share.share({ message: texto });
  }

  const ligar = (n: string) => Linking.openURL(`tel:${String(n).replace(/\s/g, '')}`);
  const abrirWhatsApp = (texto: string) =>
    Linking.openURL(`whatsapp://send?text=${encodeURIComponent(texto)}`).catch(() => Share.share({ message: texto }));

  async function abrirFixo(f: Fixo) {
    if (f.url) { Linking.openURL(f.url); return; }
    if (f.tel) { ligar(f.tel); return; }
    if (f.tela) { navigation?.navigate(f.tela); return; }
    if (f.especial === 'abrir_definicoes') { Linking.openSettings(); return; }
    const pos = await obterLocalizacao();
    if (!pos) return;
    const link = `https://www.google.com/maps/search/?api=1&query=${pos.lat},${pos.lng}`;
    if (f.especial === 'abrir_mapa_aqui') { Linking.openURL(link); return; }
    Share.share({ message: `${f.msg || 'Preciso de ajuda.'}\nMinha localização: ${link}` });
  }

  if (aberto && cfg.filho) {
    return (
      <TelaSecao
        modulo={modulo} cfg={cfg.filho.sec} userId={userId} navigation={navigation}
        voltar={() => setAberto(null)} extraFixo={{ [cfg.filho.pai]: aberto.id }}
      />
    );
  }

  return (
    <SafeAreaView style={s.tela}>
      <TouchableOpacity onPress={voltar}><Text style={s.voltar}>← Voltar</Text></TouchableOpacity>
      <Text style={s.h1}>{cfg.icone} {cfg.nome}</Text>
      <Text style={s.desc}>{cfg.desc}</Text>
      {offline && <Text style={s.aviso}>Sem internet. Mostrando o que está guardado no aparelho.</Text>}

      {cfg.filtros && (
        <View style={s.linhaBtns}>
          {cfg.filtros.map((f) => (
            <TextInput
              key={f} style={[s.input, { flex: 1, minWidth: 100, marginBottom: 0 }]} placeholder={f}
              placeholderTextColor={cores.suave} value={filtro[f] || ''} onChangeText={(t) => setFiltro({ ...filtro, [f]: t })}
            />
          ))}
          <TouchableOpacity style={s.btn} onPress={() => setAplicado({ ...filtro })}><Text style={s.btnTxt}>Buscar</Text></TouchableOpacity>
        </View>
      )}

      <View style={s.linhaBtns}>
        {cfg.campos.length > 0 && (
          <TouchableOpacity style={s.btn} onPress={() => setNovo(!novo)}>
            <Text style={s.btnTxt}>{novo ? 'Fechar' : cfg.botaoNovo || '+ Novo'}</Text>
          </TouchableOpacity>
        )}
        {cfg.verificar && (
          <TouchableOpacity style={s.btnClaro} onPress={verificar}><Text style={s.btnClaroTxt}>{cfg.verificar.rotulo}</Text></TouchableOpacity>
        )}
        {cfg.compartilhar && itens.length > 0 && (
          <TouchableOpacity style={s.btnClaro} onPress={partilhar}><Text style={s.btnClaroTxt}>Compartilhar</Text></TouchableOpacity>
        )}
      </View>

      {novo && (
        <ScrollView style={s.form} keyboardShouldPersistTaps="handled">
          {cfg.campos.map((c) => {
            if (c.tipo === 'bool') {
              return (
                <TouchableOpacity key={c.k} style={{ paddingVertical: 8 }} onPress={() => setForm({ ...form, [c.k]: !form[c.k] })}>
                  <Text style={s.linha}>{form[c.k] ? '☑' : '☐'} {c.r}</Text>
                </TouchableOpacity>
              );
            }
            if (c.tipo === 'foto') {
              return (
                <View key={c.k} style={{ marginBottom: 8 }}>
                  <Text style={s.linha}>{c.r}</Text>
                  {form[c.k] ? <Image source={{ uri: form[c.k] }} style={s.fotoPrev} resizeMode="cover" /> : null}
                  <View style={s.linhaBtns}>
                    <TouchableOpacity style={s.btnClaro} onPress={() => escolherFotoCampo(c.k, true)}><Text style={s.btnClaroTxt}>📷 Tirar foto</Text></TouchableOpacity>
                    <TouchableOpacity style={s.btnClaro} onPress={() => escolherFotoCampo(c.k, false)}><Text style={s.btnClaroTxt}>🖼️ Galeria</Text></TouchableOpacity>
                    {enviandoFoto ? <ActivityIndicator color={cores.verde} /> : null}
                  </View>
                </View>
              );
            }
            return (
              <TextInput
                key={c.k}
                style={[s.input, c.tipo === 'longo' && { height: 90, textAlignVertical: 'top' }]}
                placeholder={c.dica ? `${c.r} (${c.dica})` : c.r}
                placeholderTextColor={cores.suave}
                multiline={c.tipo === 'longo'}
                keyboardType={c.tipo === 'numero' ? 'numeric' : 'default'}
                value={String(form[c.k] ?? '')}
                onChangeText={(t) => setForm({ ...form, [c.k]: t })}
              />
            );
          })}
          <TouchableOpacity style={s.btn} onPress={salvar}><Text style={s.btnTxt}>Guardar</Text></TouchableOpacity>
        </ScrollView>
      )}

      {carregando ? (
        <ActivityIndicator color={cores.verde} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={itens}
          keyExtractor={(i, n) => String(i.id ?? n)}
          onRefresh={carregar}
          refreshing={false}
          ListEmptyComponent={<Text style={s.vazio}>Nada por aqui ainda.</Text>}
          renderItem={({ item }) => {
            if (cfg.fixos) {
              const f = item as Fixo;
              const temBotao = !!(f.url || f.tel || f.tela || f.especial);
              return (
                <View style={s.card}>
                  <Text style={s.titulo}>{f.titulo}</Text>
                  {(f.linhas || []).map((l, n) => <Text key={n} style={s.linha}>{l}</Text>)}
                  {temBotao ? (
                    <View style={s.acoes}>
                      <TouchableOpacity style={s.btnPeq} onPress={() => abrirFixo(f)}><Text style={s.btnTxt}>{f.botao || '▶ Abrir'}</Text></TouchableOpacity>
                    </View>
                  ) : null}
                </View>
              );
            }
            const meu = !!cfg.dono && String(item[cfg.dono]) === userId;
            const tel = cfg.tel ? item[cfg.tel] : null;
            const linhas = cfg.linhas(item).filter(Boolean);
            return (
              <TouchableOpacity
                activeOpacity={leituraVoz ? 0.6 : 1}
                onPress={() => leituraVoz && falar(`${cfg.titulo(item)}. ${linhas.join('. ')}`)}
              >
                <View style={s.card}>
                  <Text style={s.titulo}>{cfg.titulo(item)}</Text>
                  {linhas.map((l, n) => <Text key={n} style={s.linha}>{l}</Text>)}
                  <View style={s.acoes}>
                    {tel ? <TouchableOpacity style={s.btnPeq} onPress={() => ligar(tel)}><Text style={s.btnTxt}>📞 Ligar</Text></TouchableOpacity> : null}
                    {cfg.chat && item[cfg.chat.id] ? (
                      <TouchableOpacity
                        style={s.btnPeq}
                        onPress={() => navigation?.navigate('Chat', {
                          userId: item[cfg.chat!.id],
                          userName: cfg.chat!.nome ? item[cfg.chat!.nome] || 'Chat' : 'Chat',
                        })}
                      >
                        <Text style={s.btnTxt}>💬 Mensagem</Text>
                      </TouchableOpacity>
                    ) : null}
                    {cfg.mapa && item.lat && item.lng ? (
                      <TouchableOpacity style={s.btnPeq} onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${item.lat},${item.lng}`)}>
                        <Text style={s.btnTxt}>🗺️ Ver no mapa</Text>
                      </TouchableOpacity>
                    ) : null}
                    {cfg.rotaMapa && item[cfg.rotaMapa.de] && item[cfg.rotaMapa.ate] ? (
                      <TouchableOpacity
                        style={s.btnPeq}
                        onPress={() => Linking.openURL(`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(item[cfg.rotaMapa!.de])}&destination=${encodeURIComponent(item[cfg.rotaMapa!.ate])}`)}
                      >
                        <Text style={s.btnTxt}>🗺️ Ver rota</Text>
                      </TouchableOpacity>
                    ) : null}
                    {cfg.url && item[cfg.url] ? (
                      <TouchableOpacity style={s.btnPeq} onPress={() => Linking.openURL(item[cfg.url!])}><Text style={s.btnTxt}>▶ Abrir</Text></TouchableOpacity>
                    ) : null}
                    {cfg.whatsapp ? (
                      <TouchableOpacity style={s.btnPeq} onPress={() => abrirWhatsApp(cfg.whatsapp!(item))}><Text style={s.btnTxt}>📲 WhatsApp</Text></TouchableOpacity>
                    ) : null}
                    {cfg.filho ? (
                      <TouchableOpacity style={s.btnPeq} onPress={() => setAberto(item)}><Text style={s.btnTxt}>{cfg.filho.rotulo}</Text></TouchableOpacity>
                    ) : null}
                    {(cfg.acoes || []).filter((a) => !a.se || a.se(item, meu)).map((a) => (
                      <TouchableOpacity key={a.r} style={s.btnPeq} onPress={() => aplicarAcao(item, a)}><Text style={s.btnTxt}>{a.r}</Text></TouchableOpacity>
                    ))}
                    {meu ? <TouchableOpacity style={s.btnApagar} onPress={() => apagar(item)}><Text style={s.btnTxt}>Apagar</Text></TouchableOpacity> : null}
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      <Modal visible={!!pedido} transparent animationType="fade" onRequestClose={() => setPedido(null)}>
        <View style={s.fundoModal}>
          <View style={[s.card, { backgroundColor: cores.fundo }]}>
            <Text style={s.titulo}>{pedido?.a.pedir?.rotulo}</Text>
            <TextInput
              style={[s.input, { marginTop: 10 }]}
              value={entrada}
              onChangeText={setEntrada}
              keyboardType={pedido?.a.pedir?.numero ? 'numeric' : 'default'}
              autoFocus
              placeholderTextColor={cores.suave}
            />
            <View style={s.linhaBtns}>
              <TouchableOpacity style={s.btn} onPress={confirmarPedido}><Text style={s.btnTxt}>Confirmar</Text></TouchableOpacity>
              <TouchableOpacity style={s.btnClaro} onPress={() => setPedido(null)}><Text style={s.btnClaroTxt}>Cancelar</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ---------- menu do módulo ----------
export default function ModuloAgro({ modulo, titulo, icone, secoes, topo, navigation }: {
  modulo: string; titulo: string; icone: string; secoes: Secao[]; topo?: React.ReactNode; navigation?: any;
}) {
  const { s } = useEstilos();
  const [secao, setSecao] = useState<Secao | null>(null);
  const [userId, setUserId] = useState('');
  const [role, setRole] = useState('');
  const [pendentes, setPendentes] = useState(0);

  useEffect(() => {
    (async () => {
      const u = await AsyncStorage.getItem('@nodjuntaagro:user');
      if (u) {
        const dados = JSON.parse(u);
        setUserId(String(dados.id));
        setRole(String(dados.role || '').toUpperCase());
      }
      setPendentes(await sincronizarFila());
    })();
  }, [secao]);

  if (secao) {
    return <TelaSecao modulo={modulo} cfg={secao} userId={userId} voltar={() => setSecao(null)} navigation={navigation} />;
  }

  const visiveis = secoes.filter((x) => !x.perfis || role === 'ADMIN' || x.perfis.includes(role));

  return (
    <SafeAreaView style={s.tela}>
      <ScrollView>
        {navigation?.goBack && (
          <TouchableOpacity onPress={() => navigation.goBack()}><Text style={s.voltar}>← Voltar</Text></TouchableOpacity>
        )}
        <Text style={s.h1}>{icone} {titulo}</Text>
        {pendentes > 0 && <Text style={s.aviso}>{pendentes} registo(s) esperando internet para enviar.</Text>}
        {topo}
        {visiveis.map((x, n) => (
          <View key={x.id}>
            {x.grupo && x.grupo !== visiveis[n - 1]?.grupo ? <Text style={s.grupo}>{x.grupo}</Text> : null}
            <TouchableOpacity
              style={s.menuItem}
              onPress={() => (x.tela ? navigation?.navigate(x.tela, x.params) : setSecao(x))}
            >
              <Text style={s.menuIcone}>{x.icone}</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.titulo}>{x.nome}</Text>
                <Text style={s.mini}>{x.desc}</Text>
              </View>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
