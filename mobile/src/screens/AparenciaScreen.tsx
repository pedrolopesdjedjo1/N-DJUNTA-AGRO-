// mobile/src/screens/AparenciaScreen.tsx  (funcionalidades 80, 96 e 100)
import React from 'react';
import { SafeAreaView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { useAparencia } from '../context/AparenciaContext';

export default function AparenciaScreen({ navigation }: any) {
  const a = useAparencia();
  const { cores, escala } = a;
  const s = StyleSheet.create({
    tela: { flex: 1, backgroundColor: cores.fundo, padding: 16, paddingTop: 40 },
    voltar: { color: cores.verde, fontSize: 16 * escala, marginBottom: 8 },
    h1: { fontSize: 22 * escala, fontWeight: 'bold', color: cores.verde, marginBottom: 12 },
    linha: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: cores.borda },
    txt: { color: cores.texto, fontSize: 16 * escala, flex: 1, paddingRight: 8 },
    mini: { color: cores.suave, fontSize: 12 * escala },
    modos: { flexDirection: 'row', gap: 8, marginTop: 8 },
    modo: { flex: 1, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: cores.verde, alignItems: 'center' },
    modoAtivo: { backgroundColor: cores.verde },
  });
  const Linha = ({ rotulo, dica, valor, onChange }: any) => (
    <View style={s.linha}>
      <View style={{ flex: 1 }}><Text style={s.txt}>{rotulo}</Text>{dica ? <Text style={s.mini}>{dica}</Text> : null}</View>
      <Switch value={valor} onValueChange={onChange} trackColor={{ true: cores.verde, false: '#999' }} />
    </View>
  );
  return (
    <SafeAreaView style={s.tela}>
      {navigation?.goBack && <TouchableOpacity onPress={() => navigation.goBack()}><Text style={s.voltar}>← Voltar</Text></TouchableOpacity>}
      <Text style={s.h1}>🎨 Aparência e acessibilidade</Text>
      <Linha rotulo="🌙 Modo escuro" dica="Tela escura, confortável e que gasta menos bateria." valor={a.escuro} onChange={(v: boolean) => a.mudar({ escuro: v })} />
      <Linha rotulo="🔠 Letras e botões grandes" valor={a.letrasGrandes} onChange={(v: boolean) => a.mudar({ letrasGrandes: v })} />
      <Linha rotulo="◐ Alto contraste" valor={a.altoContraste} onChange={(v: boolean) => a.mudar({ altoContraste: v })} />
      <Linha rotulo="🔊 Leitura por voz" dica="Toque num item da lista para ouvir. Precisa do pacote expo-speech." valor={a.leituraVoz} onChange={(v: boolean) => a.mudar({ leituraVoz: v })} />
      <Text style={[s.txt, { marginTop: 18 }]}>Modo de uso</Text>
      <View style={s.modos}>
        {(['vendedor', 'comprador'] as const).map((m) => (
          <TouchableOpacity key={m} style={[s.modo, a.modo === m && s.modoAtivo]} onPress={() => a.mudar({ modo: m })}>
            <Text style={{ color: a.modo === m ? '#fff' : cores.verde, fontWeight: 'bold', fontSize: 16 * escala }}>
              {m === 'vendedor' ? '🧑‍🌾 Vender' : '🛒 Comprar'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}
