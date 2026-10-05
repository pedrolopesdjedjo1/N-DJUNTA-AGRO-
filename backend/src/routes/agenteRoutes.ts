// backend/src/routes/agenteRoutes.ts  (funcionalidades 51 a 56)
import { makeRouter, Cfg, Resumo } from '../lib/agroEngine';

const cfgs: Record<string, Cfg> = {
  // 51 Registar agricultor (guarda o pedido de conta, com a autorização dele)
  registos: {
    t: 'agro_registos_agente', leitura: 'dono', escrita: 'dono', dono: 'agente_id', nome: true,
    acesso: ['AGENTE'],
    campos: { nome: 'text', telefone: 'text', regiao: 'text', autorizado: 'bool', estado: 'text' },
    padrao: { estado: 'pendente' },
    restritos: { estado: ['ADMIN'] },
    leituraTodos: ['ADMIN'], editaPapeis: ['ADMIN'],
  },
  // 52 Publicar em nome de outro agricultor
  publicacoes: {
    t: 'agro_publicacoes_agente', leitura: 'dono', escrita: 'dono', dono: 'agente_id',
    acesso: ['AGENTE'],
    campos: { agricultor_nome: 'text', agricultor_telefone: 'text', produto: 'text', quantidade: 'text', preco: 'numeric', localizacao: 'text', estado: 'text' },
    padrao: { estado: 'pendente' },
    restritos: { estado: ['ADMIN'] },
    leituraTodos: ['ADMIN'], editaPapeis: ['ADMIN'],
  },
  // 53 Comissões (a percentagem é definida pelo administrador)
  comissoes: {
    t: 'agro_comissoes', leitura: 'dono', escrita: 'dono', dono: 'agente_id',
    acesso: ['AGENTE'],
    campos: { descricao: 'text', valor_venda: 'numeric', percentual: 'numeric', estado: 'text' },
    padrao: { percentual: 5, estado: 'a receber' },
    restritos: { percentual: ['ADMIN'], estado: ['ADMIN'] },
    leituraTodos: ['ADMIN'], editaPapeis: ['ADMIN'],
  },
  // 55 Formação online
  cursos: {
    t: 'agro_cursos', leitura: 'todos', escrita: 'admin',
    campos: { titulo: 'text', publico: 'text', descricao: 'text', url: 'text' },
  },
  // 56 Marcar visita
  visitas: {
    t: 'agro_visitas', leitura: 'dono', escrita: 'dono', dono: 'usuario_id',
    acesso: ['AGENTE'],
    campos: { agricultor_nome: 'text', telefone: 'text', data_hora: 'text', local: 'text', estado: 'text' },
    padrao: { estado: 'marcada' },
  },
};

const resumos: Record<string, Resumo> = {
  // 54 Ranking de agentes: agricultores ajudados e operações realizadas
  ranking: {
    sql: `SELECT coalesce(r.nome,'Agente') AS rotulo,
                 r.n::text || ' agricultores ajudados • ' || coalesce(o.n,0)::text || ' operações' AS valor
            FROM (SELECT agente_id, max(usuario_nome) AS nome, count(*) AS n FROM agro_registos_agente GROUP BY agente_id) r
            LEFT JOIN (SELECT agente_id, count(*) AS n FROM agro_comissoes GROUP BY agente_id) o ON o.agente_id = r.agente_id
           ORDER BY r.n DESC LIMIT 20`,
  },
};

export default makeRouter(cfgs, { resumos });
