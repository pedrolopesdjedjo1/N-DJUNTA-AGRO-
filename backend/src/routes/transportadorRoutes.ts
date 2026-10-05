// backend/src/routes/transportadorRoutes.ts  (funcionalidades 57 a 62)
import { makeRouter, Cfg, Resumo } from '../lib/agroEngine';

const cfgs: Record<string, Cfg> = {
  // 57 a 60: pedidos de transporte feitos por Agricultor e Comprador (mesma tabela agro_transportes)
  corridas: {
    t: 'agro_transportes', leitura: 'todos', escrita: 'dono', dono: 'usuario_id',
    acesso: ['TRANSPORTADOR'], editaPapeis: ['TRANSPORTADOR'], meusCampo: 'transportador_id',
    campos: { estado: 'text', valor: 'numeric', pagamento: 'text', transportador_id: 'text' },
    // ao aceitar, o servidor grava quem aceitou
    aoEditar: (uid, body) => (body.estado === 'aceita' ? { transportador_id: uid } : {}),
  },
  // 61 Avaliar cliente
  avaliacoes_clientes: {
    t: 'agro_avaliacoes_clientes', leitura: 'dono', escrita: 'dono', dono: 'autor_id',
    acesso: ['TRANSPORTADOR'],
    campos: { cliente_nome: 'text', estrelas: 'int', comentario: 'text' },
  },
  // 62 Preço do combustível (o administrador publica)
  combustivel: {
    t: 'agro_combustivel', leitura: 'todos', escrita: 'admin',
    campos: { cidade: 'text', tipo: 'text', preco: 'numeric' },
  },
};

const resumos: Record<string, Resumo> = {
  // 60 Ganhos
  ganhos: {
    papeis: ['TRANSPORTADOR'],
    sql: `SELECT 'Corridas concluídas' AS rotulo, count(*)::text AS valor
            FROM agro_transportes WHERE transportador_id = $1 AND estado = 'concluida'
          UNION ALL
          SELECT 'Total recebido', coalesce(sum(valor),0)::text
            FROM agro_transportes WHERE transportador_id = $1 AND pagamento = 'recebido'
          UNION ALL
          SELECT 'Ainda por receber', coalesce(sum(valor),0)::text
            FROM agro_transportes WHERE transportador_id = $1 AND estado = 'concluida' AND coalesce(pagamento,'') <> 'recebido'`,
  },
};

export default makeRouter(cfgs, { resumos });
