// mobile/src/screens/AgenteScreen.tsx  (funcionalidades 51 a 56)
import React from 'react';
import ModuloAgro, { Secao } from '../components/ModuloAgro';

const SECOES: Secao[] = [
  {
    id: 'registar', icone: '🧑‍🌾', nome: 'Registar agricultor', rota: 'registos', dono: 'agente_id',
    desc: 'Guarde os dados do agricultor com a autorização dele. A conta é criada depois de aprovada.',
    campos: [
      { k: 'nome', r: 'Nome do agricultor' }, { k: 'telefone', r: 'Celular' }, { k: 'regiao', r: 'Região' },
      { k: 'autorizado', r: 'O agricultor autorizou o registo', tipo: 'bool' },
    ],
    tel: 'telefone',
    titulo: (i) => i.nome,
    linhas: (i) => [i.regiao, i.autorizado ? 'Autorizado ✅' : 'Sem autorização ⚠️', `Estado: ${i.estado}`],
  },
  {
    id: 'publicar', icone: '📢', nome: 'Publicar em nome de outro', rota: 'publicacoes', dono: 'agente_id',
    desc: 'Registe o produto de um agricultor que tem dificuldade com o telefone.',
    campos: [
      { k: 'agricultor_nome', r: 'Nome do agricultor' }, { k: 'agricultor_telefone', r: 'Celular dele' },
      { k: 'produto', r: 'Produto' }, { k: 'quantidade', r: 'Quantidade' },
      { k: 'preco', r: 'Preço', tipo: 'numero' }, { k: 'localizacao', r: 'Localização' },
    ],
    tel: 'agricultor_telefone',
    titulo: (i) => `${i.produto}: ${Number(i.preco)} (${i.quantidade})`,
    linhas: (i) => [`Agricultor: ${i.agricultor_nome}`, i.localizacao, `Estado: ${i.estado}`],
  },
  {
    id: 'comissoes', icone: '💵', nome: 'Receber comissão', rota: 'comissoes', dono: 'agente_id',
    desc: 'Registe as vendas elegíveis. A comissão é calculada pela percentagem definida pela administração.',
    campos: [{ k: 'descricao', r: 'Venda (produto e agricultor)' }, { k: 'valor_venda', r: 'Valor da venda', tipo: 'numero' }],
    titulo: (i) => `${i.descricao}`,
    linhas: (i) => [
      `Venda: ${Number(i.valor_venda)} • ${Number(i.percentual)}%`,
      `Comissão: ${Math.round((Number(i.valor_venda) * Number(i.percentual)) / 100)}`,
      `Estado: ${i.estado}`,
    ],
  },
  {
    id: 'ranking', icone: '🏆', nome: 'Ranking de agentes', rota: 'resumo/ranking',
    desc: 'Desempenho por agricultores ajudados e operações realizadas.',
    campos: [],
    titulo: (i) => i.rotulo, linhas: (i) => [i.valor],
  },
  {
    id: 'formacao', icone: '🎓', nome: 'Formação online', rota: 'cursos', fixo: { publico: 'agente' }, url: 'url',
    desc: 'Cursos para aprender a usar e explicar o aplicativo.',
    campos: [],
    titulo: (i) => i.titulo, linhas: (i) => [i.descricao || ''],
  },
  {
    id: 'visitas', icone: '📍', nome: 'Marcar visita', rota: 'visitas', dono: 'usuario_id',
    desc: 'Agende visitas a agricultores.',
    campos: [
      { k: 'agricultor_nome', r: 'Agricultor' }, { k: 'telefone', r: 'Celular (opcional)', obrig: false },
      { k: 'data_hora', r: 'Data e hora', dica: '2026-10-20 09:00' }, { k: 'local', r: 'Local' },
    ],
    tel: 'telefone',
    acoes: [{ r: 'Feita', patch: { estado: 'feita' } }, { r: 'Cancelar', patch: { estado: 'cancelada' } }],
    titulo: (i) => `${i.data_hora} • ${i.agricultor_nome}`,
    linhas: (i) => [i.local, `Estado: ${i.estado}`],
  },
];

export default function AgenteScreen({ navigation }: any) {
  return <ModuloAgro modulo="agente" titulo="Área do Agente Digital" icone="👨‍💼" secoes={SECOES} navigation={navigation} />;
}
