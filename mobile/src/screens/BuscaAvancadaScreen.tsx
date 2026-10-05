// mobile/src/screens/BuscaAvancadaScreen.tsx  (funcionalidades 29, 30, 31 e 32)
// Procura produto por nome e filtra por localização, preço e quantidade mínima.
// Busca por voz: o teclado do celular já tem o microfone para ditar o nome do produto.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Linking, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAparencia } from '../context/AparenciaContext';

const API = 'https://n-djunta-agro.onrender.com/api/products';

export default function BuscaAvancadaScreen({ navigation }: any) {
  const { cores, escala } = useAparencia();
  const [todos, setTodos] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [nome, setNome] = useState('');
  const [local, setLocal] = useState('');
  const [precoMax, setPrecoMax] = useState('');
  const [precoMin, setPrecoMin] = useState('');
  const [qtdMin, setQtdMin] = useState('');

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro('');
    try {
      const token = await AsyncStorage.getItem('@nodjuntaagro:token');
      const r = await fetch(API, { headers: { Authorization: `Bearer ${token}` } });
      const d: any = await r.json();
      if (!r.ok) throw new Error(d.error || d.erro || `Erro ${r.status}`);
      setTodos(Array.isArray(d) ? d : d.products ?? d.data ?? []);
    } catch (e: any) {
      setErro(e.message || 'Sem internet');
    }
    setCarregando(false);
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  const num = (t: string) => (t.trim() === '' ? null : Number(t.replace(',', '.')));
  const lista = useMemo(() => {
    const pMax = num(precoMax), pMin = num(precoMin), qMin = num(qtdMin);
    return todos.filter((p) => {
      if (nome && !String(p.title || '').toLowerCase().includes(nome.toLowerCase())) return false;
      if (local && !String(p.location || '').toLowerCase().includes(local.toLowerCase())) return false;
      if (pMax !== null && Number(p.price) > pMax) return false;
      if (pMin !== null && Number(p.price) < pMin) return false;
      if (qMin !== null && Number(p.quantity) < qMin) return false;
      return true;
    });
  }, [todos, nome, local, precoMax, precoMin, qtdMin]);

  const s = StyleSheet.create({
    tela: { flex: 1, backgroundColor: cores.fundo, padding: 16, paddingTop: 40 },
    voltar: { color: cores.verde, fontSize: 16 * escala, marginBottom: 8 },
    h1: { fontSize: 22 * escala, fontWeight: 'bold', color: cores.verde, marginBottom: 8 },
    input: { borderWidth: 1, borderColor: cores.borda, borderRadius: 8, padding: 10, marginBottom: 8, color: cores.texto, backgroundColor: cores.fundo, fontSize: 14 * escala },
    linha: { flexDirection: 'row', gap: 8 },
    card: { padding: 12, borderRadius: 12, borderWidth: 1, borderColor: cores.borda, marginBottom: 8, backgroundColor: cores.card },
    titulo: { fontWeight: 'bold', fontSize: 15 * escala, color: cores.texto },
    txt: { color: cores.texto, marginTop: 2, fontSize: 14 * escala },
    btn: { backgroundColor: cores.verde, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, marginTop: 8, alignSelf: 'flex-start' },
    btnTxt: { color: '#fff', fontWeight: 'bold', fontSize: 14 * escala },
  });

  return (
    <SafeAreaView style={s.tela}>
      {navigation?.goBack && <TouchableOpacity onPress={() => navigation.goBack()}><Text style={s.voltar}>← Voltar</Text></TouchableOpacity>}
      <Text style={s.h1}>🔎 Procurar produtos</Text>
      <TextInput style={s.input} placeholder="Nome do produto (pode ditar pelo microfone do teclado)" placeholderTextColor={cores.suave} value={nome} onChangeText={setNome} />
      <TextInput style={s.input} placeholder="Região ou cidade" placeholderTextColor={cores.suave} value={local} onChangeText={setLocal} />
      <View style={s.linha}>
        <TextInput style={[s.input, { flex: 1 }]} placeholder="Preço mín." placeholderTextColor={cores.suave} keyboardType="numeric" value={precoMin} onChangeText={setPrecoMin} />
        <TextInput style={[s.input, { flex: 1 }]} placeholder="Preço máx." placeholderTextColor={cores.suave} keyboardType="numeric" value={precoMax} onChangeText={setPrecoMax} />
        <TextInput style={[s.input, { flex: 1 }]} placeholder="Qtd. mín." placeholderTextColor={cores.suave} keyboardType="numeric" value={qtdMin} onChangeText={setQtdMin} />
      </View>
      {carregando ? <ActivityIndicator color={cores.verde} /> : null}
      {erro ? <Text style={s.txt}>{erro}</Text> : null}
      <FlatList
        data={lista}
        keyExtractor={(p, n) => String(p.id ?? n)}
        onRefresh={carregar}
        refreshing={false}
        ListEmptyComponent={!carregando ? <Text style={s.txt}>Nenhum produto com esses filtros.</Text> : null}
        renderItem={({ item: p }) => (
          <View style={s.card}>
            <Text style={s.titulo}>{p.title}: {Number(p.price)}{p.unit ? ` / ${p.unit}` : ''}</Text>
            <Text style={s.txt}>Disponível: {p.quantity ?? '-'} • {p.location || '-'}</Text>
            {p.owner?.name ? <Text style={s.txt}>Vendedor: {p.owner.name}</Text> : null}
            {p.owner?.phone ? (
              <TouchableOpacity style={s.btn} onPress={() => Linking.openURL(`tel:${String(p.owner.phone).replace(/\s/g, '')}`)}>
                <Text style={s.btnTxt}>📞 Ligar</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}
      />
    </SafeAreaView>
  );
}
