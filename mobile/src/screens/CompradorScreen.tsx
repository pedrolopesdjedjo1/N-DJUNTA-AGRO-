// mobile/src/screens/CompradorScreen.tsx  (funcionalidades 29 a 43)
import React from 'react';
import ModuloAgro, { Secao, linkTela } from '../components/ModuloAgro';

const est = (n: any) => '★'.repeat(Number(n) || 0) + '☆'.repeat(5 - (Number(n) || 0));
const dataBr = (d: any) => (d ? new Date(d).toLocaleDateString() : '');

const G_PROCURAR = '🔎 PROCURAR';
const G_NEGOCIAR = '🤝 COMPRAR E NEGOCIAR';
const G_PAGAR = '💳 PAGAR E TRANSPORTAR';
const G_MERCADO = '📊 MERCADO';

const propostas: Secao = {
  id: 'propostas', icone: '📨', nome: 'Propostas', rota: 'propostas', dono: 'usuario_id', botaoNovo: '+ Enviar proposta',
  desc: 'Compare preço, quantidade e local. Ligue ou fale com o vendedor.',
  campos: [
    { k: 'preco', r: 'Seu preço', tipo: 'numero' }, { k: 'quantidade', r: 'Quantidade que tem' },
    { k: 'local', r: 'Seu local' }, { k: 'telefone', r: 'Seu celular' },
  ],
  tel: 'telefone', chat: { id: 'usuario_id', nome: 'usuario_nome' }, perfil: { id: 'usuario_id', nome: 'usuario_nome' },
  titulo: (i) => `${Number(i.preco)} • ${i.quantidade}`, linhas: (i) => [i.local, `De ${i.usuario_nome || 'Vendedor'}`],
};

const SECOES: Secao[] = [
  // ----- procurar -----
  linkTela(G_PROCURAR, 'busca', '🔎', 'Procurar e filtrar produtos', 'Por nome, região, preço e quantidade mínima.', 'BuscaAvancada'),
  linkTela(G_PROCURAR, 'produtos', '🧺', 'Produtos e perfil do vendedor', 'Veja os anúncios. Em cada um, toque em 👤 Vendedor para ver avaliações e produtos.', 'Products'),
  {
    id: 'desejos', grupo: G_PROCURAR, icone: '📝', nome: 'Lista de desejos', rota: 'desejos', dono: 'usuario_id',
    desc: 'Registe o que procura. Toque em Ver se apareceu para saber se já há anúncios iguais.', botaoNovo: '+ Novo desejo',
    campos: [
      { k: 'produto', r: 'Produto' }, { k: 'quantidade', r: 'Quantidade (opcional)', obrig: false },
      { k: 'preco_max', r: 'Preço máximo (opcional)', tipo: 'numero', obrig: false },
    ],
    verificar: { rota: 'resumo/correspondencias', rotulo: 'Ver se apareceu', vazio: 'Ainda não apareceu nenhum anúncio igual.' },
    titulo: (i) => i.produto, linhas: (i) => [i.quantidade || '', i.preco_max ? `Até ${Number(i.preco_max)}` : ''],
  },
  {
    id: 'alerta_colheita', grupo: G_PROCURAR, icone: '🌾', nome: 'Alerta de nova colheita', rota: 'alertas_colheita', dono: 'usuario_id',
    desc: 'Escolha produto e região. Toque em Ver novas ofertas para ver o que surgiu.', botaoNovo: '+ Novo alerta',
    campos: [{ k: 'produto', r: 'Produto' }, { k: 'regiao', r: 'Região (opcional)', obrig: false }],
    verificar: { rota: 'resumo/novas_ofertas', rotulo: 'Ver novas ofertas', vazio: 'Nada novo por enquanto.' },
    titulo: (i) => i.produto, linhas: (i) => [i.regiao || 'Todas as regiões'],
  },

  // ----- comprar e negociar -----
  {
    id: 'ofertas', grupo: G_NEGOCIAR, icone: '🤝', nome: 'Ofertas', rota: 'ofertas', dono: 'comprador_id',
    desc: 'Faça uma oferta pelo celular do vendedor. Ele aceita, recusa ou faz uma contraoferta, e você recebe um aviso.',
    botaoNovo: '+ Fazer oferta',
    campos: [
      { k: 'produto_titulo', r: 'Produto' }, { k: 'vendedor_telefone', r: 'Celular do vendedor' },
      { k: 'preco_oferta', r: 'Quanto quer pagar', tipo: 'numero' }, { k: 'quantidade', r: 'Quantidade' },
    ],
    chat: { id: (i, meu) => (meu ? i.vendedor_id : i.comprador_id) },
    perfil: { id: (i, meu) => (meu ? i.vendedor_id : i.comprador_id) },
    acoes: [
      // vendedor
      { r: '✅ Aceitar', patch: { estado: 'aceita' }, se: (i, meu) => !meu && i.estado === 'pendente' },
      { r: '❌ Recusar', patch: { estado: 'recusada' }, confirmar: 'Recusar esta oferta?', se: (i, meu) => !meu && i.estado === 'pendente' },
      { r: '💲 Contraoferta', patch: { estado: 'contraoferta' }, pedir: { rotulo: 'Seu preço (contraoferta)', numero: true, campo: 'contraoferta' }, se: (i, meu) => !meu && i.estado === 'pendente' },
      // comprador
      { r: '✅ Aceitar contraoferta', patch: { estado: 'aceita' }, se: (i, meu) => meu && i.estado === 'contraoferta' },
      { r: '✖ Cancelar oferta', patch: { estado: 'cancelada' }, confirmar: 'Cancelar esta oferta?', se: (i, meu) => meu && (i.estado === 'pendente' || i.estado === 'contraoferta') },
    ],
    titulo: (i) => `${i.produto_titulo}: ${Number(i.preco_oferta)} (${i.quantidade})`,
    linhas: (i) => [`Estado: ${i.estado}`, i.contraoferta ? `Contraoferta: ${Number(i.contraoferta)}` : '', dataBr(i.criado_em)],
  },
  {
    id: 'leiloes', grupo: G_NEGOCIAR, icone: '🔨', nome: 'Comprar em leilão', rota: 'leiloes', dono: 'usuario_id',
    desc: 'Peça um produto. Vendedores mandam propostas e você compara preço, quantidade, local e reputação.',
    botaoNovo: '+ Pedir proposta',
    campos: [{ k: 'produto', r: 'Produto' }, { k: 'quantidade', r: 'Quantidade' }, { k: 'local', r: 'Local de entrega' }],
    acoes: [{ r: '🔒 Fechar leilão', patch: { estado: 'fechado' }, se: (i, meu) => meu && i.estado === 'aberto' }],
    filho: { sec: propostas, pai: 'leilao_id', rotulo: '📨 Propostas' },
    titulo: (i) => `${i.produto} (${i.quantidade})`,
    linhas: (i) => [i.local, `Pedido por ${i.usuario_nome || 'Comprador'} • ${i.estado}`],
  },
  {
    id: 'precos', grupo: G_NEGOCIAR, icone: '📈', nome: 'Comparar preços', rota: 'precos',
    desc: 'Preços atuais e antigos. Busque o produto para ver como o preço mudou ao longo do tempo.',
    campos: [], filtros: ['produto', 'cidade'],
    titulo: (i) => `${i.produto}: ${Number(i.preco)} ${i.moeda || ''}`, linhas: (i) => [`${i.cidade} • ${dataBr(i.criado_em)}`],
  },

  // ----- pagar e transportar -----
  {
    id: 'pagamentos', grupo: G_PAGAR, icone: '🔒', nome: 'Pagamento seguro', rota: 'pagamentos', dono: 'comprador_id',
    desc: 'Registe o valor combinado. Ele só é liberado quando você confirma a entrega. (Por enquanto sem dinheiro real dentro do app.)',
    botaoNovo: '+ Reservar pagamento',
    campos: [
      { k: 'vendedor_telefone', r: 'Celular do vendedor' }, { k: 'descricao', r: 'O que está comprando' },
      { k: 'valor', r: 'Valor', tipo: 'numero' },
    ],
    tel: 'vendedor_telefone',
    chat: { id: (i, meu) => (meu ? i.vendedor_id : i.comprador_id) },
    acoes: [
      { r: '✅ Confirmar entrega e liberar', patch: { estado: 'liberado' }, confirmar: 'Confirma que recebeu o produto? O pagamento será liberado.', se: (i, meu) => meu && i.estado === 'reservado' },
      { r: '⚠️ Abrir disputa', patch: { estado: 'disputa' }, confirmar: 'Abrir uma disputa com o vendedor?', se: (i, meu) => meu && i.estado === 'reservado' },
    ],
    titulo: (i) => `${i.descricao}: ${Number(i.valor)}`, linhas: (i) => [`Estado: ${i.estado}`, dataBr(i.criado_em)],
  },
  {
    id: 'transporte', grupo: G_PAGAR, icone: '🚚', nome: 'Contratar transporte', rota: 'transportes', dono: 'usuario_id',
    desc: 'Diga a mercadoria, origem, destino e horário. Os transportadores veem o pedido e você recebe um aviso a cada etapa.',
    botaoNovo: '+ Contratar transporte',
    campos: [
      { k: 'produto', r: 'Mercadoria' }, { k: 'quantidade', r: 'Quantidade' }, { k: 'origem', r: 'Origem' }, { k: 'destino', r: 'Destino' },
      { k: 'horario', r: 'Dia e hora', dica: '2026-10-12 08:00' },
      { k: 'valor', r: 'Valor oferecido pelo transporte (opcional)', tipo: 'numero', obrig: false },
    ],
    chat: { id: 'transportador_id' },
    acoes: [
      { r: '💲 Definir valor', pedir: { rotulo: 'Valor do transporte (CFA)', numero: true }, se: (i, meu) => meu && (i.estado === 'aberto' || i.estado === 'aceita') },
      { r: '✅ Marcar como pago', patch: { pagamento: 'pago' }, confirmar: 'Marcar o transporte como pago?', se: (i, meu) => meu && i.estado === 'concluida' && i.pagamento !== 'pago' && i.pagamento !== 'recebido' },
      { r: '✖ Cancelar pedido', patch: { estado: 'cancelada' }, confirmar: 'Cancelar este pedido de transporte?', se: (i, meu) => meu && (i.estado === 'aberto' || i.estado === 'aceita') },
    ],
    titulo: (i) => `${i.produto} (${i.quantidade})`,
    linhas: (i) => [
      `${i.origem} → ${i.destino}`, `Horário: ${i.horario || '-'}`,
      `Valor: ${i.valor ? Number(i.valor) : 'a combinar'} • Pagamento: ${i.pagamento || 'pendente'}`, `Etapa: ${i.estado}`,
    ],
    rotaMapa: { de: 'origem', ate: 'destino' },
  },
  {
    id: 'avaliar', grupo: G_PAGAR, icone: '⭐', nome: 'Avaliar vendedor', rota: 'avaliacoes_vendedores', dono: 'autor_id',
    desc: 'Dê de 1 a 5 estrelas para qualidade, pontualidade e experiência.', botaoNovo: '+ Avaliar vendedor',
    campos: [
      { k: 'vendedor_nome', r: 'Nome do vendedor' }, { k: 'qualidade', r: 'Qualidade (1 a 5)', tipo: 'numero' },
      { k: 'pontualidade', r: 'Pontualidade (1 a 5)', tipo: 'numero' }, { k: 'experiencia', r: 'Experiência (1 a 5)', tipo: 'numero' },
      { k: 'comentario', r: 'Comentário (opcional)', tipo: 'longo', obrig: false },
    ],
    titulo: (i) => i.vendedor_nome,
    linhas: (i) => [`Qualidade ${est(i.qualidade)}`, `Pontualidade ${est(i.pontualidade)}`, `Experiência ${est(i.experiencia)}`, i.comentario || ''],
  },

  // ----- mercado -----
  {
    id: 'exportar', grupo: G_MERCADO, icone: '🌍', nome: 'Exportar', rota: 'exportacao', dono: 'usuario_id',
    desc: 'Oportunidades de produtos em grande quantidade. Publique ou ligue para o contacto.', botaoNovo: '+ Publicar oportunidade',
    campos: [
      { k: 'produto', r: 'Produto' }, { k: 'quantidade', r: 'Quantidade' }, { k: 'regiao', r: 'Região' },
      { k: 'contacto', r: 'Celular de contacto' }, { k: 'nota', r: 'Nota (opcional)', obrig: false },
    ],
    filtros: ['produto', 'regiao'], tel: 'contacto', chat: { id: 'usuario_id', nome: 'usuario_nome' },
    titulo: (i) => `${i.produto} (${i.quantidade})`, linhas: (i) => [i.regiao, i.nota || '', `Por ${i.usuario_nome || 'Utilizador'}`],
  },
  {
    id: 'mercado_oferta', grupo: G_MERCADO, icone: '📊', nome: 'Relatório: disponibilidade', rota: 'resumo/mercado_oferta',
    desc: 'Anúncios, preço médio e quantidade disponível por produto.', campos: [], compartilhar: true,
    titulo: (i) => i.rotulo, linhas: (i) => [i.valor],
  },
  {
    id: 'mercado_procura', grupo: G_MERCADO, icone: '📊', nome: 'Relatório: procura', rota: 'resumo/mercado_procura',
    desc: 'O que os compradores mais procuram.', campos: [], compartilhar: true,
    titulo: (i) => i.rotulo, linhas: (i) => [i.valor],
  },
];

export default function CompradorScreen({ navigation }: any) {
  return (
    <ModuloAgro
      modulo="comprador" titulo="Área do Comprador" icone="🛒"
      secoes={SECOES} navigation={navigation}
    />
  );
}
