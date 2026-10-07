// backend/src/routes/agricultorRoutes.ts  (funcionalidades 1 a 20)
// Usa o motor comum (lib/agroEngine), como os outros módulos.
import { Router, Request, Response } from 'express';
import { makeRouter, auth, Cfg, COMUNS, CAMPOS_TRANSPORTE } from '../lib/agroEngine';
import { FUNCAO_NOTIFICAR, gatilho } from '../lib/avisosSql';
import * as prismaModule from '../lib/prisma';

const prisma: any = (prismaModule as any).prisma ?? (prismaModule as any).default;

const cfgs: Record<string, Cfg> = {
  precos: COMUNS.precos,
  alertas_preco: {
    t: 'agro_alertas_preco', leitura: 'dono', escrita: 'dono', dono: 'usuario_id',
    campos: { produto: 'text', preco_desejado: 'numeric', ativo: 'bool' },
    padrao: { ativo: true },
  },
  alertas_regiao: COMUNS.alertas_regiao,
  // 7 Marcar encontro: a outra pessoa (se tiver conta, pelo celular) também vê e recebe aviso
  encontros: {
    t: 'agro_encontros', leitura: 'dono', escrita: 'dono', dono: 'criado_por', tambem: 'outro_id',
    campos: {
      outro_nome: 'text', outro_telefone: 'text', outro_id: 'text',
      data_hora: 'text', local: 'text', estado: 'text',
    },
    padrao: { estado: 'marcado' },
    resolver: [{ de: 'outro_telefone', para: 'outro_id' }],
  },
  // Pedidos de transporte: os transportadores veem os pedidos em aberto
  transportes: {
    t: 'agro_transportes', leitura: 'dono', escrita: 'dono', dono: 'usuario_id', tambem: 'transportador_id',
    campos: CAMPOS_TRANSPORTE,
    padrao: { estado: 'aberto', pagamento: 'pendente' },
  },
  avaliacoes_compradores: {
    t: 'agro_avaliacoes_compradores', leitura: 'dono', escrita: 'dono', dono: 'autor_id',
    campos: { comprador_nome: 'text', estrelas: 'int', comentario: 'text' },
  },
  vendas: COMUNS.vendas,
  contactos: COMUNS.contactos,
  forum_posts: COMUNS.forum_posts,
  forum_respostas: COMUNS.forum_respostas,
  videos: {
    t: 'agro_videos', leitura: 'todos', escrita: 'admin',
    campos: { titulo: 'text', categoria: 'text', idioma: 'text', url: 'text' },
  },
  colheitas: COMUNS.colheitas,
  noticias: {
    t: 'agro_noticias', leitura: 'todos', escrita: 'admin',
    campos: { titulo: 'text', texto: 'text' },
  },
  compradores: {
    t: 'agro_compradores', leitura: 'todos', escrita: 'dono', dono: 'usuario_id',
    campos: { nome: 'text', telefone: 'text', produtos_procurados: 'text', cidade: 'text', lat: 'numeric', lng: 'numeric' },
  },
};

// ---------- avisos automáticos dos encontros ----------
const TRIGGERS = [
  FUNCAO_NOTIFICAR,
  ...gatilho('agro_encontros', 'encontro_novo', 'INSERT', `
    PERFORM agro_notificar(NEW.outro_id, '📅 Novo encontro marcado',
      coalesce(NEW.data_hora, '') || ' em ' || coalesce(NEW.local, ''));`),
  ...gatilho('agro_encontros', 'encontro_mudou', 'UPDATE', `
    IF NEW.estado IS DISTINCT FROM OLD.estado THEN
      PERFORM agro_notificar(NEW.criado_por, '📅 Encontro: ' || coalesce(NEW.estado, ''),
        coalesce(NEW.data_hora, '') || ' em ' || coalesce(NEW.local, ''));
      PERFORM agro_notificar(NEW.outro_id, '📅 Encontro: ' || coalesce(NEW.estado, ''),
        coalesce(NEW.data_hora, '') || ' em ' || coalesce(NEW.local, ''));
    END IF;`),
];

const router = Router();

// Alertas de preço que já foram atingidos pelos preços do mercado
router.get('/atingidos', auth, async (req: Request, res: Response) => {
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
  } catch (e: any) {
    if (/relation "[^"]+" does not exist/i.test(String(e?.message || e))) return res.json([]);
    console.error(e);
    res.status(500).json({ erro: 'Erro ao verificar alertas' });
  }
});

router.use(makeRouter(cfgs, { depois: TRIGGERS }));

export default router;
