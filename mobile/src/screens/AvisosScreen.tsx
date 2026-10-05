// mobile/src/screens/AvisosScreen.tsx
// Lista de avisos do app para cada utilizador (alertas de preço, clima, praga, mar e notícias).
import React from 'react';
import ModuloAgro, { Secao } from '../components/ModuloAgro';

const SECOES: Secao[] = [
  {
    id: 'avisos', icone: '🔔', nome: 'Meus avisos', rota: 'notificacoes', modulo: 'conteudo', dono: 'usuario_id',
    desc: 'Alertas de preço, clima, praga, mar e notícias. Puxe a lista para baixo para atualizar.',
    campos: [],
    acoes: [{ r: 'Marcar como lida', patch: { lida: true } }],
    titulo: (i) => `${i.lida ? '' : '🔵 '}${i.titulo}`,
    linhas: (i) => [i.texto, new Date(i.criado_em).toLocaleString()],
  },
];

export default function AvisosScreen({ navigation }: any) {
  return <ModuloAgro modulo="conteudo" titulo="Avisos do app" icone="🔔" secoes={SECOES} navigation={navigation} />;
}
