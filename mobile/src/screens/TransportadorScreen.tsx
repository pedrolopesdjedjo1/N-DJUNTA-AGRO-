// mobile/src/screens/TransportadorScreen.tsx  (funcionalidades 57 a 62)
import React from 'react';
import ModuloAgro, { Secao } from '../components/ModuloAgro';

const detalhes = (i: any) => [
  `${i.origem} → ${i.destino}`,
  `Carga: ${i.quantidade || '-'} • Horário: ${i.horario || 'a combinar'}`,
  i.valor ? `Valor: ${Number(i.valor)}` : 'Valor: a combinar',
  `Estado: ${i.estado}`,
];

const SECOES: Secao[] = [
  {
    id: 'pedidos', icone: '📋', nome: 'Pedidos de transporte', rota: 'corridas', fixo: { estado: 'aberto' },
    desc: 'Veja carga, origem, destino e valor antes de aceitar. Puxe a lista para atualizar.',
    campos: [], rotaMapa: { de: 'origem', ate: 'destino' },
    acoes: [{ r: '✅ Aceitar corrida', patch: { estado: 'aceita' } }],
    titulo: (i) => i.produto, linhas: detalhes,
  },
  {
    id: 'minhas', icone: '🚚', nome: 'Minhas corridas', rota: 'corridas', fixo: { meus: '1' },
    desc: 'Corridas que você aceitou. Veja a rota no mapa, conclua e acompanhe o pagamento.',
    campos: [], rotaMapa: { de: 'origem', ate: 'destino' },
    acoes: [
      { r: 'Concluir', patch: { estado: 'concluida' } },
      { r: 'Recebi o pagamento', patch: { pagamento: 'recebido' } },
    ],
    titulo: (i) => i.produto,
    linhas: (i) => [...detalhes(i), `Pagamento: ${i.pagamento || 'pendente'}`],
  },
  {
    id: 'ganhos', icone: '💵', nome: 'Pagamentos e ganhos', rota: 'resumo/ganhos',
    desc: 'Corridas concluídas, total recebido e o que ainda falta receber.',
    campos: [], titulo: (i) => i.rotulo, linhas: (i) => [i.valor],
  },
  {
    id: 'avaliar', icone: '⭐', nome: 'Avaliar cliente', rota: 'avaliacoes_clientes', dono: 'autor_id',
    desc: 'Depois da entrega, avalie o cliente.',
    campos: [
      { k: 'cliente_nome', r: 'Nome do cliente' }, { k: 'estrelas', r: 'Estrelas (1 a 5)', tipo: 'numero' },
      { k: 'comentario', r: 'Comentário (opcional)', tipo: 'longo', obrig: false },
    ],
    titulo: (i) => `${i.cliente_nome} ${'★'.repeat(Number(i.estrelas) || 0)}`,
    linhas: (i) => [i.comentario || ''],
  },
  {
    id: 'combustivel', icone: '⛽', nome: 'Preço do combustível', rota: 'combustivel',
    desc: 'Preços de combustível por cidade.',
    campos: [], filtros: ['cidade'],
    titulo: (i) => `${i.tipo}: ${Number(i.preco)}`, linhas: (i) => [i.cidade],
  },
];

export default function TransportadorScreen({ navigation }: any) {
  return <ModuloAgro modulo="transportador" titulo="Área do Transportador" icone="🚚" secoes={SECOES} navigation={navigation} />;
}
