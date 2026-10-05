// mobile/src/screens/ComercianteScreen.tsx  (funcionalidades 44 a 50)
import React from 'react';
import ModuloAgro, { Secao } from '../components/ModuloAgro';

const camposBanca = [
  { k: 'produto', r: 'Produto' }, { k: 'preco', r: 'Preço', tipo: 'numero' as const },
  { k: 'quantidade', r: 'Quantidade' }, { k: 'local_banca', r: 'Local da banca' },
  { k: 'telefone', r: 'Seu celular (opcional)', obrig: false },
];
const tituloBanca = (i: any) => `${i.produto}: ${Number(i.preco)}`;
const linhasBanca = (i: any) => [`${i.quantidade} • ${i.local_banca}`, `Por ${i.usuario_nome || 'Comerciante'}`];

const SECOES: Secao[] = [
  {
    id: 'frutas', icone: '🥬', nome: 'Publicar frutas e legumes', rota: 'banca', dono: 'usuario_id', fixo: { tipo: 'frutas_legumes' },
    desc: 'Publique rápido os produtos da sua banca com preço e quantidade.',
    campos: camposBanca, filtros: ['produto'], tel: 'telefone', titulo: tituloBanca, linhas: linhasBanca,
    whatsapp: (i) => `🥬 ${i.produto}: ${Number(i.preco)} CFA (${i.quantidade}). Banca: ${i.local_banca}. Contacto: ${i.telefone || ''}`,
  },
  {
    id: 'retalho', icone: '🛍️', nome: 'Vender a retalho', rota: 'banca', dono: 'usuario_id', fixo: { tipo: 'retalho' },
    desc: 'Produtos individuais com preço, quantidade e localização da banca.',
    campos: camposBanca, filtros: ['produto'], tel: 'telefone', titulo: tituloBanca, linhas: linhasBanca,
  },
  {
    id: 'precos', icone: '💰', nome: 'Preço em outros mercados', rota: 'precos',
    desc: 'Compare preços entre mercados e regiões antes de comprar ou vender.',
    campos: [], filtros: ['produto', 'cidade'],
    titulo: (i) => `${i.produto}: ${Number(i.preco)} ${i.moeda || ''}`, linhas: (i) => [i.cidade],
  },
  {
    id: 'atacado', icone: '📦', nome: 'Comprar atacado', rota: 'resumo/atacado',
    desc: 'Agricultores com grandes quantidades (100 ou mais). Toque em Ligar para negociar.',
    campos: [], tel: 'telefone',
    titulo: (i) => i.rotulo, linhas: (i) => [i.valor],
  },
  {
    id: 'emprestimo', icone: '🏦', nome: 'Pedir empréstimo', rota: 'emprestimos', dono: 'usuario_id',
    desc: 'Informe o valor e para que precisa. Você acompanha o estado do pedido e a resposta.',
    campos: [{ k: 'valor', r: 'Valor', tipo: 'numero' }, { k: 'finalidade', r: 'Para que precisa', tipo: 'longo' }],
    titulo: (i) => `Pedido de ${Number(i.valor)}`,
    linhas: (i) => [i.finalidade, `Estado: ${i.estado}`, i.resposta ? `Resposta: ${i.resposta}` : ''],
  },
  {
    id: 'grupo', icone: '👩‍🌾', nome: 'Grupo de apoio', rota: 'grupo_apoio', dono: 'usuario_id',
    desc: 'Espaço privado de comerciantes para conversar, trocar experiências e ajudar umas às outras.',
    campos: [{ k: 'texto', r: 'Escreva uma mensagem', tipo: 'longo' }], botaoNovo: '+ Escrever',
    titulo: (i) => i.texto, linhas: (i) => [`${i.usuario_nome || 'Comerciante'} • ${new Date(i.criado_em).toLocaleDateString()}`],
  },
  {
    id: 'formacao', icone: '🎓', nome: 'Formação de negócios', rota: 'cursos', fixo: { publico: 'comerciante' }, url: 'url',
    desc: 'Cursos curtos sobre vendas, estoque, poupança, atendimento e gestão.',
    campos: [],
    titulo: (i) => i.titulo, linhas: (i) => [i.descricao || ''],
  },
];

export default function ComercianteScreen({ navigation }: any) {
  return <ModuloAgro modulo="comerciante" titulo="Área da Comerciante" icone="🧺" secoes={SECOES} navigation={navigation} />;
}
