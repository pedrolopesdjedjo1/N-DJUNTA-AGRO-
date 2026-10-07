// mobile/src/screens/AgricultorScreen.tsx  (funcionalidades 1 a 20)
import React from 'react';
import ModuloAgro, { Secao, linkTela } from '../components/ModuloAgro';

const estrelas = (n: any) => '★'.repeat(Number(n) || 0) + '☆'.repeat(5 - (Number(n) || 0));
const dataBr = (d: any) => (d ? new Date(d).toLocaleDateString() : '');

const G_VENDER = '🌾 VENDER E RECEBER';
const G_MERCADO = '💰 MERCADO E ALERTAS';
const G_NEGOCIOS = '🤝 NEGÓCIOS';
const G_PRODUCAO = '🌱 PRODUÇÃO E COMUNIDADE';

// Fórum e pedidos de sementes usam a mesma estrutura: pergunta + respostas
const respostas: Secao = {
  id: 'respostas', icone: '💬', nome: 'Respostas', rota: 'forum_respostas', dono: 'usuario_id', botaoNovo: '+ Responder',
  desc: 'Respostas a esta publicação.', campos: [{ k: 'texto', r: 'Sua resposta', tipo: 'longo' }],
  titulo: (i) => i.texto, linhas: (i) => [`${i.usuario_nome || 'Utilizador'} • ${dataBr(i.criado_em)}`],
};

const SECOES: Secao[] = [
  // ----- vender e receber -----
  linkTela(G_VENDER, 'publicar', '📸', 'Publicar produto', 'Foto, produto, quantidade, preço e localização. Você confirma antes de publicar.', 'AddProduct'),
  {
    id: 'transporte', grupo: G_VENDER, icone: '🚚', nome: 'Pedir transporte', rota: 'transportes', dono: 'usuario_id',
    desc: 'Depois de vender, peça transporte. Os transportadores recebem o pedido e você recebe um aviso a cada etapa.',
    botaoNovo: '+ Preciso de transporte',
    campos: [
      { k: 'produto', r: 'Produto' }, { k: 'quantidade', r: 'Quantidade' }, { k: 'origem', r: 'Origem' }, { k: 'destino', r: 'Destino' },
      { k: 'horario', r: 'Dia e hora (opcional)', obrig: false, dica: '2026-10-12 08:00' },
      { k: 'valor', r: 'Valor oferecido pelo transporte (opcional)', tipo: 'numero', obrig: false },
    ],
    chat: { id: 'transportador_id' },
    acoes: [
      { r: '💲 Definir valor', pedir: { rotulo: 'Valor do transporte (CFA)', numero: true }, se: (i, meu) => meu && (i.estado === 'aberto' || i.estado === 'aceita') },
      { r: '✅ Marcar como pago', patch: { pagamento: 'pago' }, confirmar: 'Marcar o transporte como pago?', se: (i, meu) => meu && i.estado === 'concluida' && i.pagamento !== 'pago' && i.pagamento !== 'recebido' },
      { r: '✖ Cancelar pedido', patch: { estado: 'cancelada' }, confirmar: 'Cancelar este pedido de transporte?', se: (i, meu) => meu && (i.estado === 'aberto' || i.estado === 'aceita') },
    ],
    titulo: (i) => `${i.produto} (${i.quantidade || '-'})`,
    linhas: (i) => [
      `${i.origem} → ${i.destino}`,
      `Valor: ${i.valor ? Number(i.valor) : 'a combinar'} • Pagamento: ${i.pagamento || 'pendente'}`,
      `Etapa: ${i.estado}`,
    ],
    rotaMapa: { de: 'origem', ate: 'destino' },
  },
  {
    id: 'historico', grupo: G_VENDER, icone: '🧾', nome: 'Histórico de vendas', rota: 'vendas', dono: 'vendedor_id',
    desc: 'Todas as suas vendas: produto, quantidade, comprador, preço e data.', botaoNovo: '+ Registar venda',
    campos: [
      { k: 'produto', r: 'Produto' }, { k: 'quantidade', r: 'Quantidade' }, { k: 'comprador_nome', r: 'Comprador' },
      { k: 'comprador_telefone', r: 'Celular do comprador (opcional)', obrig: false },
      { k: 'preco', r: 'Valor total', tipo: 'numero' },
    ],
    tel: 'comprador_telefone', compartilhar: true,
    titulo: (i) => `${i.produto} (${i.quantidade}): ${Number(i.preco)}`,
    linhas: (i) => [`Comprador: ${i.comprador_nome}`, dataBr(i.criado_em)],
  },
  {
    id: 'pagamento', grupo: G_VENDER, icone: '💵', nome: 'Receber pagamento', rota: 'vendas', dono: 'vendedor_id',
    desc: 'Valor, estado do pagamento e confirmação da entrega. O dinheiro não passa pelo app.', campos: [],
    acoes: [
      { r: '💵 Marcar como pago', patch: { estado_pagamento: 'pago' }, se: (i) => i.estado_pagamento !== 'pago' },
      { r: '📦 Entrega confirmada', patch: { entrega_confirmada: true }, se: (i) => !i.entrega_confirmada },
    ],
    titulo: (i) => `${i.produto}: ${Number(i.preco)}`,
    linhas: (i) => [
      `Pagamento: ${i.estado_pagamento === 'pago' ? 'Pago ✅' : 'Pendente ⏳'}`,
      `Entrega: ${i.entrega_confirmada ? 'Confirmada ✅' : 'Pendente ⏳'}`,
    ],
  },
  {
    id: 'avaliar', grupo: G_VENDER, icone: '⭐', nome: 'Avaliar comprador', rota: 'avaliacoes_compradores', dono: 'autor_id',
    desc: 'Depois da venda, dê estrelas de 1 a 5 e escreva um comentário.', botaoNovo: '+ Avaliar comprador',
    campos: [
      { k: 'comprador_nome', r: 'Nome do comprador' }, { k: 'estrelas', r: 'Estrelas (1 a 5)', tipo: 'numero' },
      { k: 'comentario', r: 'Comentário (opcional)', tipo: 'longo', obrig: false },
    ],
    titulo: (i) => `${i.comprador_nome} ${estrelas(i.estrelas)}`, linhas: (i) => [i.comentario || ''],
  },

  // ----- mercado e alertas -----
  {
    id: 'precos', grupo: G_MERCADO, icone: '💰', nome: 'Preço do mercado hoje', rota: 'precos',
    desc: 'Compare o preço dos produtos por cidade e veja onde vale mais.', campos: [], filtros: ['produto', 'cidade'],
    titulo: (i) => `${i.produto}: ${Number(i.preco)} ${i.moeda || ''}`, linhas: (i) => [`${i.cidade} • ${dataBr(i.criado_em)}`],
  },
  {
    id: 'alerta_preco', grupo: G_MERCADO, icone: '🔔', nome: 'Alerta de preço', rota: 'alertas_preco', dono: 'usuario_id',
    desc: 'Escolha um produto e o preço que você quer. Você recebe um aviso quando o preço chegar lá ou mudar muito.',
    botaoNovo: '+ Novo alerta',
    campos: [{ k: 'produto', r: 'Produto' }, { k: 'preco_desejado', r: 'Preço desejado', tipo: 'numero' }],
    verificar: { rota: 'atingidos', rotulo: 'Verificar agora', vazio: 'Nenhum preço chegou ao valor que você quer ainda.' },
    titulo: (i) => i.produto, linhas: (i) => [`Quero a partir de ${Number(i.preco_desejado)}`],
  },
  {
    id: 'clima', grupo: G_MERCADO, icone: '🌦️', nome: 'Alerta de clima', rota: 'alertas_regiao', fixo: { tipo: 'clima' },
    desc: 'Chuva, seca, calor e vento na sua região, com orientação prática.', campos: [], filtros: ['regiao'],
    titulo: (i) => i.titulo, linhas: (i) => [i.regiao, i.texto, i.orientacao ? `Orientação: ${i.orientacao}` : ''],
  },
  {
    id: 'praga', grupo: G_MERCADO, icone: '🐛', nome: 'Alerta de praga', rota: 'alertas_regiao', fixo: { tipo: 'praga' },
    desc: 'Pragas e doenças encontradas na sua região, com explicação e o que fazer.', campos: [], filtros: ['regiao'],
    titulo: (i) => i.titulo, linhas: (i) => [i.regiao, i.texto, i.orientacao ? `Orientação: ${i.orientacao}` : ''],
  },

  // ----- negócios -----
  {
    id: 'mapa', grupo: G_NEGOCIOS, icone: '🗺️', nome: 'Compradores: ligar e ver no mapa', rota: 'compradores', dono: 'usuario_id',
    desc: 'Compradores perto de você, com os produtos que procuram. Toque em Ligar ou Ver no mapa.',
    botaoNovo: 'Registar-me como comprador', filtros: ['cidade'], tel: 'telefone', mapa: true, chat: { id: 'usuario_id', nome: 'nome' },
    campos: [
      { k: 'nome', r: 'Nome' }, { k: 'telefone', r: 'Celular' }, { k: 'produtos_procurados', r: 'Produtos que procura' }, { k: 'cidade', r: 'Cidade' },
      { k: 'lat', r: 'Latitude (opcional)', tipo: 'numero', obrig: false }, { k: 'lng', r: 'Longitude (opcional)', tipo: 'numero', obrig: false },
    ],
    perfil: { id: 'usuario_id', nome: 'nome' },
    titulo: (i) => i.nome, linhas: (i) => [`Procura: ${i.produtos_procurados || '-'}`, i.cidade],
  },
  {
    id: 'encontros', grupo: G_NEGOCIOS, icone: '📅', nome: 'Marcar encontro', rota: 'encontros', dono: 'criado_por',
    desc: 'Combine data, hora e local com o comprador. Toque em Ligar para avisar a pessoa.', botaoNovo: '+ Marcar encontro',
    campos: [
      { k: 'outro_nome', r: 'Com quem' }, { k: 'outro_telefone', r: 'Celular (opcional)', obrig: false },
      { k: 'data_hora', r: 'Data e hora', dica: '2026-10-20 15:00' }, { k: 'local', r: 'Local' },
    ],
    tel: 'outro_telefone',
    acoes: [
      { r: '✅ Feito', patch: { estado: 'concluido' }, se: (i) => i.estado === 'marcado' },
      { r: '✖ Cancelar', patch: { estado: 'cancelado' }, se: (i) => i.estado === 'marcado' },
    ],
    titulo: (i) => `${i.data_hora} com ${i.outro_nome}`, linhas: (i) => [i.local, `Estado: ${i.estado}`],
  },
  {
    id: 'contactos', grupo: G_NEGOCIOS, icone: '⭐', nome: 'Favoritos: compradores e contactos', rota: 'contactos', dono: 'usuario_id',
    desc: 'Guarde compradores e contactos importantes para ligar rápido.', botaoNovo: '+ Guardar contacto', tel: 'telefone',
    campos: [{ k: 'nome', r: 'Nome' }, { k: 'telefone', r: 'Celular' }, { k: 'nota', r: 'Nota (opcional)', obrig: false }],
    titulo: (i) => i.nome, linhas: (i) => [i.telefone, i.nota || ''],
  },
  linkTela(G_NEGOCIOS, 'cooperativas', '🤝', 'Cooperativas', 'Criar ou entrar numa cooperativa, convidar membros e organizar vendas coletivas.', 'Cooperatives'),

  // ----- produção e comunidade -----
  {
    id: 'colheitas', grupo: G_PRODUCAO, icone: '🌾', nome: 'Registar colheita', rota: 'colheitas', dono: 'usuario_id',
    desc: 'Guarde produto, quantidade e data. Se autorizar, os dados entram nas estatísticas agrícolas.', botaoNovo: '+ Registar colheita',
    campos: [
      { k: 'produto', r: 'Produto' }, { k: 'quantidade', r: 'Quantidade' }, { k: 'data', r: 'Data', dica: 'AAAA-MM-DD' },
      { k: 'autorizado_estatistica', r: 'Autorizo usar nas estatísticas', tipo: 'bool' },
    ],
    titulo: (i) => `${i.produto} (${i.quantidade})`, linhas: (i) => [i.data || '', i.autorizado_estatistica ? 'Usado em estatísticas' : ''],
  },
  {
    id: 'sementes', grupo: G_PRODUCAO, icone: '🌱', nome: 'Pedir sementes', rota: 'forum_posts', dono: 'usuario_id', fixo: { tipo: 'sementes' },
    desc: 'Publique o que procura, por exemplo: Procuro sementes de arroz. Fornecedores e outros utilizadores respondem.',
    botaoNovo: '+ Pedir sementes', campos: [{ k: 'texto', r: 'O que você procura', tipo: 'longo' }],
    filho: { sec: respostas, pai: 'post_id', rotulo: '💬 Respostas' },
    titulo: (i) => i.texto, linhas: (i) => [`Por ${i.usuario_nome || 'Utilizador'} • ${dataBr(i.criado_em)}`],
  },
  {
    id: 'forum', grupo: G_PRODUCAO, icone: '💬', nome: 'Fórum agrícola', rota: 'forum_posts', dono: 'usuario_id', fixo: { tipo: 'pergunta' },
    desc: 'Faça perguntas. Outros agricultores e especialistas respondem.', botaoNovo: '+ Fazer pergunta',
    campos: [{ k: 'texto', r: 'Sua pergunta', tipo: 'longo' }],
    filho: { sec: respostas, pai: 'post_id', rotulo: '💬 Respostas' },
    titulo: (i) => i.texto, linhas: (i) => [`Por ${i.usuario_nome || 'Utilizador'} • ${dataBr(i.criado_em)}`],
  },
  {
    id: 'videos', grupo: G_PRODUCAO, icone: '🎬', nome: 'Vídeos de técnicas', rota: 'videos', url: 'url',
    desc: 'Vídeos curtos sobre plantação, colheita, conservação, pesca e negócios. Filtre por idioma.', campos: [], filtros: ['categoria', 'idioma'],
    titulo: (i) => i.titulo, linhas: (i) => [`${i.categoria || ''} • ${i.idioma || ''}`],
  },
  {
    id: 'noticias', grupo: G_PRODUCAO, icone: '📰', nome: 'Notícias do governo', rota: 'noticias',
    desc: 'Subsídios, programas, campanhas agrícolas, avisos e oportunidades.', campos: [],
    titulo: (i) => i.titulo, linhas: (i) => [i.texto, dataBr(i.criado_em)],
  },
];

export default function AgricultorScreen({ navigation }: any) {
  return (
    <ModuloAgro
      modulo="agricultor" titulo="Área do Agricultor" icone="🌾"
      secoes={SECOES} navigation={navigation}
    />
  );
}
