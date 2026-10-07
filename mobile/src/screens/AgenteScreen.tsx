// mobile/src/screens/AgenteScreen.tsx  (funcionalidades 51 a 56)
import React from 'react';
import ModuloAgro, { Secao, linkTela } from '../components/ModuloAgro';

const dataBr = (d: any) => (d ? new Date(d).toLocaleDateString() : '');

const G_AGRICULTORES = '🧑‍🌾 AGRICULTORES';
const G_GANHOS = '💵 DESEMPENHO';
const G_APRENDER = '🎓 APRENDER';

const SECOES: Secao[] = [
  {
    id: 'registar', grupo: G_AGRICULTORES, icone: '🧑‍🌾', nome: 'Registar agricultor', rota: 'registos', dono: 'agente_id',
    desc: 'Guarde os dados do agricultor com a autorização dele. O administrador cria a conta e você recebe um aviso.',
    botaoNovo: '+ Registar agricultor',
    campos: [
      { k: 'nome', r: 'Nome do agricultor' }, { k: 'telefone', r: 'Celular' }, { k: 'regiao', r: 'Região' },
      { k: 'autorizado', r: 'O agricultor autorizou o registo', tipo: 'bool' },
    ],
    tel: 'telefone',
    titulo: (i) => i.nome,
    linhas: (i) => [i.regiao, i.autorizado ? 'Autorizado ✅' : 'Sem autorização ⚠️', `Estado: ${i.estado}`],
  },
  {
    id: 'publicar', grupo: G_AGRICULTORES, icone: '📢', nome: 'Publicar em nome de outro', rota: 'publicacoes', rotaNova: 'publicacoes/nova', dono: 'agente_id',
    desc: 'Publique o produto de um agricultor que tem dificuldade com o telefone. Ele já precisa ter conta, e é avisado.',
    botaoNovo: '+ Publicar produto',
    campos: [
      { k: 'agricultor_telefone', r: 'Celular do agricultor' }, { k: 'produto', r: 'Produto' },
      { k: 'quantidade', r: 'Quantidade e unidade', dica: '50 kg' }, { k: 'preco', r: 'Preço', tipo: 'numero' },
      { k: 'localizacao', r: 'Localização (opcional)', obrig: false },
      { k: 'autorizado', r: 'O agricultor autorizou a publicação', tipo: 'bool' },
    ],
    tel: 'agricultor_telefone',
    titulo: (i) => `${i.produto}: ${Number(i.preco)} (${i.quantidade})`,
    linhas: (i) => [`Agricultor: ${i.agricultor_nome}`, i.localizacao || '', `Estado: ${i.estado} • ${dataBr(i.criado_em)}`],
  },
  {
    id: 'visitas', grupo: G_AGRICULTORES, icone: '📍', nome: 'Marcar visita', rota: 'visitas', dono: 'usuario_id',
    desc: 'Agende visitas a agricultores.', botaoNovo: '+ Marcar visita',
    campos: [
      { k: 'agricultor_nome', r: 'Agricultor' }, { k: 'telefone', r: 'Celular (opcional)', obrig: false },
      { k: 'data_hora', r: 'Data e hora', dica: '2026-10-20 09:00' }, { k: 'local', r: 'Local' },
    ],
    tel: 'telefone',
    acoes: [
      { r: '✅ Feita', patch: { estado: 'feita' }, se: (i) => i.estado === 'marcada' },
      { r: '✖ Cancelar', patch: { estado: 'cancelada' }, se: (i) => i.estado === 'marcada' },
    ],
    titulo: (i) => `${i.data_hora} • ${i.agricultor_nome}`, linhas: (i) => [i.local, `Estado: ${i.estado}`],
  },
  {
    id: 'comissoes', grupo: G_GANHOS, icone: '💵', nome: 'Receber comissão', rota: 'comissoes', dono: 'agente_id',
    desc: 'Registe as vendas elegíveis. A comissão usa a percentagem definida pela administração.', botaoNovo: '+ Registar venda',
    campos: [{ k: 'descricao', r: 'Venda (produto e agricultor)' }, { k: 'valor_venda', r: 'Valor da venda', tipo: 'numero' }],
    titulo: (i) => i.descricao,
    linhas: (i) => [
      `Venda: ${Number(i.valor_venda)} • ${Number(i.percentual)}%`,
      `Comissão: ${Math.round((Number(i.valor_venda) * Number(i.percentual)) / 100)}`,
      `Estado: ${i.estado}`,
    ],
  },
  {
    id: 'ranking', grupo: G_GANHOS, icone: '🏆', nome: 'Ranking de agentes', rota: 'resumo/ranking',
    desc: 'Desempenho por agricultores ajudados e operações realizadas.', campos: [],
    titulo: (i) => i.rotulo, linhas: (i) => [i.valor],
  },
  {
    id: 'formacao', grupo: G_APRENDER, icone: '🎓', nome: 'Formação online', rota: 'cursos', fixo: { publico: 'agente' }, url: 'url',
    desc: 'Cursos para aprender a usar e explicar o aplicativo.', campos: [],
    titulo: (i) => i.titulo, linhas: (i) => [i.descricao || ''],
  },
  linkTela(G_APRENDER, 'suporte', '🛟', 'Ferramentas e suporte', 'Calculadora, emergência e suporte técnico.', 'Ferramentas'),
];

export default function AgenteScreen({ navigation }: any) {
  return (
    <ModuloAgro
      modulo="agente" titulo="Área do Agente Digital" icone="👨‍💼"
      secoes={SECOES} navigation={navigation}
    />
  );
}
