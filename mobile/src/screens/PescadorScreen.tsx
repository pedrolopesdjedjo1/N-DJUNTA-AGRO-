// mobile/src/screens/PescadorScreen.tsx  (funcionalidades 21 a 28)
import React from 'react';
import ModuloAgro, { Secao } from '../components/ModuloAgro';

const NIVEL: any = { perigo: '🔴 PERIGO', atencao: '🟠 ATENÇÃO', seguro: '🟢 SEGURO' };

const SECOES: Secao[] = [
  {
    id: 'peixes', icone: '🐟', nome: 'Publicar peixe fresco', rota: 'peixes', dono: 'usuario_id',
    desc: 'Publique espécie, peso, preço e hora da captura. O anúncio aparece como peixe fresco.',
    campos: [
      { k: 'especie', r: 'Espécie' }, { k: 'peso', r: 'Peso (kg)' }, { k: 'preco', r: 'Preço', tipo: 'numero' },
      { k: 'local', r: 'Local' }, { k: 'hora_captura', r: 'Hora da captura', dica: '06:30' },
      { k: 'telefone', r: 'Seu celular (opcional)', obrig: false },
    ],
    filtros: ['especie', 'local'], tel: 'telefone',
    whatsapp: (i) => `🐟 PEIXE FRESCO: ${i.especie}, ${i.peso} kg, ${Number(i.preco)} CFA. Local: ${i.local}. Capturado às ${i.hora_captura}. Contacto: ${i.telefone || ''}`,
    titulo: (i) => `🐟 FRESCO • ${i.especie} — ${Number(i.preco)}`,
    linhas: (i) => [`${i.peso} kg • ${i.local}`, `Capturado às ${i.hora_captura}`, `Por ${i.usuario_nome || 'Pescador'}`],
  },
  {
    id: 'mar', icone: '🌊', nome: 'Alerta de tempo no mar', rota: 'alertas_mar',
    desc: 'Veja as condições do mar antes de sair. Alertas de perigo aparecem em destaque.',
    campos: [], filtros: ['regiao'],
    titulo: (i) => `${NIVEL[i.nivel] || i.nivel} • ${i.regiao}`,
    linhas: (i) => [i.texto],
  },
  {
    id: 'precos_peixe', icone: '💰', nome: 'Preço do peixe', rota: 'precos_peixe',
    desc: 'Preços por espécie e região.',
    campos: [], filtros: ['especie', 'regiao'],
    titulo: (i) => `${i.especie}: ${Number(i.preco)} ${i.moeda || ''}`,
    linhas: (i) => [i.regiao],
  },
  {
    id: 'entregas', icone: '🛵', nome: 'Entrega rápida', rota: 'entregas', dono: 'usuario_id',
    desc: 'Combine hora e local da entrega com o comprador (pelo celular dele) e acompanhe o estado.',
    campos: [
      { k: 'peixe', r: 'Peixe' }, { k: 'outro_telefone', r: 'Celular da outra pessoa' },
      { k: 'hora', r: 'Hora', dica: '17:00' }, { k: 'local', r: 'Local de entrega' },
    ],
    tel: 'outro_telefone',
    acoes: [{ r: 'A caminho', patch: { estado: 'a_caminho' } }, { r: 'Entregue', patch: { estado: 'entregue' } }, { r: 'Cancelar', patch: { estado: 'cancelada' } }],
    titulo: (i) => `${i.peixe} às ${i.hora}`,
    linhas: (i) => [i.local, `Estado: ${i.estado}`],
  },
  {
    id: 'pedido_gelo', icone: '🧊', nome: 'Pedir gelo / guarda-frio', rota: 'pedidos_gelo', dono: 'usuario_id',
    desc: 'Diga a quantidade e o local de que precisa.',
    campos: [{ k: 'quantidade', r: 'Quantidade (kg ou sacos)' }, { k: 'local', r: 'Local' }],
    acoes: [{ r: 'Cancelar', patch: { estado: 'cancelado' } }],
    titulo: (i) => `${i.quantidade} em ${i.local}`,
    linhas: (i) => [`Estado: ${i.estado}`],
  },
  {
    id: 'servicos_gelo', icone: '🏭', nome: 'Serviços de gelo e frio', rota: 'servicos_gelo',
    desc: 'Locais com gelo e câmara fria. Toque em Ligar.',
    campos: [], tel: 'telefone',
    titulo: (i) => i.nome,
    linhas: (i) => [i.local, i.preco ? `Preço: ${i.preco}` : ''],
  },
  {
    id: 'seco', icone: '🍤', nome: 'Compradores de peixe seco', rota: 'compradores_seco', dono: 'usuario_id',
    desc: 'Compradores de peixe seco ou processado. Registe-se como comprador ou ligue para um.',
    campos: [
      { k: 'nome', r: 'Nome' }, { k: 'telefone', r: 'Celular' },
      { k: 'interesse', r: 'O que compra' }, { k: 'cidade', r: 'Cidade' },
    ],
    filtros: ['cidade'], botaoNovo: 'Registar-me como comprador', tel: 'telefone',
    titulo: (i) => i.nome,
    linhas: (i) => [`Compra: ${i.interesse}`, i.cidade],
  },
  {
    id: 'capturas', icone: '📒', nome: 'Registar captura', rota: 'capturas', dono: 'usuario_id',
    desc: 'Guarde espécie, quantidade, local e data. O histórico fica no seu perfil.',
    campos: [
      { k: 'especie', r: 'Espécie' }, { k: 'quantidade', r: 'Quantidade' },
      { k: 'local', r: 'Local' }, { k: 'data', r: 'Data', dica: '2026-10-04' },
    ],
    titulo: (i) => `${i.especie} (${i.quantidade})`,
    linhas: (i) => [i.local, i.data || ''],
  },
  {
    id: 'zonas', icone: '🚫', nome: 'Zonas protegidas', rota: 'zonas',
    desc: 'Zonas onde a pesca é proibida ou limitada. Toque em Ver no mapa.',
    campos: [], filtros: ['regiao'], mapa: true,
    titulo: (i) => `🚫 ${i.nome}`,
    linhas: (i) => [i.regiao, i.regra],
  },
];

export default function PescadorScreen({ navigation }: any) {
  return <ModuloAgro modulo="pescador" titulo="Área do Pescador" icone="🎣" secoes={SECOES} navigation={navigation} />;
}
