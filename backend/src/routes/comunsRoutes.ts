// backend/src/routes/comunsRoutes.ts  (funcionalidades para todos: 83, 85, 87 a 99)
import { makeRouter, Cfg, Resumo, COMUNS } from '../lib/agroEngine';

const cfgs: Record<string, Cfg> = {
  // 87 Guardar contactos
  contactos: COMUNS.contactos,
  // 88 Calendário agrícola (o administrador publica)
  calendario: {
    t: 'agro_calendario', leitura: 'todos', escrita: 'admin',
    campos: { regiao: 'text', mes: 'int', atividade: 'text', texto: 'text' },
  },
  // 90 Dicionário de produtos (o administrador publica)
  dicionario: {
    t: 'agro_dicionario', leitura: 'todos', escrita: 'admin',
    campos: { produto: 'text', descricao: 'text', nome_kriol: 'text', nome_fr: 'text', nome_en: 'text', foto_url: 'text' },
  },
  // 91 Botão de emergência: serviços e telefones (o administrador publica)
  emergencia: {
    t: 'agro_emergencia', leitura: 'todos', escrita: 'admin',
    campos: { nome: 'text', telefone: 'text', descricao: 'text', regiao: 'text' },
  },
  // 92 Fórum da comunidade
  forum_posts: COMUNS.forum_posts,
  forum_respostas: COMUNS.forum_respostas,
  // 93 Enquetes: GOVERNO, ONG e ADMIN criam; todos votam (um voto por pessoa)
  enquetes: {
    t: 'agro_enquetes', leitura: 'todos', escrita: 'papeis', papeisEscrita: ['GOVERNO', 'ONG'],
    dono: 'usuario_id', nome: true,
    campos: { pergunta: 'text', opcoes: 'text' },
  },
  votos: {
    t: 'agro_votos', leitura: 'dono', escrita: 'dono', dono: 'usuario_id',
    campos: { enquete_id: 'uuid', opcao: 'text' },
  },
  // 94 Recompensas (o administrador dá pontos pelo celular da pessoa)
  recompensas: {
    t: 'agro_recompensas', leitura: 'dono', escrita: 'admin', dono: 'usuario_id',
    campos: { telefone: 'text', usuario_id: 'text', motivo: 'text', pontos: 'int' },
    resolver: [{ de: 'telefone', para: 'usuario_id' }],
    leituraTodos: ['ADMIN'],
  },
  // 95 Indicar amigo
  convites: {
    t: 'agro_convites', leitura: 'dono', escrita: 'dono', dono: 'usuario_id',
    campos: { telefone_amigo: 'text', estado: 'text' },
    padrao: { estado: 'enviado' },
  },
  // 99 Suporte técnico (só o administrador responde)
  suporte: {
    t: 'agro_suporte', leitura: 'dono', escrita: 'dono', dono: 'usuario_id', nome: true,
    campos: { assunto: 'text', mensagem: 'text', estado: 'text', resposta: 'text' },
    padrao: { estado: 'aberto' },
    restritos: { estado: ['ADMIN'], resposta: ['ADMIN'] },
    leituraTodos: ['ADMIN'], editaPapeis: ['ADMIN'],
  },
  // 83 e 85 SMS: fila de mensagens que um serviço de SMS vai enviar (ainda não ligado a nenhuma operadora)
  sms_fila: {
    t: 'agro_sms_fila', leitura: 'todos', escrita: 'admin', acesso: [],
    campos: { telefone: 'text', mensagem: 'text', estado: 'text' },
    padrao: { estado: 'pendente' },
  },
  // 97 Histórico completo vem do resumo abaixo; estas tabelas precisam existir
  colheitas: COMUNS.colheitas,
  vendas: COMUNS.vendas,
};

const resumos: Record<string, Resumo> = {
  // 93 Resultados das enquetes
  resultados_enquetes: {
    sql: `SELECT e.pergunta AS rotulo,
                 coalesce((SELECT string_agg(o.opcao || ': ' || o.n::text, ' | ')
                             FROM (SELECT opcao, count(*) AS n FROM agro_votos v WHERE v.enquete_id = e.id GROUP BY opcao) o),
                          'sem votos ainda') AS valor
            FROM agro_enquetes e ORDER BY e.criado_em DESC LIMIT 20`,
  },
  // 94 Saldo de pontos
  saldo: {
    sql: `SELECT 'Meus pontos' AS rotulo, coalesce(sum(pontos),0)::text AS valor FROM agro_recompensas WHERE usuario_id = $1`,
  },
  // 97 Histórico completo por data
  historico: {
    sql: `SELECT * FROM (
            SELECT criado_em, 'Venda: ' || coalesce(produto,'') || ' • ' || coalesce(preco::text,'') AS rotulo FROM agro_vendas WHERE vendedor_id = $1
            UNION ALL SELECT criado_em, 'Colheita: ' || coalesce(produto,'') FROM agro_colheitas WHERE usuario_id = $1
            UNION ALL SELECT criado_em, 'Oferta: ' || coalesce(produto_titulo,'') || ' • ' || coalesce(preco_oferta::text,'') FROM agro_ofertas WHERE comprador_id = $1 OR vendedor_id = $1
            UNION ALL SELECT criado_em, 'Pagamento: ' || coalesce(valor::text,'') || ' (' || coalesce(estado,'') || ')' FROM agro_pagamentos WHERE comprador_id = $1 OR vendedor_id = $1
            UNION ALL SELECT criado_em, 'Transporte: ' || coalesce(produto,'') || ' ' || coalesce(origem,'') || ' → ' || coalesce(destino,'') FROM agro_transportes WHERE usuario_id = $1 OR transportador_id = $1
          ) h ORDER BY criado_em DESC LIMIT 100`,
  },
};

export default makeRouter(cfgs, {
  resumos,
  // um voto por pessoa em cada enquete
  depois: ['CREATE UNIQUE INDEX IF NOT EXISTS agro_votos_unico ON agro_votos (enquete_id, usuario_id)'],
});
