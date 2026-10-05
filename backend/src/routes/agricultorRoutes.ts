// backend/src/routes/agricultorRoutes.ts
// Módulo Agricultor: preços, alertas, encontros, transporte, avaliações de comprador,
// vendas/pagamentos, contactos, sementes, fórum, vídeos, colheitas, notícias, mapa de compradores.
// As tabelas (prefixo agro_) são criadas sozinhas na primeira chamada. Não precisa rodar SQL.
import { Router, Request, Response, NextFunction } from 'express';
import { verify } from 'jsonwebtoken';
import * as prismaModule from '../lib/prisma';

const prisma: any = (prismaModule as any).prisma ?? (prismaModule as any).default;

type Tipo = 'text' | 'numeric' | 'int' | 'bool' | 'uuid';
type Cfg = {
  t: string;
  leitura: 'todos' | 'dono';
  escrita: 'dono' | 'admin';
  dono?: string;
  nome?: boolean; // guarda o nome de quem escreveu
  campos: Record<string, Tipo>;
  padrao?: Record<string, any>;
};

const T: Record<string, Cfg> = {
  precos: {
    t: 'agro_precos', leitura: 'todos', escrita: 'admin',
    campos: { produto: 'text', cidade: 'text', preco: 'numeric', moeda: 'text' },
    padrao: { moeda: 'XOF' },
  },
  alertas_preco: {
    t: 'agro_alertas_preco', leitura: 'dono', escrita: 'dono', dono: 'usuario_id',
    campos: { produto: 'text', preco_desejado: 'numeric', ativo: 'bool' },
    padrao: { ativo: true },
  },
  alertas_regiao: {
    t: 'agro_alertas_regiao', leitura: 'todos', escrita: 'admin',
    campos: { tipo: 'text', regiao: 'text', titulo: 'text', texto: 'text', orientacao: 'text' },
  },
  encontros: {
    t: 'agro_encontros', leitura: 'dono', escrita: 'dono', dono: 'criado_por',
    campos: { outro_nome: 'text', outro_telefone: 'text', data_hora: 'text', local: 'text', estado: 'text' },
    padrao: { estado: 'marcado' },
  },
  transportes: {
    t: 'agro_transportes', leitura: 'dono', escrita: 'dono', dono: 'usuario_id',
    campos: { produto: 'text', quantidade: 'text', origem: 'text', destino: 'text', estado: 'text' },
    padrao: { estado: 'aberto' },
  },
  avaliacoes_compradores: {
    t: 'agro_avaliacoes_compradores', leitura: 'dono', escrita: 'dono', dono: 'autor_id',
    campos: { comprador_nome: 'text', estrelas: 'int', comentario: 'text' },
  },
  vendas: {
    t: 'agro_vendas', leitura: 'dono', escrita: 'dono', dono: 'vendedor_id',
    campos: {
      produto: 'text', quantidade: 'text', comprador_nome: 'text', comprador_telefone: 'text',
      preco: 'numeric', estado_pagamento: 'text', entrega_confirmada: 'bool',
    },
    padrao: { estado_pagamento: 'pendente', entrega_confirmada: false },
  },
  contactos: {
    t: 'agro_contactos', leitura: 'dono', escrita: 'dono', dono: 'usuario_id',
    campos: { nome: 'text', telefone: 'text', nota: 'text' },
  },
  forum_posts: {
    t: 'agro_forum_posts', leitura: 'todos', escrita: 'dono', dono: 'usuario_id', nome: true,
    campos: { tipo: 'text', texto: 'text' },
  },
  forum_respostas: {
    t: 'agro_forum_respostas', leitura: 'todos', escrita: 'dono', dono: 'usuario_id', nome: true,
    campos: { post_id: 'uuid', texto: 'text' },
  },
  videos: {
    t: 'agro_videos', leitura: 'todos', escrita: 'admin',
    campos: { titulo: 'text', categoria: 'text', idioma: 'text', url: 'text' },
  },
  colheitas: {
    t: 'agro_colheitas', leitura: 'dono', escrita: 'dono', dono: 'usuario_id',
    campos: { produto: 'text', quantidade: 'text', data: 'text', autorizado_estatistica: 'bool' },
    padrao: { autorizado_estatistica: false },
  },
  noticias: {
    t: 'agro_noticias', leitura: 'todos', escrita: 'admin',
    campos: { titulo: 'text', texto: 'text' },
  },
  compradores: {
    t: 'agro_compradores', leitura: 'todos', escrita: 'dono', dono: 'usuario_id',
    campos: { nome: 'text', telefone: 'text', produtos_procurados: 'text', cidade: 'text', lat: 'numeric', lng: 'numeric' },
  },
};

const BUSCA_TEXTO = ['produto', 'cidade', 'categoria', 'regiao', 'idioma'];

function ddl(c: Cfg): string {
  const cols: string[] = ['id uuid primary key default gen_random_uuid()'];
  if (c.dono) cols.push(`${c.dono} text`);
  if (c.nome) cols.push('usuario_nome text');
  for (const [k, tipo] of Object.entries(c.campos)) {
    cols.push(`${k} ${tipo === 'bool' ? 'boolean' : tipo}`);
  }
  cols.push('criado_em timestamptz default now()');
  return `CREATE TABLE IF NOT EXISTS ${c.t} (${cols.join(', ')})`;
}

let pronto: Promise<void> | null = null;
function garantirTabelas(): Promise<void> {
  if (!pronto) {
    pronto = (async () => {
      for (const c of Object.values(T)) {
        await prisma.$executeRawUnsafe(ddl(c));
        await prisma.$executeRawUnsafe(`ALTER TABLE ${c.t} ENABLE ROW LEVEL SECURITY`);
      }
    })().catch((e) => {
      pronto = null;
      throw e;
    });
  }
  return pronto;
}

function valor(tipo: Tipo, v: any): any {
  if (v === undefined || v === null || v === '') return null;
  if (tipo === 'numeric' || tipo === 'int') {
    const n = Number(String(v).replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  }
  if (tipo === 'bool') return v === true || v === 'true';
  return String(v);
}
const cast = (tipo: Tipo) => (tipo === 'text' ? '' : tipo === 'bool' ? '::boolean' : `::${tipo}`);

function auth(req: Request, res: Response, next: NextFunction) {
  const h = String(req.headers.authorization || '');
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  try {
    const p: any = verify(token, process.env.JWT_SECRET as string);
    const id = p.id ?? p.userId ?? p.sub;
    if (!id) return res.status(401).json({ erro: 'Token sem id de usuário' });
    (req as any).agro = { id: String(id), role: String(p.role || '') };
    next();
  } catch {
    res.status(401).json({ erro: 'Entre na sua conta' });
  }
}

async function nomeDoUsuario(id: string): Promise<string | null> {
  try {
    const r: any[] = await prisma.$queryRawUnsafe('SELECT name FROM users WHERE id::text = $1 LIMIT 1', id);
    return r[0]?.name ?? null;
  } catch {
    return null;
  }
}

const router = Router();
router.use(auth);
router.use(async (_req, res, next) => {
  try {
    await garantirTabelas();
    next();
  } catch (e) {
    console.error('agricultor: erro ao preparar tabelas', e);
    res.status(500).json({ erro: 'Falha ao preparar as tabelas do Agricultor' });
  }
});

// Alertas de preço que já foram atingidos pelos preços do mercado
router.get('/atingidos', async (req: Request, res: Response) => {
  try {
    const uid = (req as any).agro.id;
    const rows = await prisma.$queryRawUnsafe(
      `SELECT a.produto, a.preco_desejado, p.cidade, p.preco, p.moeda
         FROM agro_alertas_preco a
         JOIN agro_precos p ON lower(p.produto) = lower(a.produto) AND p.preco >= a.preco_desejado
        WHERE a.usuario_id = $1 AND a.ativo = true
        ORDER BY p.preco DESC`,
      uid
    );
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: 'Erro ao verificar alertas' });
  }
});

function cfg(req: Request, res: Response): Cfg | null {
  const c = T[req.params.rota];
  if (!c) {
    res.status(404).json({ erro: 'Rota desconhecida' });
    return null;
  }
  return c;
}

function podeEscrever(c: Cfg, req: Request, res: Response): boolean {
  if (c.escrita === 'admin' && (req as any).agro.role !== 'ADMIN') {
    res.status(403).json({ erro: 'Só o administrador pode fazer isso' });
    return false;
  }
  return true;
}

router.get('/:rota', async (req: Request, res: Response) => {
  const c = cfg(req, res);
  if (!c) return;
  try {
    const uid = (req as any).agro.id;
    const where: string[] = [];
    const params: any[] = [];
    if (c.leitura === 'dono') {
      params.push(uid);
      where.push(`${c.dono} = $${params.length}`);
    }
    for (const [k, tipo] of Object.entries(c.campos)) {
      const v = req.query[k];
      if (typeof v !== 'string' || !v) continue;
      if (tipo === 'text' && BUSCA_TEXTO.includes(k)) {
        params.push(`%${v}%`);
        where.push(`${k} ilike $${params.length}`);
      } else {
        params.push(v);
        where.push(`${k}::text = $${params.length}`);
      }
    }
    const sql = `SELECT * FROM ${c.t} ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY criado_em DESC LIMIT 200`;
    res.json(await prisma.$queryRawUnsafe(sql, ...params));
  } catch (e) {
    console.error(e);
    res.status(500).json({ erro: 'Erro ao listar' });
  }
});

router.post('/:rota', async (req: Request, res: Response) => {
  const c = cfg(req, res);
  if (!c || !podeEscrever(c, req, res)) return;
  try {
    const uid = (req as any).agro.id;
    const dados: Record<string, any> = { ...(c.padrao || {}) };
    for (const k of Object.keys(c.campos)) {
      if (req.body?.[k] !== undefined) dados[k] = req.body[k];
    }
    const cols: string[] = [];
    const marcas: string[] = [];
    const params: any[] = [];
    for (const [k, v] of Object.entries(dados)) {
      const tipo = c.campos[k];
      params.push(valor(tipo, v));
      cols.push(k);
      marcas.push(`$${params.length}${cast(tipo)}`);
    }
    if (c.dono) {
      params.push(uid);
      cols.push(c.dono);
      marcas.push(`$${params.length}`);
    }
    if (c.nome) {
      params.push(await nomeDoUsuario(uid));
      cols.push('usuario_nome');
      marcas.push(`$${params.length}`);
    }
    const sql = `INSERT INTO ${c.t} (${cols.join(',')}) VALUES (${marcas.join(',')}) RETURNING *`;
    const r: any[] = await prisma.$queryRawUnsafe(sql, ...params);
    res.status(201).json(r[0]);
  } catch (e) {
    console.error(e);
    res.status(400).json({ erro: 'Não foi possível guardar. Confira os campos.' });
  }
});

router.patch('/:rota/:id', async (req: Request, res: Response) => {
  const c = cfg(req, res);
  if (!c || !podeEscrever(c, req, res)) return;
  try {
    const uid = (req as any).agro.id;
    const sets: string[] = [];
    const params: any[] = [];
    for (const [k, tipo] of Object.entries(c.campos)) {
      if (req.body?.[k] === undefined) continue;
      params.push(valor(tipo, req.body[k]));
      sets.push(`${k} = $${params.length}${cast(tipo)}`);
    }
    if (!sets.length) return res.status(400).json({ erro: 'Nada para atualizar' });
    params.push(req.params.id);
    let sql = `UPDATE ${c.t} SET ${sets.join(', ')} WHERE id = $${params.length}::uuid`;
    if (c.escrita === 'dono' && c.dono) {
      params.push(uid);
      sql += ` AND ${c.dono} = $${params.length}`;
    }
    sql += ' RETURNING *';
    const r: any[] = await prisma.$queryRawUnsafe(sql, ...params);
    if (!r.length) return res.status(404).json({ erro: 'Não encontrado' });
    res.json(r[0]);
  } catch (e) {
    console.error(e);
    res.status(400).json({ erro: 'Não foi possível atualizar' });
  }
});

router.delete('/:rota/:id', async (req: Request, res: Response) => {
  const c = cfg(req, res);
  if (!c || !podeEscrever(c, req, res)) return;
  try {
    const uid = (req as any).agro.id;
    const params: any[] = [req.params.id];
    let sql = `DELETE FROM ${c.t} WHERE id = $1::uuid`;
    if (c.escrita === 'dono' && c.dono) {
      params.push(uid);
      sql += ` AND ${c.dono} = $2`;
    }
    sql += ' RETURNING id';
    const r: any[] = await prisma.$queryRawUnsafe(sql, ...params);
    if (!r.length) return res.status(404).json({ erro: 'Não encontrado' });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(400).json({ erro: 'Não foi possível apagar' });
  }
});

export default router;
