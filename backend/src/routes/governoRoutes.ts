// backend/src/routes/governoRoutes.ts  (funcionalidades 63 a 70 e tarefas do administrador)
import { Router, Request, Response } from 'express';
import { makeRouter, Cfg, Resumo, COMUNS } from '../lib/agroEngine';
import { FUNCAO_NOTIFICAR, gatilho } from '../lib/avisosSql';
import { registerUser, AuthError } from '../services/authService';
import * as prismaModule from '../lib/prisma';

const prisma: any = (prismaModule as any).prisma ?? (prismaModule as any).default;

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
  // Pedidos de conta feitos por agentes (o admin cria a conta)
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

// ---------- avisos automáticos ----------
const TRIGGERS = [
  FUNCAO_NOTIFICAR,
  // 68 Mensagem oficial: chega a quem está na região (ou sem região cadastrada). Região "Todas" vai para todos.
  ...gatilho('agro_avisos_oficiais', 'aviso_oficial', 'INSERT', `
    PERFORM agro_notificar(u.id, '📣 ' || coalesce(NEW.titulo, 'Aviso oficial'), coalesce(NEW.texto, ''))
      FROM users u
     WHERE coalesce(NEW.regiao, '') = ''
        OR lower(NEW.regiao) LIKE 'tod%'
        OR coalesce(u.location, '') = ''
        OR u.location ILIKE '%' || NEW.regiao || '%';`),
  // Retirada do transportador: avisa os administradores e depois o transportador
  ...gatilho('agro_retiradas', 'retirada_nova', 'INSERT', `
    PERFORM agro_notificar(u.id, '🏧 Novo pedido de retirada',
      coalesce(NEW.usuario_nome, 'Transportador') || ': ' || coalesce(NEW.valor::text, '?'))
      FROM users u WHERE u.role::text = 'ADMIN';`),
  ...gatilho('agro_retiradas', 'retirada_mudou', 'UPDATE', `
    IF NEW.estado IS DISTINCT FROM OLD.estado THEN
      PERFORM agro_notificar(NEW.usuario_id, '🏧 Pedido de retirada',
        CASE NEW.estado
          WHEN 'paga' THEN 'A sua retirada foi paga.'
          WHEN 'recusada' THEN 'A sua retirada foi recusada.'
          ELSE 'Estado: ' || coalesce(NEW.estado, '')
        END);
    END IF;`),
];

const router = Router();
router.use(makeRouter(cfgs, { resumos, depois: TRIGGERS }));

// 51 Criar a conta de verdade a partir do pedido do agente (só o administrador)
router.post('/registos/:id/criar-conta', async (req: Request, res: Response) => {
  const { role } = (req as any).agro;
  if (role !== 'ADMIN') return res.status(403).json({ erro: 'Só o administrador pode criar contas.' });
  try {
    const r: any[] = await prisma.$queryRawUnsafe(
      `SELECT id::text AS id, nome, telefone, regiao, autorizado, estado
         FROM agro_registos_agente WHERE id = $1::uuid`,
      req.params.id
    );
    if (!r.length) return res.status(404).json({ erro: 'Pedido não encontrado.' });
    const reg = r[0];
    if (!reg.autorizado) return res.status(400).json({ erro: 'O agricultor não autorizou o registo.' });
    if (reg.estado === 'conta_criada') return res.status(409).json({ erro: 'A conta já foi criada.' });

    const senha = String(Math.floor(100000 + Math.random() * 900000));
    await registerUser({
      name: reg.nome,
      phone: reg.telefone,
      password: senha,
      role: 'AGRICULTOR' as any,
      location: reg.regiao || undefined,
    });
    await prisma.$executeRawUnsafe(
      `UPDATE agro_registos_agente SET estado = 'conta_criada' WHERE id = $1::uuid`,
      req.params.id
    );
    return res.json({
      ok: true,
      mensagem:
        `Conta criada.\nCelular: ${reg.telefone}\nSenha temporária: ${senha}\n` +
        'Entregue ao agricultor e peça para ele trocar a senha.',
    });
  } catch (e: any) {
    if (e instanceof AuthError) return res.status(e.status).json({ erro: e.message });
    console.error('governo criar-conta:', String(e?.message || e));
    return res.status(400).json({ erro: 'Não foi possível criar a conta.' });
  }
});

export default router;
