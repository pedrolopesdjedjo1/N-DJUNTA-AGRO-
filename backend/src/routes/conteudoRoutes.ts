// backend/src/routes/conteudoRoutes.ts
// Publicação de conteúdo pelo administrador (preços, alertas, vídeos, notícias, cursos, etc.)
// e avisos dentro do app: ao publicar, os utilizadores certos recebem um aviso na lista "Avisos do app".
import { Router, Request, Response, NextFunction } from 'express';
import { makeRouter, Cfg } from '../lib/agroEngine';
import * as prismaModule from '../lib/prisma';

const prisma: any = (prismaModule as any).prisma ?? (prismaModule as any).default;

// Só o ADMIN escreve. Todos leem. "criado_por" permite ao admin apagar o que publicou.
const admin = (t: string, campos: Cfg['campos'], padrao?: Record<string, any>): Cfg => ({
  t, leitura: 'todos', escrita: 'admin', dono: 'criado_por', campos, padrao,
});

const cfgs: Record<string, Cfg> = {
  precos: admin('agro_precos', { produto: 'text', cidade: 'text', preco: 'numeric', moeda: 'text' }, { moeda: 'XOF' }),
  alertas_regiao: admin('agro_alertas_regiao', { tipo: 'text', regiao: 'text', titulo: 'text', texto: 'text', orientacao: 'text' }),
  alertas_mar: admin('agro_alertas_mar', { regiao: 'text', nivel: 'text', texto: 'text' }),
  precos_peixe: admin('agro_precos_peixe', { especie: 'text', regiao: 'text', preco: 'numeric', moeda: 'text' }, { moeda: 'XOF' }),
  servicos_gelo: admin('agro_servicos_gelo', { nome: 'text', local: 'text', telefone: 'text', preco: 'text' }),
  zonas: admin('agro_zonas_protegidas', { nome: 'text', regiao: 'text', regra: 'text', lat: 'numeric', lng: 'numeric', raio_km: 'numeric' }),
  combustivel: admin('agro_combustivel', { cidade: 'text', tipo: 'text', preco: 'numeric' }),
  videos: admin('agro_videos', { titulo: 'text', categoria: 'text', idioma: 'text', url: 'text' }),
  noticias: admin('agro_noticias', { titulo: 'text', texto: 'text' }),
  cursos: admin('agro_cursos', { titulo: 'text', publico: 'text', descricao: 'text', url: 'text' }),
  calendario: admin('agro_calendario', { regiao: 'text', mes: 'int', atividade: 'text', texto: 'text' }),
  dicionario: admin('agro_dicionario', { produto: 'text', descricao: 'text', nome_kriol: 'text', nome_fr: 'text', nome_en: 'text', foto_url: 'text' }),
  emergencia: admin('agro_emergencia', { nome: 'text', telefone: 'text', descricao: 'text', regiao: 'text' }),
  // Tabela dos alertas de preço dos agricultores (precisa existir para o aviso de preço funcionar)
  alertas_preco: {
    t: 'agro_alertas_preco', leitura: 'dono', escrita: 'dono', dono: 'usuario_id',
    campos: { produto: 'text', preco_desejado: 'numeric', ativo: 'bool' },
    padrao: { ativo: true },
  },
  // Avisos de cada utilizador (cada pessoa só vê os seus)
  notificacoes: {
    t: 'agro_notificacoes', leitura: 'dono', escrita: 'dono', dono: 'usuario_id',
    campos: { titulo: 'text', texto: 'text', lida: 'bool' },
    padrao: { lida: false },
  },
};

// ---------- envio de avisos ----------
type Dest = 'todos' | { sql: string; params: any[] };

async function enviar(titulo: string, texto: string, d: Dest) {
  if (d === 'todos') {
    await prisma.$executeRawUnsafe(
      `INSERT INTO agro_notificacoes (usuario_id, titulo, texto, lida)
       SELECT id::text, $1::text, $2::text, false FROM users`,
      titulo, texto
    );
  } else {
    await prisma.$executeRawUnsafe(
      `INSERT INTO agro_notificacoes (usuario_id, titulo, texto, lida)
       SELECT x.uid, $1::text, $2::text, false FROM (${d.sql}) AS x(uid)`,
      titulo, texto, ...d.params
    );
  }
}

const perfil = (role: string): Dest => ({ sql: `SELECT id::text FROM users WHERE role::text = '${role}'`, params: [] });

// Variação em % do novo preço contra o preço anterior do mesmo produto e local
async function variacaoPct(
  tabela: string, col1: string, v1: string, col2: string, v2: string, id: string, novo: number
): Promise<number | null> {
  const r: any[] = await prisma.$queryRawUnsafe(
    `SELECT preco::text AS p FROM ${tabela}
      WHERE lower(${col1}) = lower($1::text) AND lower(${col2}) = lower($2::text) AND id <> $3::uuid
      ORDER BY criado_em DESC LIMIT 1`,
    v1, v2, id
  );
  const antes = Number(r[0]?.p);
  if (!antes) return null;
  return ((novo - antes) / antes) * 100;
}

const sinal = (v: number) => `${v > 0 ? '+' : ''}${Math.round(v)}%`;

const gatilhos: Record<string, (row: any) => Promise<void>> = {
  // Alerta de preço do agricultor: valor atingido ou mudança grande
  precos: async (row) => {
    const preco = Number(row.preco);
    await enviar(
      `💰 ${row.produto}: ${preco} em ${row.cidade}`,
      'O preço chegou ao valor que você definiu.',
      {
        sql: `SELECT usuario_id FROM agro_alertas_preco
               WHERE ativo = true AND lower(produto) = lower($3::text) AND preco_desejado <= $4::numeric`,
        params: [row.produto, preco],
      }
    );
    const v = await variacaoPct('agro_precos', 'produto', row.produto, 'cidade', row.cidade, row.id, preco);
    if (v !== null && Math.abs(v) >= 10) {
      await enviar(
        `📈 ${row.produto} mudou ${sinal(v)} em ${row.cidade}`,
        `Novo preço: ${preco}`,
        { sql: `SELECT usuario_id FROM agro_alertas_preco WHERE ativo = true AND lower(produto) = lower($3::text)`, params: [row.produto] }
      );
    }
  },
  // Clima e praga: avisa os agricultores
  alertas_regiao: async (row) => {
    const praga = row.tipo === 'praga';
    await enviar(
      `${praga ? '🐛 Alerta de praga' : '🌦️ Alerta de clima'}: ${row.titulo}`,
      [row.regiao, row.texto, row.orientacao].filter(Boolean).join('. '),
      perfil('AGRICULTOR')
    );
  },
  // Mar: avisa os pescadores quando é perigo ou atenção
  alertas_mar: async (row) => {
    if (row.nivel === 'seguro') return;
    await enviar(
      `${row.nivel === 'perigo' ? '🔴 PERIGO no mar' : '🟠 Atenção no mar'}: ${row.regiao}`,
      row.texto,
      perfil('PESCADOR')
    );
  },
  // Preço do peixe: avisa os pescadores quando muda 10% ou mais
  precos_peixe: async (row) => {
    const v = await variacaoPct('agro_precos_peixe', 'especie', row.especie, 'regiao', row.regiao, row.id, Number(row.preco));
    if (v !== null && Math.abs(v) >= 10) {
      await enviar(`🐟 ${row.especie} mudou ${sinal(v)} em ${row.regiao}`, `Novo preço: ${Number(row.preco)}`, perfil('PESCADOR'));
    }
  },
  // Notícias: avisa todos
  noticias: async (row) => enviar(`📰 ${row.titulo}`, row.texto, 'todos'),
};

const base = makeRouter(cfgs);

// Depois de criar um item com sucesso (201), dispara o aviso sem atrasar nem quebrar a resposta
const router = Router();
router.use((req: Request, res: Response, next: NextFunction) => {
  if (req.method === 'POST') {
    const rota = req.path.split('/')[1];
    const original = res.json.bind(res);
    res.json = (corpo: any) => {
      const r = original(corpo);
      if (res.statusCode === 201 && gatilhos[rota]) {
        gatilhos[rota](corpo).catch((e) => console.error('conteudo aviso:', e?.message || e));
      }
      return r;
    };
  }
  next();
});
router.use(base);

export default router;
