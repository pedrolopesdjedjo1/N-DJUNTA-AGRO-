// mobile/src/screens/AgricultorScreen.tsx
// Área do Agricultor: menu com as funcionalidades e uma tela genérica para cada uma.
// Modo offline: ao guardar sem internet, o registo fica no aparelho e é enviado depois.
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Linking, SafeAreaView, ScrollView,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API = 'https://n-djunta-agro.onrender.com/api/agricultor';
const VERDE = '#2e7d32';
const FILA = '@nodjuntaagro:filaAgricultor';

type Campo = { k: string; r: string; tipo?: 'texto' | 'numero' | 'longo' | 'bool'; obrig?: boolean; dica?: string };
type Acao = { r: string; patch: any };
type Secao = {
  id: string; icone: string; nome: string; desc: string; rota: string;
  campos: Campo[]; filtros?: string[]; fixo?: any; dono?: string;
  titulo: (i: any) => string; linhas: (i: any) => string[];
  tel?: string; url?: string; mapa?: boolean; acoes?: Acao[];
  respostas?: boolean; verificar?: boolean; botaoNovo?: string;
};

const estrelas = (n: any) => '★'.repeat(Number(n) || 0) + '☆'.repeat(5 - (Number(n) || 0));

const SECOES: Secao[] = [
  {
    id: 'precos', icone: '💰', nome: 'Preço do mercado hoje', rota: 'precos',
    desc: 'Compare o preço dos produtos por cidade. Busque pelo produto ou pela cidade.',
    campos: [], filtros: ['produto', 'cidade'],
    titulo: (i) => `${i.produto}: ${Number(i.preco)} ${i.moeda || ''}`,
    linhas: (i) => [i.cidade],
  },
  {
    id: 'alerta_preco', icone: '🔔', nome: 'Alerta de preço', rota: 'alertas_preco', dono: 'usuario_id', verificar: true,
    desc: 'Escolha um produto e o preço que você quer. Toque em Verificar para ver se já chegou.',
    campos: [
      { k: 'produto', r: 'Produto' },
      { k: 'preco_desejado', r: 'Preço desejado', tipo: 'numero' },
    ],
    titulo: (i) => i.produto,
    linhas: (i) => [`Quero a partir de ${Number(i.preco_desejado)}`],
  },
  {
    id: 'clima', icone: '🌦️', nome: 'Alerta de clima', rota: 'alertas_regiao', fixo: { tipo: 'clima' },
    desc: 'Chuva, seca, calor e vento na sua região, com orientação prática.',
    campos: [], filtros: ['regiao'],
    titulo: (i) => i.titulo,
    linhas: (i) => [i.regiao, i.texto, i.orientacao ? `Orientação: ${i.orientacao}` : ''],
  },
  {
    id: 'praga', icone: '🐛', nome: 'Alerta de praga', rota: 'alertas_regiao', fixo: { tipo: 'praga' },
    desc: 'Pragas e doenças encontradas na sua região, com explicação e o que fazer.',
    campos: [], filtros: ['regiao'],
    titulo: (i) => i.titulo,
    linhas: (i) => [i.regiao, i.texto, i.orientacao ? `Orientação: ${i.orientacao}` : ''],
  },
  {
    id: 'mapa', icone: '🗺️', nome: 'Compradores (mapa e ligar)', rota: 'compradores', dono: 'usuario_id',
    desc: 'Compradores perto de você. Toque em Ligar ou Ver no mapa.',
    campos: [
      { k: 'nome', r: 'Nome' },
      { k: 'telefone', r: 'Celular' },
      { k: 'produtos_procurados', r: 'Produtos que procura' },
      { k: 'cidade', r: 'Cidade' },
      { k: 'lat', r: 'Latitude (opcional)', tipo: 'numero', obrig: false },
      { k: 'lng', r: 'Longitude (opcional)', tipo: 'numero', obrig: false },
    ],
    filtros: ['cidade'], botaoNovo: 'Registar-me como comprador', tel: 'telefone', mapa: true,
    titulo: (i) => i.nome,
    linhas: (i) => [`Procura: ${i.produtos_procurados || '-'}`, i.cidade],
  },
  {
    id: 'encontros', icone: '📅', nome: 'Marcar encontro', rota: 'encontros', dono: 'criado_por',
    desc: 'Combine data, hora e local com o comprador. Toque em Ligar para avisar a pessoa.',
    campos: [
      { k: 'outro_nome', r: 'Com quem' },
      { k: 'outro_telefone', r: 'Celular (opcional)', obrig: false },
      { k: 'data_hora', r: 'Data e hora', dica: '2026-10-20 15:00' },
      { k: 'local', r: 'Local' },
    ],
    tel: 'outro_telefone',
    acoes: [{ r: 'Feito', patch: { estado: 'concluido' } }, { r: 'Cancelar', patch: { estado: 'cancelado' } }],
    titulo: (i) => `${i.data_hora} com ${i.outro_nome}`,
    linhas: (i) => [i.local, `Estado: ${i.estado}`],
  },
  {
    id: 'transporte', icone: '🚚', nome: 'Pedir transporte', rota: 'transportes', dono: 'usuario_id',
    desc: 'Depois de vender, peça transporte: produto, quantidade, de onde e para onde.',
    campos: [
      { k: 'produto', r: 'Produto' },
      { k: 'quantidade', r: 'Quantidade' },
      { k: 'origem', r: 'Origem' },
      { k: 'destino', r: 'Destino' },
    ],
    acoes: [{ r: 'Cancelar pedido', patch: { estado: 'cancelado' } }],
    titulo: (i) => `${i.produto} (${i.quantidade})`,
    linhas: (i) => [`${i.origem} → ${i.destino}`, `Estado: ${i.estado}`],
  },
  {
    id: 'avaliar', icone: '⭐', nome: 'Avaliar comprador', rota: 'avaliacoes_compradores', dono: 'autor_id',
    desc: 'Depois da venda, dê estrelas de 1 a 5 e escreva um comentário.',
    campos: [
      { k: 'comprador_nome', r: 'Nome do comprador' },
      { k: 'estrelas', r: 'Estrelas (1 a 5)', tipo: 'numero' },
      { k: 'comentario', r: 'Comentário (opcional)', tipo: 'longo', obrig: false },
    ],
    titulo: (i) => `${i.comprador_nome} ${estrelas(i.estrelas)}`,
    linhas: (i) => [i.comentario || ''],
  },
  {
    id: 'historico', icone: '🧾', nome: 'Histórico de vendas', rota: 'vendas', dono: 'vendedor_id',
    desc: 'Todas as suas vendas: produto, quantidade, comprador, preço e data.',
    campos: [
      { k: 'produto', r: 'Produto' },
      { k: 'quantidade', r: 'Quantidade' },
      { k: 'comprador_nome', r: 'Comprador' },
      { k: 'comprador_telefone', r: 'Celular do comprador (opcional)', obrig: false },
      { k: 'preco', r: 'Valor total', tipo: 'numero' },
    ],
    tel: 'comprador_telefone',
    titulo: (i) => `${i.produto} (${i.quantidade}): ${Number(i.preco)}`,
    linhas: (i) => [`Comprador: ${i.comprador_nome}`, new Date(i.criado_em).toLocaleDateString()],
  },
  {
    id: 'pagamento', icone: '💵', nome: 'Receber pagamento', rota: 'vendas', dono: 'vendedor_id',
    desc: 'Acompanhe o valor, o estado do pagamento e a entrega. O dinheiro não passa pelo app.',
    campos: [],
    acoes: [
      { r: 'Marcar como pago', patch: { estado_pagamento: 'pago' } },
      { r: 'Entrega confirmada', patch: { entrega_confirmada: true } },
    ],
    titulo: (i) => `${i.produto}: ${Number(i.preco)}`,
    linhas: (i) => [
      `Pagamento: ${i.estado_pagamento === 'pago' ? 'Pago ✅' : 'Pendente ⏳'}`,
      `Entrega: ${i.entrega_confirmada ? 'Confirmada ✅' : 'Pendente ⏳'}`,
    ],
  },
  {
    id: 'contactos', icone: '⭐', nome: 'Contactos favoritos', rota: 'contactos', dono: 'usuario_id',
    desc: 'Guarde compradores e contactos importantes para ligar rápido.',
    campos: [
      { k: 'nome', r: 'Nome' },
      { k: 'telefone', r: 'Celular' },
      { k: 'nota', r: 'Nota (opcional)', obrig: false },
    ],
    tel: 'telefone',
    titulo: (i) => i.nome,
    linhas: (i) => [i.telefone, i.nota || ''],
  },
  {
    id: 'sementes', icone: '🌱', nome: 'Pedir sementes', rota: 'forum_posts', dono: 'usuario_id', fixo: { tipo: 'sementes' },
    desc: 'Publique o que procura, por exemplo: Procuro sementes de arroz. Outros respondem.',
    campos: [{ k: 'texto', r: 'O que você procura', tipo: 'longo' }],
    respostas: true,
    titulo: (i) => i.texto,
    linhas: (i) => [`Por ${i.usuario_nome || 'Utilizador'}`],
  },
  {
    id: 'forum', icone: '💬', nome: 'Fórum agrícola', rota: 'forum_posts', dono: 'usuario_id', fixo: { tipo: 'pergunta' },
    desc: 'Faça perguntas. Agricultores e especialistas respondem.',
    campos: [{ k: 'texto', r: 'Sua pergunta', tipo: 'longo' }],
    respostas: true,
    titulo: (i) => i.texto,
    linhas: (i) => [`Por ${i.usuario_nome || 'Utilizador'}`],
  },
  {
    id: 'videos', icone: '🎬', nome: 'Vídeos de técnicas', rota: 'videos', url: 'url',
    desc: 'Vídeos curtos sobre plantação, colheita, conservação, pesca e negócios. Filtre por idioma.',
    campos: [], filtros: ['categoria', 'idioma'],
    titulo: (i) => i.titulo,
    linhas: (i) => [`${i.categoria || ''} • ${i.idioma || ''}`],
  },
  {
    id: 'colheitas', icone: '🌾', nome: 'Registar colheita', rota: 'colheitas', dono: 'usuario_id',
    desc: 'Guarde produto, quantidade e data. Pode autorizar o uso nas estatísticas agrícolas.',
    campos: [
      { k: 'produto', r: 'Produto' },
      { k: 'quantidade', r: 'Quantidade' },
      { k: 'data', r: 'Data', dica: '2026-10-04' },
      { k: 'autorizado_estatistica', r: 'Autorizo usar nas estatísticas', tipo: 'bool' },
    ],
    titulo: (i) => `${i.produto} (${i.quantidade})`,
    linhas: (i) => [i.data || '', i.autorizado_estatistica ? 'Usado em estatísticas' : ''],
  },
  {
    id: 'noticias', icone: '📰', nome: 'Notícias do governo', rota: 'noticias',
    desc: 'Subsídios, programas, campanhas agrícolas, avisos e oportunidades.',
    campos: [],
    titulo: (i) => i.titulo,
    linhas: (i) => [i.texto, new Date(i.criado_em).toLocaleDateString()],
  },
];

// ---------- rede e modo offline ----------
async function chamar(caminho: string, metodo = 'GET', corpo?: any) {
  const token = await AsyncStorage.getItem('@nodjuntaagro:token');
  const r = await fetch(`${API}/${caminho}`, {
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

async function guardarNaFila(rota: string, corpo: any) {
  const f = JSON.parse((await AsyncStorage.getItem(FILA)) || '[]');
  f.push({ rota, corpo });
  await AsyncStorage.setItem(FILA, JSON.stringify(f));
}

async function sincronizar(): Promise<number> {
  const f: any[] = JSON.parse((await AsyncStorage.getItem(FILA)) || '[]');
  if (!f.length) return 0;
  const resto: any[] = [];
  let enviados = 0;
  for (const it of f) {
    try {
      await chamar(it.rota, 'POST', it.corpo);
      enviados++;
    } catch (e: any) {
      if (!e.http) resto.push(it); // sem internet: tenta de novo depois
    }
  }
  await AsyncStorage.setItem(FILA, JSON.stringify(resto));
  return enviados;
}

// ---------- respostas do fórum ----------
function Respostas({ post, voltar }: { post: any; voltar: () => void }) {
  const [lista, setLista] = useState<any[]>([]);
  const [texto, setTexto] = useState('');
  const carregar = useCallback(async () => {
    try {
      setLista(await chamar(`forum_respostas?post_id=${post.id}`));
    } catch (e: any) {
      Alert.alert('Erro', e.message);
    }
  }, [post.id]);
  useEffect(() => { carregar(); }, [carregar]);
  async function enviar() {
    if (!texto.trim()) return;
    try {
      await chamar('forum_respostas', 'POST', { post_id: post.id, texto: texto.trim() });
      setTexto('');
      carregar();
    } catch (e: any) {
      Alert.alert('Erro', e.http ? e.message : 'Sem internet. Tente de novo.');
    }
  }
  return (
    <SafeAreaView style={s.tela}>
      <TouchableOpacity onPress={voltar}><Text style={s.voltar}>← Voltar</Text></TouchableOpacity>
      <View style={s.card}><Text style={s.titulo}>{post.texto}</Text><Text style={s.linha}>Por {post.usuario_nome || 'Utilizador'}</Text></View>
      <Text style={s.sub}>Respostas</Text>
      <FlatList
        data={lista}
        keyExtractor={(i) => i.id}
        ListEmptyComponent={<Text style={s.vazio}>Ainda sem respostas.</Text>}
        renderItem={({ item }) => (
          <View style={s.card}><Text style={s.linha}>{item.texto}</Text><Text style={s.mini}>{item.usuario_nome || 'Utilizador'}</Text></View>
        )}
      />
      <View style={s.linhaEnviar}>
        <TextInput style={[s.input, { flex: 1 }]} placeholder="Escreva uma resposta" value={texto} onChangeText={setTexto} />
        <TouchableOpacity style={s.btn} onPress={enviar}><Text style={s.btnTxt}>Enviar</Text></TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ---------- tela genérica de cada seção ----------
function TelaSecao({ cfg, userId, voltar }: { cfg: Secao; userId: string; voltar: () => void }) {
  const [itens, setItens] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [offline, setOffline] = useState(false);
  const [filtro, setFiltro] = useState<any>({});
  const [aplicado, setAplicado] = useState<any>({});
  const [novo, setNovo] = useState(false);
  const [form, setForm] = useState<any>({});
  const [post, setPost] = useState<any>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    const params = { ...aplicado, ...(cfg.fixo || {}) };
    const qs = Object.entries(params).filter(([, v]) => v).map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&');
    const chave = `@nodjuntaagro:cacheAgro:${cfg.id}`;
    try {
      const d = await chamar(cfg.rota + (qs ? `?${qs}` : ''));
      setItens(d);
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
  }, [aplicado, cfg]);

  useEffect(() => {
    sincronizar().finally(carregar);
  }, [carregar]);

  async function salvar() {
    for (const c of cfg.campos) {
      if (c.obrig !== false && c.tipo !== 'bool' && !String(form[c.k] ?? '').trim()) {
        Alert.alert('Falta preencher', c.r);
        return;
      }
    }
    const corpo = { ...form, ...(cfg.fixo || {}) };
    try {
      await chamar(cfg.rota, 'POST', corpo);
      setNovo(false);
      setForm({});
      carregar();
    } catch (e: any) {
      if (e.http) {
        Alert.alert('Erro', e.message);
      } else {
        await guardarNaFila(cfg.rota, corpo);
        Alert.alert('Sem internet', 'Guardado no aparelho. Será enviado quando a conexão voltar.');
        setNovo(false);
        setForm({});
      }
    }
  }

  async function aplicarAcao(i: any, a: Acao) {
    try {
      await chamar(`${cfg.rota}/${i.id}`, 'PATCH', a.patch);
      carregar();
    } catch (e: any) {
      Alert.alert('Erro', e.http ? e.message : 'Sem internet. Tente de novo.');
    }
  }

  function apagar(i: any) {
    Alert.alert('Apagar', 'Quer apagar este item?', [
      { text: 'Não', style: 'cancel' },
      {
        text: 'Apagar', style: 'destructive', onPress: async () => {
          try { await chamar(`${cfg.rota}/${i.id}`, 'DELETE'); carregar(); }
          catch (e: any) { Alert.alert('Erro', e.http ? e.message : 'Sem internet. Tente de novo.'); }
        },
      },
    ]);
  }

  async function verificar() {
    try {
      const d = await chamar('atingidos');
      if (!d.length) Alert.alert('Alertas de preço', 'Nenhum preço chegou ao valor que você quer ainda.');
      else Alert.alert('Preço atingido! 🎉', d.map((x: any) => `${x.produto}: ${Number(x.preco)} em ${x.cidade}`).join('\n'));
    } catch (e: any) {
      Alert.alert('Erro', e.http ? e.message : 'Sem internet.');
    }
  }

  const ligar = (n: string) => Linking.openURL(`tel:${String(n).replace(/\s/g, '')}`);

  if (post) return <Respostas post={post} voltar={() => setPost(null)} />;

  return (
    <SafeAreaView style={s.tela}>
      <TouchableOpacity onPress={voltar}><Text style={s.voltar}>← Voltar</Text></TouchableOpacity>
      <Text style={s.h1}>{cfg.icone} {cfg.nome}</Text>
      <Text style={s.desc}>{cfg.desc}</Text>
      {offline && <Text style={s.aviso}>Sem internet. Mostrando o que está guardado no aparelho.</Text>}

      {cfg.filtros && (
        <View style={s.linhaEnviar}>
          {cfg.filtros.map((f) => (
            <TextInput key={f} style={[s.input, { flex: 1 }]} placeholder={f} value={filtro[f] || ''} onChangeText={(t) => setFiltro({ ...filtro, [f]: t })} />
          ))}
          <TouchableOpacity style={s.btn} onPress={() => setAplicado({ ...filtro })}><Text style={s.btnTxt}>Buscar</Text></TouchableOpacity>
        </View>
      )}

      <View style={s.linhaEnviar}>
        {cfg.campos.length > 0 && (
          <TouchableOpacity style={s.btn} onPress={() => setNovo(!novo)}>
            <Text style={s.btnTxt}>{novo ? 'Fechar' : cfg.botaoNovo || '+ Novo'}</Text>
          </TouchableOpacity>
        )}
        {cfg.verificar && (
          <TouchableOpacity style={s.btnClaro} onPress={verificar}><Text style={s.btnClaroTxt}>Verificar agora</Text></TouchableOpacity>
        )}
      </View>

      {novo && (
        <ScrollView style={s.form} keyboardShouldPersistTaps="handled">
          {cfg.campos.map((c) =>
            c.tipo === 'bool' ? (
              <TouchableOpacity key={c.k} style={s.check} onPress={() => setForm({ ...form, [c.k]: !form[c.k] })}>
                <Text style={s.linha}>{form[c.k] ? '☑' : '☐'} {c.r}</Text>
              </TouchableOpacity>
            ) : (
              <TextInput
                key={c.k}
                style={[s.input, c.tipo === 'longo' && { height: 90, textAlignVertical: 'top' }]}
                placeholder={c.dica ? `${c.r} (${c.dica})` : c.r}
                multiline={c.tipo === 'longo'}
                keyboardType={c.tipo === 'numero' ? 'numeric' : 'default'}
                value={String(form[c.k] ?? '')}
                onChangeText={(t) => setForm({ ...form, [c.k]: t })}
              />
            )
          )}
          <TouchableOpacity style={s.btn} onPress={salvar}><Text style={s.btnTxt}>Guardar</Text></TouchableOpacity>
        </ScrollView>
      )}

      {carregando ? (
        <ActivityIndicator color={VERDE} style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={itens}
          keyExtractor={(i) => String(i.id)}
          onRefresh={carregar}
          refreshing={false}
          ListEmptyComponent={<Text style={s.vazio}>Nada por aqui ainda.</Text>}
          renderItem={({ item }) => {
            const meu = !!cfg.dono && String(item[cfg.dono]) === userId;
            return (
              <View style={s.card}>
                <Text style={s.titulo}>{cfg.titulo(item)}</Text>
                {cfg.linhas(item).filter(Boolean).map((l, n) => <Text key={n} style={s.linha}>{l}</Text>)}
                <View style={s.acoes}>
                  {cfg.tel && item[cfg.tel] ? (
                    <TouchableOpacity style={s.btnPeq} onPress={() => ligar(item[cfg.tel!])}><Text style={s.btnTxt}>📞 Ligar</Text></TouchableOpacity>
                  ) : null}
                  {cfg.mapa && item.lat && item.lng ? (
                    <TouchableOpacity style={s.btnPeq} onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${item.lat},${item.lng}`)}>
                      <Text style={s.btnTxt}>🗺️ Ver no mapa</Text>
                    </TouchableOpacity>
                  ) : null}
                  {cfg.url && item[cfg.url] ? (
                    <TouchableOpacity style={s.btnPeq} onPress={() => Linking.openURL(item[cfg.url!])}><Text style={s.btnTxt}>▶ Assistir</Text></TouchableOpacity>
                  ) : null}
                  {cfg.respostas ? (
                    <TouchableOpacity style={s.btnPeq} onPress={() => setPost(item)}><Text style={s.btnTxt}>💬 Respostas</Text></TouchableOpacity>
                  ) : null}
                  {cfg.acoes && meu ? cfg.acoes.map((a) => (
                    <TouchableOpacity key={a.r} style={s.btnPeq} onPress={() => aplicarAcao(item, a)}><Text style={s.btnTxt}>{a.r}</Text></TouchableOpacity>
                  )) : null}
                  {meu ? (
                    <TouchableOpacity style={s.btnApagar} onPress={() => apagar(item)}><Text style={s.btnTxt}>Apagar</Text></TouchableOpacity>
                  ) : null}
                </View>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

// ---------- menu principal ----------
export default function AgricultorScreen({ navigation }: any) {
  const [secao, setSecao] = useState<Secao | null>(null);
  const [userId, setUserId] = useState('');
  const [pendentes, setPendentes] = useState(0);

  useEffect(() => {
    (async () => {
      const u = await AsyncStorage.getItem('@nodjuntaagro:user');
      if (u) setUserId(String(JSON.parse(u).id));
      await sincronizar();
      const f = JSON.parse((await AsyncStorage.getItem(FILA)) || '[]');
      setPendentes(f.length);
    })();
  }, [secao]);

  if (secao) return <TelaSecao cfg={secao} userId={userId} voltar={() => setSecao(null)} />;

  return (
    <SafeAreaView style={s.tela}>
      <ScrollView>
        {navigation?.goBack && (
          <TouchableOpacity onPress={() => navigation.goBack()}><Text style={s.voltar}>← Voltar</Text></TouchableOpacity>
        )}
        <Text style={s.h1}>🌾 Área do Agricultor</Text>
        {pendentes > 0 && <Text style={s.aviso}>{pendentes} registo(s) esperando internet para enviar.</Text>}
        {SECOES.map((x) => (
          <TouchableOpacity key={x.id} style={s.menuItem} onPress={() => setSecao(x)}>
            <Text style={s.menuIcone}>{x.icone}</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.titulo}>{x.nome}</Text>
              <Text style={s.mini}>{x.desc}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  tela: { flex: 1, backgroundColor: '#fff', padding: 16, paddingTop: 40 },
  voltar: { color: VERDE, fontSize: 16, marginBottom: 8 },
  h1: { fontSize: 22, fontWeight: 'bold', color: VERDE, marginBottom: 6 },
  desc: { color: '#444', marginBottom: 10 },
  sub: { fontWeight: 'bold', marginVertical: 6 },
  aviso: { backgroundColor: '#fff3cd', padding: 8, borderRadius: 8, marginBottom: 8, color: '#664d03' },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#d9e8d9', marginBottom: 8 },
  menuIcone: { fontSize: 26, marginRight: 12 },
  card: { padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e0e0e0', marginBottom: 8, backgroundColor: '#fafafa' },
  titulo: { fontWeight: 'bold', fontSize: 15 },
  linha: { color: '#333', marginTop: 2 },
  mini: { color: '#666', fontSize: 12, marginTop: 2 },
  vazio: { textAlign: 'center', color: '#888', marginTop: 24 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, marginBottom: 8, backgroundColor: '#fff' },
  form: { maxHeight: 360, marginBottom: 8 },
  check: { paddingVertical: 8 },
  linhaEnviar: { flexDirection: 'row', gap: 8, marginBottom: 8, alignItems: 'center' },
  acoes: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  btn: { backgroundColor: VERDE, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, alignItems: 'center' },
  btnPeq: { backgroundColor: VERDE, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 },
  btnApagar: { backgroundColor: '#c62828', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 },
  btnTxt: { color: '#fff', fontWeight: 'bold' },
  btnClaro: { borderWidth: 1, borderColor: VERDE, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8 },
  btnClaroTxt: { color: VERDE, fontWeight: 'bold' },
});
