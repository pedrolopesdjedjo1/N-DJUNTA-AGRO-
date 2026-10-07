// backend/src/routes/ongRoutes.ts  (funcionalidades 71 a 77)
import { makeRouter, Cfg, Resumo } from '../lib/agroEngine';

const PAINEL = ['GOVERNO', 'ONG']; // o ADMIN sempre entra

const cfgs: Record<string, Cfg> = {
  // 72, 73, 74 e 77: indicadores por região (tipo = pobreza | clima | genero | ods). Sempre agregados, sem dados pessoais.
  indicadores: {
    t: 'agro_indicadores', leitura: 'todos', escrita: 'papeis', papeisEscrita: ['GOVERNO', 'ONG'],
    acesso: PAINEL,
    dono: 'usuario_id',
    campos: { tipo: 'text', regiao: 'text', nome: 'text', valor: 'text', periodo: 'text' },
  },
  // 75 e 76: projetos de ajuda e resultados
  projetos: {
    t: 'agro_projetos', leitura: 'todos', escrita: 'papeis', papeisEscrita: ['GOVERNO', 'ONG'],
    acesso: PAINEL,
    dono: 'usuario_id', nome: true,
    campos: { nome: 'text', regiao: 'text', beneficiarios: 'text', recursos: 'text', objetivo: 'text', resultado: 'text' },
  },
};

const resumos: Record<string, Resumo> = {
  // 71 Painel de impacto (números reais do app)
  painel: {
    papeis: PAINEL,
    sql: `SELECT 'Utilizadores' AS rotulo, count(*)::text AS valor FROM users
          UNION ALL SELECT 'Contas verificadas', count(*)::text FROM users WHERE "isVerified" = true
          UNION ALL SELECT 'Anúncios publicados', count(*)::text FROM products
          UNION ALL SELECT 'Vendas registadas', count(*)::text FROM agro_vendas
          UNION ALL SELECT 'Valor das vendas registadas', coalesce(sum(preco), 0)::text FROM agro_vendas
          UNION ALL SELECT 'Entregas concluídas', count(*)::text FROM agro_transportes WHERE estado = 'concluida'
          UNION ALL SELECT 'Colheitas registadas', count(*)::text FROM agro_colheitas`,
  },
  perfis: {
    papeis: PAINEL,
    sql: `SELECT role::text AS rotulo, count(*)::text AS valor FROM users GROUP BY role ORDER BY count(*) DESC`,
  },
  // Alcance por região (dados agregados, sem nomes)
  regioes: {
    papeis: PAINEL,
    sql: `SELECT coalesce(nullif(location, ''), '(sem região)') AS rotulo, count(*)::text || ' utilizadores' AS valor
            FROM users GROUP BY 1 ORDER BY count(*) DESC LIMIT 30`,
  },
};

export default makeRouter(cfgs, { resumos });
