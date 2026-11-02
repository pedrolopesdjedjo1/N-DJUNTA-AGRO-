import { Option } from "./ngoCatalog";

export const SERVICE_KINDS: Option[] = [
  { value: "POSTO_COMBUSTIVEL", label: "Posto de combustível" },
  { value: "OFICINA", label: "Oficina mecânica" },
  { value: "ESTACIONAMENTO", label: "Estacionamento" },
  { value: "MANUTENCAO", label: "Manutenção (pneus, lavagem, eletricidade)" },
  { value: "ASSISTENCIA", label: "Assistência na estrada e reboque" },
];

export const SERVICE_STATUS: Option[] = [
  { value: "PENDENTE", label: "Em análise" },
  { value: "PUBLICADO", label: "Publicado" },
  { value: "ESCONDIDO", label: "Escondido" },
];

export const INCIDENT_KINDS: Option[] = [
  { value: "SOS", label: "SOS: preciso de ajuda urgente" },
  { value: "ACIDENTE", label: "Acidente" },
  { value: "AVARIA", label: "Avaria do veículo" },
  { value: "ASSISTENCIA", label: "Pedir assistência na estrada" },
  { value: "OCORRENCIA", label: "Registar uma ocorrência" },
];

export const INCIDENT_STATUS: Option[] = [
  { value: "ABERTA", label: "Aberta" },
  { value: "EM_ATENDIMENTO", label: "Em atendimento" },
  { value: "RESOLVIDA", label: "Resolvida" },
];

const GENERAL = [
  "Antes de sair, confirme os pneus, os travões, as luzes e o combustível.",
  "Leve água, o telemóvel carregado e os contactos de emergência.",
  "Partilhe a viagem pelo app: o comprador acompanha e a equipa sabe onde está.",
  "Tire fotos dos produtos na recolha e na entrega. Protegem-no se houver reclamações.",
  "Não aceite cargas que não conhece nem produtos proibidos. Na dúvida, fale com o suporte.",
  "Evite viajar à noite por estradas más. Se for preciso, avise o comprador e use luzes e coletes refletores.",
];

const BY_VEHICLE: Record<string, string[]> = {
  MOTO: [
    "Use sempre capacete e prenda bem a carga, sem passar a capacidade da moto.",
    "Com chuva, reduza a velocidade e aumente a distância de travagem.",
    "Não transporte pessoas junto com a carga pesada.",
  ],
  TRICICLO: [
    "Ponha a carga pesada em baixo e ao centro, para o triciclo não tombar nas curvas.",
    "Abrande nas curvas e em estradas de terra molhada.",
  ],
  CARRO: ["Distribua o peso pela mala e pelo banco, sem tapar os espelhos.", "Use o cinto e não passe a capacidade do carro."],
  CARRINHA: ["Amarre a carga com cordas ou redes e cubra o que a chuva estraga.", "Distribua o peso para a carrinha não ficar inclinada."],
  CAMIAO: [
    "Calce as rodas quando parar em ladeiras e cubra e amarre sempre a carga.",
    "Descanse pelo menos 15 minutos a cada 4 horas de condução.",
    "Verifique os pneus e os travões antes de cada viagem longa.",
  ],
  BARCO: [
    "Leve coletes salva-vidas para todos a bordo e veja a maré e a previsão marítima.",
    "Não saia com mau tempo e avise alguém do destino e da hora de chegada.",
  ],
};

const BY_CARGO: Record<string, string[]> = {
  PESCA: ["O peixe estraga depressa: transporte-o com gelo e sem demoras."],
  AGRICOLA: ["Proteja os produtos do sol e da chuva e deixe-os ventilar, para não apodrecerem."],
  CONSTRUCAO: ["Amarre bem o material pesado e sinalize cargas que ficam fora do veículo."],
  VEICULOS_PECAS: ["Peças e equipamentos: envolva-os e prenda-os para não se danificarem."],
  ARTESANATO: ["Artesanato frágil: embrulhe-o e ponha-o em cima, nunca por baixo de cargas pesadas."],
};

export function safetyTipsFor(vehicleType?: string | null, cargoTypes: string[] = []) {
  return {
    general: GENERAL,
    vehicle: vehicleType ? BY_VEHICLE[vehicleType] ?? [] : [],
    cargo: cargoTypes.flatMap((c) => BY_CARGO[c] ?? []),
  };
}

export const ACCOUNT_SECURITY_TIPS = [
  "Use uma palavra-passe só sua, difícil de adivinhar. Não a diga a ninguém, nem a quem diga ser do NÔDJUNTA.",
  "O NÔDJUNTA AGRO nunca pede a sua palavra-passe por mensagem ou chamada.",
  "Só entregue os produtos a quem os encomendou, e confirme sempre a entrega pelo app.",
  "Não faça pagamentos nem entregas fora do app para pessoas que não conhece.",
  "Se alguém lhe pedir algo suspeito, denuncie pelo app.",
];

export function transportToolsCatalog() {
  return { serviceKinds: SERVICE_KINDS, serviceStatus: SERVICE_STATUS, incidentKinds: INCIDENT_KINDS, incidentStatus: INCIDENT_STATUS };
}
