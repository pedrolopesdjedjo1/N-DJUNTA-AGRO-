// backend/src/routes/governoRoutes.ts  (funcionalidades 63 a 70)
import { makeRouter, Cfg, Resumo, COMUNS } from '../lib/agroEngine';

const PAINEL = ['GOVERNO', 'ONG']; // o ADMIN sempre entra

const cfgs: Record<string, Cfg> = {
  // 68 Mensagem oficial para regiões ou grupos (todos os utilizadores leem)
  avisos: {
    t: 'agro_avisos_oficiais', leitura: 'todos', escrita: 'papeis', papeisEscrita: ['GOVERNO'],
    dono: 'usuario_id', nome: true,
    campos: { regiao: 'text', publico: 'text', titulo: 'text', texto: 'text' },
  },
  // 69 Impacto de projetos: indicador antes e depois
  impacto: {
    t: 'agro_impacto', leitura: 'todos', escrita: 'papeis', papeisEscrita: ['GOVERNO', 'ONG'],
    dono: 'usuario_id',
    campos: { projeto: 'text', indicador: 'text', antes: 'numeric', depois: 'numeric', unidade: 'text' },
  },
  // 67 Dados de emprego rural e 63 colheitas (leitura para alimentar os resumos)
  colheitas: COMUNS.colheitas,
  vendas: COMUNS.vendas,
  // 48 (admin) Ver e responder pedidos de empréstimo: mesma tabela do Comerciante
  emprestimos: {
    t: 'agro_emprestimos', leitura: 'dono', escrita: 'dono', dono: 'usuario_id', nome: true,
    campos: { valor: 'numeric', finalidade: 'text', estado: 'text', resposta: 'text' },
    padrao: { estado: 'em análise' },
    restritos: { estado: ['ADMIN'], resposta: ['ADMIN'] },
    leituraTodos: ['ADMIN'], editaPapeis: ['ADMIN'],
  },
  // Pedidos de conta e publicações feitos por agentes (o admin aprova)
  registos: {
    t: 'agro_registos_agente', leitura: 'dono', escrita: 'dono', dono: 'agente_id', nome: true,
    campos: { nome: 'text', telefone: 'text', regiao: 'text', autorizado: 'bool', estado: 'text' },
    padrao: { estado: 'pendente' },
    restritos: { estado: ['ADMIN'] },
    leituraTodos: ['ADMIN'], editaPapeis: ['ADMIN'],
  },
};

const resumos: Record<string, Resumo> = {
  // 63 Mapa de produção real: anúncios e volume por região
  producao: {
    papeis: PAINEL,
    sql: `SELECT coalesce(location,'(sem local)') AS rotulo,
                 count(*)::text || ' anúncios • volume ' || coalesce(sum(quantity),0)::text AS valor
            FROM products GROUP BY 1 ORDER BY count(*) DESC LIMIT 50`,
  },
  // 63 Colheitas registadas (só as autorizadas para estatística)
  colheitas_registadas: {
    papeis: PAINEL,
    sql: `SELECT lower(produto) AS rotulo,
                 count(*)::text || ' registos • total ' ||
                 sum(CASE WHEN quantidade ~ '^[0-9]+([.][0-9]+)?$' THEN quantidade::numeric ELSE 0 END)::text AS valor
            FROM agro_colheitas WHERE autorizado_estatistica = true
           GROUP BY lower(produto) ORDER BY count(*) DESC LIMIT 50`,
  },
  // 64 Preço médio por produto (anúncios do app)
  preco_medio: {
    papeis: PAINEL,
    sql: `SELECT lower(title) AS rotulo,
                 'média ' || round(avg(price)::numeric,0)::text || ' • mín ' || min(price)::text || ' • máx ' || max(price)::text AS valor
            FROM products GROUP BY lower(title) ORDER BY count(*) DESC LIMIT 50`,
  },
  // 65 Alerta de escassez: produtos com pouca quantidade disponível
  escassez: {
    papeis: PAINEL,
    sql: `SELECT lower(title) AS rotulo, 'disponível no total: ' || sum(quantity)::text AS valor
            FROM products GROUP BY lower(title) HAVING sum(quantity) < 50 ORDER BY sum(quantity) LIMIT 50`,
  },
  // 66 Alerta de preço abusivo: preço acima do dobro da média (precisa de verificação humana)
  preco_abusivo: {
    papeis: PAINEL,
    sql: `SELECT p.title AS rotulo,
                 p.price::text || ' (média ' || round(a.m::numeric,0)::text || ') em ' || coalesce(p.location,'-') AS valor
            FROM products p
            JOIN (SELECT lower(title) AS t, avg(price) AS m, count(*) AS n FROM products GROUP BY 1) a ON lower(p.title) = a.t
           WHERE a.n >= 3 AND p.price > 2 * a.m LIMIT 50`,
  },
  // 67 Emprego rural: utilizadores por perfil
  emprego: {
    papeis: PAINEL,
    sql: `SELECT role::text AS rotulo, count(*)::text || ' utilizadores' AS valor FROM users GROUP BY role ORDER BY count(*) DESC`,
  },
};

export default makeRouter(cfgs, { resumos });
