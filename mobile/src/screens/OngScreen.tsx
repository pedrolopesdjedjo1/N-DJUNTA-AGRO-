// mobile/src/screens/OngScreen.tsx  (funcionalidades 71 a 77)
import React from 'react';
import ModuloAgro, { Secao } from '../components/ModuloAgro';

const campoIndicador = [
  { k: 'regiao', r: 'Região' }, { k: 'nome', r: 'Indicador' },
  { k: 'valor', r: 'Valor' }, { k: 'periodo', r: 'Período', dica: '2026' },
];
const indicador = (id: string, icone: string, nome: string, desc: string, tipo: string): Secao => ({
  id, icone, nome, desc, rota: 'indicadores', dono: 'usuario_id', fixo: { tipo }, campos: campoIndicador,
  filtros: ['regiao'], compartilhar: true,
  titulo: (i) => `${i.nome}: ${i.valor}`, linhas: (i) => [`${i.regiao} • ${i.periodo || ''}`],
});

const SECOES: Secao[] = [
  { id: 'painel', icone: '📊', nome: 'Painel de impacto', rota: 'resumo/painel', modulo: 'ong', desc: 'Números reais do aplicativo.', campos: [], compartilhar: true, titulo: (i) => i.rotulo, linhas: (i) => [i.valor] },
  { id: 'perfis', icone: '👥', nome: 'Alcance por perfil', rota: 'resumo/perfis', desc: 'Utilizadores por perfil (agregado).', campos: [], compartilhar: true, titulo: (i) => i.rotulo, linhas: (i) => [i.valor] },
  indicador('pobreza', '🏚️', 'Mapa de pobreza rural', 'Indicadores agregados de regiões vulneráveis (sem dados pessoais).', 'pobreza'),
  indicador('clima', '🌧️', 'Mudanças climáticas', 'Áreas afetadas por seca, chuva excessiva e outros eventos.', 'clima'),
  indicador('genero', '⚖️', 'Dados de género', 'Participação de mulheres e jovens (agregado).', 'genero'),
  indicador('ods', '🌍', 'Medir ODS', 'Indicadores ligados aos Objetivos de Desenvolvimento Sustentável.', 'ods'),
  {
    id: 'projetos', icone: '🤲', nome: 'Projetos de ajuda', rota: 'projetos', dono: 'usuario_id', compartilhar: true,
    desc: 'Registe projetos com região, beneficiários, recursos, objetivo e resultado. Compare o que funciona.',
    campos: [
      { k: 'nome', r: 'Nome do projeto' }, { k: 'regiao', r: 'Região' }, { k: 'beneficiarios', r: 'Beneficiários' },
      { k: 'recursos', r: 'Recursos' }, { k: 'objetivo', r: 'Objetivo', tipo: 'longo' },
      { k: 'resultado', r: 'Resultado (opcional)', tipo: 'longo', obrig: false },
    ],
    filtros: ['regiao'],
    titulo: (i) => i.nome,
    linhas: (i) => [`${i.regiao} • ${i.beneficiarios}`, `Objetivo: ${i.objetivo}`, i.resultado ? `Resultado: ${i.resultado}` : '', `Por ${i.usuario_nome || 'Organização'}`],
  },
];

export default function OngScreen({ navigation }: any) {
  return <ModuloAgro modulo="ong" titulo="Painel ONU / ONG" icone="🌍" secoes={SECOES} navigation={navigation} />;
}
