// mobile/src/screens/CompradorScreen.tsx  (funcionalidades 34 a 43; busca e filtros 29 a 32 estão em BuscaAvancadaScreen)
import React from 'react';
import ModuloAgro, { Secao } from '../components/ModuloAgro';

const est = (n: any) => '★'.repeat(Number(n) || 0) + '☆'.repeat(5 - (Number(n) || 0));
const data = (d: any) => new Date(d).toLocaleDateString();

const SECOES: Secao[] = [
  {
    id: 'ofertas', icone: '🤝', nome: 'Fazer oferta', rota: 'ofertas', dono: 'comprador_id',
    desc: 'Diga quanto quer pagar e quanto quer comprar. O vendedor aceita, recusa ou faz contraoferta.',
    campos: [
      { k: 'produto_titulo', r: 'Produto' }, { k: 'vendedor_telefone', r: 'Celular do vendedor' },
      { k: 'preco_oferta', r: 'Quanto quer pagar', tipo: 'numero' }, { k: 'quantidade', r: 'Quantidade' },
    ],
    tel: 'vendedor_telefone',
    acoes: [
      { r: 'Aceitar', patch: { estado: 'aceita' } }, { r: 'Recusar', patch: { estado: 'recusada' } },
    ],
    titulo: (i) => `${i.produto_titulo}: ${Number(i.preco_oferta)} (${i.quantidade})`,
    linhas: (i) => [`Estado: ${i.estado}`, i.contraoferta ? `Contraoferta: ${Number(i.contraoferta)}` : ''],
  },
  {
    id: 'precos', icone: '📈', nome: 'Comparar preços', rota: 'precos',
    desc: 'Preços atuais e antigos. Busque o produto para ver como o preço mudou ao longo do tempo.',
    campos: [], filtros: ['produto', 'cidade'],
    titulo: (i) => `${i.produto}: ${Number(i.preco)} ${i.moeda || ''}`,
    linhas: (i) => [`${i.cidade} • ${data(i.criado_em)}`],
  },
  {
    id: 'desejos', icone: '📝', nome: 'Lista de desejos', rota: 'desejos', dono: 'usuario_id',
    desc: 'Registe o que procura. Toque em Ver se apareceu para saber se há anúncios iguais.',
    campos: [
      { k: 'produto', r: 'Produto' }, { k: 'quantidade', r: 'Quantidade (opcional)', obrig: false },
      { k: 'preco_max', r: 'Preço máximo (opcional)', tipo: 'numero', obrig: false },
    ],
    verificar: { rota: 'resumo/correspondencias', rotulo: 'Ver se apareceu', vazio: 'Ainda não apareceu nenhum anúncio igual.' },
    titulo: (i) => i.produto,
    linhas: (i) => [i.quantidade || '', i.preco_max ? `Até ${Number(i.preco_max)}` : ''],
  },
  {
    id: 'leiloes', icone: '🔨', nome: 'Comprar em leilão', rota: 'leiloes', dono: 'usuario_id',
    desc: 'Peça um produto. Vendedores mandam propostas e você compara preço, quantidade e local.',
    campos: [{ k: 'produto', r: 'Produto' }, { k: 'quantidade', r: 'Quantidade' }, { k: 'local', r: 'Local de entrega' }],
    acoes: [{ r: 'Fechar leilão', patch: { estado: 'fechado' } }],
    titulo: (i) => `${i.produto} (${i.quantidade})`,
    linhas: (i) => [i.local, `Pedido por ${i.usuario_nome || 'Comprador'} • ${i.estado}`],
    filho: {
      pai: 'leilao_id', rotulo: '📨 Propostas',
      sec: {
        id: 'propostas', icone: '📨', nome: 'Propostas', rota: 'propostas', dono: 'usuario_id', botaoNovo: '+ Enviar proposta',
        desc: 'Compare e ligue para o vendedor.',
        campos: [
          { k: 'preco', r: 'Seu preço', tipo: 'numero' }, { k: 'quantidade', r: 'Quantidade que tem' },
          { k: 'local', r: 'Seu local' }, { k: 'telefone', r: 'Seu celular' },
        ],
        tel: 'telefone',
        titulo: (i) => `${Number(i.preco)} • ${i.quantidade}`,
        linhas: (i) => [i.local, `De ${i.usuario_nome || 'Vendedor'}`],
      },
    },
  },
  {
    id: 'transporte', icone: '🚚', nome: 'Contratar transporte', rota: 'transportes', dono: 'usuario_id',
    desc: 'Diga a mercadoria, origem, destino e horário. Os transportadores veem o pedido.',
    campos: [
      { k: 'produto', r: 'Mercadoria' }, { k: 'quantidade', r: 'Quantidade' }, { k: 'origem', r: 'Origem' },
      { k: 'destino', r: 'Destino' }, { k: 'horario', r: 'Horário', dica: '2026-10-12 08:00' },
    ],
    acoes: [{ r: 'Cancelar pedido', patch: { estado: 'cancelada' } }],
    titulo: (i) => `${i.produto} (${i.quantidade})`,
    linhas: (i) => [`${i.origem} → ${i.destino}`, `Horário: ${i.horario || '-'}`, `Estado: ${i.estado}`],
    rotaMapa: { de: 'origem', ate: 'destino' },
  },
  {
    id: 'pagamentos', icone: '🔒', nome: 'Pagamento seguro', rota: 'pagamentos', dono: 'comprador_id',
    desc: 'Registe o valor combinado. O dinheiro só é liberado quando você confirma a entrega. (Por enquanto sem dinheiro real dentro do app.)',
    campos: [
      { k: 'vendedor_telefone', r: 'Celular do vendedor' }, { k: 'descricao', r: 'O que está comprando' },
      { k: 'valor', r: 'Valor', tipo: 'numero' },
    ],
    tel: 'vendedor_telefone',
    acoes: [
      { r: 'Confirmar entrega e liberar', patch: { estado: 'liberado' } }, { r: 'Abrir disputa', patch: { estado: 'disputa' } },
    ],
    titulo: (i) => `${i.descricao}: ${Number(i.valor)}`,
    linhas: (i) => [`Estado: ${i.estado}`],
  },
  {
    id: 'avaliar', icone: '⭐', nome: 'Avaliar vendedor', rota: 'avaliacoes_vendedores', dono: 'autor_id',
    desc: 'Dê de 1 a 5 estrelas para qualidade, pontualidade e experiência.',
    campos: [
      { k: 'vendedor_nome', r: 'Nome do vendedor' }, { k: 'qualidade', r: 'Qualidade (1 a 5)', tipo: 'numero' },
      { k: 'pontualidade', r: 'Pontualidade (1 a 5)', tipo: 'numero' }, { k: 'experiencia', r: 'Experiência (1 a 5)', tipo: 'numero' },
      { k: 'comentario', r: 'Comentário (opcional)', tipo: 'longo', obrig: false },
    ],
    titulo: (i) => i.vendedor_nome,
    linhas: (i) => [`Qualidade ${est(i.qualidade)}`, `Pontualidade ${est(i.pontualidade)}`, `Experiência ${est(i.experiencia)}`, i.comentario || ''],
  },
  {
    id: 'exportar', icone: '🌍', nome: 'Exportar', rota: 'exportacao', dono: 'usuario_id',
    desc: 'Oportunidades de produtos em grande quantidade. Publique ou ligue para o contacto.',
    campos: [
      { k: 'produto', r: 'Produto' }, { k: 'quantidade', r: 'Quantidade' }, { k: 'regiao', r: 'Região' },
      { k: 'contacto', r: 'Celular de contacto' }, { k: 'nota', r: 'Nota (opcional)', obrig: false },
    ],
    filtros: ['produto', 'regiao'], tel: 'contacto',
    titulo: (i) => `${i.produto} (${i.quantidade})`,
    linhas: (i) => [i.regiao, i.nota || '', `Por ${i.usuario_nome || 'Utilizador'}`],
  },
  {
    id: 'mercado_oferta', icone: '📊', nome: 'Relatório: disponibilidade', rota: 'resumo/mercado_oferta',
    desc: 'Anúncios, preço médio e quantidade disponível por produto.', campos: [], compartilhar: true,
    titulo: (i) => i.rotulo, linhas: (i) => [i.valor],
  },
  {
    id: 'mercado_procura', icone: '📊', nome: 'Relatório: procura', rota: 'resumo/mercado_procura',
    desc: 'O que os compradores mais procuram.', campos: [], compartilhar: true,
    titulo: (i) => i.rotulo, linhas: (i) => [i.valor],
  },
  {
    id: 'alerta_colheita', icone: '🌾', nome: 'Alerta de nova colheita', rota: 'alertas_colheita', dono: 'usuario_id',
    desc: 'Escolha produto e região. Toque em Ver novas ofertas para ver o que surgiu.',
    campos: [{ k: 'produto', r: 'Produto' }, { k: 'regiao', r: 'Região (opcional)', obrig: false }],
    verificar: { rota: 'resumo/novas_ofertas', rotulo: 'Ver novas ofertas', vazio: 'Nada novo por enquanto.' },
    titulo: (i) => i.produto,
    linhas: (i) => [i.regiao || 'Todas as regiões'],
  },
];

export default function CompradorScreen({ navigation }: any) {
  return <ModuloAgro modulo="comprador" titulo="Área do Comprador" icone="🛒" secoes={SECOES} navigation={navigation} />;
}
