// mobile/src/utils/whatsapp.ts  (funcionalidade 86: partilhar no WhatsApp)
// Uso: partilharProduto(produto) num botão do card do produto.
import { Linking, Share } from 'react-native';

export function textoDoProduto(p: any): string {
  const preco = p.price !== undefined ? `${Number(p.price)} CFA${p.unit ? '/' + p.unit : ''}` : '';
  return [
    `🌾 ${p.title}`,
    preco ? `Preço: ${preco}` : '',
    p.quantity ? `Quantidade: ${p.quantity}` : '',
    p.location ? `Local: ${p.location}` : '',
    p.owner?.phone ? `Contacto: ${p.owner.phone}` : '',
    'Veja no NôdjuntaAgro.',
  ].filter(Boolean).join('\n');
}

export async function partilharProduto(p: any) {
  const texto = textoDoProduto(p);
  try {
    await Linking.openURL(`whatsapp://send?text=${encodeURIComponent(texto)}`);
  } catch {
    await Share.share({ message: texto });
  }
}
