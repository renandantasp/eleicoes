/**
 * Escalas de cor em faixas discretas, sobre as rampas do design system Grade.
 *
 * As cores sao tokens CSS (`--ag-red-3`, `--ag-teal-1`...), nao hex literais:
 * assim as rampas vivem num lugar so, em tokens/scales.css, e sao iguais nos
 * dois temas - requisito para que os mapas claro e escuro se comparem a olho.
 *
 * O algoritmo das faixas e o mesmo de antes (passo redondo ao mais proximo,
 * limite por percentil, pontas abertas), com a correcao de casas decimais
 * trazida pelo design system: elas saem do passo, de modo que um passo de
 * 0,25 escreve "+0,25 a +0,50" e nao "+0,3 a +0,5".
 */

export type Rampa = "red" | "blue" | "green" | "amber" | "teal";

/** Cada rampa tem 5 passos, do mais claro (1) ao mais escuro (5). */
export const RAMPAS: Record<Rampa, string[]> = {
  red: ["--ag-red-1", "--ag-red-2", "--ag-red-3", "--ag-red-4", "--ag-red-5"],
  blue: ["--ag-blue-1", "--ag-blue-2", "--ag-blue-3", "--ag-blue-4", "--ag-blue-5"],
  green: ["--ag-green-1", "--ag-green-2", "--ag-green-3", "--ag-green-4", "--ag-green-5"],
  amber: ["--ag-amber-1", "--ag-amber-2", "--ag-amber-3", "--ag-amber-4", "--ag-amber-5"],
  teal: ["--ag-teal-1", "--ag-teal-2", "--ag-teal-3", "--ag-teal-4", "--ag-teal-5"],
};

/** Rampas das duas chapas, para quando a metrica opoe os candidatos. */
export const RAMPA_LULA: Rampa = "red";
export const RAMPA_FLAVIO: Rampa = "blue";

export interface Faixa {
  /** limite inferior, -Infinity na primeira */
  min: number;
  /** limite superior, +Infinity na ultima */
  max: number;
  /** nome do token CSS, ex. "--ag-red-3" */
  corVar: string;
}

/** `var(--ag-red-3)`, para usar direto em CSS. */
export const corCss = (corVar: string) => `var(${corVar})`;

const cacheCor = new Map<string, string>();

/**
 * Resolve um token para o valor computado. O Leaflet precisa de cor literal:
 * nao aceita `var(...)` no `fillColor`. Fica em cache porque as rampas sao
 * iguais nos dois temas e nunca mudam em tempo de execucao.
 */
export function cssVar(corVar: string): string {
  const emCache = cacheCor.get(corVar);
  if (emCache) return emCache;
  if (typeof document === "undefined") return "#8d8d8d";
  const v = getComputedStyle(document.documentElement).getPropertyValue(corVar).trim();
  const cor = v || "#8d8d8d";
  if (v) cacheCor.set(corVar, cor);
  return cor;
}

export const FAIXAS_POR_LADO = 5;
export const FAIXAS_SEQUENCIAIS = 5;

/**
 * Passo "redondo" mais proximo: 1, 2, 2,5, 5 ou 10 vezes uma potencia de dez.
 * Ao mais proximo, e nao para baixo, porque a quantidade de faixas e fixa: com
 * 5 faixas por lado o passo precisa ficar perto de limite/5, senao a cobertura
 * fica curta e a maioria das areas cai na faixa aberta da ponta.
 */
export function passoRedondo(bruto: number): number {
  if (!Number.isFinite(bruto) || bruto <= 0) return 1;
  const base = Math.pow(10, Math.floor(Math.log10(bruto)));
  const n = bruto / base;
  let melhor = 1;
  for (const c of [1, 2, 2.5, 5, 10]) {
    if (Math.abs(c - n) < Math.abs(melhor - n)) melhor = c;
  }
  return melhor * base;
}

/** Casas decimais a partir do passo: 5 -> 0, 2,5 -> 1, 0,25 -> 2. */
export function decimaisDoPasso(passo: number): number {
  for (let d = 0; d < 4; d++) {
    if (Math.abs(Math.round(passo * 10 ** d) - passo * 10 ** d) < 1e-9) return d;
  }
  return 3;
}

/**
 * Faixas simetricas em torno de zero: sempre 5 de cada lado, pontas abertas.
 * Devolve em ordem crescente de valor - as negativas primeiro (da mais extrema
 * ate o zero) e depois as positivas (do zero ate a mais extrema).
 */
export function faixasDivergentes(
  limite: number,
  rampaPos: Rampa,
  rampaNeg: Rampa,
): { faixas: Faixa[]; passo: number } {
  const n = FAIXAS_POR_LADO;
  const passo = passoRedondo(limite / n);
  const faixas: Faixa[] = [];

  for (let k = n; k >= 1; k--) {
    faixas.push({
      min: k === n ? -Infinity : -k * passo,
      max: -(k - 1) * passo,
      corVar: RAMPAS[rampaNeg][k - 1],
    });
  }
  for (let k = 1; k <= n; k++) {
    faixas.push({
      min: (k - 1) * passo,
      max: k === n ? Infinity : k * passo,
      corVar: RAMPAS[rampaPos][k - 1],
    });
  }

  return { faixas, passo };
}

/** Faixas de um tom so cobrindo [min, max], com pontas abertas. */
export function faixasSequenciais(
  min: number,
  max: number,
  rampa: Rampa,
): { faixas: Faixa[]; passo: number } {
  const n = FAIXAS_SEQUENCIAIS;
  const amplitude = max - min;

  if (!(amplitude > 0)) {
    return {
      passo: 1,
      faixas: Array.from({ length: n }, (_, k) => ({
        min: k === 0 ? -Infinity : min,
        max: k === n - 1 ? Infinity : min,
        corVar: RAMPAS[rampa][k],
      })),
    };
  }

  const passo = passoRedondo(amplitude / n);
  const inicio = Math.floor(min / passo) * passo;

  return {
    passo,
    faixas: Array.from({ length: n }, (_, k) => ({
      min: k === 0 ? -Infinity : inicio + k * passo,
      max: k === n - 1 ? Infinity : inicio + (k + 1) * passo,
      corVar: RAMPAS[rampa][k],
    })),
  };
}

/** Indice da faixa em que o valor cai. */
export function indiceDaFaixa(faixas: Faixa[], valor: number): number {
  for (let i = 0; i < faixas.length; i++) {
    if (valor >= faixas[i].min && valor < faixas[i].max) return i;
  }
  return faixas.length - 1;
}

/** Token da faixa em que o valor cai. */
export function corNaFaixa(faixas: Faixa[], valor: number): string {
  return faixas[indiceDaFaixa(faixas, valor)]?.corVar ?? "--ag-outros";
}

/** Rotulo do intervalo, ex. "2,5 a 5,0" ou "10 ou mais". */
export function rotuloFaixa(f: Faixa, formata: (v: number) => string): string {
  if (f.min === -Infinity) return `ate ${formata(f.max)}`;
  if (f.max === Infinity) return `${formata(f.min)} ou mais`;
  return `${formata(f.min)} a ${formata(f.max)}`;
}

/**
 * Raio do circulo do mapa: area proporcional ao eleitorado.
 * `k` e o fator do enquadramento, conforme o design system.
 */
export const raioPonto = (eleitorado: number, maximo: number, k = 1) =>
  (3.5 + 14 * Math.sqrt(Math.max(eleitorado, 0) / Math.max(maximo, 1))) * k;
