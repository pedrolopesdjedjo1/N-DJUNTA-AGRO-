// mobile/src/screens/TransportadorScreen.tsx  (Área do Transportador, 15 seções)
import React, { useCallback, useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import ModuloAgro, { chamarApi, Fixo, Secao } from '../components/ModuloAgro';
import { useAparencia } from '../context/AparenciaContext';

const MAPS = 'https://www.google.com/maps/search/';
const dataBr = (d: any) => (d ? new Date(d).toLocaleString() : '');
const estrelas = (n: any) => '★'.repeat(Number(n) || 0) + '☆'.repeat(5 - (Number(n) || 0));

// ---------- ajudantes para montar o menu ----------
const base = { campos: [] as any[], titulo: () => '', linhas: () => [] as string[] };

// Atalho para uma tela que o app já tem
const link = (grupo: string, id: string, icone: string, nome: string, desc: string, tela: string): Secao => ({
  id, icone, nome, desc, grupo, tela, rota: '', ...base,
});

// Lista fixa (atalhos, ligações, textos)
const fixos = (grupo: string, id: string, icone: string, nome: string, desc: string, lista: Fixo[]): Secao => ({
  id, icone, nome, desc, grupo, fixos: lista, rota: '', ...base,
});

// ---------- entregas ----------
const detalhes = (i: any) => [
  `${i.origem} → ${i.destino}`,
  `Distância: ${i.distancia_km ? `${Number(i.distancia_km)} km` : 'toque em 🗺️ Ver rota'}`,
  `Valor: ${i.valor ? Number(i.valor) : 'a combinar'}`,
  `Horário: ${i.horario || 'a combinar'}`,
  `Cliente: ${i.solicitante || '-'}${i.perfil ? ` (${i.perfil})` : ''}`,
];

const comprovativos: Secao = {
  id: 'comprovativos', icone: '📎', nome: 'Comprovativo de entrega', rota: 'comprovativos', dono: 'usuario_id',
  desc: 'Escreva uma nota (por exemplo, quem recebeu) e, se quiser, envie uma foto. Depois volte e toque em 🏁 Concluir.',
  botaoNovo: '+ Enviar comprovativo', url: 'foto_url',
  campos: [
    { k: 'nota', r: 'Nota (ex.: quem recebeu a carga)' },
    { k: 'foto_url', r: 'Foto do comprovativo (opcional)', tipo: 'foto', obrig: false },
  ],
  titulo: (i) => i.nota || 'Comprovativo', linhas: (i) => [dataBr(i.criado_em)],
};

const G_ENTREGAS = '📦 ENTREGAS';
const G_MAPA = '🗺️ MAPA E ROTAS';
const G_GANHOS = '💰 GANHOS';
const G_MSG = '💬 MENSAGENS';
const G_NOT = '🔔 NOTIFICAÇÕES';
const G_MERCADO = '🌾 MERCADO';
const G_CLIMA = '🌦️ CLIMA E ALERTAS';
const G_COOP = '🤝 COOPERATIVAS';
const G_FERR = '🔧 FERRAMENTAS';
const G_EMERG = '🆘 EMERGÊNCIA';
const G_PERFIL = '👤 MEU PERFIL';
const G_VERIF = '✅ VERIFICAÇÃO DE IDENTIDADE';
const G_IDIOMA = '🌐 IDIOMA';
const G_CONF = '⚙️ CONFIGURAÇÕES';

const SECOES: Secao[] = [
  // ----- 2. ENTREGAS -----
  {
    id: 'disponiveis', grupo: G_ENTREGAS, icone: '📋', nome: 'Entregas disponíveis', rota: 'resumo/disponiveis',
    desc: 'Veja produto, quantidade, origem, destino e valor antes de aceitar. Puxe a lista para atualizar.',
    campos: [], rotaMapa: { de: 'origem', ate: 'destino' }, tel: 'telefone', chat: { id: 'usuario_id', nome: 'solicitante' },
    acoes: [
      { r: '✅ Aceitar entrega', post: 'entrega/:id/aceitar', confirmar: 'Aceitar esta entrega?' },
      { r: '❌ Recusar', post: 'entrega/:id/recusar', confirmar: 'Recusar esta entrega? Ela deixa de aparecer para você.' },
    ],
    titulo: (i) => `${i.produto} (${i.quantidade || '-'})`, linhas: detalhes,
  },
  {
    id: 'andamento', grupo: G_ENTREGAS, icone: '🚚', nome: 'Entregas em andamento', rota: 'resumo/minhas_ativas',
    desc: 'Siga os passos: iniciar, recolha, entrega, comprovativo e concluir. Fale com o cliente e veja a rota.',
    campos: [], rotaMapa: { de: 'origem', ate: 'destino' }, tel: 'telefone', chat: { id: 'usuario_id', nome: 'solicitante' },
    filho: { sec: comprovativos, pai: 'transporte_id', rotulo: '📎 Enviar comprovativo' },
    acoes: [
      { r: '▶ Iniciar entrega', post: 'entrega/:id/iniciar', se: (i) => i.estado === 'aceita' },
      { r: '↩ Desistir', post: 'entrega/:id/cancelar', confirmar: 'Desistir desta entrega? Ela volta para a lista.', se: (i) => i.estado === 'aceita' || i.estado === 'iniciada' },
      { r: '📦 Confirmar recolha', post: 'entrega/:id/recolher', se: (i) => i.estado === 'iniciada' },
      { r: '✅ Confirmar entrega', post: 'entrega/:id/entregar', se: (i) => i.estado === 'recolhida' },
      { r: '🏁 Concluir', post: 'entrega/:id/concluir', se: (i) => i.estado === 'entregue' },
      { r: '💲 Definir valor', post: 'entrega/:id/valor', pedir: { rotulo: 'Valor do transporte (CFA)', numero: true } },
      { r: '📏 Informar distância', post: 'entrega/:id/distancia', pedir: { rotulo: 'Distância em km', numero: true } },
    ],
    titulo: (i) => `${i.produto} (${i.quantidade || '-'})`,
    linhas: (i) => [...detalhes(i), `Etapa: ${i.estado}`],
  },
  {
    id: 'historico', grupo: G_ENTREGAS, icone: '🕘', nome: 'Histórico de entregas e ganhos', rota: 'resumo/historico_entregas',
    desc: 'Entregas concluídas, com valor e pagamento.', campos: [], compartilhar: true, tel: 'telefone',
    acoes: [{ r: '💵 Recebi o pagamento', post: 'entrega/:id/receber', se: (i) => i.pagamento !== 'recebido' }],
    titulo: (i) => `${i.produto} (${i.quantidade || '-'})`,
    linhas: (i) => [
      `${i.origem} → ${i.destino}`,
      `Valor: ${i.valor ? Number(i.valor) : '-'} • Pagamento: ${i.pagamento}`,
      `Concluída: ${dataBr(i.concluido_em)}`,
    ],
  },

  // ----- 3. MAPA E ROTAS -----
  fixos(G_MAPA, 'mapa', '🧭', 'Localização, rotas e serviços no caminho',
    'Abre o Google Maps. Em cada entrega, o botão 🗺️ Ver rota mostra o melhor caminho, a distância e o trânsito.', [
      { titulo: '📍 Localização atual', linhas: ['Abre o mapa na sua posição.'], especial: 'abrir_mapa_aqui', botao: '📍 Abrir mapa' },
      { titulo: '🧭 Ponto de recolha, ponto de entrega, melhor rota e distância', linhas: ['Abra Entregas em andamento e toque em 🗺️ Ver rota.'] },
      { titulo: '⛽ Postos de combustível', url: `${MAPS}posto+de+combustivel`, botao: '⛽ Ver no mapa' },
      { titulo: '🔧 Oficinas próximas', url: `${MAPS}oficina+mecanica`, botao: '🔧 Ver no mapa' },
      { titulo: '🅿️ Estacionamento', url: `${MAPS}estacionamento`, botao: '🅿️ Ver no mapa' },
    ]),
  {
    id: 'estradas', grupo: G_MAPA, icone: '⚠️', nome: 'Alertas e condições da estrada', rota: 'alertas_estrada', dono: 'usuario_id', fixo: { ativo: 'true' },
    desc: 'Avisos feitos pelos transportadores: buracos, cheias, acidentes e obras. Quem avisou pode marcar como resolvido.',
    botaoNovo: '+ Avisar sobre a estrada', filtros: ['regiao'],
    campos: [
      { k: 'regiao', r: 'Região ou estrada' },
      { k: 'tipo', r: 'Tipo', dica: 'buraco, cheia, acidente, obras' },
      { k: 'texto', r: 'Descrição', tipo: 'longo' },
    ],
    acoes: [{ r: '✔ Resolvido', patch: { ativo: false }, se: (_i, meu) => meu }],
    titulo: (i) => `⚠️ ${i.tipo}: ${i.regiao}`, linhas: (i) => [i.texto, `Por ${i.usuario_nome || 'Transportador'} • ${dataBr(i.criado_em)}`],
  },

  // ----- 4. GANHOS -----
  {
    id: 'ganhos', grupo: G_GANHOS, icone: '💵', nome: 'Ganhos, comissão e saldo', rota: 'resumo/ganhos',
    desc: 'Ganhos de hoje, da semana e do mês, pagamentos pendentes, comissão e saldo disponível.',
    campos: [], compartilhar: true, titulo: (i) => i.rotulo, linhas: (i) => [i.valor],
  },
  {
    id: 'pagas', grupo: G_GANHOS, icone: '✅', nome: 'Entregas pagas', rota: 'resumo/pagas',
    desc: 'Entregas com pagamento recebido.', campos: [], compartilhar: true,
    titulo: (i) => `${i.produto}: ${i.valor ? Number(i.valor) : '-'}`, linhas: (i) => [`${i.origem} → ${i.destino}`, `Concluída: ${dataBr(i.concluido_em)}`],
  },
  {
    id: 'pendentes', grupo: G_GANHOS, icone: '⏳', nome: 'Pagamentos pendentes', rota: 'resumo/pendentes',
    desc: 'Entregas concluídas que ainda não foram pagas. Quando receber, toque em Recebi o pagamento.', campos: [],
    acoes: [{ r: '💵 Recebi o pagamento', post: 'entrega/:id/receber' }], tel: 'telefone',
    titulo: (i) => `${i.produto}: ${i.valor ? Number(i.valor) : 'sem valor'}`, linhas: (i) => [`${i.origem} → ${i.destino}`, `Cliente: ${i.solicitante || '-'}`],
  },
  {
    id: 'retiradas', grupo: G_GANHOS, icone: '🏧', nome: 'Pedir retirada e histórico', rota: 'retiradas', dono: 'usuario_id',
    desc: 'Peça a retirada do saldo disponível. A administração aprova e paga.', botaoNovo: '+ Pedir retirada',
    campos: [{ k: 'valor', r: 'Valor a retirar', tipo: 'numero' }, { k: 'metodo', r: 'Como quer receber', dica: 'Mobile Money, banco, dinheiro' }],
    titulo: (i) => `Retirada de ${Number(i.valor)}`, linhas: (i) => [`Estado: ${i.estado}`, i.resposta ? `Resposta: ${i.resposta}` : '', dataBr(i.criado_em)],
  },
  {
    id: 'dados_pagamento', grupo: G_GANHOS, icone: '🏦', nome: 'Dados de pagamento', rota: 'dados_pagamento', dono: 'usuario_id',
    desc: 'Onde você recebe: Mobile Money ou conta bancária.',
    campos: [{ k: 'metodo', r: 'Método', dica: 'Mobile Money, banco' }, { k: 'titular', r: 'Nome do titular' }, { k: 'conta', r: 'Número da conta ou do celular' }],
    titulo: (i) => `${i.metodo}: ${i.conta}`, linhas: (i) => [`Titular: ${i.titular}`],
  },
  {
    id: 'retiradas_admin', grupo: G_GANHOS, icone: '🛡️', nome: 'Retiradas dos transportadores (admin)', rota: 'retiradas', perfis: ['ADMIN'],
    desc: 'Só o administrador vê e responde a todos os pedidos de retirada.', campos: [],
    acoes: [{ r: '✅ Pago', patch: { estado: 'paga' } }, { r: '❌ Recusar', patch: { estado: 'recusada' } }],
    titulo: (i) => `${i.usuario_nome || 'Transportador'}: ${Number(i.valor)}`, linhas: (i) => [`${i.metodo || ''} • ${i.estado}`],
  },

  // ----- 5, 6. MENSAGENS E NOTIFICAÇÕES -----
  link(G_MSG, 'mensagens', '💬', 'Mensagens', 'Conversas com agricultores, vendedores e compradores, incluindo as conversas sobre entregas.', 'Conversations'),
  link(G_MSG, 'suporte', '🛟', 'Suporte NÔDJUNTA AGRO', 'Fale com a equipa.', 'Ferramentas'),
  link(G_NOT, 'notificacoes', '🔔', 'Notificações', 'Novas entregas, mudanças nas entregas, pagamentos e avisos importantes.', 'Notifications'),

  // ----- 7. MERCADO -----
  link(G_MERCADO, 'produtos', '🧺', 'Produtos disponíveis', 'Veja os anúncios de produtos.', 'Products'),
  link(G_MERCADO, 'precos', '💰', 'Preços de mercado', 'Preços por produto e região.', 'MarketPrices'),
  {
    id: 'procura', grupo: G_MERCADO, icone: '📊', nome: 'Procura por produtos', rota: 'resumo/mercado_procura', modulo: 'comprador',
    desc: 'O que os compradores mais procuram.', campos: [], titulo: (i) => i.rotulo, linhas: (i) => [i.valor],
  },
  link(G_MERCADO, 'ofertas', '🚛', 'Ofertas de transporte', 'Ofertas de outros transportadores.', 'Transport'),
  {
    id: 'info_agricola', grupo: G_MERCADO, icone: '📰', nome: 'Informações agrícolas', rota: 'noticias', modulo: 'agricultor',
    desc: 'Notícias e avisos do governo.', campos: [], titulo: (i) => i.titulo, linhas: (i) => [i.texto, dataBr(i.criado_em)],
  },
  fixos(G_MERCADO, 'mercados', '🏪', 'Mercados próximos', 'Abre o mapa com os mercados perto de você.', [
    { titulo: '🏪 Mercados perto de mim', url: `${MAPS}mercado`, botao: '🏪 Ver no mapa' },
  ]),

  // ----- 8. CLIMA E ALERTAS -----
  link(G_CLIMA, 'avisos_clima', '🌦️', 'Alertas meteorológicos', 'Alertas de chuva, seca e outros avisos publicados no app.', 'WeatherAlerts'),
  {
    id: 'clima', grupo: G_CLIMA, icone: '🌧️', nome: 'Alertas de clima (chuva, tempestades)', rota: 'alertas_regiao', modulo: 'agricultor', fixo: { tipo: 'clima' },
    desc: 'Avisos de clima por região, com orientação.', campos: [], filtros: ['regiao'],
    titulo: (i) => i.titulo, linhas: (i) => [i.regiao, i.texto, i.orientacao ? `Orientação: ${i.orientacao}` : ''],
  },
  {
    id: 'praga', grupo: G_CLIMA, icone: '🐛', nome: 'Alertas agrícolas (pragas)', rota: 'alertas_regiao', modulo: 'agricultor', fixo: { tipo: 'praga' },
    desc: 'Pragas e doenças por região.', campos: [], filtros: ['regiao'],
    titulo: (i) => i.titulo, linhas: (i) => [i.regiao, i.texto, i.orientacao ? `Orientação: ${i.orientacao}` : ''],
  },
  fixos(G_CLIMA, 'previsao', '🌡️', 'Previsão do tempo e temperatura', 'Abre a previsão no navegador.', [
    { titulo: '🌡️ Previsão do tempo, chuva e temperatura', url: 'https://www.google.com/search?q=previsao+do+tempo+Bissau', botao: '🌡️ Ver previsão' },
  ]),

  // ----- 9. COOPERATIVAS -----
  link(G_COOP, 'cooperativas', '🤝', 'Cooperativas', 'Cooperativas próximas, contactos, produtos e informações.', 'Cooperatives'),

  // ----- 10. FERRAMENTAS -----
  {
    id: 'servicos', grupo: G_FERR, icone: '🔧', nome: 'Oficinas, postos e estacionamentos', rota: 'servicos_veiculo', dono: 'usuario_id',
    desc: 'Lista feita pelos transportadores. Filtre pelo tipo (oficina, posto ou estacionamento).',
    botaoNovo: '+ Cadastrar serviço', filtros: ['tipo', 'local'], tel: 'telefone', mapa: true,
    campos: [
      { k: 'tipo', r: 'Tipo', dica: 'oficina, posto ou estacionamento' }, { k: 'nome', r: 'Nome' }, { k: 'local', r: 'Local' },
      { k: 'regiao', r: 'Região (opcional)', obrig: false }, { k: 'telefone', r: 'Celular (opcional)', obrig: false },
      { k: 'lat', r: 'Latitude (opcional)', tipo: 'numero', obrig: false }, { k: 'lng', r: 'Longitude (opcional)', tipo: 'numero', obrig: false },
    ],
    titulo: (i) => `${i.tipo}: ${i.nome}`, linhas: (i) => [i.local, i.regiao || ''],
  },
  {
    id: 'manutencao', grupo: G_FERR, icone: '🛠️', nome: 'Manutenção do veículo', rota: 'manutencao', dono: 'usuario_id',
    desc: 'Registe revisões, reparações e gastos.', botaoNovo: '+ Registar manutenção',
    campos: [
      { k: 'veiculo', r: 'Veículo ou matrícula' }, { k: 'servico', r: 'Serviço feito' }, { k: 'data', r: 'Data', dica: 'AAAA-MM-DD' },
      { k: 'km', r: 'Quilometragem (opcional)', obrig: false }, { k: 'custo', r: 'Custo (opcional)', tipo: 'numero', obrig: false },
      { k: 'nota', r: 'Nota (opcional)', obrig: false },
    ],
    titulo: (i) => `${i.servico} • ${i.veiculo}`, linhas: (i) => [i.data || '', i.custo ? `Custo: ${Number(i.custo)}` : '', i.km ? `${i.km} km` : ''],
  },
  {
    id: 'combustivel', grupo: G_FERR, icone: '⛽', nome: 'Preço do combustível', rota: 'combustivel', modulo: 'conteudo',
    desc: 'Preços por cidade.', campos: [], filtros: ['cidade'], titulo: (i) => `${i.tipo}: ${Number(i.preco)}`, linhas: (i) => [i.cidade],
  },
  link(G_FERR, 'calculadora', '🧮', 'Ferramentas úteis: calculadora de preço', 'Quantidade × preço.', 'Calculadora'),

  // ----- 11. EMERGÊNCIA -----
  fixos(G_EMERG, 'sos', '🚨', 'Pedir ajuda agora', 'Envia a sua localização por WhatsApp ou SMS, ou abre o mapa do serviço mais próximo.', [
    { titulo: '🚨 Veículo avariado', linhas: ['Envia um pedido de ajuda com a sua localização.'], especial: 'enviar_localizacao', msg: '🚨 O meu veículo avariou. Preciso de ajuda.', botao: '📤 Enviar pedido' },
    { titulo: '⛽ Falta de combustível', linhas: ['Envia um pedido de ajuda com a sua localização.'], especial: 'enviar_localizacao', msg: '⛽ Fiquei sem combustível. Preciso de ajuda.', botao: '📤 Enviar pedido' },
    { titulo: '📍 Enviar minha localização', especial: 'enviar_localizacao', msg: 'Esta é a minha localização.', botao: '📤 Enviar localização' },
    { titulo: '🏥 Hospital próximo', url: `${MAPS}hospital`, botao: '🏥 Ver no mapa' },
    { titulo: '👮 Polícia', url: `${MAPS}policia`, botao: '👮 Ver no mapa' },
    { titulo: '🚒 Bombeiros', url: `${MAPS}bombeiros`, botao: '🚒 Ver no mapa' },
    { titulo: '🛟 Contactar suporte', tela: 'Ferramentas', botao: '🛟 Abrir suporte' },
  ]),
  {
    id: 'emergencia', grupo: G_EMERG, icone: '☎️', nome: 'Telefones de emergência', rota: 'emergencia', modulo: 'comuns', tel: 'telefone',
    desc: 'Telefones publicados pela administração. Toque em Ligar.', campos: [], filtros: ['regiao'],
    titulo: (i) => `🆘 ${i.nome}`, linhas: (i) => [i.regiao || '', i.descricao || ''],
  },

  // ----- 12. MEU PERFIL -----
  link(G_PERFIL, 'perfil', '👤', 'Foto, nome, telefone e região', 'Os seus dados.', 'Profile'),
  {
    id: 'veiculos', grupo: G_PERFIL, icone: '🚛', nome: 'Meus veículos e disponibilidade', rota: 'veiculos', dono: 'usuario_id',
    desc: 'Tipo de transportador, tipo de veículo, matrícula, capacidade de carga e se está disponível.', botaoNovo: '+ Cadastrar veículo',
    campos: [
      { k: 'tipo_transportador', r: 'Tipo de transportador', dica: 'individual ou empresa' }, { k: 'tipo_veiculo', r: 'Tipo de veículo', dica: 'moto, carrinha, camião' },
      { k: 'matricula', r: 'Matrícula' }, { k: 'capacidade', r: 'Capacidade de carga', dica: 'ex.: 2 toneladas' },
    ],
    acoes: [
      { r: '🟢 Disponível', patch: { disponibilidade: 'disponível' } },
      { r: '🔴 Indisponível', patch: { disponibilidade: 'indisponível' } },
    ],
    titulo: (i) => `${i.tipo_veiculo} • ${i.matricula}`, linhas: (i) => [`Capacidade: ${i.capacidade}`, `${i.tipo_transportador} • ${i.disponibilidade}`],
  },
  {
    id: 'avaliacoes', grupo: G_PERFIL, icone: '⭐', nome: 'Minhas avaliações', rota: 'avaliacoes_transportador',
    desc: 'O que os clientes dizem de você.', campos: [], titulo: (i) => estrelas(i.estrelas), linhas: (i) => [i.comentario || '', dataBr(i.criado_em)],
  },

  // ----- 13, 14. VERIFICAÇÃO E IDIOMA -----
  link(G_VERIF, 'verificacao', '✅', 'Verificação de identidade', 'Documento de identidade, estado da verificação e conta verificada.', 'Verification'),
  link(G_IDIOMA, 'idioma', '🌐', 'Idioma', 'Português, Français, English e Crioulo da Guiné-Bissau.', 'Language'),

  // ----- 15. CONFIGURAÇÕES -----
  fixos(G_CONF, 'config', '⚙️', 'Configurações', 'Segurança, conta, notificações, localização, privacidade e ajuda.', [
    { titulo: '🔒 Segurança e alterar senha', linhas: ['Em breve.'] },
    { titulo: '📱 Número de telefone', linhas: ['Em breve.'] },
    { titulo: '🔔 Notificações', linhas: ['Ative ou desative nas definições do celular.'], especial: 'abrir_definicoes', botao: '⚙️ Abrir definições' },
    { titulo: '📍 Localização', linhas: ['Permita a localização nas definições do celular.'], especial: 'abrir_definicoes', botao: '⚙️ Abrir definições' },
    { titulo: '🌐 Idioma', tela: 'Language', botao: '🌐 Mudar idioma' },
    { titulo: '🛡️ Privacidade', linhas: ['Em breve.'] },
    { titulo: '📄 Termos e condições', linhas: ['Em breve.'] },
    { titulo: '❓ Ajuda e contactar suporte', tela: 'Ferramentas', botao: '🛟 Abrir suporte' },
  ]),
];

// ---------- 1. INÍCIO: cartões no topo do menu ----------
function PainelInicio() {
  const { cores, escala } = useAparencia();
  const [linhas, setLinhas] = useState<any[]>([]);
  const [erro, setErro] = useState('');

  const carregar = useCallback(async () => {
    try {
      setErro('');
      const d = await chamarApi('transportador', 'resumo/inicio');
      setLinhas(Array.isArray(d) ? d : []);
    } catch (e: any) {
      setErro(e.http ? e.message : 'Sem internet.');
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  return (
    <View style={{ marginBottom: 8 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
        {linhas.map((l) => (
          <View
            key={l.rotulo}
            style={{ width: '48%', backgroundColor: cores.card, borderWidth: 1, borderColor: cores.borda, borderRadius: 12, padding: 12, marginBottom: 8 }}
          >
            <Text style={{ color: cores.suave, fontSize: 12 * escala }}>{l.rotulo}</Text>
            <Text style={{ color: cores.verde, fontSize: 22 * escala, fontWeight: 'bold' }}>{l.valor}</Text>
          </View>
        ))}
      </View>
      {erro ? <Text style={{ color: '#B71C1C', fontSize: 13 * escala }}>{erro}</Text> : null}
      <TouchableOpacity onPress={carregar}><Text style={{ color: cores.verde, fontSize: 14 * escala }}>🔄 Atualizar</Text></TouchableOpacity>
    </View>
  );
}

export default function TransportadorScreen({ navigation }: any) {
  return (
    <ModuloAgro
      modulo="transportador" titulo="Área do Transportador" icone="🚚"
      secoes={SECOES} topo={<PainelInicio />} navigation={navigation}
    />
  );
}
