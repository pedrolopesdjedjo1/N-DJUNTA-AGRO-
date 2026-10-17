// Números com espaço nos milhares e vírgula nos decimais (ex: 12 500,5)
export function formatNumber(value?: number | null): string {
  const n = Math.round((Number(value) || 0) * 10) / 10;
  const [int, dec] = String(n).split(".");
  return int.replace(/\B(?=(\d{3})+(?!\d))/g, " ") + (dec ? `,${dec}` : "");
}
