// mobile/src/screens/PerfilVendedorScreen.tsx  (funcionalidade 33: perfil do vendedor)
// Mostra nome, região, verificação, avaliação e anúncios de uma pessoa, com botões de ligar e mensagem.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { chamarApi } from '../components/ModuloAgro';
import { useAparencia } from '../context/AparenciaContext';

export default function PerfilVendedorScreen({ navigation, route }: any) {
  const { cores, escala } = useAparencia();
  const userId = String(route?.params?.userId ?? '');
  const userName = String(route?.params?.userName ?? '');
  const [dados, setDados] = useState<any>(null);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro('');
    try {
      setDados(await chamarApi('comprador', `vendedor/${userId}`));
    } catch (e: any) {
      setErro(e.http ? e.message : 'Sem internet. Tente de novo.');
    }
    setCarregando(false);
  }, [userId]);

  useEffect(() => { carregar(); }, [carregar]);

  const s = useMemo(() => StyleSheet.create({
    tela: { flex: 1, backgroundColor: cores.fundo },
    conteudo: { padding: 16, paddingBottom: 40 },
    nome: { fontSize: 24 * escala, fontWeight: 'bold', color: cores.verde },
    linha: { color: cores.texto, fontSize: 15 * escala, marginTop: 4 },
    suave: { color: cores.suave, fontSize: 13 * escala, marginTop: 2 },
    selo: { alignSelf: 'flex-start', backgroundColor: cores.verde, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, marginTop: 8 },
    seloTxt: { color: '#fff', fontWeight: 'bold', fontSize: 12 * escala },
    linhaBtns: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12 },
    btn: { backgroundColor: cores.verde, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 14, marginRight: 8, marginBottom: 8 },
    btnClaro: { borderWidth: 1, borderColor: cores.verde, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 14, marginRight: 8, marginBottom: 8 },
    btnTxt: { color: '#fff', fontWeight: 'bold', fontSize: 14 * escala },
    btnClaroTxt: { color: cores.verde, fontWeight: 'bold', fontSize: 14 * escala },
    secao: { fontSize: 17 * escala, fontWeight: 'bold', color: cores.texto, marginTop: 20, marginBottom: 8 },
    card: { flexDirection: 'row', borderWidth: 1, borderColor: cores.borda, borderRadius: 10, padding: 10, marginBottom: 8, backgroundColor: cores.card },
    foto: { width: 64, height: 64, borderRadius: 8, marginRight: 10, backgroundColor: '#ddd' },
    prodNome: { color: cores.texto, fontWeight: '600', fontSize: 15 * escala },
    voltar: { color: cores.verde, fontSize: 16 * escala, marginBottom: 12 },
  }), [cores, escala]);

  if (carregando) {
    return <View style={[s.tela, { justifyContent: 'center' }]}><ActivityIndicator color={cores.verde} size="large" /></View>;
  }

  if (erro || !dados) {
    return (
      <View style={[s.tela, s.conteudo, { paddingTop: 40 }]}>
        {navigation?.goBack && <TouchableOpacity onPress={() => navigation.goBack()}><Text style={s.voltar}>← Voltar</Text></TouchableOpacity>}
        <Text style={s.linha}>{erro || 'Perfil não encontrado.'}</Text>
        <TouchableOpacity style={[s.btn, { marginTop: 12, alignSelf: 'flex-start' }]} onPress={carregar}><Text style={s.btnTxt}>Tentar de novo</Text></TouchableOpacity>
      </View>
    );
  }

  const v = dados.vendedor;
  const media = dados.avaliacao?.media;
  const total = Number(dados.avaliacao?.total || 0);
  const nome = v.name || userName || 'Vendedor';

  return (
    <ScrollView style={s.tela} contentContainerStyle={s.conteudo}>
      <Text style={s.nome}>{nome}</Text>
      <Text style={s.linha}>{v.role}{v.location ? ` • ${v.location}` : ''}</Text>
      <Text style={s.suave}>No app desde {v.desde ? new Date(v.desde).toLocaleDateString() : '-'}</Text>
      {v.verificado ? <View style={s.selo}><Text style={s.seloTxt}>✅ Conta verificada</Text></View> : null}
      <Text style={s.linha}>
        {total > 0 ? `⭐ ${media} (${total} avaliação${total > 1 ? 'ões' : ''})` : 'Ainda sem avaliações'}
      </Text>

      <View style={s.linhaBtns}>
        {v.phone ? (
          <TouchableOpacity style={s.btn} onPress={() => Linking.openURL(`tel:${String(v.phone).replace(/\s/g, '')}`)}>
            <Text style={s.btnTxt}>📞 Ligar</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity style={s.btn} onPress={() => navigation.navigate('Chat', { userId: v.id, userName: nome })}>
          <Text style={s.btnTxt}>💬 Mensagem</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.btnClaro} onPress={() => navigation.navigate('Reviews', { userId: v.id, userName: nome })}>
          <Text style={s.btnClaroTxt}>⭐ Avaliações</Text>
        </TouchableOpacity>
      </View>

      <Text style={s.secao}>Produtos à venda ({dados.produtos?.length || 0})</Text>
      {(dados.produtos || []).length === 0 ? <Text style={s.suave}>Nenhum produto disponível agora.</Text> : null}
      {(dados.produtos || []).map((p: any) => (
        <View key={p.id} style={s.card}>
          {p.imageUrl ? <Image source={{ uri: p.imageUrl }} style={s.foto} /> : null}
          <View style={{ flex: 1 }}>
            <Text style={s.prodNome}>{p.title}</Text>
            <Text style={s.linha}>{Number(p.price)} FCFA{p.unit ? ` / ${p.unit}` : ''}</Text>
            <Text style={s.suave}>{[p.quantity ? `Disponível: ${p.quantity}` : '', p.location || ''].filter(Boolean).join(' • ')}</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}
