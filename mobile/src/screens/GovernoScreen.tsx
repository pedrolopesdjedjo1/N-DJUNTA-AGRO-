// mobile/src/screens/GovernoScreen.tsx  (funcionalidades 63 a 70; também serve ao ADMIN)
import React from 'react';
import ModuloAgro, { Secao } from '../components/ModuloAgro';

const lista = (i: any) => [i.valor];

const SECOES: Secao[] = [
  { id: 'producao', icone: '🗺️', nome: 'Produção por região', rota: 'resumo/producao', desc: 'Anúncios e volume registados em cada região.', campos: [], compartilhar: true, titulo: (i) => i.rotulo, linhas: lista },
  { id: 'colheitas', icone: '🌾', nome: 'Colheitas registadas', rota: 'resumo/colheitas_registadas', desc: 'Colheitas que os agricultores autorizaram para estatísticas.', campos: [], compartilhar: true, titulo: (i) => i.rotulo, linhas: lista },
  { id: 'preco_medio', icone: '📈', nome: 'Preço médio nacional', rota: 'resumo/preco_medio', desc: 'Média, mínimo e máximo por produto.', campos: [], compartilhar: true, titulo: (i) => i.rotulo, linhas: lista },
  { id: 'escassez', icone: '⚠️', nome: 'Alerta de escassez', rota: 'resumo/escassez', desc: 'Produtos com pouca quantidade disponível.', campos: [], compartilhar: true, titulo: (i) => i.rotulo, linhas: lista },
  { id: 'abusivo', icone: '🚩', nome: 'Alerta de preço abusivo', rota: 'resumo/preco_abusivo', desc: 'Preços muito acima da média. Precisam de verificação humana.', campos: [], compartilhar: true, titulo: (i) => i.rotulo, linhas: lista },
  { id: 'emprego', icone: '👥', nome: 'Emprego rural', rota: 'resumo/emprego', desc: 'Utilizadores por perfil (dados agregados).', campos: [], compartilhar: true, titulo: (i) => i.rotulo, linhas: lista },
  {
    id: 'avisos', icone: '📣', nome: 'Enviar mensagem oficial', rota: 'avisos', dono: 'usuario_id',
    desc: 'Avisos para uma região ou grupo. Todos os utilizadores podem ler.',
    campos: [
      { k: 'regiao', r: 'Região (ou Todas)' }, { k: 'publico', r: 'Para quem (ex.: agricultores)' },
      { k: 'titulo', r: 'Título' }, { k: 'texto', r: 'Mensagem', tipo: 'longo' },
    ],
    titulo: (i) => i.titulo, linhas: (i) => [i.regiao, i.publico || '', i.texto],
  },
  {
    id: 'impacto', icone: '🎯', nome: 'Impacto de projetos', rota: 'impacto', dono: 'usuario_id', compartilhar: true,
    desc: 'Compare um indicador antes e depois de um projeto.',
    campos: [
      { k: 'projeto', r: 'Projeto' }, { k: 'indicador', r: 'Indicador' },
      { k: 'antes', r: 'Valor antes', tipo: 'numero' }, { k: 'depois', r: 'Valor depois', tipo: 'numero' },
      { k: 'unidade', r: 'Unidade (opcional)', obrig: false },
    ],
    titulo: (i) => `${i.projeto} • ${i.indicador}`,
    linhas: (i) => {
      const a = Number(i.antes), d = Number(i.depois);
      const v = a ? Math.round(((d - a) / a) * 100) : 0;
      return [`Antes ${a} → Depois ${d} ${i.unidade || ''}`, `Variação: ${v > 0 ? '+' : ''}${v}%`];
    },
  },
  {
    id: 'emprestimos', icone: '🏦', nome: 'Pedidos de empréstimo (admin)', rota: 'emprestimos',
    desc: 'Só o administrador vê todos e responde.',
    campos: [],
    acoes: [
      { r: 'Aprovar', patch: { estado: 'aprovado' } }, { r: 'Recusar', patch: { estado: 'recusado' } },
      { r: 'Pedir documentos', patch: { estado: 'documentos', resposta: 'Entre em contacto para apresentar documentos.' } },
    ],
    titulo: (i) => `${i.usuario_nome || 'Comerciante'}: ${Number(i.valor)}`,
    linhas: (i) => [i.finalidade, `Estado: ${i.estado}`],
  },
  {
    id: 'registos', icone: '🧑‍🌾', nome: 'Contas pedidas por agentes (admin)', rota: 'registos',
    desc: 'Pedidos de conta feitos por agentes. Só o administrador aprova.',
    campos: [], tel: 'telefone',
    acoes: [{ r: 'Aprovar', patch: { estado: 'aprovado' } }, { r: 'Recusar', patch: { estado: 'recusado' } }],
    titulo: (i) => `${i.nome} (${i.regiao})`,
    linhas: (i) => [i.autorizado ? 'Autorizado ✅' : 'Sem autorização ⚠️', `Por ${i.usuario_nome || 'Agente'} • ${i.estado}`],
  },
];

export default function GovernoScreen({ navigation }: any) {
  return <ModuloAgro modulo="governo" titulo="Painel do Governo" icone="🏛️" secoes={SECOES} navigation={navigation} />;
}
