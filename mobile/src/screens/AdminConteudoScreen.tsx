// mobile/src/screens/AdminConteudoScreen.tsx
// O administrador publica e apaga conteúdo pelo celular. Alguns itens geram aviso para os utilizadores.
import React from 'react';
import ModuloAgro, { Campo, Secao } from '../components/ModuloAgro';

const pub = (
  id: string, icone: string, nome: string, rota: string, desc: string, campos: Campo[],
  titulo: (i: any) => string, linhas: (i: any) => string[], extra: Partial<Secao> = {}
): Secao => ({ id, icone, nome, rota, desc, campos, titulo, linhas, dono: 'criado_por', ...extra });

const SECOES: Secao[] = [
  pub('precos', '💰', 'Preço do mercado', 'precos',
    'Publica o preço de um produto numa cidade. Avisa quem definiu alerta de preço.',
    [{ k: 'produto', r: 'Produto' }, { k: 'cidade', r: 'Cidade ou mercado' }, { k: 'preco', r: 'Preço', tipo: 'numero' }, { k: 'moeda', r: 'Moeda (padrão XOF)', obrig: false }],
    (i) => `${i.produto}: ${Number(i.preco)} ${i.moeda || ''}`, (i) => [i.cidade],
    { filtros: ['produto'] }),
  pub('clima', '🌦️', 'Alerta de clima', 'alertas_regiao',
    'Avisa todos os agricultores sobre chuva, seca, calor ou vento.',
    [{ k: 'regiao', r: 'Região' }, { k: 'titulo', r: 'Título' }, { k: 'texto', r: 'O que vai acontecer', tipo: 'longo' }, { k: 'orientacao', r: 'O que fazer (opcional)', tipo: 'longo', obrig: false }],
    (i) => i.titulo, (i) => [i.regiao, i.texto], { fixo: { tipo: 'clima' } }),
  pub('praga', '🐛', 'Alerta de praga', 'alertas_regiao',
    'Avisa todos os agricultores sobre uma praga ou doença.',
    [{ k: 'regiao', r: 'Região' }, { k: 'titulo', r: 'Título' }, { k: 'texto', r: 'Explicação', tipo: 'longo' }, { k: 'orientacao', r: 'O que fazer (opcional)', tipo: 'longo', obrig: false }],
    (i) => i.titulo, (i) => [i.regiao, i.texto], { fixo: { tipo: 'praga' } }),
  pub('mar', '🌊', 'Alerta de tempo no mar', 'alertas_mar',
    'Avisa os pescadores. Nível: perigo, atencao ou seguro.',
    [{ k: 'regiao', r: 'Região' }, { k: 'nivel', r: 'Nível', dica: 'perigo, atencao ou seguro' }, { k: 'texto', r: 'Condições do mar', tipo: 'longo' }],
    (i) => `${i.nivel}: ${i.regiao}`, (i) => [i.texto]),
  pub('precos_peixe', '🐟', 'Preço do peixe', 'precos_peixe',
    'Avisa os pescadores quando o preço muda 10% ou mais.',
    [{ k: 'especie', r: 'Espécie' }, { k: 'regiao', r: 'Região' }, { k: 'preco', r: 'Preço', tipo: 'numero' }],
    (i) => `${i.especie}: ${Number(i.preco)}`, (i) => [i.regiao]),
  pub('servicos_gelo', '🧊', 'Serviços de gelo e frio', 'servicos_gelo',
    'Locais com gelo e câmara fria.',
    [{ k: 'nome', r: 'Nome' }, { k: 'local', r: 'Local' }, { k: 'telefone', r: 'Celular' }, { k: 'preco', r: 'Preço (opcional)', obrig: false }],
    (i) => i.nome, (i) => [i.local, i.preco || ''], { tel: 'telefone' }),
  pub('zonas', '🚫', 'Zonas protegidas', 'zonas',
    'Zona de pesca proibida ou limitada. Latitude, longitude e raio permitem o alerta por GPS.',
    [
      { k: 'nome', r: 'Nome da zona' }, { k: 'regiao', r: 'Região' }, { k: 'regra', r: 'Regra (o que é proibido)', tipo: 'longo' },
      { k: 'lat', r: 'Latitude (ex.: 11.85)', tipo: 'numero' }, { k: 'lng', r: 'Longitude (ex.: -15.60)', tipo: 'numero' },
      { k: 'raio_km', r: 'Raio em km (ex.: 5)', tipo: 'numero' },
    ],
    (i) => i.nome, (i) => [i.regiao, i.regra, `Raio: ${i.raio_km ? Number(i.raio_km) : '-'} km`], { mapa: true }),
  pub('combustivel', '⛽', 'Preço do combustível', 'combustivel',
    'Preço por cidade.',
    [{ k: 'cidade', r: 'Cidade' }, { k: 'tipo', r: 'Tipo', dica: 'gasolina ou gasóleo' }, { k: 'preco', r: 'Preço', tipo: 'numero' }],
    (i) => `${i.tipo}: ${Number(i.preco)}`, (i) => [i.cidade]),
  pub('videos', '🎬', 'Vídeos de técnicas', 'videos',
    'Cole o link do vídeo (YouTube ou outro).',
    [{ k: 'titulo', r: 'Título' }, { k: 'categoria', r: 'Categoria', dica: 'plantação, colheita, pesca...' }, { k: 'idioma', r: 'Idioma', dica: 'Kriol, Português...' }, { k: 'url', r: 'Link do vídeo' }],
    (i) => i.titulo, (i) => [`${i.categoria || ''} • ${i.idioma || ''}`], { url: 'url' }),
  pub('noticias', '📰', 'Notícias do governo', 'noticias',
    'Avisa todos os utilizadores.',
    [{ k: 'titulo', r: 'Título' }, { k: 'texto', r: 'Texto', tipo: 'longo' }],
    (i) => i.titulo, (i) => [i.texto]),
  pub('cursos', '🎓', 'Cursos e formação', 'cursos',
    'Público: comerciante ou agente.',
    [{ k: 'titulo', r: 'Título' }, { k: 'publico', r: 'Público', dica: 'comerciante ou agente' }, { k: 'descricao', r: 'Descrição', tipo: 'longo', obrig: false }, { k: 'url', r: 'Link do curso (opcional)', obrig: false }],
    (i) => i.titulo, (i) => [i.publico || '', i.descricao || ''], { url: 'url' }),
  pub('calendario', '🗓️', 'Calendário agrícola', 'calendario',
    'Atividade por mês e região.',
    [{ k: 'regiao', r: 'Região' }, { k: 'mes', r: 'Mês (1 a 12)', tipo: 'numero' }, { k: 'atividade', r: 'Atividade' }, { k: 'texto', r: 'Detalhes (opcional)', tipo: 'longo', obrig: false }],
    (i) => `Mês ${i.mes}: ${i.atividade}`, (i) => [i.regiao, i.texto || '']),
  pub('dicionario', '📖', 'Dicionário de produtos', 'dicionario',
    'Nome do produto em vários idiomas.',
    [
      { k: 'produto', r: 'Produto' }, { k: 'descricao', r: 'Descrição', tipo: 'longo' },
      { k: 'nome_kriol', r: 'Nome em Kriol' }, { k: 'nome_fr', r: 'Nome em Français', obrig: false }, { k: 'nome_en', r: 'Nome em English', obrig: false },
    ],
    (i) => i.produto, (i) => [i.descricao || '', `Kriol: ${i.nome_kriol || '-'}`]),
  pub('emergencia', '🆘', 'Emergência', 'emergencia',
    'Serviços de emergência e telefones.',
    [{ k: 'nome', r: 'Serviço' }, { k: 'telefone', r: 'Telefone' }, { k: 'descricao', r: 'Descrição (opcional)', obrig: false }, { k: 'regiao', r: 'Região (opcional)', obrig: false }],
    (i) => i.nome, (i) => [i.telefone, i.regiao || ''], { tel: 'telefone' }),
  {
    id: 'recompensas', icone: '🎁', nome: 'Dar pontos de recompensa', rota: 'recompensas', modulo: 'comuns',
    desc: 'Dê pontos a uma pessoa pelo celular dela, por uma atividade legítima.',
    campos: [{ k: 'telefone', r: 'Celular da pessoa' }, { k: 'motivo', r: 'Motivo' }, { k: 'pontos', r: 'Pontos', tipo: 'numero' }],
    titulo: (i) => `+${i.pontos} pontos`, linhas: (i) => [i.motivo || '', new Date(i.criado_em).toLocaleDateString()],
  },
];

export default function AdminConteudoScreen({ navigation }: any) {
  return (
    <ModuloAgro
      modulo="conteudo" titulo="Publicar conteúdo (admin)" icone="🛠️"
      secoes={SECOES} navigation={navigation}
    />
  );
}
