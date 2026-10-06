// backend/src/routes/transportadorRoutes.ts  (Área do Transportador)
// Entregas (aceitar, recusar, iniciar, recolher, entregar, comprovativo, concluir), ganhos, retiradas,
// veículos, manutenção, serviços, alertas de estrada e avisos automáticos de novas entregas.
import { Router, Request, Response } from 'express';
import { makeRouter, Cfg, Resumo, Tipo, CAMPOS_TRANSPORTE } from '../lib/agroEngine';
import * as prismaModule from '../lib/prisma';

const prisma: any = (prismaModule as any).prisma ?? (prismaModule as any).default;

const TR = ['TRANSPORTADOR']; // o ADMIN sempre entra

// Colunas extras da tabela de pedidos de transporte (a mesma usada por Agricultor e Comprador)
const CAMPOS_ENTREGA: Record<string, Tipo> = { ...CAMPOS_TRANSPORTE, concluido_em: 'text', distancia_km: 'numeric' };

const cfgs: Record<string, Cfg> = {
  // Só registra as colunas; as entregas são lidas e alteradas pelos resumos e pelas ações abaixo
  corridas: { t: 'agro_transportes', leitura: 'dono', escrita: 'admin', dono: 'usuario_id', acesso: TR, campos: CAMPOS_ENTREGA },
  // Comprovativo de entrega (foto e nota)
  comprovativos: {
    t: 'agro_comprovativos', leitura: 'dono', escrita: 'dono', dono: 'usuario_id', acesso: TR,
    campos: { transporte_id: 'text', nota: 'text', foto_url: 'text' },
  },
  // Entregas que o transportador recusou (não aparecem mais para ele)
  recusas: {
    t: 'agro_recusas', leitura: 'dono', escrita: 'dono', dono: 'transportador_id', acesso: TR,
    campos: { transporte_id: 'text' },
  },
  // Pedidos de retirada do saldo (só o administrador muda o estado)
  retiradas: {
    t: 'agro_retiradas', leitura: 'dono', escrita: 'dono', dono: 'usuario_id', nome: true, acesso: TR,
    campos: { valor: 'numeric', metodo: 'text', estado: 'text', resposta: 'text' },
    padrao: { estado: 'pedida' },
    restritos: { estado: ['ADMIN'], resposta: ['ADMIN'] },
    leituraTodos: ['ADMIN'], editaPapeis: ['ADMIN'],
  },
  veiculos: {
    t: 'agro_veiculos', leitura: 'dono', escrita: 'dono', dono: 'usuario_id', acesso: TR,
    campos: { tipo_transportador: 'text', tipo_veiculo: 'text', matricula: 'text', capacidade: 'text', disponibilidade: 'text' },
    padrao: { disponibilidade: 'disponível' },
  },
  dados_pagamento: {
    t: 'agro_dados_pagamento', leitura: 'dono', escrita: 'dono', dono: 'usuario_id', acesso: TR,
    campos: { metodo: 'text', titular: 'text', conta: 'text' },
  },
  manutencao: {
    t: 'agro_manutencao', leitura: 'dono', escrita: 'dono', dono: 'usuario_id', acesso: TR,
    campos: { veiculo: 'text', servico: 'text', data: 'text', km: 'text', custo: 'numeric', nota: 'text' },
  },
  // Oficinas, postos e estacionamentos: os transportadores cadastram, todos leem
  servicos_veiculo: {
    t: 'agro_servicos_veiculo', leitura: 'todos', escrita: 'papeis', papeisEscrita: TR, dono: 'usuario_id', nome: true,
    campos: { tipo: 'text', nome: 'text', local: 'text', regiao: 'text', telefone: 'text', lat: 'numeric', lng: 'numeric' },
  },
  // Alertas e condições da estrada: qualquer pessoa vê, quem reporta pode marcar como resolvido
  alertas_estrada: {
    t: 'agro_alertas_estrada', leitura: 'todos', escrita: 'dono', dono: 'usuario_id', nome: true,
    campos: { regiao: 'text', tipo: 'text', texto: 'text', ativo: 'bool' },
    padrao: { ativo: true },
  },
  // Avaliação do transportador feita por quem usou o serviço (sem restrição de perfil)
  avaliacoes_transportador: {
    t: 'agro_avaliacoes_transportador', leitura: 'dono', escrita: 'dono', dono: 'autor_id', tambem: 'transportador_id',
    campos: { transportador_telefone: 'text', transportador_id: 'text', estrelas: 'int', comentario: 'text' },
    resolver: [{ de: 'transportador_telefone', para: 'transportador_id' }],
  },
};

// ---------- consultas prontas ----------
const COLUNAS = `t.id::text AS id, t.produto, t.quantidade, t.origem, t.destino, t.horario,
  coalesce(t.valor::text, '') AS valor, coalesce(t.distancia_km::text, '') AS distancia_km,
  t.estado, coalesce(t.pagamento, 'pendente') AS pagamento, t.usuario_id,
  u.name AS solicitante, u.phone AS telefone, u.role::text AS perfil, coalesce(t.concluido_em, '') AS concluido_em`;
const DE = `FROM agro_transportes t LEFT JOIN users u ON u.id::text = t.usuario_id`;

const resumos: Record<string, Resumo> = {
  // Cartões da tela inicial
  inicio: {
    papeis: TR,
    sql: `SELECT 'Entregas disponíveis' AS rotulo, count(*)::text AS valor
            FROM agro_transportes t
           WHERE t.estado = 'aberto'
             AND NOT EXISTS (SELECT 1 FROM agro_recusas r WHERE r.transporte_id = t.id::text AND r.transportador_id = $1)
          UNION ALL SELECT 'Em andamento', count(*)::text FROM agro_transportes
           WHERE transportador_id = $1 AND estado IN ('iniciada', 'recolhida', 'entregue')
          UNION ALL SELECT 'Próximas entregas', count(*)::text FROM agro_transportes
           WHERE transportador_id = $1 AND estado = 'aceita'
          UNION ALL SELECT 'Ganhos do dia', coalesce(sum(valor), 0)::text FROM agro_transportes
           WHERE transportador_id = $1 AND estado = 'concluida' AND pagamento = 'recebido'
             AND concluido_em::timestamptz >= date_trunc('day', now())
          UNION ALL SELECT 'Ganhos da semana', coalesce(sum(valor), 0)::text FROM agro_transportes
           WHERE transportador_id = $1 AND estado = 'concluida' AND pagamento = 'recebido'
             AND concluido_em::timestamptz >= date_trunc('week', now())
          UNION ALL SELECT 'Avaliação', coalesce(round(avg(estrelas)::numeric, 1)::text, '-')
            FROM agro_avaliacoes_transportador WHERE transportador_id = $1
          UNION ALL SELECT 'Alertas de estrada', count(*)::text FROM agro_alertas_estrada WHERE ativo = true`,
  },
  disponiveis: {
    papeis: TR,
    sql: `SELECT ${COLUNAS} ${DE}
           WHERE t.estado = 'aberto'
             AND NOT EXISTS (SELECT 1 FROM agro_recusas r WHERE r.transporte_id = t.id::text AND r.transportador_id = $1)
           ORDER BY t.criado_em DESC LIMIT 50`,
  },
  minhas_ativas: {
    papeis: TR,
    sql: `SELECT ${COLUNAS} ${DE}
           WHERE t.transportador_id = $1 AND t.estado IN ('aceita', 'iniciada', 'recolhida', 'entregue')
           ORDER BY t.criado_em DESC LIMIT 50`,
  },
  historico_entregas: {
    papeis: TR,
    sql: `SELECT ${COLUNAS} ${DE}
           WHERE t.transportador_id = $1 AND t.estado = 'concluida'
           ORDER BY t.concluido_em DESC LIMIT 100`,
  },
  pagas: {
    papeis: TR,
    sql: `SELECT ${COLUNAS} ${DE}
           WHERE t.transportador_id = $1 AND t.estado = 'concluida' AND t.pagamento = 'recebido'
           ORDER BY t.concluido_em DESC LIMIT 100`,
  },
  pendentes: {
    papeis: TR,
    sql: `SELECT ${COLUNAS} ${DE}
           WHERE t.transportador_id = $1 AND t.estado = 'concluida' AND coalesce(t.pagamento, '') <> 'recebido'
           ORDER BY t.concluido_em DESC LIMIT 100`,
  },
  // Ganhos, comissão e saldo. A comissão usa a percentagem das configurações da plataforma.
  ganhos: {
    papeis: TR,
    sql: `WITH g AS (
            SELECT valor, concluido_em::timestamptz AS quando FROM agro_transportes
             WHERE transportador_id = $1 AND estado = 'concluida' AND pagamento = 'recebido' AND valor IS NOT NULL
          ),
          c AS (SELECT coalesce((SELECT "commissionPercentage" FROM platform_settings LIMIT 1), 0) AS pct),
          r AS (SELECT coalesce(sum(valor), 0) AS v FROM agro_retiradas WHERE usuario_id = $1 AND estado <> 'recusada')
          SELECT 'Ganhos de hoje' AS rotulo, coalesce(sum(valor), 0)::text AS valor FROM g WHERE quando >= date_trunc('day', now())
          UNION ALL SELECT 'Ganhos da semana', coalesce(sum(valor), 0)::text FROM g WHERE quando >= date_trunc('week', now())
          UNION ALL SELECT 'Ganhos do mês', coalesce(sum(valor), 0)::text FROM g WHERE quando >= date_trunc('month', now())
          UNION ALL SELECT 'Total recebido', coalesce(sum(valor), 0)::text FROM g
          UNION ALL SELECT 'Pagamentos pendentes', coalesce(sum(valor), 0)::text FROM agro_transportes
           WHERE transportador_id = $1 AND estado = 'concluida' AND coalesce(pagamento, '') <> 'recebido' AND valor IS NOT NULL
          UNION ALL SELECT 'Comissão da plataforma (%)', pct::text FROM c
          UNION ALL SELECT 'Comissão sobre o total recebido',
                 round((coalesce((SELECT sum(valor) FROM g), 0) * (SELECT pct FROM c) / 100)::numeric, 0)::text
          UNION ALL SELECT 'Retiradas pedidas', v::text FROM r
          UNION ALL SELECT 'Saldo disponível',
                 round((coalesce((SELECT sum(valor) FROM g), 0) * (1 - (SELECT pct FROM c) / 100) - (SELECT v FROM r))::numeric, 0)::text`,
  },
};

// ---------- avisos automáticos (feitos pelo banco, sem depender de cada tela) ----------
// Os blocos com EXCEPTION garantem que um erro no aviso nunca impede o pedido de transporte.
const TRIGGERS = [
  `CREATE OR REPLACE FUNCTION agro_avisar_nova_entrega() RETURNS trigger AS $$
   BEGIN
     BEGIN
       INSERT INTO notifications (id, "userId", type, title, message, "isRead", "createdAt")
       SELECT gen_random_uuid()::text, u.id, 'SISTEMA'::"NotificationType",
              '🚚 Nova entrega disponível',
              coalesce(NEW.produto, 'Carga') || ': ' || coalesce(NEW.origem, '?') || ' → ' || coalesce(NEW.destino, '?'),
              false, now()
         FROM users u WHERE u.role::text = 'TRANSPORTADOR';
     EXCEPTION WHEN OTHERS THEN
       NULL;
     END;
     RETURN NEW;
   END;
   $$ LANGUAGE plpgsql`,
  `DROP TRIGGER IF EXISTS agro_trg_nova_entrega ON agro_transportes`,
  `CREATE TRIGGER agro_trg_nova_entrega AFTER INSERT ON agro_transportes
     FOR EACH ROW EXECUTE FUNCTION agro_avisar_nova_entrega()`,
  `CREATE OR REPLACE FUNCTION agro_avisar_mudanca_entrega() RETURNS trigger AS $$
   DECLARE msg text;
   BEGIN
     BEGIN
       IF NEW.estado IS DISTINCT FROM OLD.estado THEN
         msg := CASE NEW.estado
           WHEN 'aceita' THEN 'Um transportador aceitou a sua entrega.'
           WHEN 'iniciada' THEN 'O transportador iniciou a entrega.'
           WHEN 'recolhida' THEN 'A carga foi recolhida.'
           WHEN 'entregue' THEN 'A carga foi entregue.'
           WHEN 'concluida' THEN 'A entrega foi concluída.'
           ELSE NULL END;
         IF msg IS NOT NULL AND NEW.usuario_id IS NOT NULL THEN
           INSERT INTO notifications (id, "userId", type, title, message, "isRead", "createdAt")
           VALUES (gen_random_uuid()::text, NEW.usuario_id, 'SISTEMA'::"NotificationType",
                   '🚚 ' || coalesce(NEW.produto, 'Entrega'), msg, false, now());
         END IF;
         IF NEW.estado = 'cancelada' AND NEW.transportador_id IS NOT NULL THEN
           INSERT INTO notifications (id, "userId", type, title, message, "isRead", "createdAt")
           VALUES (gen_random_uuid()::text, NEW.transportador_id, 'SISTEMA'::"NotificationType",
                   '🚚 ' || coalesce(NEW.produto, 'Entrega'), 'O cliente cancelou esta entrega.', false, now());
         END IF;
       END IF;
       IF NEW.pagamento IS DISTINCT FROM OLD.pagamento AND NEW.pagamento = 'pago' AND NEW.transportador_id IS NOT NULL THEN
         INSERT INTO notifications (id, "userId", type, title, message, "isRead", "createdAt")
         VALUES (gen_random_uuid()::text, NEW.transportador_id, 'SISTEMA'::"NotificationType",
                 '💰 Pagamento', 'O cliente marcou o pagamento da entrega como pago.', false, now());
       END IF;
     EXCEPTION WHEN OTHERS THEN
       NULL;
     END;
     RETURN NEW;
   END;
   $$ LANGUAGE plpgsql`,
  `DROP TRIGGER IF EXISTS agro_trg_mudanca_entrega ON agro_transportes`,
  `CREATE TRIGGER agro_trg_mudanca_entrega AFTER UPDATE ON agro_transportes
     FOR EACH ROW EXECUTE FUNCTION agro_avisar_mudanca_entrega()`,
];

// ---------- ações sobre uma entrega ----------
// Cada passo só vale na ordem certa e só para o transportador que aceitou a entrega.
const TRANSICOES: Record<string, { de: string[]; para: string; fim?: boolean; devolver?: boolean }> = {
  iniciar: { de: ['aceita'], para: 'iniciada' },
  recolher: { de: ['iniciada'], para: 'recolhida' },
  entregar: { de: ['recolhida'], para: 'entregue' },
  concluir: { de: ['entregue'], para: 'concluida', fim: true },
  cancelar: { de: ['aceita', 'iniciada'], para: 'aberto', devolver: true },
};

const numero = (v: any): number | null => {
  const n = Number(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
};

const router = Router();
router.use(makeRouter(cfgs, { resumos, depois: TRIGGERS }));

router.post('/entrega/:id/:acao', async (req: Request, res: Response) => {
  const { id: uid, role } = (req as any).agro;
  if (role !== 'TRANSPORTADOR' && role !== 'ADMIN') {
    return res.status(403).json({ erro: 'Só transportadores podem fazer isso.' });
  }
  const { id, acao } = req.params;
  try {
    if (acao === 'recusar') {
      await prisma.$executeRawUnsafe(
        'INSERT INTO agro_recusas (transporte_id, transportador_id) VALUES ($1::text, $2::text)', id, uid
      );
      return res.json({ ok: true });
    }

    if (acao === 'aceitar') {
      const r: any[] = await prisma.$queryRawUnsafe(
        `UPDATE agro_transportes SET estado = 'aceita', transportador_id = $2::text
          WHERE id = $1::uuid AND estado = 'aberto' RETURNING id`,
        id, uid
      );
      if (!r.length) return res.status(409).json({ erro: 'Esta entrega já foi aceita por outro transportador.' });
      return res.json({ ok: true });
    }

    if (acao === 'valor' || acao === 'distancia') {
      const n = numero(req.body?.valor);
      if (n === null) return res.status(400).json({ erro: 'Informe um número maior que zero.' });
      const coluna = acao === 'valor' ? 'valor' : 'distancia_km';
      const r: any[] = await prisma.$queryRawUnsafe(
        `UPDATE agro_transportes SET ${coluna} = $3::numeric
          WHERE id = $1::uuid AND transportador_id = $2::text
            AND estado IN ('aceita', 'iniciada', 'recolhida', 'entregue') RETURNING id`,
        id, uid, n
      );
      if (!r.length) return res.status(409).json({ erro: 'Só dá para alterar numa entrega sua que ainda está em andamento.' });
      return res.json({ ok: true });
    }

    if (acao === 'receber') {
      const r: any[] = await prisma.$queryRawUnsafe(
        `UPDATE agro_transportes SET pagamento = 'recebido'
          WHERE id = $1::uuid AND transportador_id = $2::text AND estado = 'concluida'
            AND coalesce(pagamento, '') <> 'recebido' RETURNING id`,
        id, uid
      );
      if (!r.length) return res.status(409).json({ erro: 'Só dá para marcar o pagamento de uma entrega concluída.' });
      return res.json({ ok: true });
    }

    const t = TRANSICOES[acao];
    if (!t) return res.status(404).json({ erro: 'Ação desconhecida.' });

    if (acao === 'concluir') {
      const c: any[] = await prisma.$queryRawUnsafe(
        'SELECT 1 FROM agro_comprovativos WHERE transporte_id = $1::text LIMIT 1', id
      );
      if (!c.length) return res.status(409).json({ erro: 'Envie o comprovativo (foto ou nota) antes de concluir.' });
    }

    const sets = ['estado = $3::text'];
    if (t.fim) sets.push('concluido_em = now()::text');
    if (t.devolver) sets.push('transportador_id = NULL');
    const r: any[] = await prisma.$queryRawUnsafe(
      `UPDATE agro_transportes SET ${sets.join(', ')}
        WHERE id = $1::uuid AND transportador_id = $2::text AND estado = ANY($4::text[]) RETURNING id`,
      id, uid, t.para, t.de
    );
    if (!r.length) return res.status(409).json({ erro: 'Este passo não está disponível agora. Atualize a lista.' });
    return res.json({ ok: true });
  } catch (e: any) {
    console.error('transportador entrega:', String(e?.message || e));
    return res.status(400).json({ erro: 'Não foi possível atualizar a entrega.' });
  }
});

export default router;
