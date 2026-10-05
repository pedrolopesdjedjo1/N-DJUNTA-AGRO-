// mobile/src/screens/CalculadoraScreen.tsx  (funcionalidade 89)
import React, { useState } from 'react';
import { SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity } from 'react-native';
import { useAparencia } from '../context/AparenciaContext';

const fmt = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');

export default function CalculadoraScreen({ navigation }: any) {
  const { cores, escala } = useAparencia();
  const [qtd, setQtd] = useState('');
  const [preco, setPreco] = useState('');
  const q = Number(qtd.replace(',', '.')) || 0;
  const p = Number(preco.replace(',', '.')) || 0;

  const s = StyleSheet.create({
    tela: { flex: 1, backgroundColor: cores.fundo, padding: 16, paddingTop: 40 },
    voltar: { color: cores.verde, fontSize: 16 * escala, marginBottom: 8 },
    h1: { fontSize: 22 * escala, fontWeight: 'bold', color: cores.verde, marginBottom: 12 },
    input: { borderWidth: 1, borderColor: cores.borda, borderRadius: 10, padding: 14, marginBottom: 10, fontSize: 20 * escala, color: cores.texto, backgroundColor: cores.fundo },
    conta: { color: cores.suave, fontSize: 16 * escala, marginTop: 12 },
    total: { color: cores.verde, fontSize: 34 * escala, fontWeight: 'bold', marginTop: 6 },
    limpar: { marginTop: 20, alignSelf: 'flex-start', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: cores.verde },
    limparTxt: { color: cores.verde, fontWeight: 'bold', fontSize: 15 * escala },
  });

  return (
    <SafeAreaView style={s.tela}>
      {navigation?.goBack && <TouchableOpacity onPress={() => navigation.goBack()}><Text style={s.voltar}>← Voltar</Text></TouchableOpacity>}
      <Text style={s.h1}>🧮 Calculadora de preço</Text>
      <TextInput style={s.input} placeholder="Quantidade (kg)" placeholderTextColor={cores.suave} keyboardType="numeric" value={qtd} onChangeText={setQtd} />
      <TextInput style={s.input} placeholder="Preço por kg (CFA)" placeholderTextColor={cores.suave} keyboardType="numeric" value={preco} onChangeText={setPreco} />
      <Text style={s.conta}>{fmt(q)} kg × {fmt(p)} CFA =</Text>
      <Text style={s.total}>{fmt(q * p)} CFA</Text>
      <TouchableOpacity style={s.limpar} onPress={() => { setQtd(''); setPreco(''); }}><Text style={s.limparTxt}>Limpar</Text></TouchableOpacity>
    </SafeAreaView>
  );
}
