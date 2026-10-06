// backend/src/routes/comercianteRoutes.ts  (funcionalidades 44 a 50)
import { makeRouter, Cfg, Resumo, COMUNS } from '../lib/agroEngine';
import { FUNCAO_NOTIFICAR, gatilho } from '../lib/avisosSql';

const cfgs: Record<string, Cfg> = {
  // 44 e 47 Banca: frutas/legumes e venda a retalho
  banca: {
    t: 'agro_banca', leitura: 'todos', escrita: 'dono', dono: 'usuario_id', nome: true,
    campos: { tipo: 'text', produto: 'text', preco: 'numeric', quantidade: 'text', local_banca: 'text', telefone: 'text' },
  },
  precos: COMUNS.precos, // 45 Preço em outros mercados
  // 48 Pedir empréstimo (só o administrador muda o estado e responde)
  emprestimos: {
    t: 'agro_emprestimos', leitura: 'dono', escrita: 'dono', dono: 'usuario_id', nome: true,
    campos: { valor: 'numeric', finalidade: 'text', estado: 'text', resposta: 'text' },
    padrao: { estado: 'em análise' },
    restritos: { estado: ['ADMIN'], resposta: ['ADMIN'] },
    leituraTodos: ['ADMIN'], editaPapeis: ['ADMIN'],
  },
  // 49 Grupo de apoio (por enquanto só perfil COMERCIANTE; falta o campo género no cadastro)
  grupo_apoio: {
    t: 'agro_grupo_apoio', leitura: 'todos', escrita: 'dono', dono: 'usuario_id', nome: true,
    acesso: ['COMERCIANTE'],
    campos: { texto: 'text' },
  },
  // 50 Formação de negócios
  cursos: {
    t: 'agro_cursos', leitura: 'todos', escrita: 'admin',
    campos: { titulo: 'text', publico: 'text', descricao: 'text', url: 'text' },
  },
};

const resumos: Record<string, Resumo> = {
  // 46 Comprar atacado: anúncios com 100 ou mais de quantidade
  atacado: {
    sql: `SELECT p.title AS rotulo,
                 'Quantidade ' || p.quantity::text || ' • ' || p.price::text || ' • ' || coalesce(p.location,'-') AS valor,
                 u.phone AS telefone
            FROM products p JOIN users u ON u.id = p."ownerId"
           WHERE p.quantity >= 100 ORDER BY p.quantity DESC LIMIT 100`,
  },
};

// ---------- avisos automáticos do empréstimo ----------
const TRIGGERS = [
  FUNCAO_NOTIFICAR,
  // Pedido novo: avisa os administradores
  ...gatilho('agro_emprestimos', 'emprestimo_novo', 'INSERT', `
    PERFORM agro_notificar(u.id, '🏦 Novo pedido de empréstimo',
      coalesce(NEW.usuario_nome, 'Comerciante') || ': ' || coalesce(NEW.valor::text, '?'))
      FROM users u WHERE u.role::text = 'ADMIN';`),
  // Resposta ou estado mudou: avisa quem pediu
  ...gatilho('agro_emprestimos', 'emprestimo_mudou', 'UPDATE', `
    IF NEW.estado IS DISTINCT FROM OLD.estado OR NEW.resposta IS DISTINCT FROM OLD.resposta THEN
      PERFORM agro_notificar(NEW.usuario_id, '🏦 Pedido de empréstimo',
        'Estado: ' || coalesce(NEW.estado, '') || coalesce('. ' || NEW.resposta, ''));
    END IF;`),
];

export default makeRouter(cfgs, { resumos, depois: TRIGGERS });
