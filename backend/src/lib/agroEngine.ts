// backend/src/lib/agroEngine.ts
// Motor comum dos módulos (Agricultor, Pescador, Comprador, Comerciante, Agente, Transportador, Governo, ONG, Comuns).
// - Cria e ajusta as tabelas (prefixo agro_) sozinho, sem SQL no Supabase.
// - Confere o token do login com o mesmo verifyToken do app e o perfil (role) do usuário.
// - Entrega listar, criar, atualizar e apagar para cada tabela configurada, e "resumos" (consultas prontas).
import { Router, Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import * as prismaModule from './prisma';

const prisma: any = (prismaModule as any).prisma ?? (prismaModule as any).default;

export type Tipo = 'text' | 'numeric' | 'int' | 'bool' | 'uuid';
export type Cfg = {
  t: string;
  leitura: 'todos' | 'dono';
  escrita: 'dono' | 'admin' | 'papeis';
  dono?: string; // coluna com o id de quem criou
  tambem?: string; // segunda coluna com id (ex.: vendedor) que também vê e atualiza
  nome?: boolean; // guarda o nome de quem escreveu (usuario_nome)
  campos: Record<string, Tipo>;
  padrao?: Record<string, any>;
  papeisEscrita?: string[]; // quando escrita = 'papeis'
  acesso?: string[]; // só estes perfis usam a tabela (ADMIN sempre pode)
  leituraTodos?: string[]; // perfis que leem todas as linhas mesmo em tabelas 'dono'
  editaPapeis?: string[]; // perfis que podem atualizar linhas de outras pessoas
  restritos?: Record<string, string[]>; // campo -> perfis que podem escrever esse campo
  resolver?: { de: string; para: string }[]; // celular -> id do usuário
  meusCampo?: string; // com ?meus=1 filtra por este campo = usuário
  aoEditar?: (uid: string, body: any) => Record<string, any>;
};
export type Resumo = { sql: string; papeis?: string[] };

const REGISTO: Cfg[] = [];
const DEPOIS: string[] = [];

// ---------- configurações compartilhadas por vários módulos ----------
export const COMUNS: Record<string, Cfg> = {
  precos: {
    t: 'agro_precos', leitura: 'todos', escrita: 'admin',
    campos: { produto: 'text', cidade: 'text', preco: 'numeric', moeda: 'text' },
    padrao: { moeda: 'XOF' },
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
  vendas: {
    t: 'agro_vendas', leitura: 'dono', escrita: 'dono', dono: 'vendedor_id',
    campos: {
      produto: 'text', quantidade: 'text', comprador_nome: 'text', comprador_telefone: 'text',
      preco: 'numeric', estado_pagamento: 'text', entrega_confirmada: 'bool',
    },
    padrao: { estado_pagamento: 'pendente', entrega_confirmada: false },
  },
  colheitas: {
    t: 'agro_colheitas', leitura: 'dono', escrita: 'dono', dono: 'usuario_id',
    campos: { produto: 'text', quantidade: 'text', data: 'text', autorizado_estatistica: 'bool' },
    padrao: { autorizado_estatistica: false },
  },
  alertas_regiao: {
    t: 'agro_alertas_regiao', leitura: 'todos', escrita: 'admin',
    campos: { tipo: 'text', regiao: 'text', titulo: 'text', texto: 'text', orientacao: 'text' },
  },
};

// Pedidos de transporte: a mesma tabela é usada por Agricultor, Comprador e Transportador
export const CAMPOS_TRANSPORTE: Record<string, Tipo> = {
  produto: 'text', quantidade: 'text', origem: 'text', destino: 'text', estado: 'text',
  horario: 'text', valor: 'numeric', transportador_id: 'text', pagamento: 'text',
};

// ---------- tabelas ----------
function montarTabelas(): Map<string, Map<string, string>> {
  const m = new Map<string, Map<string, string>>();
  REGISTO.forEach((c) => {
    if (!m.has(c.t)) m.set(c.t, new Map());
    const cols = m.get(c.t)!;
    const add = (k: string, tp: string) => { if (!cols.has(k)) cols.set(k, tp); };
    if (c.dono) add(c.dono, 'text');
    if (c.tambem) add(c.tambem, 'text');
    if (c.nome) add('usuario_nome', 'text');
    Object.entries(c.campos).forEach(([k, tp]) => add(k, tp === 'bool' ? 'boolean' : tp));
  });
  return m;
}

let pronto: Promise<void> | null = null;
function garantirTabelas(): Promise<void> {
  if (!pronto) {
    pronto = (async () => {
      const tabelas = Array.from(montarTabelas().entries());
      for (const [t, cols] of tabelas) {
        await prisma.$executeRawUnsafe(
          `CREATE TABLE IF NOT EXISTS ${t} (id uuid primary key default gen_random_uuid(), criado_em timestamptz default now())`
        );
        const adds = Array.from(cols.entries()).map(([k, tp]) => `ADD COLUMN IF NOT EXISTS ${k} ${tp}`);
        if (adds.length) await prisma.$executeRawUnsafe(`ALTER TABLE ${t} ${adds.join(', ')}`);
        await prisma.$executeRawUnsafe(`ALTER TABLE ${t} ENABLE ROW LEVEL SECURITY`);
      }
      // Preparações extras (índices, avisos automáticos): se uma falhar, só vai para o log
      for (const q of DEPOIS) {
        try {
          await prisma.$executeRawUnsafe(q);
        } catch (e: any) {
          console.error('agro: aviso ao preparar extras:', String(e?.message || e).slice(0, 300));
        }
      }
    })().catch((e) => {
      pronto = null;
      throw e;
    });
  }
  return pronto;
}

// ---------- utilidades ----------
class ErroHttp extends Error {
  constructor(public status: number, msg: string) { super(msg); }
}
const cast = (tipo: Tipo) => (tipo === 'text' ? '' : tipo === 'bool' ? '::boolean' : `::${tipo}`);

function valor(tipo: Tipo, v: any): any {
  if (v === undefined || v === null || v === '') return null;
  if (tipo === 'numeric' || tipo === 'int') {
    const n = Number(String(v).replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  }
  if (tipo === 'bool') return v === true || v === 'true';
  return String(v);
}

const naLista = (l: string[] | undefined, role: string) => !!l && (role === 'ADMIN' || l.includes(role));
const temAcesso = (c: Cfg, role: string) => !c.acesso || naLista(c.acesso, role);

function podeEscrever(c: Cfg, role: string): boolean {
  if (!temAcesso(c, role)) return false;
  if (c.escrita === 'admin') return role === 'ADMIN';
  if (c.escrita === 'papeis') return naLista(c.papeisEscrita, role);
  return true;
}

function filtrarRestritos(c: Cfg, body: any, role: string) {
  const o = { ...(body || {}) };
  Object.entries(c.restritos || {}).forEach(([k, roles]) => {
    if (!naLista(roles, role)) delete o[k];
  });
  return o;
}

async function nomeDoUsuario(id: string): Promise<string | null> {
  try {
    const r: any[] = await prisma.$queryRawUnsafe('SELECT name FROM users WHERE id::text = $1 LIMIT 1', id);
    return r[0]?.name ?? null;
  } catch {
    return null;
  }
}

// Mesma regra do cadastro: só números, sem o 245 do país. O número pode estar salvo em vários formatos.
function candidatosTelefone(raw: string): string[] {
  let d = String(raw ?? '').replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('245') && d.length > 9) d = d.slice(3);
  const lista = [d, `245${d}`, `+245${d}`, String(raw ?? '').trim()];
  return Array.from(new Set(lista.filter(Boolean)));
}

async function resolverCelulares(c: Cfg, body: any) {
  for (const { de, para } of c.resolver || []) {
    if (!body[de]) continue;
    const r: any[] = await prisma.$queryRawUnsafe(
      'SELECT id::text AS id FROM users WHERE phone = ANY($1::text[]) LIMIT 1',
      candidatosTelefone(String(body[de]))
    );
    if (!r.length) throw new ErroHttp(400, 'Esse celular não está registado no app.');
    body[para] = r[0].id;
  }
}

// Confere o token com o mesmo verifyToken do resto do app e guarda quem é o usuário (req.agro)
export function auth(req: Request, res: Response, next: NextFunction) {
  const h = String(req.headers.authorization || '');
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  try {
    const p: any = verifyToken(token);
    const id = p.userId ?? p.id ?? p.sub;
    if (!id) return res.status(401).json({ erro: 'Token sem id de usuário' });
    (req as any).agro = { id: String(id), role: String(p.role || '').toUpperCase() };
    next();
  } catch {
    res.status(401).json({ erro: 'Entre na sua conta' });
  }
}

function erro(res: Response, e: any, padrao: string) {
  if (e instanceof ErroHttp) return res.status(e.status).json({ erro: e.message });
  const m = String(e?.message || e);
  console.error('agro:', m);
  if (/23505|duplicate key/i.test(m)) return res.status(409).json({ erro: 'Já existe um registo igual (por exemplo, você já votou).' });
  return res.status(400).json({ erro: padrao });
}

// ---------- fábrica do router ----------
export function makeRouter(cfgs: Record<string, Cfg>, opts?: { resumos?: Record<string, Resumo>; depois?: string[] }): Router {
  Object.values(cfgs).forEach((c) => REGISTO.push(c));
  (opts?.depois || []).forEach((q) => DEPOIS.push(q));

  const router = Router();
  router.use(auth);
  router.use(async (_req, res, next) => {
    try {
      await garantirTabelas();
      next();
    } catch (e) {
      console.error('agro: erro ao preparar tabelas', e);
      res.status(500).json({ erro: 'Falha ao preparar as tabelas' });
    }
  });

  // Resumos: consultas prontas (listas de {rotulo, valor, ...})
  router.get('/resumo/:nome', async (req: Request, res: Response) => {
    const r = opts?.resumos?.[req.params.nome];
    if (!r) return res.status(404).json({ erro: 'Resumo desconhecido' });
    const { id, role } = (req as any).agro;
    if (r.papeis && !naLista(r.papeis, role)) return res.status(403).json({ erro: 'Sem permissão para ver isto' });
    try {
      const rows = await prisma.$queryRawUnsafe(r.sql, ...(r.sql.includes('$1') ? [id] : []));
      res.json(rows);
    } catch (e: any) {
      const m = String(e?.message || e);
      if (/relation "[^"]+" does not exist/i.test(m)) return res.json([]);
      console.error('agro resumo:', m);
      res.status(500).json({ erro: 'Consulta indisponível: ' + m.slice(0, 160) });
    }
  });

  const pegar = (req: Request, res: Response): Cfg | null => {
    const c = cfgs[req.params.rota];
    if (!c) { res.status(404).json({ erro: 'Rota desconhecida' }); return null; }
    if (!temAcesso(c, (req as any).agro.role)) { res.status(403).json({ erro: 'Este espaço é para outro perfil' }); return null; }
    return c;
  };

  router.get('/:rota', async (req: Request, res: Response) => {
    const c = pegar(req, res);
    if (!c) return;
    try {
      const { id, role } = (req as any).agro;
      const where: string[] = [];
      const params: any[] = [];
      if (c.leitura === 'dono' && !naLista(c.leituraTodos, role)) {
        params.push(id);
        const n = params.length;
        where.push(c.tambem ? `(${c.dono} = $${n} OR ${c.tambem} = $${n})` : `${c.dono} = $${n}`);
      }
      if (c.meusCampo && req.query.meus) {
        params.push(id);
        where.push(`${c.meusCampo} = $${params.length}`);
      }
      const BUSCA = ['produto', 'cidade', 'categoria', 'regiao', 'idioma', 'especie', 'local'];
      Object.entries(c.campos).forEach(([k, tipo]) => {
        const v = req.query[k];
        if (typeof v !== 'string' || !v) return;
        if (tipo === 'text' && BUSCA.includes(k)) {
          params.push(`%${v}%`);
          where.push(`${k} ilike $${params.length}`);
        } else {
          params.push(v);
          where.push(`${k}::text = $${params.length}`);
        }
      });
      const sql = `SELECT * FROM ${c.t} ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY criado_em DESC LIMIT 200`;
      res.json(await prisma.$queryRawUnsafe(sql, ...params));
    } catch (e) {
      erro(res, e, 'Erro ao listar');
    }
  });

  router.post('/:rota', async (req: Request, res: Response) => {
    const c = pegar(req, res);
    if (!c) return;
    const { id, role } = (req as any).agro;
    if (!podeEscrever(c, role)) return res.status(403).json({ erro: 'Sem permissão para guardar aqui' });
    try {
      const body = filtrarRestritos(c, req.body, role);
      await resolverCelulares(c, body);
      const dados: Record<string, any> = { ...(c.padrao || {}) };
      Object.keys(c.campos).forEach((k) => { if (body[k] !== undefined) dados[k] = body[k]; });
      if (c.dono && !(c.escrita === 'admin' && dados[c.dono] !== undefined)) dados[c.dono] = id;
      if (c.nome) dados.usuario_nome = await nomeDoUsuario(id);
      const cols: string[] = [];
      const marcas: string[] = [];
      const params: any[] = [];
      Object.entries(dados).forEach(([k, v]) => {
        const tipo: Tipo = c.campos[k] ?? 'text';
        params.push(valor(tipo, v));
        cols.push(k);
        marcas.push(`$${params.length}${cast(tipo)}`);
      });
      const r: any[] = await prisma.$queryRawUnsafe(
        `INSERT INTO ${c.t} (${cols.join(',')}) VALUES (${marcas.join(',')}) RETURNING *`, ...params
      );
      res.status(201).json(r[0]);
    } catch (e) {
      erro(res, e, 'Não foi possível guardar. Confira os campos.');
    }
  });

  router.patch('/:rota/:id', async (req: Request, res: Response) => {
    const c = pegar(req, res);
    if (!c) return;
    const { id, role } = (req as any).agro;
    if (!podeEscrever(c, role)) return res.status(403).json({ erro: 'Sem permissão para alterar aqui' });
    try {
      let body = filtrarRestritos(c, req.body, role);
      if (c.aoEditar) body = { ...body, ...c.aoEditar(id, body) };
      const sets: string[] = [];
      const params: any[] = [];
      Object.entries(c.campos).forEach(([k, tipo]) => {
        if (body[k] === undefined) return;
        params.push(valor(tipo, body[k]));
        sets.push(`${k} = $${params.length}${cast(tipo)}`);
      });
      if (!sets.length) return res.status(400).json({ erro: 'Nada para atualizar' });
      params.push(req.params.id);
      let sql = `UPDATE ${c.t} SET ${sets.join(', ')} WHERE id = $${params.length}::uuid`;
      if (c.dono && c.escrita !== 'admin' && !(c.escrita === 'papeis' && role === 'ADMIN') && !(c.escrita === 'dono' && naLista(c.editaPapeis, role))) {
        params.push(id);
        const n = params.length;
        sql += c.tambem ? ` AND (${c.dono} = $${n} OR ${c.tambem} = $${n})` : ` AND ${c.dono} = $${n}`;
      }
      const r: any[] = await prisma.$queryRawUnsafe(sql + ' RETURNING *', ...params);
      if (!r.length) return res.status(404).json({ erro: 'Não encontrado' });
      res.json(r[0]);
    } catch (e) {
      erro(res, e, 'Não foi possível atualizar');
    }
  });

  router.delete('/:rota/:id', async (req: Request, res: Response) => {
    const c = pegar(req, res);
    if (!c) return;
    const { id, role } = (req as any).agro;
    if (!podeEscrever(c, role)) return res.status(403).json({ erro: 'Sem permissão para apagar aqui' });
    try {
      const params: any[] = [req.params.id];
      let sql = `DELETE FROM ${c.t} WHERE id = $1::uuid`;
      if (c.dono && c.escrita !== 'admin' && !(c.escrita === 'papeis' && role === 'ADMIN')) {
        params.push(id);
        sql += ` AND ${c.dono} = $2`;
      }
      const r: any[] = await prisma.$queryRawUnsafe(sql + ' RETURNING id', ...params);
      if (!r.length) return res.status(404).json({ erro: 'Não encontrado' });
      res.json({ ok: true });
    } catch (e) {
      erro(res, e, 'Não foi possível apagar');
    }
  });

  return router;
}
