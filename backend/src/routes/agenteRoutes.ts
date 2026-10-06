// backend/src/routes/agenteRoutes.ts  (funcionalidades 51 a 56)
import { Router, Request, Response } from 'express';
import { makeRouter, Cfg, Resumo } from '../lib/agroEngine';
import { FUNCAO_NOTIFICAR, gatilho } from '../lib/avisosSql';
import { createProduct } from '../services/productService';
import * as prismaModule from '../lib/prisma';

const prisma: any = (prismaModule as any).prisma ?? (prismaModule as any).default;

const AG = ['AGENTE_DIGITAL']; // o ADMIN sempre entra

const cfgs: Record<string, Cfg> = {
  // 51 Registar agricultor (guarda o pedido; o administrador cria a conta de verdade)
  registos: {
    t: 'agro_registos_agente', leitura: 'dono', escrita: 'dono', dono: 'agente_id', nome: true,
    acesso: AG,
    campos: { nome: 'text', telefone: 'text', regiao: 'text', autorizado: 'bool', estado: 'text' },
    padrao: { estado: 'pendente' },
    restritos: { estado: ['ADMIN'] },
    leituraTodos: ['ADMIN'], editaPapeis: ['ADMIN'],
  },
  // 52 Publicar em nome de outro agricultor (o histórico fica aqui; a publicação é feita pela ação abaixo)
  publicacoes: {
    t: 'agro_publicacoes_agente', leitura: 'dono', escrita: 'dono', dono: 'agente_id',
    acesso: AG,
    campos: {
      agricultor_nome: 'text', agricultor_telefone: 'text', produto: 'text', quantidade: 'text',
      preco: 'numeric', localizacao: 'text', estado: 'text', autorizado: 'bool',
    },
    padrao: { estado: 'pendente' },
    restritos: { estado: ['ADMIN'] },
    leituraTodos: ['ADMIN'], editaPapeis: ['ADMIN'],
  },
  // 53 Comissões (a percentagem é definida pelo administrador)
  comissoes: {
    t: 'agro_comissoes', leitura: 'dono', escrita: 'dono', dono: 'agente_id',
    acesso: AG,
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
    acesso: AG,
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

// ---------- avisos automáticos ----------
const TRIGGERS = [
  FUNCAO_NOTIFICAR,
  // Pedido de conta novo: avisa os administradores
  ...gatilho('agro_registos_agente', 'registo_novo', 'INSERT', `
    PERFORM agro_notificar(u.id, '🧑‍🌾 Novo pedido de conta',
      coalesce(NEW.nome, '') || ' (' || coalesce(NEW.regiao, '') || ') pedido por ' || coalesce(NEW.usuario_nome, 'um agente'))
      FROM users u WHERE u.role::text = 'ADMIN';`),
  // Estado do pedido mudou: avisa o agente
  ...gatilho('agro_registos_agente', 'registo_mudou', 'UPDATE', `
    IF NEW.estado IS DISTINCT FROM OLD.estado THEN
      PERFORM agro_notificar(NEW.agente_id, '🧑‍🌾 ' || coalesce(NEW.nome, 'Agricultor'),
        CASE NEW.estado
          WHEN 'conta_criada' THEN 'A conta do agricultor foi criada.'
          WHEN 'recusado' THEN 'O pedido de conta foi recusado.'
          ELSE 'Estado do pedido: ' || coalesce(NEW.estado, '')
        END);
    END IF;`),
  // Comissão mudou: avisa o agente
  ...gatilho('agro_comissoes', 'comissao_mudou', 'UPDATE', `
    IF NEW.estado IS DISTINCT FROM OLD.estado THEN
      PERFORM agro_notificar(NEW.agente_id, '💵 Comissão', coalesce(NEW.descricao, 'Venda') || ': ' || coalesce(NEW.estado, ''));
    END IF;`),
];

// Mesma regra do cadastro: só números, sem o 245 do país. O número pode estar salvo em vários formatos.
function candidatosTelefone(raw: string): string[] {
  let d = String(raw ?? '').replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('245') && d.length > 9) d = d.slice(3);
  return Array.from(new Set([d, `245${d}`, `+245${d}`, String(raw ?? '').trim()].filter(Boolean)));
}

const router = Router();
router.use(makeRouter(cfgs, { resumos, depois: TRIGGERS }));

// 52 Publicar em nome do agricultor: o produto entra na conta dele (que já precisa existir)
router.post('/publicacoes/nova', async (req: Request, res: Response) => {
  const { id: uid, role } = (req as any).agro;
  if (role !== 'AGENTE_DIGITAL' && role !== 'ADMIN') {
    return res.status(403).json({ erro: 'Só agentes digitais podem publicar em nome de outro.' });
  }
  const b = req.body || {};
  if (b.autorizado !== true && b.autorizado !== 'true') {
    return res.status(400).json({ erro: 'Confirme que o agricultor autorizou a publicação.' });
  }
  const preco = Number(String(b.preco ?? '').replace(',', '.'));
  const m = String(b.quantidade ?? '').trim().match(/^(\d+(?:[.,]\d+)?)\s*(.*)$/);
  if (!String(b.produto || '').trim() || !String(b.agricultor_telefone || '').trim() || !Number.isFinite(preco) || preco <= 0 || !m) {
    return res.status(400).json({ erro: 'Preencha produto, celular do agricultor, preço e quantidade (por exemplo: 50 kg).' });
  }
  const quantidade = Math.round(parseFloat(m[1].replace(',', '.')));
  if (!(quantidade > 0)) return res.status(400).json({ erro: 'A quantidade precisa ser maior que zero.' });
  const unidade = m[2].trim() || 'kg';

  try {
    const donos: any[] = await prisma.$queryRawUnsafe(
      'SELECT id::text AS id, name, role::text AS role FROM users WHERE phone = ANY($1::text[]) LIMIT 1',
      candidatosTelefone(String(b.agricultor_telefone))
    );
    if (!donos.length) {
      return res.status(400).json({ erro: 'Esse agricultor ainda não tem conta. Registe-o primeiro (Registar agricultor).' });
    }
    const dono = donos[0];
    await createProduct({
      ownerId: dono.id,
      title: String(b.produto).trim(),
      category: (dono.role === 'PESCADOR' ? 'PESCA' : 'AGRICOLA') as any,
      price: preco,
      unit: unidade,
      quantity: quantidade,
      location: b.localizacao ? String(b.localizacao).trim() : undefined,
    });
    await prisma.$executeRawUnsafe(
      `INSERT INTO agro_publicacoes_agente
         (agente_id, agricultor_nome, agricultor_telefone, produto, quantidade, preco, localizacao, estado, autorizado)
       VALUES ($1::text, $2::text, $3::text, $4::text, $5::text, $6::numeric, $7::text, 'publicada', true)`,
      uid, dono.name, String(b.agricultor_telefone), String(b.produto).trim(), String(b.quantidade), preco,
      b.localizacao ? String(b.localizacao).trim() : null
    );
    try {
      await prisma.notification.create({
        data: {
          userId: dono.id,
          type: 'PRODUTO',
          title: '📢 Produto publicado por um agente',
          message: `${String(b.produto).trim()} foi publicado em seu nome.`,
        },
      });
    } catch (e) {
      /* o aviso é opcional */
    }
    return res.status(201).json({ ok: true, mensagem: 'Produto publicado na conta do agricultor.' });
  } catch (e: any) {
    console.error('agente publicar:', String(e?.message || e));
    return res.status(400).json({ erro: 'Não foi possível publicar o produto.' });
  }
});

export default router;
