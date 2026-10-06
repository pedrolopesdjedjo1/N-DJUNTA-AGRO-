// mobile/src/screens/FerramentasScreen.tsx  (funcionalidades para todos: 87 a 99)
import React from 'react';
import { Linking, Share, Text, TouchableOpacity, View } from 'react-native';
import ModuloAgro, { Secao } from '../components/ModuloAgro';
import { useAparencia } from '../context/AparenciaContext';

// Preencha com o contacto real de suporte (com código do país), ou deixe vazio para esconder os botões
const SUPORTE_TEL = '';
const SUPORTE_WHATSAPP = '';

const SECOES: Secao[] = [
  {
    id: 'emergencia', icone: '🆘', nome: 'Emergência', rota: 'emergencia', tel: 'telefone',
    desc: 'Serviços de emergência disponíveis. Toque em Ligar.', campos: [], filtros: ['regiao'],
    titulo: (i) => `🆘 ${i.nome}`, linhas: (i) => [i.regiao || '', i.descricao || ''],
  },
  {
    id: 'avisos', icone: '📣', nome: 'Avisos oficiais', rota: 'avisos', modulo: 'governo',
    desc: 'Mensagens oficiais do governo.', campos: [],
    titulo: (i) => i.titulo, linhas: (i) => [i.regiao, i.texto],
  },
  {
    id: 'calendario', icone: '🗓️', nome: 'Calendário agrícola', rota: 'calendario',
    desc: 'Atividades por época e região. Filtre pela região e pelo mês (número).', campos: [], filtros: ['regiao', 'mes'],
    titulo: (i) => `Mês ${i.mes}: ${i.atividade}`, linhas: (i) => [i.regiao || '', i.texto || ''],
  },
  {
    id: 'dicionario', icone: '📖', nome: 'Dicionário de produtos', rota: 'dicionario',
    desc: 'Nome e descrição de cada produto em vários idiomas.', campos: [], filtros: ['produto'],
    titulo: (i) => i.produto,
    linhas: (i) => [i.descricao || '', `Kriol: ${i.nome_kriol || '-'} • Français: ${i.nome_fr || '-'} • English: ${i.nome_en || '-'}`],
  },
  {
    id: 'forum', icone: '💬', nome: 'Fórum da comunidade', rota: 'forum_posts', dono: 'usuario_id', fixo: { tipo: 'geral' },
    desc: 'Perguntas, respostas e experiências.', campos: [{ k: 'texto', r: 'Sua pergunta ou mensagem', tipo: 'longo' }],
    titulo: (i) => i.texto, linhas: (i) => [`Por ${i.usuario_nome || 'Utilizador'}`],
    filho: {
      pai: 'post_id', rotulo: '💬 Respostas',
      sec: {
        id: 'respostas', icone: '💬', nome: 'Respostas', rota: 'forum_respostas', dono: 'usuario_id', botaoNovo: '+ Responder',
        desc: 'Respostas desta pergunta.', campos: [{ k: 'texto', r: 'Sua resposta', tipo: 'longo' }],
        titulo: (i) => i.texto, linhas: (i) => [`${i.usuario_nome || 'Utilizador'} • ${new Date(i.criado_em).toLocaleDateString()}`],
      },
    },
  },
  {
    id: 'enquetes', icone: '🗳️', nome: 'Enquetes', rota: 'enquetes', dono: 'usuario_id',
    desc: 'Perguntas de organizações. Toque em Votar e escreva uma das opções.', campos: [],
    titulo: (i) => i.pergunta, linhas: (i) => [`Opções: ${i.opcoes}`],
    filho: {
      pai: 'enquete_id', rotulo: '🗳️ Votar',
      sec: {
        id: 'votar', icone: '🗳️', nome: 'Votar', rota: 'votos', dono: 'usuario_id', botaoNovo: 'Votar agora',
        desc: 'Um voto por pessoa. Escreva a opção exatamente como aparece.', campos: [{ k: 'opcao', r: 'Sua opção' }],
        titulo: (i) => `Meu voto: ${i.opcao}`, linhas: () => [],
      },
    },
  },
  {
    id: 'resultados', icone: '📊', nome: 'Resultados das enquetes', rota: 'resumo/resultados_enquetes',
    desc: 'Votos até agora.', campos: [], titulo: (i) => i.rotulo, linhas: (i) => [i.valor],
  },
  {
    id: 'recompensas', icone: '🎁', nome: 'Recompensas', rota: 'recompensas', dono: 'usuario_id',
    desc: 'Pontos recebidos por atividades legítimas.', campos: [],
    titulo: (i) => `+${i.pontos} pontos`, linhas: (i) => [i.motivo || ''],
    verificar: { rota: 'resumo/saldo', rotulo: 'Ver meu saldo', vazio: 'Sem pontos ainda.' },
  },
  {
    id: 'convites', icone: '👫', nome: 'Indicar amigo', rota: 'convites', dono: 'usuario_id', tel: 'telefone_amigo',
    desc: 'Registe o celular do amigo e envie o convite pelo WhatsApp. Se as condições da campanha forem cumpridas, ambos recebem a recompensa.',
    campos: [{ k: 'telefone_amigo', r: 'Celular do amigo' }],
    whatsapp: () => 'Olá! Entre no NôdjuntaAgro para comprar e vender produtos da terra. Baixe o aplicativo e crie a sua conta com o seu número de celular.',
    titulo: (i) => i.telefone_amigo, linhas: (i) => [`Estado: ${i.estado}`],
  },
  {
    id: 'contactos', icone: '📒', nome: 'Contactos da minha rede', rota: 'contactos', dono: 'usuario_id', tel: 'telefone',
    desc: 'Guarde contactos importantes do seu negócio.',
    campos: [{ k: 'nome', r: 'Nome' }, { k: 'telefone', r: 'Celular' }, { k: 'nota', r: 'Nota (opcional)', obrig: false }],
    titulo: (i) => i.nome, linhas: (i) => [i.telefone, i.nota || ''],
  },
  {
    id: 'avaliar_transportador', icone: '⭐', nome: 'Avaliar transportador', rota: 'avaliacoes_transportador', modulo: 'transportador', dono: 'autor_id',
    desc: 'Usou um transportador? Escreva o celular dele e dê de 1 a 5 estrelas.', botaoNovo: '+ Avaliar transportador',
    campos: [
      { k: 'transportador_telefone', r: 'Celular do transportador' },
      { k: 'estrelas', r: 'Estrelas (1 a 5)', tipo: 'numero' },
      { k: 'comentario', r: 'Comentário (opcional)', tipo: 'longo', obrig: false },
    ],
    titulo: (i) => `${'★'.repeat(Number(i.estrelas) || 0)}${'☆'.repeat(5 - (Number(i.estrelas) || 0))}`,
    linhas: (i) => [i.comentario || '', i.transportador_telefone || ''],
  },
  {
    id: 'historico', icone: '🕘', nome: 'Histórico completo', rota: 'resumo/historico',
    desc: 'Vendas, colheitas, ofertas, pagamentos e transportes por data.', campos: [], compartilhar: true,
    titulo: (i) => i.rotulo, linhas: (i) => [new Date(i.criado_em).toLocaleString()],
  },
  {
    id: 'suporte', icone: '🛟', nome: 'Suporte técnico', rota: 'suporte', dono: 'usuario_id',
    desc: 'Escreva o seu problema. A equipa responde aqui.',
    campos: [{ k: 'assunto', r: 'Assunto' }, { k: 'mensagem', r: 'Mensagem', tipo: 'longo' }],
    titulo: (i) => i.assunto,
    linhas: (i) => [i.mensagem, `Estado: ${i.estado}`, i.resposta ? `Resposta: ${i.resposta}` : ''],
  },
];

function Topo({ navigation }: any) {
  const { cores, escala } = useAparencia();
  const btn = { backgroundColor: cores.verde, padding: 12, borderRadius: 10, marginBottom: 8 } as const;
  const txt = { color: '#fff', fontWeight: 'bold', fontSize: 15 * escala } as const;
  return (
    <View style={{ marginBottom: 8 }}>
      <TouchableOpacity style={btn} onPress={() => navigation?.navigate('Calculadora')}><Text style={txt}>🧮 Calculadora de preço</Text></TouchableOpacity>
      <TouchableOpacity style={btn} onPress={() => navigation?.navigate('Aparencia')}><Text style={txt}>🎨 Aparência, letras grandes e modo vendedor/comprador</Text></TouchableOpacity>
      {SUPORTE_TEL ? (
        <TouchableOpacity style={btn} onPress={() => Linking.openURL(`tel:${SUPORTE_TEL}`)}><Text style={txt}>📞 Ligar para o suporte</Text></TouchableOpacity>
      ) : null}
      {SUPORTE_WHATSAPP ? (
        <TouchableOpacity
          style={btn}
          onPress={() => Linking.openURL(`https://wa.me/${SUPORTE_WHATSAPP}`).catch(() => Share.share({ message: 'Preciso de ajuda com o NôdjuntaAgro' }))}
        >
          <Text style={txt}>💬 Suporte no WhatsApp</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export default function FerramentasScreen({ navigation }: any) {
  return (
    <ModuloAgro
      modulo="comuns" titulo="Ferramentas para todos" icone="🧰" secoes={SECOES}
      topo={<Topo navigation={navigation} />} navigation={navigation}
    />
  );
}
