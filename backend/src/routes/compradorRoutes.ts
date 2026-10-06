// backend/src/routes/compradorRoutes.ts  (funcionalidades 33 a 43; 29 a 32 estão na BuscaAvancadaScreen)
import { Router, Request, Response } from 'express';
import { makeRouter, Cfg, Resumo, COMUNS, CAMPOS_TRANSPORTE } from '../lib/agroEngine';
import { FUNCAO_NOTIFICAR, gatilho } from '../lib/avisosSql';
import * as prismaModule from '../lib/prisma';

const prisma: any = (prismaModule as any).prisma ?? (prismaModule as any).default;

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

// ---------- avisos automáticos ----------
const TRIGGERS = [
  FUNCAO_NOTIFICAR,
  // Oferta nova: avisa o vendedor
  ...gatilho('agro_ofertas', 'oferta_nova', 'INSERT', `
    PERFORM agro_notificar(NEW.vendedor_id, '🤝 Nova oferta',
      coalesce(NEW.produto_titulo, 'Produto') || ': ' || coalesce(NEW.preco_oferta::text, '') || ' (' || coalesce(NEW.quantidade, '') || ')');`),
  // Oferta mudou de estado: avisa a outra parte
  ...gatilho('agro_ofertas', 'oferta_mudou', 'UPDATE', `
    IF NEW.estado IS DISTINCT FROM OLD.estado THEN
      IF NEW.estado = 'aceita' AND OLD.estado = 'contraoferta' THEN
        PERFORM agro_notificar(NEW.vendedor_id, '🤝 ' || coalesce(NEW.produto_titulo, 'Oferta'), 'O comprador aceitou a sua contraoferta.');
      ELSIF NEW.estado = 'aceita' THEN
        PERFORM agro_notificar(NEW.comprador_id, '🤝 ' || coalesce(NEW.produto_titulo, 'Oferta'), 'O vendedor aceitou a sua oferta.');
      ELSIF NEW.estado = 'recusada' THEN
        PERFORM agro_notificar(NEW.comprador_id, '🤝 ' || coalesce(NEW.produto_titulo, 'Oferta'), 'O vendedor recusou a sua oferta.');
      ELSIF NEW.estado = 'contraoferta' THEN
        PERFORM agro_notificar(NEW.comprador_id, '🤝 ' || coalesce(NEW.produto_titulo, 'Oferta'),
          'O vendedor fez uma contraoferta de ' || coalesce(NEW.contraoferta::text, '?') || '.');
      ELSIF NEW.estado = 'cancelada' THEN
        PERFORM agro_notificar(NEW.vendedor_id, '🤝 ' || coalesce(NEW.produto_titulo, 'Oferta'), 'O comprador cancelou a oferta.');
      END IF;
    END IF;`),
  // Pagamento seguro: avisa o vendedor
  ...gatilho('agro_pagamentos', 'pagamento_novo', 'INSERT', `
    PERFORM agro_notificar(NEW.vendedor_id, '🔒 Pagamento reservado',
      coalesce(NEW.descricao, 'Compra') || ': ' || coalesce(NEW.valor::text, '?'));`),
  ...gatilho('agro_pagamentos', 'pagamento_mudou', 'UPDATE', `
    IF NEW.estado IS DISTINCT FROM OLD.estado THEN
      IF NEW.estado = 'liberado' THEN
        PERFORM agro_notificar(NEW.vendedor_id, '💰 Pagamento liberado', coalesce(NEW.descricao, 'Compra') || ': o comprador confirmou a entrega.');
      ELSIF NEW.estado = 'disputa' THEN
        PERFORM agro_notificar(NEW.vendedor_id, '⚠️ Disputa aberta', coalesce(NEW.descricao, 'Compra') || ': o comprador abriu uma disputa.');
      END IF;
    END IF;`),
  // Leilão: avisa quem pediu quando chega uma proposta
  ...gatilho('agro_propostas', 'proposta_nova', 'INSERT', `
    PERFORM agro_notificar((SELECT usuario_id FROM agro_leiloes WHERE id = NEW.leilao_id), '📨 Nova proposta no seu leilão',
      'Preço ' || coalesce(NEW.preco::text, '?') || ' • ' || coalesce(NEW.quantidade, ''));`),
];

const router = Router();
router.use(makeRouter(cfgs, { resumos, depois: TRIGGERS }));

// 33 Perfil do vendedor: dados públicos, avaliação e anúncios ativos
router.get('/vendedor/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const u: any[] = await prisma.$queryRawUnsafe(
      `SELECT id::text AS id, name, role::text AS role, location, "isVerified" AS verificado,
              "createdAt" AS desde, phone
         FROM users WHERE id::text = $1 LIMIT 1`,
      id
    );
    if (!u.length) return res.status(404).json({ erro: 'Vendedor não encontrado.' });
    const a: any[] = await prisma.$queryRawUnsafe(
      `SELECT coalesce(round(avg(rating)::numeric, 1)::text, '') AS media, count(*)::text AS total
         FROM reviews WHERE "targetId" = $1`,
      id
    );
    const p: any[] = await prisma.$queryRawUnsafe(
      `SELECT id::text AS id, title, price::text AS price, unit, quantity::text AS quantity,
              location, "imageUrl" AS "imageUrl"
         FROM products WHERE "ownerId" = $1 AND "isAvailable" = true
        ORDER BY "createdAt" DESC LIMIT 30`,
      id
    );
    return res.json({ vendedor: u[0], avaliacao: a[0], produtos: p });
  } catch (e: any) {
    console.error('comprador vendedor:', String(e?.message || e));
    return res.status(500).json({ erro: 'Não foi possível carregar o perfil do vendedor.' });
  }
});

export default router;
