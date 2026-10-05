// mobile/src/screens/ZonaProtegidaScreen.tsx  (funcionalidade 28)
// Usa o GPS do celular para avisar se o pescador está dentro ou perto de uma zona protegida.
// Precisa do pacote: npx expo install expo-location
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAparencia } from '../context/AparenciaContext';

const API = 'https://n-djunta-agro.onrender.com/api/pescador/zonas';

function km(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const rad = (x: number) => (x * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLng = rad(lng2 - lng1);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

type Estado = 'carregando' | 'ok' | 'semPermissao' | 'semPacote' | 'erro';

export default function ZonaProtegidaScreen({ navigation }: any) {
  const { cores, escala } = useAparencia();
  const [estado, setEstado] = useState<Estado>('carregando');
  const [mensagem, setMensagem] = useState('');
  const [lista, setLista] = useState<any[]>([]);

  const verificar = useCallback(async () => {
    setEstado('carregando');
    let Location: any = null;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      Location = require('expo-location');
    } catch {
      /* pacote não instalado */
    }
    if (!Location) { setEstado('semPacote'); return; }
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') { setEstado('semPermissao'); return; }
      const pos = await Location.getCurrentPositionAsync({});
      const token = await AsyncStorage.getItem('@nodjuntaagro:token');
      const r = await fetch(API, { headers: { Authorization: `Bearer ${token}` } });
      const zonas: any[] = await r.json();
      if (!r.ok) throw new Error((zonas as any)?.erro || `Erro ${r.status}`);
      const calc = zonas
        .filter((z) => z.lat !== null && z.lng !== null && !isNaN(Number(z.lat)) && !isNaN(Number(z.lng)))
        .map((z) => {
          const dist = km(pos.coords.latitude, pos.coords.longitude, Number(z.lat), Number(z.lng));
          const raio = Number(z.raio_km) || 5;
          const nivel = dist <= raio ? 'dentro' : dist <= raio + 5 ? 'perto' : 'longe';
          return { ...z, dist, raio, nivel };
        })
        .sort((a, b) => a.dist - b.dist);
      setLista(calc);
      setEstado('ok');
    } catch (e: any) {
      setMensagem(e.message || 'Não foi possível obter a localização.');
      setEstado('erro');
    }
  }, []);

  useEffect(() => { verificar(); }, [verificar]);

  const s = StyleSheet.create({
    tela: { flex: 1, backgroundColor: cores.fundo, padding: 16, paddingTop: 40 },
    voltar: { color: cores.verde, fontSize: 16 * escala, marginBottom: 8 },
    h1: { fontSize: 22 * escala, fontWeight: 'bold', color: cores.verde, marginBottom: 8 },
    txt: { color: cores.texto, fontSize: 15 * escala, marginBottom: 8 },
    card: { padding: 12, borderRadius: 12, borderWidth: 2, marginBottom: 8, backgroundColor: cores.card },
    titulo: { fontWeight: 'bold', fontSize: 16 * escala, color: cores.texto },
    btn: { backgroundColor: cores.verde, padding: 12, borderRadius: 8, alignSelf: 'flex-start', marginTop: 8 },
    btnTxt: { color: '#fff', fontWeight: 'bold', fontSize: 15 * escala },
  });

  const corDe = (n: string) => (n === 'dentro' ? '#c62828' : n === 'perto' ? '#ef6c00' : cores.borda);
  const dentro = lista.filter((z) => z.nivel === 'dentro');
  const perto = lista.filter((z) => z.nivel === 'perto');

  return (
    <View style={s.tela}>
      {navigation?.goBack && <TouchableOpacity onPress={() => navigation.goBack()}><Text style={s.voltar}>← Voltar</Text></TouchableOpacity>}
      <Text style={s.h1}>📍 Zonas protegidas perto de mim</Text>

      {estado === 'carregando' && <ActivityIndicator color={cores.verde} />}
      {estado === 'semPacote' && (
        <Text style={s.txt}>Falta instalar o pacote de localização. No terminal do Replit, rode: cd mobile && npx expo install expo-location</Text>
      )}
      {estado === 'semPermissao' && (
        <Text style={s.txt}>Sem permissão de localização. Ative a localização para o Expo Go nas configurações do celular e tente de novo.</Text>
      )}
      {estado === 'erro' && <Text style={s.txt}>{mensagem}</Text>}

      {estado === 'ok' && (
        <ScrollView>
          {dentro.length > 0 && (
            <Text style={[s.txt, { color: '#c62828', fontWeight: 'bold' }]}>
              🚫 ATENÇÃO: você está dentro de {dentro.length === 1 ? 'uma zona protegida' : `${dentro.length} zonas protegidas`}.
            </Text>
          )}
          {dentro.length === 0 && perto.length > 0 && (
            <Text style={[s.txt, { color: '#ef6c00', fontWeight: 'bold' }]}>⚠️ Você está perto de uma zona protegida.</Text>
          )}
          {dentro.length === 0 && perto.length === 0 && (
            <Text style={s.txt}>✅ Nenhuma zona protegida por perto.</Text>
          )}
          {lista.length === 0 && <Text style={s.txt}>Ainda não há zonas com localização registadas.</Text>}
          {lista.slice(0, 8).map((z) => (
            <View key={z.id} style={[s.card, { borderColor: corDe(z.nivel) }]}>
              <Text style={s.titulo}>{z.nivel === 'dentro' ? '🚫 ' : z.nivel === 'perto' ? '⚠️ ' : ''}{z.nome}</Text>
              <Text style={s.txt}>{z.regiao}</Text>
              <Text style={s.txt}>{z.regra}</Text>
              <Text style={s.txt}>A {z.dist.toFixed(1)} km • raio da zona {z.raio} km</Text>
              <TouchableOpacity style={s.btn} onPress={() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${z.lat},${z.lng}`)}>
                <Text style={s.btnTxt}>🗺️ Ver no mapa</Text>
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity style={s.btn} onPress={verificar}><Text style={s.btnTxt}>🔄 Verificar de novo</Text></TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}
