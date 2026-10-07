// mobile/src/screens/GovernoScreen.tsx  (funcionalidades 63 a 70; também serve ao ADMIN)
import React from 'react';
import ModuloAgro, { Secao } from '../components/ModuloAgro';

const lista = (i: any) => [i.valor];
const dataBr = (d: any) => (d ? new Date(d).toLocaleDateString() : '');

const G_DADOS = '📊 DADOS E ALERTAS';
const G_MENSAGENS = '📣 COMUNICAÇÃO';
const G_ADMIN = '🛡️ ADMINISTRAÇÃO';

const resumo = (id: string, icone: string, nome: string, rota: string, desc: string): Secao => ({
  id, grupo: G_DADOS, icone, nome, rota, desc, campos: [], compartilhar: true, titulo: (i) => i.rotulo, linhas: lista,
});

const SECOES: Secao[] = [
  resumo('producao', '🗺️', 'Produção por região', 'resumo/producao', 'Anúncios e volume registados em cada região.'),
  resumo('colheitas', '🌾', 'Colheitas registadas', 'resumo/colheitas_registadas', 'Colheitas que os agricultores autorizaram para estatísticas.'),
  resumo('preco_medio', '📈', 'Preço médio nacional', 'resumo/preco_medio', 'Média, mínimo e máximo por produto.'),
  resumo('escassez', '⚠️', 'Alerta de escassez', 'resumo/escassez', 'Produtos com pouca quantidade disponível.'),
  resumo('abusivo', '🚩', 'Alerta de preço abusivo', 'resumo/preco_abusivo', 'Preços muito acima da média. Precisam de verificação humana.'),
  resumo('emprego', '👥', 'Emprego rural', 'resumo/emprego', 'Utilizadores por perfil (dados agregados).'),
  {
    id: 'impacto', grupo: G_DADOS, icone: '🎯', nome: 'Impacto de projetos', rota: 'impacto', dono: 'usuario_id', compartilhar: true,
    desc: 'Compare um indicador antes e depois de um projeto.', botaoNovo: '+ Registar impacto',
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
    id: 'avisos', grupo: G_MENSAGENS, icone: '📣', nome: 'Enviar mensagem oficial', rota: 'avisos', dono: 'usuario_id',
    desc: 'Envia um aviso para os utilizadores da região escolhida (escreva Todas para avisar todos). Eles recebem em Notificações.',
    botaoNovo: '+ Nova mensagem',
    campos: [
      { k: 'regiao', r: 'Região', dica: 'ex.: Bafatá ou Todas' }, { k: 'publico', r: 'Para quem (opcional)', obrig: false, dica: 'ex.: agricultores' },
      { k: 'titulo', r: 'Título' }, { k: 'texto', r: 'Mensagem', tipo: 'longo' },
    ],
    titulo: (i) => i.titulo, linhas: (i) => [`${i.regiao}${i.publico ? ` • ${i.publico}` : ''}`, i.texto, dataBr(i.criado_em)],
  },
  {
    id: 'emprestimos', grupo: G_ADMIN, icone: '🏦', nome: 'Pedidos de empréstimo', rota: 'emprestimos', perfis: ['ADMIN'],
    desc: 'Só o administrador vê todos e responde. A comerciante recebe um aviso.', campos: [],
    acoes: [
      { r: '✅ Aprovar', patch: { estado: 'aprovado' }, se: (i) => i.estado !== 'aprovado' },
      { r: '❌ Recusar', patch: { estado: 'recusado' }, se: (i) => i.estado !== 'recusado' },
      { r: '📄 Pedir documentos', patch: { estado: 'documentos', resposta: 'Entre em contacto para apresentar documentos.' }, se: (i) => i.estado === 'em análise' },
    ],
    titulo: (i) => `${i.usuario_nome || 'Comerciante'}: ${Number(i.valor)}`,
    linhas: (i) => [i.finalidade, `Estado: ${i.estado}${i.resposta ? ` • ${i.resposta}` : ''}`],
  },
  {
    id: 'registos', grupo: G_ADMIN, icone: '🧑‍🌾', nome: 'Contas pedidas por agentes', rota: 'registos', perfis: ['ADMIN'], tel: 'telefone',
    desc: 'Toque em Criar conta para registar o agricultor. O app mostra o celular e uma senha temporária para entregar a ele.',
    campos: [],
    acoes: [
      { r: '✅ Criar conta', post: 'registos/:id/criar-conta', confirmar: 'Criar a conta deste agricultor agora?', se: (i) => !!i.autorizado && i.estado !== 'conta_criada' && i.estado !== 'recusado' },
      { r: '❌ Recusar', patch: { estado: 'recusado' }, se: (i) => i.estado === 'pendente' },
    ],
    titulo: (i) => `${i.nome} (${i.regiao})`,
    linhas: (i) => [i.autorizado ? 'Autorizado ✅' : 'Sem autorização ⚠️', `Por ${i.usuario_nome || 'Agente'} • ${i.estado}`],
  },
];

export default function GovernoScreen({ navigation }: any) {
  return <ModuloAgro modulo="governo" titulo="Painel do Governo" icone="🏛️" secoes={SECOES} navigation={navigation} />;
}
