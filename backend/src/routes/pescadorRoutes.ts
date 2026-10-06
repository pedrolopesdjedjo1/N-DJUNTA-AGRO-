// backend/src/routes/pescadorRoutes.ts  (funcionalidades 21 a 28)
import { makeRouter, Cfg } from '../lib/agroEngine';
import { FUNCAO_NOTIFICAR, gatilho } from '../lib/avisosSql';

const cfgs: Record<string, Cfg> = {
  // 21 Publicar peixe fresco
  peixes: {
    t: 'agro_peixes', leitura: 'todos', escrita: 'dono', dono: 'usuario_id', nome: true,
    campos: { especie: 'text', peso: 'text', preco: 'numeric', local: 'text', hora_captura: 'text', telefone: 'text' },
  },
  // 22 Alerta de tempo no mar (o administrador publica)
  alertas_mar: {
    t: 'agro_alertas_mar', leitura: 'todos', escrita: 'admin',
    campos: { regiao: 'text', nivel: 'text', texto: 'text' },
  },
  // 23 Preço do peixe por região (o administrador publica)
  precos_peixe: {
    t: 'agro_precos_peixe', leitura: 'todos', escrita: 'admin',
    campos: { especie: 'text', regiao: 'text', preco: 'numeric', moeda: 'text' },
    padrao: { moeda: 'XOF' },
  },
  // 24 Entrega rápida (comprador e pescador combinam hora e local)
  entregas: {
    t: 'agro_entregas', leitura: 'dono', escrita: 'dono', dono: 'usuario_id', tambem: 'outro_id',
    campos: { peixe: 'text', outro_telefone: 'text', outro_id: 'text', hora: 'text', local: 'text', estado: 'text' },
    padrao: { estado: 'combinada' },
    resolver: [{ de: 'outro_telefone', para: 'outro_id' }],
  },
  // 25 Gelo / guarda-frio
  pedidos_gelo: {
    t: 'agro_pedidos_gelo', leitura: 'dono', escrita: 'dono', dono: 'usuario_id',
    campos: { quantidade: 'text', local: 'text', estado: 'text' },
    padrao: { estado: 'aberto' },
  },
  servicos_gelo: {
    t: 'agro_servicos_gelo', leitura: 'todos', escrita: 'admin',
    campos: { nome: 'text', local: 'text', telefone: 'text', preco: 'text' },
  },
  // 26 Compradores de peixe seco
  compradores_seco: {
    t: 'agro_compradores_peixe', leitura: 'todos', escrita: 'dono', dono: 'usuario_id',
    campos: { nome: 'text', telefone: 'text', interesse: 'text', cidade: 'text' },
  },
  // 27 Registar captura
  capturas: {
    t: 'agro_capturas', leitura: 'dono', escrita: 'dono', dono: 'usuario_id',
    campos: { especie: 'text', quantidade: 'text', local: 'text', data: 'text' },
  },
  // 28 Zonas protegidas (o administrador publica)
  zonas: {
    t: 'agro_zonas_protegidas', leitura: 'todos', escrita: 'admin',
    campos: { nome: 'text', regiao: 'text', regra: 'text', lat: 'numeric', lng: 'numeric' },
  },
};

// ---------- avisos automáticos das entregas rápidas ----------
const TRIGGERS = [
  FUNCAO_NOTIFICAR,
  // Entrega combinada: avisa a outra pessoa
  ...gatilho('agro_entregas', 'entrega_peixe_nova', 'INSERT', `
    PERFORM agro_notificar(NEW.outro_id, '🛵 Nova entrega combinada',
      coalesce(NEW.peixe, 'Peixe') || ' às ' || coalesce(NEW.hora, '?') || ' em ' || coalesce(NEW.local, '?'));`),
  // Estado mudou: avisa as duas pessoas
  ...gatilho('agro_entregas', 'entrega_peixe_mudou', 'UPDATE', `
    IF NEW.estado IS DISTINCT FROM OLD.estado THEN
      PERFORM agro_notificar(NEW.outro_id, '🛵 ' || coalesce(NEW.peixe, 'Entrega'), 'Estado da entrega: ' || coalesce(NEW.estado, ''));
      PERFORM agro_notificar(NEW.usuario_id, '🛵 ' || coalesce(NEW.peixe, 'Entrega'), 'Estado da entrega: ' || coalesce(NEW.estado, ''));
    END IF;`),
];

export default makeRouter(cfgs, { depois: TRIGGERS });
