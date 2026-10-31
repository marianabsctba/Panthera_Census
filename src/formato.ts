const numero = new Intl.NumberFormat("pt-BR");
const decimal = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export const inteiro = (n: number) => numero.format(n);
export const porcento = (n: number) => `${decimal.format(n)}%`;
export const nomeDoMes = (mes: string) => `${MESES[Number(mes.slice(5, 7)) - 1]}/${mes.slice(2, 4)}`;
export const data = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

// Passos redondos para o eixo: 1, 2 ou 5 vezes uma potência de 10.
export function marcasDoEixo(maximo: number, quantas = 4): number[] {
  if (maximo <= 0) return [0];
  const bruto = maximo / quantas;
  const potencia = 10 ** Math.floor(Math.log10(bruto));
  const passo = [1, 2, 5, 10].map((m) => m * potencia).find((p) => p >= bruto) ?? bruto;
  const marcas: number[] = [];
  for (let v = 0; v < maximo + passo; v += passo) marcas.push(Math.round(v * 1000) / 1000);
  return marcas;
}

// Log: de 3 casos ao maior país, para os Estados Unidos não apagarem o resto do mapa.
export function intensidade(n: number, maximo: number, minimo = 3): number {
  if (maximo <= minimo) return 1;
  return Math.min(1, Math.max(0, Math.log(n / minimo) / Math.log(maximo / minimo)));
}
