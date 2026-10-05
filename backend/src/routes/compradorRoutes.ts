// backend/src/routes/compradorRoutes.ts  (funcionalidades 34 a 43; 29 a 32 estão na BuscaAvancadaScreen)
import { makeRouter, Cfg, Resumo, COMUNS, CAMPOS_TRANSPORTE } from '../lib/agroEngine';

const cfgs: Record<string, Cfg> = {
  precos: COMUNS.precos, // 35 Comparar preços (atuais e históricos)
  // 34 Fazer oferta (o vendedor aceita, recusa ou faz contraoferta)
  ofertas: {
    t: 'agro_ofertas', leitura: 'dono', escrita: 'dono', dono: 'comprador_id', tambem: 'vendedor_id',
    campos: {
      produto_titulo: 'text', vendedor_telefone: 'text', vendedor_id: 'text',
      preco_oferta: 'numeric', quantidade: 'text', estado: 'text', contraoferta: 'numeric',
    },
    padrao: { estado: 'pendente' },
    resolver: [{ de: 'vendedor_telefone', para: 'vendedor_id' }],
  },
  // 36 Lista de desejos
  desejos: {
    t: 'agro_desejos', leitura: 'dono', escrita: 'dono', dono: 'usuario_id',
    campos: { produto: 'text', quantidade: 'text', preco_max: 'numeric', ativo: 'bool' },
    padrao: { ativo: true },
  },
  // 37 Leilão: o comprador pede, vendedores mandam propostas
  leiloes: {
    t: 'agro_leiloes', leitura: 'todos', escrita: 'dono', dono: 'usuario_id', nome: true,
    campos: { produto: 'text', quantidade: 'text', local: 'text', estado: 'text' },
    padrao: { estado: 'aberto' },
  },
  propostas: {
    t: 'agro_propostas', leitura: 'todos', escrita: 'dono', dono: 'usuario_id', nome: true,
    campos: { leilao_id: 'uuid', preco: 'numeric', quantidade: 'text', local: 'text', telefone: 'text' },
  },
  // 38 Contratar transporte (usa a mesma tabela que o Agricultor e o Transportador)
  transportes: {
    t: 'agro_transportes', leitura: 'dono', escrita: 'dono', dono: 'usuario_id', tambem: 'transportador_id',
    campos: CAMPOS_TRANSPORTE,
    padrao: { estado: 'aberto', pagamento: 'pendente' },
  },
  // 39 Pagamento seguro (só o registo e a liberação; sem dinheiro real por enquanto)
  pagamentos: {
    t: 'agro_pagamentos', leitura: 'dono', escrita: 'dono', dono: 'comprador_id', tambem: 'vendedor_id',
    campos: { vendedor_telefone: 'text', vendedor_id: 'text', descricao: 'text', valor: 'numeric', estado: 'text' },
    padrao: { estado: 'reservado' },
    resolver: [{ de: 'vendedor_telefone', para: 'vendedor_id' }],
  },
  // 40 Avaliar vendedor
  avaliacoes_vendedores: {
    t: 'agro_avaliacoes_vendedores', leitura: 'dono', escrita: 'dono', dono: 'autor_id',
    campos: { vendedor_nome: 'text', qualidade: 'int', pontualidade: 'int', experiencia: 'int', comentario: 'text' },
  },
  // 41 Exportar: oportunidades em quantidade
  exportacao: {
    t: 'agro_exportacao', leitura: 'todos', escrita: 'dono', dono: 'usuario_id', nome: true,
    campos: { produto: 'text', quantidade: 'text', regiao: 'text', contacto: 'text', nota: 'text' },
  },
  // 43 Alerta de nova colheita
  alertas_colheita: {
    t: 'agro_alertas_colheita', leitura: 'dono', escrita: 'dono', dono: 'usuario_id',
    campos: { produto: 'text', regiao: 'text' },
  },
};

const resumos: Record<string, Resumo> = {
  // 36 Quando surge um produto igual ao desejado
  correspondencias: {
    sql: `SELECT p.title AS rotulo,
                 p.price::text || ' • ' || coalesce(p.location,'-') || ' (procurava: ' || d.produto || ')' AS valor
            FROM agro_desejos d
            JOIN products p ON p.title ILIKE '%' || d.produto || '%'
           WHERE d.usuario_id = $1 AND d.ativo = true AND (d.preco_max IS NULL OR p.price <= d.preco_max)
           LIMIT 50`,
  },
  // 43 Novas ofertas nas regiões escolhidas
  novas_ofertas: {
    sql: `SELECT p.title AS rotulo,
                 p.price::text || ' • ' || coalesce(p.location,'-') AS valor
            FROM agro_alertas_colheita a
            JOIN products p ON p.title ILIKE '%' || a.produto || '%'
                           AND (coalesce(a.regiao,'') = '' OR p.location ILIKE '%' || a.regiao || '%')
           WHERE a.usuario_id = $1
           LIMIT 50`,
  },
  // 42 Relatório de mercado
  mercado_oferta: {
    sql: `SELECT lower(title) AS rotulo,
                 count(*)::text || ' anúncios • preço médio ' || round(avg(price)::numeric,0)::text
                   || ' • disponível ' || coalesce(sum(quantity),0)::text AS valor
            FROM products GROUP BY lower(title) ORDER BY count(*) DESC LIMIT 50`,
  },
  mercado_procura: {
    sql: `SELECT lower(produto) AS rotulo, count(*)::text || ' pedidos de compradores' AS valor
            FROM agro_desejos WHERE ativo = true GROUP BY lower(produto) ORDER BY count(*) DESC LIMIT 50`,
  },
};

export default makeRouter(cfgs, { resumos });
