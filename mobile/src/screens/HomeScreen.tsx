import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Image,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as AuthModule from '../context/AuthContext';
import * as LanguageModule from '../context/LanguageContext';
import * as ClientModule from '../api/client';

const COR = {
  verde: '#1B7F3B',
  verdeEscuro: '#0F5A28',
  verdeClaro: '#E3F1E7',
  dourado: '#E3A81B',
  douradoClaro: '#FBF0D2',
  preto: '#141413',
  creme: '#FBF6EA',
  branco: '#FFFFFF',
  cinza: '#6B6F68',
  linha: '#EADFC6',
  vermelho: '#C8402F',
};

const VENDEDORES = ['AGRICULTOR', 'PESCADOR', 'COMERCIANTE', 'ARTESAO'];

const TEXTOS: Record<string, Record<string, string>> = {
  pt: {
    manha: 'Bom dia',
    tarde: 'Boa tarde',
    noite: 'Boa noite',
    precisa: 'O que precisa hoje?',
    pesquisar: 'Pesquisar produtos, vendedores…',
    categorias: 'Categorias',
    agricultura: 'Agricultura',
    pesca: 'Pesca',
    artesanato: 'Artesanato',
    comercio: 'Comércio',
    destaques: 'Produtos em destaque',
    verTudo: 'Ver tudo',
    semProdutos: 'Ainda não há produtos em destaque.',
    atalhos: 'O seu espaço',
    vender: 'Vender',
    precos: 'Preços',
    clima: 'Clima',
    transporte: 'Transporte',
    cooperativas: 'Cooperativas',
    verificacao: 'Verificação',
    idioma: 'Idioma',
    painel: 'Painel',
    admin: 'Admin',
    denuncias: 'Denúncias',
    verificacoes: 'Verificações',
    oportunidades: 'Oportunidades de negócio e emprego',
    oportunidadesSub: 'Veja o que está a acontecer perto de si',
    inicio: 'Início',
    produtos: 'Produtos',
    mensagens: 'Mensagens',
    perfil: 'Perfil',
    sair: 'Sair',
    slogan: 'JUNTOS, FAZEMOS ACONTECER.',
    verProdutos: 'Ver todos os produtos',
  },
  fr: {
    manha: 'Bonjour',
    tarde: 'Bon après-midi',
    noite: 'Bonsoir',
    precisa: "De quoi avez-vous besoin aujourd'hui ?",
    pesquisar: 'Rechercher produits, vendeurs…',
    categorias: 'Catégories',
    agricultura: 'Agriculture',
    pesca: 'Pêche',
    artesanato: 'Artisanat',
    comercio: 'Commerce',
    destaques: 'Produits en vedette',
    verTudo: 'Voir tout',
    semProdutos: "Pas encore de produits en vedette.",
    atalhos: 'Votre espace',
    vender: 'Vendre',
    precos: 'Prix',
    clima: 'Météo',
    transporte: 'Transport',
    cooperativas: 'Coopératives',
    verificacao: 'Vérification',
    idioma: 'Langue',
    painel: 'Tableau',
    admin: 'Admin',
    denuncias: 'Signalements',
    verificacoes: 'Vérifications',
    oportunidades: "Opportunités d'affaires et d'emploi",
    oportunidadesSub: 'Voyez ce qui se passe près de vous',
    inicio: 'Accueil',
    produtos: 'Produits',
    mensagens: 'Messages',
    perfil: 'Profil',
    sair: 'Quitter',
    slogan: 'ENSEMBLE, NOUS FAISONS AVANCER.',
    verProdutos: 'Voir tous les produits',
  },
  en: {
    manha: 'Good morning',
    tarde: 'Good afternoon',
    noite: 'Good evening',
    precisa: 'What do you need today?',
    pesquisar: 'Search products, sellers…',
    categorias: 'Categories',
    agricultura: 'Farming',
    pesca: 'Fishing',
    artesanato: 'Crafts',
    comercio: 'Trade',
    destaques: 'Featured products',
    verTudo: 'See all',
    semProdutos: 'No featured products yet.',
    atalhos: 'Your space',
    vender: 'Sell',
    precos: 'Prices',
    clima: 'Weather',
    transporte: 'Transport',
    cooperativas: 'Cooperatives',
    verificacao: 'Verification',
    idioma: 'Language',
    painel: 'Dashboard',
    admin: 'Admin',
    denuncias: 'Reports',
    verificacoes: 'Verifications',
    oportunidades: 'Business and job opportunities',
    oportunidadesSub: 'See what is happening near you',
    inicio: 'Home',
    produtos: 'Products',
    mensagens: 'Messages',
    perfil: 'Profile',
    sair: 'Log out',
    slogan: 'TOGETHER, WE MAKE IT HAPPEN.',
    verProdutos: 'See all products',
  },
};

type Atalho = {
  chave: string;
  icone: keyof typeof Ionicons.glyphMap;
  texto: string;
  rotas: string[];
  perfis?: string[];
  cor?: string;
};

const ATALHOS: Atalho[] = [
  { chave: 'vender', icone: 'add-circle', texto: 'vender', rotas: ['AddProduct'], perfis: VENDEDORES },
  { chave: 'precos', icone: 'pricetag', texto: 'precos', rotas: ['MarketPrices', 'Prices', 'PrecosMercado'] },
  { chave: 'clima', icone: 'partly-sunny', texto: 'clima', rotas: ['Weather', 'WeatherAlerts', 'Clima'] },
  { chave: 'transporte', icone: 'car', texto: 'transporte', rotas: ['Transport', 'Transports', 'Transporte'] },
  { chave: 'coop', icone: 'people', texto: 'cooperativas', rotas: ['Cooperatives', 'Cooperativas'] },
  { chave: 'verif', icone: 'shield-checkmark', texto: 'verificacao', rotas: ['Verification'] },
  { chave: 'painel', icone: 'stats-chart', texto: 'painel', rotas: ['Dashboard'], perfis: ['ADMIN', 'GOVERNO', 'ONG'] },
  { chave: 'admin', icone: 'construct', texto: 'admin', rotas: ['Admin'], perfis: ['ADMIN'] },
  { chave: 'denuncias', icone: 'flag', texto: 'denuncias', rotas: ['AdminReports'], perfis: ['ADMIN'], cor: COR.vermelho },
  { chave: 'verifs', icone: 'checkmark-done-circle', texto: 'verificacoes', rotas: ['AdminVerifications'], perfis: ['ADMIN'] },
  { chave: 'idioma', icone: 'language', texto: 'idioma', rotas: ['Language'] },
];

const CATEGORIAS: { valor: string; icone: keyof typeof Ionicons.glyphMap; texto: string; cor: string }[] = [
  { valor: 'AGRICOLA', icone: 'leaf', texto: 'agricultura', cor: COR.verde },
  { valor: 'PESCA', icone: 'fish', texto: 'pesca', cor: '#2B6CB0' },
  { valor: 'ARTESANATO', icone: 'color-palette', texto: 'artesanato', cor: '#9A5B2A' },
  { valor: 'COMERCIO', icone: 'storefront', texto: 'comercio', cor: COR.dourado },
];

const ROTULO_PERFIL: Record<string, string> = {
  AGRICULTOR: 'Agricultor',
  PESCADOR: 'Pescador',
  COMERCIANTE: 'Comerciante',
  ARTESAO: 'Artesão',
  COMPRADOR: 'Cliente',
  TRANSPORTADOR: 'Transportador',
  AGENTE_DIGITAL: 'Agente',
  GOVERNO: 'Governo',
  ONG: 'ONG',
  ADMIN: 'Administrador',
};

function formatarPreco(valor: any): string {
  const n = Number(valor);
  if (!isFinite(n)) return '';
  return `${n.toLocaleString('pt-PT')} FCFA`;
}

export function HomeScreen() {
  const navigation: any = useNavigation();
  const insets = useSafeAreaInsets();

  const auth: any = (AuthModule as any).useAuth ? (AuthModule as any).useAuth() : {};
  const idiomaCtx: any = (LanguageModule as any).useLanguage ? (LanguageModule as any).useLanguage() : {};
  const usuario = auth?.user ?? null;
  const sair = auth?.logout ?? auth?.signOut ?? auth?.sair;
  const perfil: string = usuario?.role ?? '';

  const codigo = String(idiomaCtx?.language ?? idiomaCtx?.lang ?? idiomaCtx?.locale ?? 'pt').toLowerCase();
  const lingua = codigo.startsWith('fr') ? 'fr' : codigo.startsWith('en') ? 'en' : 'pt';
  const t = useCallback((k: string) => TEXTOS[lingua][k] ?? TEXTOS.pt[k] ?? k, [lingua]);

  const [produtos, setProdutos] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [busca, setBusca] = useState('');
  const entrada = useRef(new Animated.Value(0)).current;

  const rotasExistentes: string[] = useMemo(() => {
    try {
      return navigation.getState()?.routeNames ?? [];
    } catch {
      return [];
    }
  }, [navigation]);

  const rotaDe = useCallback(
    (candidatas: string[]) => candidatas.find((r) => rotasExistentes.includes(r)),
    [rotasExistentes],
  );

  const ir = useCallback(
    (candidatas: string[], params?: any) => {
      const r = rotaDe(candidatas);
      if (r) navigation.navigate(r, params);
    },
    [navigation, rotaDe],
  );

  const carregarProdutos = useCallback(async () => {
    const api: any = (ClientModule as any).default ?? (ClientModule as any).api;
    if (!api?.get) return;
    setCarregando(true);
    try {
      const res = await api.get('/api/products');
      const corpo = res?.data;
      const lista = Array.isArray(corpo) ? corpo : corpo?.products ?? corpo?.data ?? [];
      const ordenados = [...lista].sort((a: any, b: any) => Number(!!b?.imageUrl) - Number(!!a?.imageUrl));
      setProdutos(ordenados.slice(0, 8));
    } catch {
      setProdutos([]);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarProdutos();
    Animated.timing(entrada, { toValue: 1, duration: 450, useNativeDriver: true }).start();
  }, [carregarProdutos, entrada]);

  const hora = new Date().getHours();
  const saudacao = hora < 12 ? t('manha') : hora < 18 ? t('tarde') : t('noite');
  const primeiroNome = String(usuario?.name ?? '').trim().split(' ')[0];
  const inicial = (primeiroNome || '?').charAt(0).toUpperCase();

  const atalhosVisiveis = ATALHOS.filter(
    (a) => rotaDe(a.rotas) && (!a.perfis || a.perfis.includes(perfil)),
  );
  const temOportunidades = !!rotaDe(['Opportunities', 'Oportunidades']);

  const abrirProdutos = (params?: any) => ir(['Products'], params);

  return (
    <View style={[styles.tela, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={COR.creme} />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 110 + insets.bottom }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={carregando} onRefresh={carregarProdutos} tintColor={COR.verde} colors={[COR.verde]} />
        }
      >
        <Animated.View style={{ opacity: entrada, transform: [{ translateY: entrada.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }}>
          {/* Cabeçalho da marca */}
          <View style={styles.marca}>
            <View style={{ flex: 1 }}>
              <Text style={styles.marcaTitulo}>
                <Text style={{ color: COR.preto }}>NÔ </Text>
                <Text style={{ color: COR.verde }}>DJUNTA</Text>
                <Text style={{ color: COR.dourado }}> AGRO</Text>
              </Text>
              <View style={styles.linhaDourada} />
              <Text style={styles.slogan}>{t('slogan')}</Text>
            </View>
            <TouchableOpacity
              accessibilityLabel={t('mensagens')}
              style={styles.botaoRedondo}
              onPress={() => ir(['Notifications'])}
            >
              <Ionicons name="notifications-outline" size={22} color={COR.preto} />
            </TouchableOpacity>
          </View>

          {/* Cartão de boas-vindas e pesquisa */}
          <View style={styles.heroi}>
            <View style={styles.heroiTopo}>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroiSaudacao}>
                  {saudacao}
                  {primeiroNome ? `, ${primeiroNome}` : ''}
                </Text>
                <Text style={styles.heroiSub}>{t('precisa')}</Text>
                {!!perfil && (
                  <View style={styles.selo}>
                    <Ionicons name="ribbon" size={13} color={COR.preto} />
                    <Text style={styles.seloTexto}>{ROTULO_PERFIL[perfil] ?? perfil}</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity style={styles.avatar} onPress={() => ir(['Profile'])} accessibilityLabel={t('perfil')}>
                <Text style={styles.avatarTexto}>{inicial}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.pesquisa}>
              <Ionicons name="search" size={20} color={COR.cinza} />
              <TextInput
                style={styles.pesquisaCampo}
                placeholder={t('pesquisar')}
                placeholderTextColor="#8A8D86"
                value={busca}
                onChangeText={setBusca}
                returnKeyType="search"
                onSubmitEditing={() => abrirProdutos(busca.trim() ? { search: busca.trim() } : undefined)}
              />
            </View>
          </View>

          {/* Categorias */}
          <Text style={styles.titulo}>{t('categorias')}</Text>
          <View style={styles.categorias}>
            {CATEGORIAS.map((c) => (
              <TouchableOpacity
                key={c.valor}
                style={styles.categoria}
                activeOpacity={0.8}
                onPress={() => abrirProdutos({ category: c.valor })}
              >
                <View style={[styles.categoriaIcone, { backgroundColor: c.cor }]}>
                  <Ionicons name={c.icone} size={26} color={COR.branco} />
                </View>
                <Text style={styles.categoriaTexto}>{t(c.texto)}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Destaques */}
          <View style={styles.tituloLinha}>
            <Text style={styles.titulo}>{t('destaques')}</Text>
            <TouchableOpacity onPress={() => abrirProdutos()}>
              <Text style={styles.verTudo}>{t('verTudo')}</Text>
            </TouchableOpacity>
          </View>

          {produtos.length === 0 ? (
            <View style={styles.vazio}>
              <Ionicons name="basket-outline" size={28} color={COR.cinza} />
              <Text style={styles.vazioTexto}>{t('semProdutos')}</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carrossel}>
              {produtos.map((p: any, i: number) => (
                <TouchableOpacity key={String(p?.id ?? i)} style={styles.produto} activeOpacity={0.9} onPress={() => abrirProdutos()}>
                  {p?.imageUrl ? (
                    <Image source={{ uri: p.imageUrl }} style={styles.produtoFoto} resizeMode="cover" />
                  ) : (
                    <View style={[styles.produtoFoto, styles.produtoSemFoto]}>
                      <Ionicons name="image-outline" size={30} color={COR.dourado} />
                    </View>
                  )}
                  <View style={styles.produtoCorpo}>
                    <Text style={styles.produtoNome} numberOfLines={1}>
                      {p?.title ?? p?.name ?? '—'}
                    </Text>
                    <Text style={styles.produtoPreco}>{formatarPreco(p?.price)}</Text>
                    {!!p?.location && (
                      <View style={styles.produtoLocal}>
                        <Ionicons name="location-outline" size={12} color={COR.cinza} />
                        <Text style={styles.produtoLocalTexto} numberOfLines={1}>
                          {p.location}
                        </Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Oportunidades (só aparece quando existir a rota) */}
          {temOportunidades && (
            <TouchableOpacity style={styles.oportunidade} activeOpacity={0.9} onPress={() => ir(['Opportunities', 'Oportunidades'])}>
              <View style={{ flex: 1 }}>
                <Text style={styles.oportunidadeTitulo}>{t('oportunidades')}</Text>
                <Text style={styles.oportunidadeSub}>{t('oportunidadesSub')}</Text>
              </View>
              <Ionicons name="briefcase" size={34} color={COR.preto} />
            </TouchableOpacity>
          )}

          {/* Atalhos por perfil */}
          {atalhosVisiveis.length > 0 && (
            <>
              <Text style={styles.titulo}>{t('atalhos')}</Text>
              <View style={styles.grade}>
                {atalhosVisiveis.map((a) => (
                  <TouchableOpacity key={a.chave} style={styles.atalho} activeOpacity={0.85} onPress={() => ir(a.rotas)}>
                    <View style={[styles.atalhoIcone, { backgroundColor: a.cor ? '#FBE4E0' : COR.verdeClaro }]}>
                      <Ionicons name={a.icone} size={24} color={a.cor ?? COR.verde} />
                    </View>
                    <Text style={styles.atalhoTexto} numberOfLines={1}>
                      {t(a.texto)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {typeof sair === 'function' && (
            <TouchableOpacity style={styles.sair} onPress={() => sair()} activeOpacity={0.85}>
              <Ionicons name="log-out-outline" size={20} color={COR.vermelho} />
              <Text style={styles.sairTexto}>{t('sair')}</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      </ScrollView>

      {/* Menu inferior */}
      <View style={[styles.menu, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        <ItemMenu icone="home" texto={t('inicio')} ativo onPress={() => {}} />
        <ItemMenu icone="basket" texto={t('produtos')} onPress={() => abrirProdutos()} />
        <ItemMenu icone="chatbubbles" texto={t('mensagens')} onPress={() => ir(['Conversations'])} />
        <ItemMenu icone="person" texto={t('perfil')} onPress={() => ir(['Profile'])} />
      </View>
    </View>
  );
}

function ItemMenu({
  icone,
  texto,
  ativo,
  onPress,
}: {
  icone: keyof typeof Ionicons.glyphMap;
  texto: string;
  ativo?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.8} accessibilityLabel={texto}>
      <View style={[styles.menuPilula, ativo && { backgroundColor: COR.verdeClaro }]}>
        <Ionicons name={icone} size={22} color={ativo ? COR.verde : '#8A8D86'} />
      </View>
      <Text style={[styles.menuTexto, ativo && { color: COR.verde, fontWeight: '700' }]}>{texto}</Text>
    </TouchableOpacity>
  );
}

const sombra = {
  shadowColor: '#000',
  shadowOpacity: 0.08,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 3 },
  elevation: 3,
};

const styles = StyleSheet.create({
  tela: { flex: 1, backgroundColor: COR.creme },

  marca: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 14 },
  marcaTitulo: { fontSize: 26, fontWeight: '900', letterSpacing: 0.5 },
  linhaDourada: { height: 2, backgroundColor: COR.dourado, marginTop: 4, marginBottom: 4, width: '92%' },
  slogan: { fontSize: 10, letterSpacing: 1.6, color: COR.preto, fontWeight: '600' },
  botaoRedondo: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COR.branco,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COR.linha,
  },

  heroi: {
    marginHorizontal: 16,
    backgroundColor: COR.verde,
    borderRadius: 24,
    padding: 18,
    ...sombra,
  },
  heroiTopo: { flexDirection: 'row', alignItems: 'center' },
  heroiSaudacao: { color: COR.branco, fontSize: 22, fontWeight: '800' },
  heroiSub: { color: '#D4EDDB', fontSize: 14, marginTop: 4 },
  selo: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: COR.dourado,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginTop: 10,
    gap: 4,
  },
  seloTexto: { color: COR.preto, fontSize: 12, fontWeight: '800' },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: COR.dourado,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#F4CB63',
  },
  avatarTexto: { fontSize: 22, fontWeight: '900', color: COR.preto },
  pesquisa: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COR.branco,
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 52,
    marginTop: 16,
    gap: 10,
  },
  pesquisaCampo: { flex: 1, fontSize: 15, color: COR.preto, paddingVertical: 0 },

  titulo: { fontSize: 19, fontWeight: '800', color: COR.preto, marginTop: 24, marginBottom: 12, paddingHorizontal: 20 },
  tituloLinha: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingRight: 20 },
  verTudo: { color: COR.verde, fontWeight: '800', fontSize: 14, marginBottom: 12 },

  categorias: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16 },
  categoria: { width: '23.5%', alignItems: 'center' },
  categoriaIcone: {
    width: 64,
    height: 64,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    ...sombra,
  },
  categoriaTexto: { marginTop: 8, fontSize: 12, fontWeight: '700', color: COR.preto, textAlign: 'center' },

  carrossel: { paddingHorizontal: 16, gap: 12 },
  produto: {
    width: 168,
    backgroundColor: COR.branco,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COR.linha,
    ...sombra,
  },
  produtoFoto: { width: '100%', height: 118, backgroundColor: COR.douradoClaro },
  produtoSemFoto: { alignItems: 'center', justifyContent: 'center' },
  produtoCorpo: { padding: 12 },
  produtoNome: { fontSize: 15, fontWeight: '800', color: COR.preto },
  produtoPreco: { fontSize: 15, fontWeight: '800', color: COR.verde, marginTop: 4 },
  produtoLocal: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 6 },
  produtoLocalTexto: { fontSize: 12, color: COR.cinza, flex: 1 },

  vazio: {
    marginHorizontal: 16,
    backgroundColor: COR.branco,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: COR.linha,
  },
  vazioTexto: { color: COR.cinza, fontSize: 14 },

  oportunidade: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 24,
    backgroundColor: COR.dourado,
    borderRadius: 22,
    padding: 20,
    gap: 12,
    ...sombra,
  },
  oportunidadeTitulo: { fontSize: 17, fontWeight: '900', color: COR.preto },
  oportunidadeSub: { fontSize: 13, color: COR.preto, marginTop: 4 },

  grade: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12 },
  atalho: { width: '25%', alignItems: 'center', marginBottom: 16, paddingHorizontal: 4 },
  atalhoIcone: { width: 58, height: 58, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  atalhoTexto: { marginTop: 6, fontSize: 12, fontWeight: '700', color: COR.preto, textAlign: 'center' },

  sair: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 8,
    height: 52,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#EFC3BC',
    backgroundColor: COR.branco,
  },
  sairTexto: { color: COR.vermelho, fontWeight: '800', fontSize: 15 },

  menu: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    backgroundColor: COR.branco,
    borderTopWidth: 1,
    borderTopColor: COR.linha,
    paddingTop: 8,
    ...sombra,
  },
  menuItem: { flex: 1, alignItems: 'center' },
  menuPilula: { width: 56, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  menuTexto: { fontSize: 11, color: '#8A8D86', marginTop: 3, fontWeight: '600' },
});

export default HomeScreen;
